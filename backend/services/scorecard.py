from typing import Optional


def _safe_div(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    """Safe division returning None if inputs are missing or denominator is zero."""
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


def _cagr(start_val: Optional[float], end_val: Optional[float], years: int) -> Optional[float]:
    """Compute CAGR. Both values must be positive for a meaningful result."""
    if start_val is None or end_val is None or years <= 0:
        return None
    if start_val <= 0 or end_val <= 0:
        return None
    return (end_val / start_val) ** (1 / years) - 1


def _first_last_valid(values: list[Optional[float]]) -> tuple[Optional[float], Optional[float], int]:
    """Return the first valid value, last valid value, and the number of years between them."""
    first_val = None
    first_idx = -1
    last_val = None
    last_idx = -1
    for i, v in enumerate(values):
        if v is not None:
            if first_val is None:
                first_val = v
                first_idx = i
            last_val = v
            last_idx = i
    years = last_idx - first_idx if first_idx >= 0 and last_idx >= 0 else 0
    return first_val, last_val, years


def _score_growth(rate: Optional[float]) -> float:
    """Score a growth rate (as decimal, e.g. 0.10 = 10%)."""
    if rate is None:
        return 0.0
    pct = rate * 100
    if pct > 10:
        return 12.5
    if pct > 7:
        return 10.0
    if pct > 5:
        return 7.5
    if pct > 3:
        return 5.0
    if pct > 0:
        return 2.5
    return 0.0


def _score_margin(margin: Optional[float]) -> float:
    """Score a profit margin (as decimal, e.g. 0.20 = 20%)."""
    if margin is None:
        return 0.0
    pct = margin * 100
    if pct > 20:
        return 12.5
    if pct > 15:
        return 10.0
    if pct > 10:
        return 7.5
    if pct > 5:
        return 5.0
    if pct > 0:
        return 2.5
    return 0.0


def _score_roe(roe: Optional[float]) -> float:
    """Score return on equity (as decimal)."""
    if roe is None:
        return 0.0
    pct = roe * 100
    if pct > 20:
        return 12.5
    if pct > 15:
        return 10.0
    if pct > 12:
        return 7.5
    if pct > 8:
        return 5.0
    if pct > 3:
        return 2.5
    return 0.0


def _score_roic(roic: Optional[float]) -> float:
    """Score return on invested capital (as decimal)."""
    if roic is None:
        return 0.0
    pct = roic * 100
    if pct > 15:
        return 12.5
    if pct > 12:
        return 10.0
    if pct > 10:
        return 7.5
    if pct > 7:
        return 5.0
    if pct > 3:
        return 2.5
    return 0.0


def _score_de_ratio(de: Optional[float]) -> float:
    """Score debt-to-equity ratio (lower is better)."""
    if de is None:
        return 0.0
    if de < 0.5:
        return 12.5
    if de < 1.0:
        return 10.0
    if de < 1.5:
        return 7.5
    if de < 2.0:
        return 5.0
    if de < 3.0:
        return 2.5
    return 0.0


def _score_interest_coverage(coverage: Optional[float]) -> float:
    """Score interest coverage ratio (higher is better)."""
    if coverage is None:
        return 0.0
    if coverage > 8:
        return 12.5
    if coverage > 5:
        return 10.0
    if coverage > 3:
        return 7.5
    if coverage > 2:
        return 5.0
    if coverage > 1:
        return 2.5
    return 0.0


def _score_consistency(net_income_list: list[Optional[float]]) -> tuple[float, Optional[float]]:
    """Score earnings consistency — fraction of years where net income grew YoY."""
    valid_pairs = 0
    growth_count = 0
    for i in range(1, len(net_income_list)):
        prev = net_income_list[i - 1]
        curr = net_income_list[i]
        if prev is not None and curr is not None:
            valid_pairs += 1
            if curr > prev:
                growth_count += 1

    if valid_pairs == 0:
        return 0.0, None

    consistency = growth_count / valid_pairs
    pct = consistency * 100
    if pct > 80:
        score = 12.5
    elif pct > 60:
        score = 10.0
    elif pct > 40:
        score = 7.5
    elif pct > 20:
        score = 5.0
    else:
        score = 0.0
    return score, consistency


def calculate_etf_scorecard(stock_data: dict) -> dict:
    etf_data = stock_data.get("etf_data") or {}
    metrics = []

    # 1. Expense Ratio (30 pts)
    er = etf_data.get("expense_ratio")
    er_score = 0.0
    if er is not None:
        if er <= 0.0005: er_score = 30.0
        elif er <= 0.0010: er_score = 25.0
        elif er <= 0.0020: er_score = 15.0
        elif er <= 0.0050: er_score = 5.0
    metrics.append({
        "name": "Expense Ratio",
        "score": er_score,
        "max": 30.0,
        "value": f"{er * 100:.2f}%" if er is not None else "N/A",
        "details": "Lower fees = better compounding"
    })

    # 2. Total Assets / AUM (25 pts)
    assets = etf_data.get("total_assets")
    assets_score = 0.0
    if assets is not None:
        if assets > 10_000_000_000: assets_score = 25.0
        elif assets > 5_000_000_000: assets_score = 20.0
        elif assets > 1_000_000_000: assets_score = 10.0
        else: assets_score = 5.0
    metrics.append({
        "name": "Assets (AUM)",
        "score": assets_score,
        "max": 25.0,
        "value": f"${assets / 1_000_000_000:.1f}B" if assets is not None else "N/A",
        "details": "Fund size and liquidity"
    })

    # 3. 5-Year Average Return (25 pts)
    five_yr = etf_data.get("five_year_return")
    yr_score = 0.0
    if five_yr is not None:
        if five_yr > 0.12: yr_score = 25.0
        elif five_yr > 0.08: yr_score = 20.0
        elif five_yr > 0.05: yr_score = 10.0
        elif five_yr > 0: yr_score = 5.0
    metrics.append({
        "name": "5Yr Return",
        "score": yr_score,
        "max": 25.0,
        "value": f"{five_yr * 100:.1f}%" if five_yr is not None else "N/A",
        "details": "Long-term performance"
    })

    # 4. Yield (20 pts)
    yld = etf_data.get("yield")
    yld_score = 0.0
    if yld is not None:
        if yld > 0.02: yld_score = 20.0
        elif yld > 0.01: yld_score = 10.0
        else: yld_score = 5.0
    metrics.append({
        "name": "Dividend Yield",
        "score": yld_score,
        "max": 20.0,
        "value": f"{yld * 100:.2f}%" if yld is not None else "N/A",
        "details": "Income generation"
    })

    total_score = sum(m["score"] for m in metrics)

    if total_score >= 90: grade = "A"
    elif total_score >= 75: grade = "B"
    elif total_score >= 60: grade = "C"
    elif total_score >= 45: grade = "D"
    else: grade = "F"

    return {
        "total_score": round(total_score, 1),
        "grade": grade,
        "metrics": metrics,
    }


def calculate_scorecard(stock_data: dict) -> dict:
    """Score a company on 8 Buffett-style metrics, each worth 12.5 points (total 100).

    Returns total score, letter grade, and per-metric breakdown.
    """
    if stock_data.get("quote_type") == "ETF":
        return calculate_etf_scorecard(stock_data)

    fin = stock_data.get("financials", {})
    revenue = fin.get("revenue", [])
    net_income = fin.get("net_income", [])
    free_cash_flow = fin.get("free_cash_flow", [])
    operating_income = fin.get("operating_income", [])
    total_debt = fin.get("total_debt", [])
    equity = fin.get("stockholders_equity", [])
    total_assets = fin.get("total_assets", [])
    cash = fin.get("cash", [])
    ebit = fin.get("ebit", [])
    interest_expense = fin.get("interest_expense", [])

    metrics = []

    # 1. Revenue Growth — 5yr CAGR
    rev_first, rev_last, rev_years = _first_last_valid(revenue)
    rev_cagr = _cagr(rev_first, rev_last, rev_years) if rev_years > 0 else None
    rev_score = _score_growth(rev_cagr)
    metrics.append({
        "name": "Revenue Growth",
        "score": rev_score,
        "max": 12.5,
        "value": f"{rev_cagr * 100:.1f}%" if rev_cagr is not None else "N/A",
        "details": f"{rev_years}yr CAGR" if rev_years > 0 else "Insufficient data",
    })

    # 2. FCF Growth — 5yr CAGR
    fcf_first, fcf_last, fcf_years = _first_last_valid(free_cash_flow)
    fcf_cagr = _cagr(fcf_first, fcf_last, fcf_years) if fcf_years > 0 else None
    fcf_score = _score_growth(fcf_cagr)
    metrics.append({
        "name": "FCF Growth",
        "score": fcf_score,
        "max": 12.5,
        "value": f"{fcf_cagr * 100:.1f}%" if fcf_cagr is not None else "N/A",
        "details": f"{fcf_years}yr CAGR" if fcf_years > 0 else "Insufficient data",
    })

    # 3. Profit Margin — Latest net margin
    latest_revenue = revenue[-1] if revenue else None
    latest_net_income = net_income[-1] if net_income else None
    net_margin = _safe_div(latest_net_income, latest_revenue)
    margin_score = _score_margin(net_margin)
    metrics.append({
        "name": "Profit Margin",
        "score": margin_score,
        "max": 12.5,
        "value": f"{net_margin * 100:.1f}%" if net_margin is not None else "N/A",
        "details": "Net Income / Revenue (latest year)",
    })

    # 4. ROE — Latest net_income / stockholders_equity
    latest_equity = equity[-1] if equity else None
    roe = _safe_div(latest_net_income, latest_equity)
    roe_score = _score_roe(roe)
    metrics.append({
        "name": "ROE",
        "score": roe_score,
        "max": 12.5,
        "value": f"{roe * 100:.1f}%" if roe is not None else "N/A",
        "details": "Net Income / Stockholders' Equity",
    })

    # 5. ROIC — NOPAT / Invested Capital
    latest_op_income = operating_income[-1] if operating_income else None
    latest_debt = total_debt[-1] if total_debt else None
    latest_cash = cash[-1] if cash else None
    nopat = latest_op_income * (1 - 0.21) if latest_op_income is not None else None
    invested_capital = None
    if latest_debt is not None and latest_equity is not None and latest_cash is not None:
        invested_capital = latest_debt + latest_equity - latest_cash
    elif latest_debt is not None and latest_equity is not None:
        invested_capital = latest_debt + latest_equity
    roic = _safe_div(nopat, invested_capital)
    roic_score = _score_roic(roic)
    metrics.append({
        "name": "ROIC",
        "score": roic_score,
        "max": 12.5,
        "value": f"{roic * 100:.1f}%" if roic is not None else "N/A",
        "details": "NOPAT / Invested Capital",
    })

    # 6. Debt-to-Equity
    de_ratio = _safe_div(latest_debt, latest_equity)
    de_score = _score_de_ratio(de_ratio)
    metrics.append({
        "name": "Debt-to-Equity",
        "score": de_score,
        "max": 12.5,
        "value": f"{de_ratio:.2f}" if de_ratio is not None else "N/A",
        "details": "Total Debt / Stockholders' Equity",
    })

    # 7. Interest Coverage — EBIT / Interest Expense
    latest_ebit = ebit[-1] if ebit else None
    latest_interest = interest_expense[-1] if interest_expense else None
    # Interest expense is often reported as negative in yFinance
    if latest_interest is not None and latest_interest < 0:
        latest_interest = abs(latest_interest)
    coverage = _safe_div(latest_ebit, latest_interest)
    cov_score = _score_interest_coverage(coverage)
    metrics.append({
        "name": "Interest Coverage",
        "score": cov_score,
        "max": 12.5,
        "value": f"{coverage:.1f}x" if coverage is not None else "N/A",
        "details": "EBIT / Interest Expense",
    })

    # 8. Earnings Consistency
    consistency_score, consistency_pct = _score_consistency(net_income)
    metrics.append({
        "name": "Earnings Consistency",
        "score": consistency_score,
        "max": 12.5,
        "value": f"{consistency_pct * 100:.0f}%" if consistency_pct is not None else "N/A",
        "details": "% of years with YoY earnings growth",
    })

    # Total and grade
    total_score = sum(m["score"] for m in metrics)

    if total_score >= 90:
        grade = "A"
    elif total_score >= 75:
        grade = "B"
    elif total_score >= 60:
        grade = "C"
    elif total_score >= 45:
        grade = "D"
    else:
        grade = "F"

    return {
        "total_score": round(total_score, 1),
        "grade": grade,
        "metrics": metrics,
    }


def calculate_scorecard_history(stock_data: dict, years: int = 5) -> list[dict]:
    """Compute a historical score trend using rolling financial history."""
    fin = stock_data.get("financials", {})
    year_labels = fin.get("years", [])
    history = []

    start = max(0, len(year_labels) - years)
    for index in range(start, len(year_labels)):
        truncated_data = {
            **stock_data,
            "financials": {
                k: (v[: index + 1] if isinstance(v, list) else v)
                for k, v in fin.items()
            }
        }
        scorecard = calculate_scorecard(truncated_data)
        history.append({
            "year": year_labels[index],
            "score": scorecard["total_score"],
            "grade": scorecard["grade"],
        })

    return history
