import threading
import time

import numpy as np
import pandas as pd
import pytest

from backend.services import market, screener, portfolio_analysis as pa


def make_stock(ticker="AAA", sector="Technology", price=100.0, quote_type="EQUITY", growth=0.10, margin=0.20):
    years = ["2021", "2022", "2023", "2024"]
    revenue = [1000.0 * (1 + growth) ** i for i in range(4)]
    net_income = [r * margin for r in revenue]
    return {
        "ticker": ticker,
        "company_name": f"{ticker} Corp",
        "sector": sector,
        "industry": "Software",
        "quote_type": quote_type,
        "current_price": price,
        "daily_change_pct": 1.5,
        "market_cap": 5e10,
        "shares_outstanding": 1e8,
        "beta": 1.1,
        "etf_data": None,
        "financials": {
            "years": years,
            "revenue": revenue,
            "net_income": net_income,
            "ebit": [n * 1.3 for n in net_income],
            "operating_income": [n * 1.3 for n in net_income],
            "interest_expense": [-5.0] * 4,
            "eps": [2.0, 2.2, 2.4, 2.6],
            "total_debt": [100.0] * 4,
            "stockholders_equity": [800.0, 900.0, 1000.0, 1100.0],
            "total_assets": [2000.0] * 4,
            "cash": [300.0] * 4,
            "free_cash_flow": [n * 0.9 for n in net_income],
            "operating_cash_flow": [n * 1.1 for n in net_income],
            "capital_expenditure": [-20.0] * 4,
        },
    }


@pytest.fixture(autouse=True)
def clean_state():
    screener.reset_state()
    market.clear_cache()
    yield
    screener.reset_state()
    market.clear_cache()


def test_universe_is_deduped_and_includes_candidates():
    assert len(screener.UNIVERSE) == len(set(screener.UNIVERSE))
    assert len(screener.UNIVERSE) >= 60
    for ticker in ("AAPL", "BRK-B", "MELI", "FCX"):
        assert ticker in screener.UNIVERSE


def test_build_row_for_two_lenses_and_skips_etf():
    data = make_stock(growth=0.02, margin=0.05)
    buffett = screener.build_row(data, "buffett", "long")
    graham = screener.build_row(data, "graham", "long")
    for row in (buffett, graham):
        assert row["ticker"] == "AAA"
        assert row["name"] == "AAA Corp"
        assert row["price"] == 100.0
        assert row["change_pct"] == 1.5
        assert isinstance(row["risk_flags"], int)
        assert row["beta"] == 1.1
        assert row["classification"] in {"Buy", "Watchlist", "Hold", "Avoid"}
        assert row["dividend_yield"] is None
    assert buffett["pe"] == pytest.approx(100.0 / 2.6, abs=0.01)
    assert buffett["score"] != graham["score"]
    assert screener.build_row(make_stock(quote_type="ETF"), "buffett", "long") is None


def test_build_row_is_null_safe():
    data = make_stock()
    data["current_price"] = None
    data["financials"] = {k: [None] * 4 for k in data["financials"]}
    row = screener.build_row(data, "buffett", "long")
    assert row["price"] is None
    assert row["margin_pct"] is None
    assert row["pe"] is None


def test_pe_prefers_stats_when_present():
    data = make_stock()
    data["stats"] = {"pe_trailing": 22.5, "dividend_yield": 0.012}
    row = screener.build_row(data, "buffett", "long")
    assert row["pe"] == 22.5
    assert row["dividend_yield"] == 0.012


def test_warming_progress_and_failed_ticker(monkeypatch):
    monkeypatch.setattr(screener, "UNIVERSE", ["AAA", "BBB", "CCC"])
    release = threading.Event()
    started = []

    def fake_fetch(ticker):
        started.append(ticker)
        if ticker == "BBB":
            raise RuntimeError("throttled")
        release.wait(5)
        return make_stock(ticker)

    monkeypatch.setattr(screener, "get_stock_data", fake_fetch)
    first = screener.get_screener("buffett", "long")
    assert first["status"] == "warming"
    assert first["progress"]["total"] == 3
    assert first["updated_at"] is None

    # A second request while warming must not start another warmer.
    screener.get_screener("graham", "long")
    names = [t.name for t in threading.enumerate() if t.name == "screener-warmer"]
    assert len(names) == 1

    release.set()
    for t in threading.enumerate():
        if t.name == "screener-warmer":
            t.join(5)

    done = screener.get_screener("buffett", "long")
    assert done["status"] == "ready"
    assert done["progress"] == {"done": 3, "total": 3}
    assert done["updated_at"] is not None
    assert sorted(r["ticker"] for r in done["rows"]) == ["AAA", "CCC"]
    assert sorted(started) == ["AAA", "BBB", "CCC"]
    assert "BBB" in screener._failed


