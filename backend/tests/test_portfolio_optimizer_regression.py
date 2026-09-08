from backend.services import portfolio_optimizer
from backend.services.sector_profiles import get_sector_profile, SECTOR_PROFILES
from backend.services.risk_filter import check_risk_flags
from backend.services.classifier import classify_stock
from backend.services.dcf import _calculate_cost_of_equity


def test_adaptive_recommendations_accepts_investor_and_horizon():
    recs = portfolio_optimizer._get_adaptive_recommendations("buffett", "short", top_n=3)
    assert isinstance(recs, list)
    assert len(recs) == 3


def test_score_percentile_thresholds_returns_three_values():
    thresholds = portfolio_optimizer._score_percentile_thresholds([55.0, 65.0, 75.0, 85.0, 95.0])
    assert len(thresholds) == 3
    assert thresholds[0] >= thresholds[1] >= thresholds[2]
    assert all(isinstance(value, float) for value in thresholds)


def test_sector_profile_aliases_and_basic_materials():
    assert "Consumer Defensive" in SECTOR_PROFILES
    assert "Consumer Cyclical" in SECTOR_PROFILES
    assert "Basic Materials" in SECTOR_PROFILES
    assert get_sector_profile("Consumer Defensive")["model"] == "dcf"
    assert get_sector_profile("Basic Materials")["model"] == "dcf"


def test_risk_flags_are_sector_aware_for_financials():
    stock_data = {
        "financials": {
            "total_debt": [3.0, 3.0],
            "stockholders_equity": [1.0, 1.0],
            "free_cash_flow": [10.0, 11.0],
            "net_income": [2.0, 2.5],
            "ebit": [30.0, 35.0],
            "interest_expense": [5.0, 6.0],
            "revenue": [100.0, 110.0],
        },
        "sector": "Financial Services",
    }
    risk = check_risk_flags(stock_data)
    assert risk["is_avoid"] is False
    assert not any(flag["flag"] == "High Debt" for flag in risk["flags"])


def test_classify_stock_does_not_auto_avoid_on_risk_flag():
    result = classify_stock({"total_score": 90, "investor_label": "Buffett", "is_etf": False}, 10.0, True, "long")
    assert result["classification"] in {"Watchlist", "Hold"}
    assert result["classification"] != "Avoid"


def test_cost_of_equity_name_and_formula_are_present():
    assert callable(_calculate_cost_of_equity)
    assert _calculate_cost_of_equity(1.0) > 0.07
