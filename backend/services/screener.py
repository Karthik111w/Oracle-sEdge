import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

from .stock_data import get_stock_data
from .analysis import build_analysis, normalize_investor, normalize_horizon
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
# After a warm where fewer than half the tickers loaded, try the whole universe again soon.
POOR_WARM_RETRY_AFTER = 2 * 60
# A ticker that failed is retried on a later request after this long.
FAILED_RETRY_AFTER = 60


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
_failed_at: dict[str, float] = {}
_state = {
    "warming": False,  # a worker thread is running
    "full": False,  # ... and it is walking the whole universe (not just retrying failures)
    "completed": False,  # at least one full warm has finished
    "done": 0,
    "total": len(UNIVERSE),
    "updated_at": None,
    "next_refresh_ts": None,
}


def _fetch_one(ticker: str) -> bool:
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
            _failed_at.pop(ticker, None)
        else:
            _failed[ticker] = reason
            _failed_at[ticker] = time.time()
        if _state["full"]:
            _state["done"] += 1
    return bool(data)


def _warm(tickers: list[str], full: bool) -> None:
    ok = 0
    try:
        with ThreadPoolExecutor(max_workers=WARM_WORKERS) as pool:
            ok = sum(pool.map(_fetch_one, tickers))
    finally:
        with _lock:
            _state["warming"] = False
            if full:
                poor = ok * 2 < len(tickers)
                _state["completed"] = True
                _state["next_refresh_ts"] = time.time() + (POOR_WARM_RETRY_AFTER if poor else REFRESH_AFTER)
                if ok:
                    _state["updated_at"] = datetime.now(timezone.utc).isoformat()


def ensure_warm() -> None:
    """Start the background worker if the data is missing, stale, or some tickers failed. Never runs two at once."""
    with _lock:
        if _state["warming"]:
            return
        now = time.time()
        next_refresh = _state["next_refresh_ts"]
        if not _state["completed"] or next_refresh is None or now >= next_refresh:
            tickers, full = list(UNIVERSE), True
        else:
            tickers = [t for t in UNIVERSE if t in _failed and now - _failed_at.get(t, 0) >= FAILED_RETRY_AFTER]
            full = False
            if not tickers:
                return
        _state["warming"] = True
        _state["full"] = full
        if full:
            _state.update(done=0, total=len(tickers))
    try:
        threading.Thread(target=_warm, args=(tickers, full), daemon=True, name="screener-warmer").start()
    except Exception:
        with _lock:
            _state["warming"] = False
        raise


def reset_state() -> None:
    """Forget everything (used by tests). Does not stop a running warmer."""
    with _lock:
        _raw.clear()
        _failed.clear()
        _failed_at.clear()
        _state.update(warming=False, full=False, completed=False, done=0, total=len(UNIVERSE), updated_at=None, next_refresh_ts=None)


def analyze_stock(stock_data: dict, investor: str, horizon: str) -> dict:
    """Flat view of analysis.build_analysis (kept for the screener rows and the portfolio analysis)."""
    result = build_analysis(stock_data, investor, horizon)
    details = result["classification_details"]
    return {
        "scorecard": result["scorecard"],
        "dcf": result["dcf"],
        "margin": result["margin"],
        "risk": result["risk"],
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
    investor = normalize_investor(investor)
    horizon = normalize_horizon(horizon)
    ensure_warm()
    with _lock:
        snapshot = list(_raw.values())
        # Stale rows stay valid during a refresh, so "warming" only means no warm has ever finished.
        status = "ready" if _state["completed"] else "warming"
        refreshing = _state["warming"] and _state["completed"]
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
        "refreshing": refreshing,
        "progress": progress,
        "updated_at": updated_at,
        "investor": investor,
        "horizon": horizon,
        "rows": rows,
    }