def test_fresh_data_is_not_refetched(monkeypatch):
    monkeypatch.setattr(screener, "UNIVERSE", ["AAA"])
    calls = []
    monkeypatch.setattr(screener, "get_stock_data", lambda t: calls.append(t) or make_stock(t))
    screener.get_screener()
    for t in threading.enumerate():
        if t.name == "screener-warmer":
            t.join(5)
    screener.get_screener("graham", "long")
    assert calls == ["AAA"]


def _join_warmer():
    for t in threading.enumerate():
        if t.name == "screener-warmer":
            t.join(5)


def test_poor_warm_retries_soon_and_failed_tickers_retry_after_backoff(monkeypatch):
    monkeypatch.setattr(screener, "UNIVERSE", ["AAA", "BBB", "CCC"])
    calls = []

    def fake_fetch(ticker):
        calls.append(ticker)
        return make_stock(ticker) if ticker == "AAA" else None

    monkeypatch.setattr(screener, "get_stock_data", fake_fetch)
    screener.get_screener()
    _join_warmer()
    # 1 of 3 loaded: not marked fresh for the full interval.
    assert screener._state["next_refresh_ts"] - time.time() <= screener.POOR_WARM_RETRY_AFTER + 1

    # Inside the backoff nothing is refetched.
    screener.get_screener()
    _join_warmer()
    assert sorted(calls) == ["AAA", "BBB", "CCC"]

    # After the backoff only the failed tickers are retried, and progress is untouched.
    for t in ("BBB", "CCC"):
        screener._failed_at[t] -= screener.FAILED_RETRY_AFTER + 1
    screener._state["next_refresh_ts"] = time.time() + 1000
    monkeypatch.setattr(screener, "get_stock_data", lambda t: calls.append(t) or make_stock(t))
    out = screener.get_screener()
    _join_warmer()
    assert sorted(calls[3:]) == ["BBB", "CCC"]
    assert out["progress"] == {"done": 3, "total": 3}
    assert len(screener.get_screener()["rows"]) == 3


def test_refresh_keeps_status_ready(monkeypatch):
    monkeypatch.setattr(screener, "UNIVERSE", ["AAA"])
    monkeypatch.setattr(screener, "get_stock_data", lambda t: make_stock(t))
    screener.get_screener()
    _join_warmer()
    screener._state["next_refresh_ts"] = time.time() - 1
    release = threading.Event()
    monkeypatch.setattr(screener, "get_stock_data", lambda t: release.wait(5) and make_stock(t))
    out = screener.get_screener()
    assert out["status"] == "ready"
    assert out["refreshing"] is True
    assert len(out["rows"]) == 1
    release.set()
    _join_warmer()
    assert screener.get_screener()["refreshing"] is False


def test_thread_start_failure_resets_warming_flag(monkeypatch):
    class Boom:
        def __init__(self, *a, **k):
            pass

        def start(self):
            raise RuntimeError("cannot start new thread")

    monkeypatch.setattr(screener.threading, "Thread", Boom)
    with pytest.raises(RuntimeError):
        screener.ensure_warm()
    assert screener._state["warming"] is False


def test_unknown_investor_and_horizon_are_normalised(monkeypatch):
    monkeypatch.setattr(screener, "UNIVERSE", ["AAA"])
    monkeypatch.setattr(screener, "get_stock_data", lambda t: make_stock(t))
    out = screener.get_screener("FOO", "bar")
    assert out["investor"] == "buffett" and out["horizon"] == "long"
    _join_warmer()
    assert screener.get_screener("Graham", "SHORT")["investor"] == "graham"


def test_market_store_is_capped_and_purged():
    for i in range(market.MAX_ENTRIES + 10):
        market.ttl_cached(f"k{i}", 100, lambda: 1)
    assert len(market._store) == market.MAX_ENTRIES
    assert "k0" not in market._store
    market.ttl_cached("short", 0.01, lambda: 1)
    time.sleep(0.03)
    market.ttl_cached("other", 100, lambda: 1)
    assert "short" not in market._store


def test_market_overview_omits_failing_index(monkeypatch):
    idx = pd.date_range("2025-01-01", periods=40, freq="B")

    def fake_closes(symbol):
        if symbol == "^VIX":
            return None
        return pd.Series(np.linspace(100, 140, 40), index=idx)

    monkeypatch.setattr(market, "_fetch_closes", fake_closes)
    result = market.get_market_overview()
    symbols = [i["symbol"] for i in result["indices"]]
    assert "^VIX" not in symbols
    assert len(symbols) == 5
    first = result["indices"][0]
    assert len(first["spark"]) == market.SPARK_POINTS
    assert first["price"] == 140.0
    assert first["change_pct"] > 0
    assert result["updated_at"]


