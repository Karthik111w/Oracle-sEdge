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

    if is_avoid or scorecard_score < 60:
        classification = "Avoid"
        explanation = f"Avoid due to risk flags or weak {investor_label} score."
    elif scorecard_score >= 90 and margin_pct >= -10:
        classification = "Buy"
        explanation = f"Exceptional {investor_label} score with only modest premium risk; this remains a buy opportunity."
    elif scorecard_score >= 90:
        classification = "Watchlist"
        explanation = f"Exceptional {investor_label} score; watch the valuation closely while the thesis plays out."
    elif scorecard_score >= 75 and margin_pct >= 15:
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

    horizon_label = classification
    if horizon == "short":
        if classification == "Buy":
            horizon_label = "Trade"
        elif classification == "Watchlist":
            horizon_label = "Watch"
        elif classification == "Hold":
            horizon_label = "Pass"
        else:
            horizon_label = "Avoid"

    return {
        "classification": classification,
        "horizon_label": horizon_label,
        "explanation": explanation,
    }
