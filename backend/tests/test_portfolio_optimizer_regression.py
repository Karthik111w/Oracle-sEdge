from backend.services import portfolio_optimizer


def test_adaptive_recommendations_accepts_investor_and_horizon():
    recs = portfolio_optimizer._get_adaptive_recommendations("buffett", "short", top_n=3)
    assert isinstance(recs, list)
    assert len(recs) == 3


def test_score_percentile_thresholds_returns_three_values():
    thresholds = portfolio_optimizer._score_percentile_thresholds([55.0, 65.0, 75.0, 85.0, 95.0])
    assert len(thresholds) == 3
    assert thresholds[0] >= thresholds[1] >= thresholds[2]
    assert all(isinstance(value, float) for value in thresholds)
