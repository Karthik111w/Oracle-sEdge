from typing import Optional


def check_risk_flags(stock_data: dict) -> dict:
    """Check for red flags that should trigger an 'Avoid' classification.

    Flags:
    1. Debt-to-equity > 2.0
    2. Latest free cash flow is negative
    3. Earnings declined 3+ consecutive years
    4. Interest coverage ratio < 2.0
    """
    fin = stock_data.get("financials", {})
    total_debt = fin.get("total_debt", [])
    equity = fin.get("stockholders_equity", [])
    fcf = fin.get("free_cash_flow", [])
    net_income = fin.get("net_income", [])
    ebit = fin.get("ebit", [])
    interest_expense = fin.get("interest_expense", [])

    flags: list[dict] = []

    # 1. Debt-to-equity > 2.0
    latest_debt = _latest(total_debt)
    latest_equity = _latest(equity)
    de_ratio = _safe_div(latest_debt, latest_equity)
    if de_ratio is not None and de_ratio > 2.0:
        flags.append({
            "flag": "High Debt",
            "description": "Debt-to-equity ratio exceeds 2.0",
            "value": f"{de_ratio:.2f}",
        })

    # 2. Latest free cash flow is negative
    latest_fcf = _latest(fcf)
    if latest_fcf is not None and latest_fcf < 0:
        flags.append({
            "flag": "Negative FCF",
            "description": "Latest free cash flow is negative",
            "value": f"${latest_fcf:,.0f}",
        })

    # 3. Earnings declined 3+ consecutive years
    consecutive_declines = _count_consecutive_declines(net_income)
    if consecutive_declines >= 3:
        flags.append({
            "flag": "Earnings Decline",
            "description": f"Earnings declined {consecutive_declines} consecutive years",
            "value": f"{consecutive_declines} years",
        })

    # 4. Interest coverage ratio < 2.0
    latest_ebit = _latest(ebit)
    latest_interest = _latest(interest_expense)
    if latest_interest is not None and latest_interest < 0:
        latest_interest = abs(latest_interest)
    coverage = _safe_div(latest_ebit, latest_interest)
    if coverage is not None and coverage < 2.0:
        flags.append({
            "flag": "Low Interest Coverage",
            "description": "Interest coverage ratio is below 2.0x",
            "value": f"{coverage:.1f}x",
        })

    # 5. Data quality flag for suspiciously high net margins
    latest_revenue = _latest(fin.get("revenue", []))
    latest_net_income = _latest(net_income)
    net_margin = _safe_div(latest_net_income, latest_revenue)
    if net_margin is not None and net_margin > 0.75:
        flags.append({
            "flag": "Suspicious Net Margin",
            "description": "Reported net margin exceeds 75% and may indicate accounting distortions or low revenue quality.",
            "value": f"{net_margin * 100:.1f}%",
        })

    return {
        "is_avoid": len(flags) > 0,
        "flags": flags,
    }


def _latest(values: list[Optional[float]]) -> Optional[float]:
    """Get the latest (last) non-None value from a chronological list."""
    for val in reversed(values):
        if val is not None:
            return val
    return None


def _safe_div(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    """Safe division returning None if inputs are missing or denominator is zero."""
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


def _count_consecutive_declines(values: list[Optional[float]]) -> int:
    """Count the maximum consecutive years of earnings decline (from the end)."""
    max_consecutive = 0
    current_streak = 0
    for i in range(1, len(values)):
        prev = values[i - 1]
        curr = values[i]
        if prev is not None and curr is not None and curr < prev:
            current_streak += 1
            max_consecutive = max(max_consecutive, current_streak)
        else:
            current_streak = 0
    return max_consecutive
