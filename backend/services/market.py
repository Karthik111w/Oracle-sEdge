import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable, Optional

import pandas as pd
import yfinance as yf

INDICES = [
    ("^GSPC", "S&P 500"),
    ("^IXIC", "Nasdaq"),
    ("^DJI", "Dow"),
    ("^RUT", "Russell 2000"),
    ("^VIX", "Volatility"),
    ("^TNX", "10Y yield"),
]

OVERVIEW_TTL = 600
SPARK_POINTS = 30

MAX_ENTRIES = 64

_lock = threading.Lock()
_store: dict[str, tuple[float, Any]] = {}


def ttl_cached(key: str, ttl: float, loader: Callable[[], Any]) -> Any:
    """Small private TTL cache. A loader returning None is not cached."""
    now = time.time()
    with _lock:
        hit = _store.get(key)
        if hit and hit[0] > now:
            return hit[1]
    value = loader()
    if value is not None:
        with _lock:
            for stale in [k for k, (expires, _) in _store.items() if expires <= now]:
                del _store[stale]
            _store.pop(key, None)
            _store[key] = (now + ttl, value)
            while len(_store) > MAX_ENTRIES:
                del _store[next(iter(_store))]
    return value


def clear_cache() -> None:
    with _lock:
        _store.clear()


def _fetch_closes(symbol: str) -> Optional[pd.Series]:
    try:
        hist = yf.Ticker(symbol).history(period="3mo", auto_adjust=False)
        if hist is None or hist.empty or "Close" not in hist:
            return None
        return hist["Close"].dropna()
    except Exception:
        return None


def _build_index(symbol: str, name: str, closes: Optional[pd.Series]) -> Optional[dict]:
    if closes is None or len(closes) < 2:
        return None
    last = float(closes.iloc[-1])
    prev = float(closes.iloc[-2])
    change_pct = (last - prev) / prev * 100 if prev else None
    spark = [round(float(v), 4) for v in closes.iloc[-SPARK_POINTS:]]
    return {
        "symbol": symbol,
        "name": name,
        "price": round(last, 4),
        "change_pct": round(change_pct, 4) if change_pct is not None else None,
        "spark": spark,
    }


def _load_overview() -> dict:
    indices = []
    for symbol, name in INDICES:
        try:
            item = _build_index(symbol, name, _fetch_closes(symbol))
        except Exception:
            item = None
        if item:
            indices.append(item)
    return {"indices": indices, "updated_at": datetime.now(timezone.utc).isoformat()}


def get_market_overview() -> dict:
    # An empty result is returned but not cached, so the next request retries.
    def loader():
        result = _load_overview()
        return result if result["indices"] else None

    result = ttl_cached("market_overview", OVERVIEW_TTL, loader)
    if result is None:
        return {"indices": [], "updated_at": datetime.now(timezone.utc).isoformat()}
    return result
