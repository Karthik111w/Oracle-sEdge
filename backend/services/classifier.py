def classify_stock(scorecard_score: float, margin_classification: str, is_avoid: bool) -> str:
    """Classify a stock into Buy / Watchlist / Hold / Avoid based on combined analysis.

    Logic:
    - If any risk flags → 'Avoid'
    - If score >= 70 AND margin is 'Strong Buy' or 'Buy' → 'Buy'
    - If score >= 70 → 'Watchlist'
    - If score >= 50 → 'Hold'
    - Else → 'Avoid'
    """
    if is_avoid:
        return "Avoid"

    if scorecard_score >= 70 and margin_classification in ("Strong Buy", "Buy"):
        return "Buy"

    if scorecard_score >= 70:
        return "Watchlist"

    if scorecard_score >= 50:
        return "Hold"

    return "Avoid"
