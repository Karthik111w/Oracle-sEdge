_MOS_BUY_GATE = {"long": 10.0, "balanced": 15.0, "short": 20.0}
_MOS_PREMIUM_TOLERANCE = {"long": -15.0, "balanced": -10.0, "short": 0.0}
_HORIZON_LABELS = {
    "short": {"Buy": "Trade", "Watchlist": "Watch", "Hold": "Pass", "Avoid": "Avoid"},
}


def classify_stock(scorecard: dict, margin_pct: float, is_avoid: bool, horizon: str = "long") -> dict:
    """Classify a stock into Buy / Watchlist / Hold / Avoid using investor framework scoring."""
    if scorecard.get("is_etf"):
        return {
            "classification": "ETF Index",
            "horizon_label": "ETF Index",
            "explanation": "Exchange-Traded Fund representing a diversified asset basket.",
        }

    scorecard_score = scorecard.get("total_score")
    if scorecard_score is None:
        scorecard_score = 0
    investor_label = scorecard.get("investor_label", "Investor")
    horizon_key = (horizon or "long").lower()
    buy_gate = _MOS_BUY_GATE.get(horizon_key, 15.0)
    premium_ok = _MOS_PREMIUM_TOLERANCE.get(horizon_key, -10.0)

    if scorecard_score < 60:
        classification = "Avoid"
        explanation = f"Avoid due to weak {investor_label} score."
    elif is_avoid and scorecard_score >= 90:
        classification = "Watchlist"
        explanation = f"Strong {investor_label} score, but risk flags warrant caution and a closer valuation check."
    elif is_avoid and scorecard_score >= 75:
        classification = "Hold"
        explanation = f"Solid {investor_label} score, but risk flags mean hold until the balance sheet or earnings profile improves."
    elif is_avoid:
        classification = "Hold"
        explanation = f"Risk flags require caution, but the score is not weak enough to justify a full avoid rating."
    elif scorecard_score >= 90 and margin_pct >= premium_ok:
        classification = "Buy"
        explanation = f"Exceptional {investor_label} score within the {horizon_key} premium tolerance; this remains a buy opportunity."
    elif scorecard_score >= 90:
        classification = "Watchlist"
        explanation = f"Exceptional {investor_label} score; watch the valuation closely while the thesis plays out."
    elif scorecard_score >= 75 and margin_pct >= buy_gate:
        classification = "Buy"
        explanation = f"Strong {investor_label} score and attractive margin of safety support a buy."
    elif scorecard_score >= 75 and margin_pct >= 0:
        classification = "Watchlist"
        explanation = f"Good {investor_label} score and non-negative margin; keep this on the watchlist."
    elif scorecard_score >= 75:
        classification = "Hold"
        explanation = f"Good {investor_label} score but slight premium risk means hold rather than buy."
    else:
        classification = "Hold"
        explanation = f"Moderate {investor_label} score; hold and re-evaluate as the business improves."

    horizon_label = _HORIZON_LABELS.get(horizon_key, {}).get(classification, classification)
    return {
        "classification": classification,
        "horizon_label": horizon_label,
        "explanation": explanation,
    }