def test_market_overview_all_failing_returns_empty(monkeypatch):
    monkeypatch.setattr(market, "_fetch_closes", lambda s: None)
    result = market.get_market_overview()
    assert result["indices"] == []
    assert "updated_at" in result


# --- portfolio analysis -------------------------------------------------

def make_closes(n=120):
    idx = pd.date_range("2025-01-01", periods=n, freq="B")
    t = np.arange(n)
    return pd.DataFrame({
        "AAA": 100 * (1 + 0.002) ** t,
        "BBB": 50 * (1 + 0.001 * np.sin(t / 5) + 0.0005 * t / n) ** t,
        "SPY": 400 * (1 + 0.001) ** t,
    }, index=idx)


def test_normalize_and_merge_holdings():
    merged = pa._merge_holdings([
        {"ticker": " brk.b ", "shares": 2},
        {"ticker": "BRK-B", "shares": 3},
        {"ticker": "ZERO", "shares": 0},
        {"ticker": "", "shares": 5},
    ])
    assert merged == {"BRK-B": 5.0}


def test_positions_weights_sectors_and_warnings():
    stocks = {
        "AAA": make_stock("AAA", "Technology", 100.0),
        "BBB": make_stock("BBB", "Technology", 50.0),
        "CCC": make_stock("CCC", "Utilities", 10.0),
        "NOPE": None,
    }
    shares = {"AAA": 10, "BBB": 20, "CCC": 100, "NOPE": 5}
    positions, warnings = pa.build_positions(shares, stocks, "buffett", "long")
    assert [p["ticker"] for p in positions] == ["AAA", "BBB", "CCC"]
    assert sum(p["weight"] for p in positions) == pytest.approx(1.0)
    assert any("NOPE" in w for w in warnings)

    sectors = pa.sector_allocation(positions)
    assert sectors[0]["sector"] == "Technology"
    assert sectors[0]["value"] == pytest.approx(2000.0)
    assert sectors[0]["weight"] == pytest.approx(2000 / 3000)
    assert sum(s["weight"] for s in sectors) == pytest.approx(1.0)

    out = pa.build_warnings(positions, sectors)
    assert any("Technology is 67%" in w for w in out)
    assert any(w.startswith("AAA is 33%") for w in out)


def test_performance_starts_at_100_and_stats():
    closes = make_closes()
    perf = pa.compute_performance(closes, {"AAA": 0.5, "BBB": 0.5}, closes["SPY"])
    assert perf["portfolio"][0] == 100.0
    assert perf["benchmark"][0] == 100.0
    assert len(perf["dates"]) == len(perf["portfolio"]) == len(perf["benchmark"])
    assert len(perf["dates"]) < len(closes)
    assert perf["dates"][-1] == closes.index[-1].strftime("%Y-%m-%d")
    # SPY compounds at a constant 0.1% per day.
    assert perf["stats"]["benchmark_return_1y"] == pytest.approx(1.001 ** (len(closes) - 1) - 1, abs=1e-3)
    assert perf["stats"]["beta_vs_benchmark"] is not None


def test_performance_weights_are_renormalised_over_available_tickers():
    closes = make_closes()
    perf = pa.compute_performance(closes, {"AAA": 0.3, "MISSING": 0.7}, closes["SPY"])
    expected = (closes["AAA"].iloc[-1] / closes["AAA"].iloc[0] - 1)
    assert perf["stats"]["return_1y"] == pytest.approx(expected, abs=1e-3)


def test_max_drawdown():
    s = pd.Series([100, 120, 90, 110, 80, 130], dtype=float)
    assert pa.max_drawdown(s) == pytest.approx(80 / 120 - 1)
    assert pa.max_drawdown(pd.Series([1.0, 2.0, 3.0])) == 0.0


def test_correlation_matrix_shape_and_diagonal():
    closes = make_closes()
    closes["SHORT"] = np.nan
    closes.loc[closes.index[-5:], "SHORT"] = 10.0
    corr = pa.compute_correlation(closes, ["AAA", "BBB", "SHORT"])
    assert corr["tickers"] == ["AAA", "BBB"]
    assert corr["matrix"][0][0] == pytest.approx(1.0)
    assert corr["matrix"][0][1] == corr["matrix"][1][0]


