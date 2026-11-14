import threading
import time

import pytest

from backend.services import cache as cache_mod
from backend.services.cache import TTLCache
from backend.services.dcf import calculate_dcf, _per_share, _project
from backend.services.scorecard import calculate_scorecard_history, calculate_scorecard_by_investor, INVESTOR_PROFILES
from backend.services.analysis import build_analysis, build_lens_summary
from backend.services.classifier import classify_stock


def make_stock(sector="Consumer Defensive", **overrides):
    stock = {
        "ticker": "TEST",
        "company_name": "Test Co",
        "sector": sector,
        "industry": "Beverages",
        "quote_type": "EQUITY",
        "current_price": 60.0,
        "shares_outstanding": 1000.0,
        "beta": 0.8,
        "financials": {
            "years": ["2020", "2021", "2022", "2023", "2024"],
            "revenue": [10000, 10800, 11700, 12400, 13200],
            "net_income": [1500, 1650, 1800, 1900, 2100],
            "ebit": [2000, 2150, 2300, 2450, 2600],
            "operating_income": [2000, 2150, 2300, 2450, 2600],
            "interest_expense": [200, 200, 210, 220, 220],
            "eps": [1.5, 1.65, 1.8, 1.9, 2.1],
            "total_debt": [5000, 5000, 5200, 5100, 5000],
            "stockholders_equity": [8000, 8500, 9000, 9600, 10200],
            "total_assets": [20000, 21000, 22000, 23000, 24000],
            "cash": [1000, 1100, 1200, 1300, 1400],
            "free_cash_flow": [1300, 1400, 1550, 1650, 1800],
            "operating_cash_flow": [1800, 1900, 2050, 2150, 2300],
            "capital_expenditure": [-500, -500, -500, -500, -500],
            "depreciation": [400, 410, 420, 430, 440],
            "dividends": [800, 850, 900, 950, 1000],
        },
    }
    stock.update(overrides)
    return stock


# --- cache ---

def test_cache_ttl_expiry():
    c = TTLCache()
    c.set("a", 1, 0.05)
    assert c.get("a") == 1
    time.sleep(0.08)
    assert c.get("a") is None
    assert c.get("a", "missing") == "missing"


def test_cache_cached_hits_and_value_ttl():
    c = TTLCache()
    calls = []

    def loader():
        calls.append(1)
        return None

    assert c.cached("k", lambda v: 0.05 if v is None else 10, loader) is None
    assert c.cached("k", lambda v: 0.05 if v is None else 10, loader) is None
    assert len(calls) == 1
    time.sleep(0.08)
    c.cached("k", lambda v: 0.05 if v is None else 10, loader)
    assert len(calls) == 2


