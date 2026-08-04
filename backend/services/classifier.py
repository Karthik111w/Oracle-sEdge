def classify_stock(scorecard: dict, margin_classification: str, is_avoid: bool) -> dict:
    """Classify a stock into Buy / Watchlist / Hold / Avoid using investor framework scoring."""
    scorecard_score = scorecard.get("total_score", 0)
    investor_label = scorecard.get("investor_label", "Investor")

    if is_avoid:
        classification = "Avoid"
        explanation = f"Avoid due to risk flags or structural concerns in {investor_label}'s framework."
        return {"classification": classification, "explanation": explanation}

    if scorecard_score >= 80 and margin_classification in ("Strong Buy", "Buy"):
        classification = "Buy"
        explanation = f"Strong {investor_label} score and margin support a Buy recommendation."
    elif scorecard_score >= 70:
        classification = "Watchlist"
        explanation = f"Good {investor_label} score but not enough margin strength for an outright Buy."
    elif scorecard_score >= 55:
        classification = "Hold"
        explanation = f"Fair {investor_label} score; consider holding while watching the thesis."
    else:
        classification = "Avoid"
        explanation = f"Weak {investor_label} score and limited margin support — avoid for now."

    return {"classification": classification, "explanation": explanation}