def test_analyze_portfolio_end_to_end_with_fakes(monkeypatch):
    stocks = {"AAA": make_stock("AAA", "Technology", 100.0), "CCC": make_stock("CCC", "Utilities", 10.0)}
    monkeypatch.setattr(pa, "_cached_stock", lambda t: stocks.get(t))
    closes = make_closes()
    closes["CCC"] = 10 * (1.0005 ** np.arange(len(closes)))
    monkeypatch.setattr(pa, "fetch_closes", lambda tickers, period="1y": closes)

    result = pa.analyze_portfolio(
        [{"ticker": "aaa", "shares": 10}, {"ticker": "ccc", "shares": 100}, {"ticker": "zzz", "shares": 3}, {"ticker": "AAA", "shares": 0}],
        "buffett", "long",
    )
    assert result["total_value"] == pytest.approx(2000.0)
    assert sum(p["weight"] for p in result["positions"]) == pytest.approx(1.0)
    assert result["performance"]["portfolio"][0] == 100.0
    assert any("ZZZ" in w for w in result["warnings"])
    assert result["correlation"]["tickers"] == ["AAA", "CCC"]


def test_analyze_portfolio_rejects_empty_and_unpriced(monkeypatch):
    with pytest.raises(pa.PortfolioError):
        pa.analyze_portfolio([{"ticker": "AAA", "shares": 0}])
    monkeypatch.setattr(pa, "_cached_stock", lambda t: None)
    with pytest.raises(pa.PortfolioError):
        pa.analyze_portfolio([{"ticker": "AAA", "shares": 1}])


def test_performance_excludes_short_history_holdings():
    closes = make_closes(250)
    closes["NEW"] = np.nan
    closes.loc[closes.index[-40:], "NEW"] = 20.0 * (1.01 ** np.arange(40))
    perf = pa.compute_performance(closes, {"AAA": 0.5, "NEW": 0.5}, closes["SPY"])
    assert perf["excluded"] == ["NEW"]
    # The window is still the full year, not the 40 days of the recent listing.
    assert len(perf["dates"]) > 40
    expected = closes["AAA"].iloc[-1] / closes["AAA"].iloc[0] - 1
    assert perf["stats"]["return_1y"] == pytest.approx(expected, abs=1e-3)


def test_analyze_portfolio_warns_about_excluded_tickers(monkeypatch):
    stocks = {"AAA": make_stock("AAA", price=100.0), "NEW": make_stock("NEW", price=20.0)}
    monkeypatch.setattr(pa, "_cached_stock", lambda t: stocks.get(t))
    closes = make_closes(250)
    closes["NEW"] = np.nan
    closes.loc[closes.index[-40:], "NEW"] = 20.0
    monkeypatch.setattr(pa, "fetch_closes", lambda tickers, period="1y": closes)
    result = pa.analyze_portfolio([{"ticker": "AAA", "shares": 1}, {"ticker": "NEW", "shares": 1}])
    assert any("NEW" in w and "left out of the performance" in w for w in result["warnings"])
    assert "excluded" not in result["performance"]
    assert len(result["performance"]["dates"]) > 40


def test_sanitize_replaces_non_finite_floats():
    out = pa.sanitize({"a": float("nan"), "b": [float("inf"), 1.5, np.float32("nan")], "c": {"d": -np.inf}})
    assert out == {"a": None, "b": [None, 1.5, None], "c": {"d": None}}


def test_portfolio_endpoints_validate_input():
    from fastapi.testclient import TestClient
    from backend.main import app
    client = TestClient(app)

    huge = {"holdings": [{"ticker": "KO", "shares": 1e308}, {"ticker": "PEP", "shares": 1e308}]}
    for path in ("/api/portfolio/analyze", "/api/portfolio/optimize"):
        r = client.post(path, json=huge)
        assert r.status_code == 422
        assert isinstance(r.json(), dict)
        bad_ticker = client.post(path, json={"holdings": [{"ticker": "KO;DROP", "shares": 1}]})
        assert bad_ticker.status_code == 422
        too_long = client.post(path, json={"holdings": [{"ticker": "A" * 13, "shares": 1}]})
        assert too_long.status_code == 422
        negative = client.post(path, json={"holdings": [{"ticker": "KO", "shares": -1}]})
        assert negative.status_code == 422
        many = client.post(path, json={"holdings": [{"ticker": "KO", "shares": 1}] * 51})
        assert many.status_code == 422
    nan_body = '{"holdings": [{"ticker": "KO", "shares": NaN}]}'
    assert client.post("/api/portfolio/analyze", content=nan_body, headers={"content-type": "application/json"}).status_code == 422


def test_search_query_is_capped(monkeypatch):
    from fastapi.testclient import TestClient
    from backend.main import app
    from backend.routers import stock as stock_router
    seen = []
    monkeypatch.setattr(stock_router, "search_tickers", lambda q: seen.append(q) or [])
    TestClient(app).get("/api/stock/search", params={"q": "x" * 500})
    assert len(seen[0]) == 64