def test_cache_dedupes_concurrent_loads():
    c = TTLCache()
    calls = []
    start = threading.Barrier(5)

    def loader():
        calls.append(1)
        time.sleep(0.1)
        return "value"

    results = []

    def worker():
        start.wait()
        results.append(c.cached("same", 10, loader))

    threads = [threading.Thread(target=worker) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert results == ["value"] * 5
    assert len(calls) == 1


def test_cache_loader_error_not_cached():
    c = TTLCache()
    with pytest.raises(ValueError):
        c.cached("x", 10, lambda: (_ for _ in ()).throw(ValueError("boom")))
    assert c.cached("x", 10, lambda: 5) == 5


def test_module_level_helpers():
    cache_mod.set("module-key", 3, 10)
    assert cache_mod.get("module-key") == 3
    assert cache_mod.cached("module-key", 10, lambda: 99) == 3


# --- dcf extras ---

@pytest.mark.parametrize("sector,model", [
    ("Consumer Defensive", "dcf"),
    ("Financial Services", "earnings_based"),
    ("Utilities", "ddm"),
    ("Real Estate", "ffo"),
])
def test_dcf_extras_present(sector, model):
    result = calculate_dcf(make_stock(sector))
    assert result["valuation_model"] == model
    for key in ("years", "shares", "base_value", "growth_cap", "implied_growth", "sensitivity"):
        assert key in result
    sens = result["sensitivity"]
    assert len(sens["growth_rates"]) == 5 and len(sens["discount_rates"]) == 5
    assert len(sens["values"]) == 5 and all(len(row) == 5 for row in sens["values"])
    assert sens["values"][2][2] == pytest.approx(result["intrinsic_value"])
    assert all(r >= result["terminal_rate"] + 0.04 - 1e-12 for r in sens["discount_rates"])
    assert all(g >= 0 for g in sens["growth_rates"])


def test_implied_growth_reproduces_price():
    stock = make_stock()
    result = calculate_dcf(stock)
    g = result["implied_growth"]
    assert g is not None
    value = _per_share(result["base_value"], g, result["years"], result["discount_rate"], result["terminal_rate"], result["shares"])
    assert value == pytest.approx(stock["current_price"], rel=0.01)


def test_implied_growth_none_without_price_or_solution():
    assert calculate_dcf(make_stock(current_price=None))["implied_growth"] is None
    assert calculate_dcf(make_stock(current_price=1e9))["implied_growth"] is None


def test_project_matches_intrinsic_value():
    result = calculate_dcf(make_stock())
    proj = _project(result["base_value"], result["growth_rate"], result["years"], result["discount_rate"], result["terminal_rate"])
    assert proj["total_pv"] / result["shares"] == pytest.approx(result["intrinsic_value"])


def test_ddm_with_none_gaps():
    stock = make_stock("Utilities")
    stock["financials"]["dividends"] = [None, 850, None, 950, 1000]
    result = calculate_dcf(stock)
    assert result["valuation_model"] == "ddm"
    assert result["intrinsic_value"] > 0


def test_ffo_with_none_gaps():
    stock = make_stock("Real Estate")
    stock["financials"]["depreciation"] = [400, None, 420, None, 440]
    stock["financials"]["net_income"] = [1500, 1650, None, 1900, 2100]
    result = calculate_dcf(stock)
    assert result["valuation_model"] == "ffo"
    assert result["intrinsic_value"] > 0


def test_ddm_and_ffo_fall_back_when_series_empty():
    utilities = make_stock("Utilities")
    utilities["financials"]["dividends"] = [None] * 5
    assert calculate_dcf(utilities)["valuation_model"] == "dcf"
    reit = make_stock("Real Estate")
    reit["financials"]["depreciation"] = [None] * 5
    assert calculate_dcf(reit)["valuation_model"] == "dcf"


# --- scorecard ---

def test_scorecard_metrics_have_key_and_raw_value():
    card = calculate_scorecard_by_investor(make_stock(), "buffett", "long")
    by_key = {m["metric"]: m for m in card["metrics"]}
    assert "roic" in by_key and "revenue_growth" in by_key
    assert all("raw_value" in m and "value" in m and "name" in m for m in card["metrics"])
    assert by_key["profit_margin"]["raw_value"] == pytest.approx(2100 / 13200)


def test_history_skips_unscorable_years():
    stock = make_stock()
    # The oldest year only has revenue, so almost no metric can be scored there.
    for key in ("net_income", "ebit", "operating_income", "interest_expense", "eps", "total_debt",
                "stockholders_equity", "total_assets", "cash", "free_cash_flow"):
        stock["financials"][key][0] = None
    history = calculate_scorecard_history(stock)
    assert history, "expected at least one scored year"
    years = [h["year"] for h in history]
    assert years[-1] == "2024"
    assert "2020" not in years
    assert all(h["score"] is not None and h["score"] > 0 for h in history)


def test_history_empty_when_no_data():
    assert calculate_scorecard_history({"financials": {"revenue": [1]}}) == []


# --- analysis ---

def test_build_analysis_shape():
    out = build_analysis(make_stock(), "nonsense", "nonsense")
    assert set(out) == {"scorecard", "dcf", "margin", "risk", "classification_details"}
    assert out["scorecard"]["investor"] == "buffett"
    assert out["classification_details"]["classification"] in ("Buy", "Watchlist", "Hold", "Avoid")


def test_lens_summary_six_lenses():
    summary = build_lens_summary(make_stock(), "long")
    assert len(summary["lenses"]) == len(INVESTOR_PROFILES) == 6
    counts = summary["consensus"]["counts"]
    assert set(counts) == {"Buy", "Watchlist", "Hold", "Avoid"}
    assert sum(counts.values()) == 6
    top = max(summary["lenses"], key=lambda l: l["score"])
    assert summary["consensus"]["top_lens"] == top["investor"]
    assert summary["ticker"] == "TEST"
    assert summary["consensus"]["summary"].endswith(".")
    assert {"investor", "label", "term", "score", "grade", "classification", "classification_label", "explanation"} <= set(summary["lenses"][0])


def test_lens_summary_etf():
    summary = build_lens_summary({"ticker": "SPY", "quote_type": "ETF"}, "long")
    assert summary["lenses"] == []
    assert "does not apply" in summary["consensus"]["summary"]


# --- classifier (unchanged behaviour) ---

@pytest.mark.parametrize("score,margin,avoid,horizon,expected", [
    (50, 40, False, "long", "Avoid"),
    (92, 0, False, "long", "Buy"),
    (92, -30, False, "long", "Watchlist"),
    (80, 20, False, "long", "Buy"),
    (80, 5, False, "long", "Watchlist"),
    (80, -5, False, "long", "Hold"),
    (80, 20, True, "long", "Hold"),
    (65, 20, False, "long", "Hold"),
])
def test_classifier_cases(score, margin, avoid, horizon, expected):
    result = classify_stock({"total_score": score, "investor_label": "X"}, margin, avoid, horizon)
    assert result["classification"] == expected


def test_classifier_short_labels_and_etf():
    result = classify_stock({"total_score": 80, "investor_label": "X"}, 25, False, "short")
    assert result["classification"] == "Buy" and result["horizon_label"] == "Trade"
    assert classify_stock({"is_etf": True}, 0, False)["classification"] == "ETF Index"
