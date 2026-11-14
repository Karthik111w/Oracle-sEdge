import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

from .stock_data import get_stock_data
from .scorecard import calculate_scorecard_by_investor
from .dcf import calculate_dcf
from .margin_of_safety import calculate_margin_of_safety
from .risk_filter import check_risk_flags
from .classifier import classify_stock
from .portfolio_optimizer import INVESTOR_CANDIDATE_UNIVERSE

# Liquid US large caps, a handful per GICS sector.
CORE_UNIVERSE = [
    # Technology
    "AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "ADBE", "CSCO",
    # Communication Services
    "GOOGL", "META", "NFLX", "DIS", "T",
    # Consumer Cyclical
    "AMZN", "TSLA", "HD", "MCD", "NKE", "SBUX",
    # Consumer Defensive
    "WMT", "PG", "KO", "PEP", "COST",
    # Financial Services
    "JPM", "BAC", "V", "MA", "GS", "BRK-B",
    # Healthcare
    "UNH", "JNJ", "LLY", "ABBV", "MRK", "PFE",
    # Industrials
    "CAT", "HON", "UPS", "GE", "BA", "RTX",
    # Energy
    "XOM", "CVX", "COP",
    # Utilities
    "NEE", "DUK", "SO",
    # Real Estate
    "PLD", "AMT", "O",
    # Basic Materials
    "LIN", "SHW", "FCX",
]

WARM_WORKERS = 4
REFRESH_AFTER = 30 * 60


def _build_universe() -> list[str]:
    seen = []
    for ticker in CORE_UNIVERSE + [t for group in INVESTOR_CANDIDATE_UNIVERSE.values() for t in group]:
        if ticker not in seen:
            seen.append(ticker)
    return seen


UNIVERSE = _build_universe()

_lock = threading.Lock()
_raw: dict[str, dict] = {}
_failed: dict[str, str] = {}
_state = {"warming": False, "done": 0, "total": len(UNIVERSE), "updated_at": None, "updated_ts": None}


def _fetch_one(ticker: str) -> None:
    try:
        data = get_stock_data(ticker)
    except Exception as exc:
        data = None
        reason = str(exc) or "error"
    else:
        reason = "no data"
    with _lock:
        if data:
            _raw[ticker] = data
            _failed.pop(ticker, None)
        else:
            _failed[ticker] = reason
        _state["done"] += 1


def _warm(tickers: list[str]) -> None:
    try:
        with ThreadPoolExecutor(max_workers=WARM_WORKERS) as pool:
            list(pool.map(_fetch_one, tickers))
    finally:
        with _lock:
            _state["warming"] = False
            _state["updated_ts"] = time.time()
            _state["updated_at"] = datetime.now(timezone.utc).isoformat()


def ensure_warm() -> None:
    """Start the background warmer if there is no data yet or it is stale. Never runs two at once."""
    with _lock:
        if _state["warming"]:
            return
        ts = _state["updated_ts"]
        if ts is not None and time.time() - ts < REFRESH_AFTER:
            return
        _state.update(warming=True, done=0, total=len(UNIVERSE))
        tickers = list(UNIVERSE)
    threading.Thread(target=_warm, args=(tickers,), daemon=True, name="screener-warmer").start()


def reset_state() -> None:
    """Forget everything (used by tests). Does not stop a running warmer."""
    with _lock:
        _raw.clear()
        _failed.clear()
        _state.update(warming=False, done=0, total=len(UNIVERSE), updated_at=None, updated_ts=None)


def analyze_stock(stock_data: dict, investor: str, horizon: str) -> dict:
    """Scorecard, DCF, margin, risk and classification for one stock, null-safe."""
    scorecard = calculate_scorecard_by_investor(stock_data, investor, horizon)
    price = stock_data.get("current_price")
    try:
        dcf = calculate_dcf(stock_data, horizon)
    except Exception:
        dcf = None
    margin = None
    if dcf and dcf.get("intrinsic_value") is not None and price is not None:
        margin = calculate_margin_of_safety(dcf["intrinsic_value"], price)
    risk = check_risk_flags(stock_data, sector=stock_data.get("sector", ""))
    details = classify_stock(scorecard, margin["margin_pct"] if margin else -100.0, risk["is_avoid"], horizon)
    return {
        "scorecard": scorecard,
        "dcf": dcf,
        "margin": margin,
        "risk": risk,
        "classification": details["classification"],
        "classification_label": details["horizon_label"],
    }


def _pe(stock_data: dict) -> Optional[float]:
    stats = stock_data.get("stats") or {}
    pe = stats.get("pe_trailing")
    if pe is not None:
        return pe
    price = stock_data.get("current_price")
    eps = ((stock_data.get("financials") or {}).get("eps")) or []
    latest = next((v for v in reversed(eps) if v is not None), None)
    if price and latest and latest > 0:
        return round(price / latest, 2)
    return None


def build_row(stock_data: dict, investor: str, horizon: str) -> Optional[dict]:
    if not stock_data or stock_data.get("quote_type") == "ETF":
        return None
    result = analyze_stock(stock_data, investor, horizon)
    scorecard = result["scorecard"]
    margin = result["margin"]
    dcf = result["dcf"]
    stats = stock_data.get("stats") or {}
    return {
        "ticker": stock_data.get("ticker"),
        "name": stock_data.get("company_name"),
        "sector": stock_data.get("sector"),
        "industry": stock_data.get("industry"),
        "price": stock_data.get("current_price"),
        "change_pct": stock_data.get("daily_change_pct"),
        "market_cap": stock_data.get("market_cap"),
        "score": scorecard.get("total_score"),
        "grade": scorecard.get("grade"),
        "classification": result["classification"],
        "classification_label": result["classification_label"],
        "margin_pct": margin["margin_pct"] if margin else None,
        "intrinsic_value": (margin or {}).get("intrinsic_value") if margin else (dcf or {}).get("intrinsic_value"),
        "pe": _pe(stock_data),
        "dividend_yield": stats.get("dividend_yield"),
        "risk_flags": len((result["risk"] or {}).get("flags") or []),
        "beta": stock_data.get("beta"),
    }


def get_screener(investor: str = "buffett", horizon: str = "long") -> dict:
    ensure_warm()
    with _lock:
        snapshot = list(_raw.values())
        status = "warming" if _state["warming"] else "ready"
        progress = {"done": _state["done"], "total": _state["total"]}
        updated_at = _state["updated_at"]
    rows = []
    for data in snapshot:
        try:
            row = build_row(data, investor, horizon)
        except Exception:
            row = None
        if row:
            rows.append(row)
    rows.sort(key=lambda r: (r["score"] is None, -(r["score"] or 0), r["ticker"] or ""))
    return {
        "status": status,
        "progress": progress,
        "updated_at": updated_at,
        "investor": investor,
        "horizon": horizon,
        "rows": rows,
    }
