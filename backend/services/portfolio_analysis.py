import math
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

from .stock_data import get_stock_data
from .market import ttl_cached
from .screener import analyze_stock

BENCHMARK = "SPY"
RISK_FREE = 0.04
CONCENTRATION_LIMIT = 0.25
SECTOR_LIMIT = 0.5
MIN_HISTORY = 30
# A holding needs this share of the window's rows to take part in performance and risk stats.
MIN_WINDOW_COVERAGE = 0.8
DATA_TTL = 600


class PortfolioError(ValueError):
    pass


def normalize_ticker(raw) -> str:
    return str(raw or "").strip().upper().replace(".", "-")


def _num(value, digits: int = 4) -> Optional[float]:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return round(f, digits)


def sanitize(value):
    """Replace NaN/inf floats anywhere in a response structure with None so JSON encoding cannot fail."""
    if isinstance(value, dict):
        return {k: sanitize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [sanitize(v) for v in value]
    if isinstance(value, (float, np.floating)):
        f = float(value)
        return f if math.isfinite(f) else None
    if isinstance(value, np.integer):
        return int(value)
    return value


def _cached_stock(ticker: str) -> Optional[dict]:
    return ttl_cached(f"stock:{ticker}", DATA_TTL, lambda: get_stock_data(ticker))


def fetch_closes(tickers: list[str], period: str = "1y") -> pd.DataFrame:
    """Daily adjusted closes, one column per ticker that returned data."""
    tickers = sorted(set(tickers))
    key = f"closes:{period}:{','.join(tickers)}"

    def load():
        try:
            data = yf.download(tickers, period=period, auto_adjust=True, progress=False, threads=True)
        except Exception:
            return None
        if data is None or data.empty:
            return None
        if isinstance(data.columns, pd.MultiIndex):
            close = data["Close"]
        else:
            close = data[["Close"]].copy()
            close.columns = [tickers[0]]
        close = close.dropna(axis=1, how="all")
        return close if not close.empty else None

    result = ttl_cached(key, DATA_TTL, load)
    return result if result is not None else pd.DataFrame()


def max_drawdown(series: pd.Series) -> Optional[float]:
    """Largest peak-to-trough fall as a negative fraction (0.0 if it never falls)."""
    s = series.dropna()
    if s.empty:
        return None
    return float((s / s.cummax() - 1.0).min())


def compute_performance(closes: pd.DataFrame, weights: dict[str, float], benchmark: pd.Series) -> Optional[dict]:
    """Buy-and-hold at the given weights, both lines normalised to 100 on the first common date.

    Only holdings with at least MIN_WINDOW_COVERAGE of the benchmark's rows take part, so one
    recent listing cannot shorten the window for everyone. Weights are renormalised over those
    holdings and the excluded tickers are returned under "excluded". Returns None if there is
    not enough overlapping data.
    """
    window = int(benchmark.notna().sum())
    present = [t for t in weights if t in closes.columns]
    cols = [t for t in present if closes[t].notna().sum() >= MIN_WINDOW_COVERAGE * window]
    excluded = [t for t in present if t not in cols]
    if not cols:
        return None
    frame = closes[cols].copy()
    frame["__bench__"] = benchmark
    frame = frame.ffill().dropna()
    if len(frame) < MIN_HISTORY:
        return None

    w = np.array([weights[t] for t in cols], dtype=float)
    w = w / w.sum()
    norm = frame / frame.iloc[0]
    port = (norm[cols] * w).sum(axis=1) * 100.0
    bench = norm["__bench__"] * 100.0

    port_ret = port.pct_change().dropna()
    bench_ret = bench.pct_change().dropna()

    vol = float(port_ret.std() * math.sqrt(252)) if len(port_ret) > 1 else None
    ann_ret = float(port_ret.mean() * 252)
    sharpe = (ann_ret - RISK_FREE) / vol if vol else None
    var_b = float(bench_ret.var())
    beta = float(port_ret.cov(bench_ret) / var_b) if var_b else None

    # Weekly points, always keeping the first and last day.
    weekly = port.resample("W-FRI").last().dropna().index
    keep = sorted(set(weekly) | {port.index[0], port.index[-1]})
    keep = [d for d in keep if d in port.index]

    return {
        "excluded": excluded,
        "dates": [d.strftime("%Y-%m-%d") for d in keep],
        "portfolio": [round(float(port.loc[d]), 2) for d in keep],
        "benchmark": [round(float(bench.loc[d]), 2) for d in keep],
        "stats": {
            "return_1y": _num(port.iloc[-1] / 100.0 - 1.0),
            "benchmark_return_1y": _num(bench.iloc[-1] / 100.0 - 1.0),
            "volatility": _num(vol),
            "sharpe": _num(sharpe, 3),
            "max_drawdown": _num(max_drawdown(port)),
            "beta_vs_benchmark": _num(beta, 3),
        },
    }


def compute_correlation(closes: pd.DataFrame, tickers: list[str]) -> dict:
    cols = [t for t in tickers if t in closes.columns and closes[t].dropna().shape[0] >= MIN_HISTORY]
    if not cols:
        return {"tickers": [], "matrix": []}
    rets = closes[cols].ffill().pct_change().dropna(how="all")
    corr = rets.corr()
    matrix = [[_num(corr.loc[a, b], 3) for b in cols] for a in cols]
    return {"tickers": cols, "matrix": matrix}


def _weighted(positions: list[dict], key: str) -> Optional[float]:
    pairs = [(p["weight"], p[key]) for p in positions if p.get(key) is not None]
    total = sum(w for w, _ in pairs)
    if not pairs or total <= 0:
        return None
    return sum(w * v for w, v in pairs) / total


def _merge_holdings(holdings: list[dict]) -> dict[str, float]:
    merged: dict[str, float] = {}
    for h in holdings:
        ticker = normalize_ticker(h.get("ticker"))
        try:
            shares = float(h.get("shares") or 0)
        except (TypeError, ValueError):
            shares = 0.0
        if not ticker or shares <= 0 or not math.isfinite(shares):
            continue
        merged[ticker] = merged.get(ticker, 0.0) + shares
    return merged


def build_positions(shares_by_ticker: dict[str, float], stocks: dict[str, Optional[dict]], investor: str, horizon: str):
    """Returns (positions, warnings). Positions without a usable price are skipped with a warning."""
    positions = []
    warnings = []
    for ticker, shares in shares_by_ticker.items():
        data = stocks.get(ticker)
        price = (data or {}).get("current_price")
        if not data or not price:
            warnings.append(f"{ticker} was skipped because no price data was found.")
            continue
        try:
            result = analyze_stock(data, investor, horizon)
        except Exception:
            result = None
        scorecard = (result or {}).get("scorecard") or {}
        margin = (result or {}).get("margin")
        positions.append({
            "ticker": ticker,
            "name": data.get("company_name"),
            "sector": data.get("sector") or "Unknown",
            "shares": shares,
            "price": price,
            "value": shares * price,
            "change_pct": data.get("daily_change_pct"),
            "score": scorecard.get("total_score"),
            "grade": scorecard.get("grade"),
            "classification": (result or {}).get("classification"),
            "classification_label": (result or {}).get("classification_label"),
            "margin_pct": margin["margin_pct"] if margin else None,
            "beta": data.get("beta"),
        })
    total = sum(p["value"] for p in positions)
    for p in positions:
        p["weight"] = p["value"] / total if total else 0.0
    return positions, warnings


def sector_allocation(positions: list[dict]) -> list[dict]:
    totals: dict[str, float] = {}
    for p in positions:
        totals[p["sector"]] = totals.get(p["sector"], 0.0) + p["value"]
    grand = sum(totals.values())
    rows = [{"sector": s, "weight": v / grand if grand else 0.0, "value": v} for s, v in totals.items()]
    rows.sort(key=lambda r: -r["value"])
    return rows


def build_warnings(positions: list[dict], sectors: list[dict]) -> list[str]:
    out = []
    for p in sorted(positions, key=lambda p: -p["weight"]):
        if p["weight"] > CONCENTRATION_LIMIT:
            out.append(f"{p['ticker']} is {p['weight'] * 100:.0f}% of the portfolio.")
    for s in sectors:
        if s["weight"] > SECTOR_LIMIT and s["sector"] != "Unknown":
            out.append(f"{s['sector']} is {s['weight'] * 100:.0f}% of the portfolio.")
    avoid = [p for p in positions if p.get("classification") == "Avoid"]
    if avoid:
        noun = "position rates" if len(avoid) == 1 else "positions rate"
        out.append(f"{len(avoid)} {noun} Avoid under this lens: {', '.join(p['ticker'] for p in avoid)}.")
    return out


def analyze_portfolio(holdings: list[dict], investor: str = "buffett", horizon: str = "long") -> dict:
    shares = _merge_holdings(holdings)
    if not shares:
        raise PortfolioError("Add at least one holding with a positive number of shares.")

    tickers = list(shares)
    with ThreadPoolExecutor(max_workers=4) as pool:
        fetched = list(pool.map(_safe_stock, tickers))
    stocks = dict(zip(tickers, fetched))

    positions, warnings = build_positions(shares, stocks, investor, horizon)
    if not positions:
        raise PortfolioError("None of the holdings could be priced. Check the ticker symbols.")

    sectors = sector_allocation(positions)
    warnings = build_warnings(positions, sectors) + warnings

    held = [p["ticker"] for p in positions]
    closes = fetch_closes(held + [BENCHMARK], "1y")
    correlation = compute_correlation(closes, held)
    missing = [t for t in held if t not in correlation["tickers"]]
    if missing:
        warnings.append(f"No price history for {', '.join(missing)}; left out of the correlation and performance figures.")

    performance = None
    stats = {k: None for k in ("return_1y", "benchmark_return_1y", "volatility", "sharpe", "max_drawdown", "beta_vs_benchmark")}
    if BENCHMARK in closes.columns:
        performance = compute_performance(closes, {p["ticker"]: p["weight"] for p in positions}, closes[BENCHMARK])
    if performance:
        stats = performance.pop("stats")
        excluded = performance.pop("excluded")
        if excluded:
            warnings.append(
                f"{', '.join(excluded)} has less than {MIN_WINDOW_COVERAGE:.0%} of the one-year price history, "
                "so it is left out of the performance and risk figures; the other holdings are reweighted."
                if len(excluded) == 1 else
                f"{', '.join(excluded)} have less than {MIN_WINDOW_COVERAGE:.0%} of the one-year price history, "
                "so they are left out of the performance and risk figures; the other holdings are reweighted."
            )
    else:
        performance = {"dates": [], "portfolio": [], "benchmark": []}
        warnings.append("Performance history was not available.")

    return sanitize({
        "total_value": round(sum(p["value"] for p in positions), 2),
        "positions": positions,
        "sector_allocation": sectors,
        "weighted_score": _num(_weighted(positions, "score"), 2),
        "weighted_beta": _num(_weighted(positions, "beta"), 3),
        "correlation": correlation,
        "performance": performance,
        "stats": stats,
        "warnings": warnings,
    })


def _safe_stock(ticker: str) -> Optional[dict]:
    try:
        return _cached_stock(ticker)
    except Exception:
        return None
