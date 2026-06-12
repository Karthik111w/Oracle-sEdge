from typing import Optional


def _cagr(start_val: Optional[float], end_val: Optional[float], years: int) -> Optional[float]:
    """Compute CAGR. Both values must be positive."""
    if start_val is None or end_val is None or years <= 0:
        return None
    if start_val <= 0 or end_val <= 0:
        return None
    return (end_val / start_val) ** (1 / years) - 1


def calculate_dcf(stock_data: dict) -> dict:
    """Run a 2-stage DCF to estimate intrinsic value per share.

    Stage 2: Terminal value using perpetuity growth model.
    """
    if stock_data.get("quote_type") == "ETF":
        return None

    fin = stock_data.get("financials", {})
    fcf_list = fin.get("free_cash_flow", [])
    current_price = stock_data.get("current_price", 0) or 0
    shares = stock_data.get("shares_outstanding", 0) or 0
    beta = stock_data.get("beta", 1.0) or 1.0

    # Get latest FCF (last element, chronological order oldest-first)
    latest_fcf = None
    for val in reversed(fcf_list):
        if val is not None:
            latest_fcf = val
            break

    if latest_fcf is None or latest_fcf <= 0 or shares <= 0:
        # Cannot run DCF with negative/zero FCF or no shares
        return {
            "intrinsic_value": 0.0,
            "current_price": current_price,
            "fcf_latest": latest_fcf if latest_fcf is not None else 0.0,
            "growth_rate": 0.0,
            "wacc": 0.0,
            "terminal_growth": 0.03,
            "projected_fcf": [],
            "terminal_value": 0.0,
            "terminal_value_discounted": 0.0,
        }

    # Calculate historical FCF growth rate (CAGR)
    first_fcf = None
    first_idx = -1
    last_idx = -1
    for i, v in enumerate(fcf_list):
        if v is not None and v > 0:
            if first_fcf is None:
                first_fcf = v
                first_idx = i
            last_idx = i

    years_span = last_idx - first_idx if first_idx >= 0 else 0
    growth_rate = _cagr(first_fcf, latest_fcf, years_span)

    if growth_rate is None:
        growth_rate = 0.05  # Default 5% if can't compute

    # Cap growth rate at 25%, floor at -10%
    growth_rate = max(-0.10, min(0.25, growth_rate))

    # WACC calculation (simplified — cost of equity only)
    risk_free = 0.045
    market_premium = 0.055
    cost_of_equity = risk_free + beta * market_premium
    wacc = cost_of_equity

    # Terminal growth rate
    terminal_growth = 0.03

    # Ensure WACC > terminal growth to avoid division by zero or negative terminal value
    if wacc <= terminal_growth:
        wacc = terminal_growth + 0.02

    # Stage 1: Project FCF for years 1-10
    projected = []
    for year in range(1, 11):
        proj_fcf = latest_fcf * ((1 + growth_rate) ** year)
        discount_factor = (1 + wacc) ** year
        discounted = proj_fcf / discount_factor
        projected.append({
            "year": year,
            "fcf": round(proj_fcf, 2),
            "discounted_fcf": round(discounted, 2),
        })

    # Stage 2: Terminal value
    fcf_year_11 = latest_fcf * ((1 + growth_rate) ** 11)
    terminal_value = fcf_year_11 / (wacc - terminal_growth)
    terminal_value_discounted = terminal_value / ((1 + wacc) ** 10)

    # Sum all discounted cash flows
    total_dcf = sum(p["discounted_fcf"] for p in projected) + terminal_value_discounted

    # Intrinsic value per share
    intrinsic_value = total_dcf / shares

    return {
        "intrinsic_value": round(intrinsic_value, 2),
        "current_price": round(current_price, 2),
        "fcf_latest": round(latest_fcf, 2),
        "growth_rate": round(growth_rate, 4),
        "wacc": round(wacc, 4),
        "terminal_growth": terminal_growth,
        "projected_fcf": projected,
        "terminal_value": round(terminal_value, 2),
        "terminal_value_discounted": round(terminal_value_discounted, 2),
    }
