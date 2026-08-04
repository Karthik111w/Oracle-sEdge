def classify_stock(scorecard: dict, margin_classification: str, is_avoid: bool, horizon: str = "long") -> dict:
    """Classify a stock into Buy / Watchlist / Hold / Avoid using investor framework scoring."""
    scorecard_score = scorecard.get("total_score", 0)
    investor_label = scorecard.get("investor_label", "Investor")

    if is_avoid:
        classification = "Avoid"
        explanation = f"Avoid due to risk flags or structural concerns in {investor_label}'s framework."
        return {"classification": classification, "explanation": explanation}

    if horizon == "short":
        if scorecard_score >= 80 and margin_classification in ("Strong Buy", "Buy"):
            classification = "Buy"
            explanation = f"High momentum and strong {investor_label} score support a short-term Buy."
        elif scorecard_score >= 70:
            classification = "Watchlist"
            explanation = f"Good {investor_label} score for short-term opportunity, but wait for clearer margin support."
        elif scorecard_score >= 55:
            classification = "Hold"
            explanation = f"Fair score with limited short-term upside; hold if already invested."
        else:
            classification = "Avoid"
            explanation = f"Weak score and insufficient margin for a short-term purchase."
    else:
        if scorecard_score >= 75 and margin_classification in ("Strong Buy", "Buy"):
            classification = "Buy"
            explanation = f"Strong {investor_label} score and margin support a long-term buy recommendation."
        elif scorecard_score >= 65:
            classification = "Watchlist"
            explanation = f"Good {investor_label} score; this company may deserve a place on the long-term watchlist."
        elif scorecard_score >= 50:
            classification = "Hold"
            explanation = f"Fair {investor_label} score; consider holding while waiting for the thesis to improve."
        else:
            classification = "Avoid"
            explanation = f"Weak {investor_label} score and limited margin support — avoid for now."

    return {"classification": classification, "explanation": explanation}
