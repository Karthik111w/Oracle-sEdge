from services.sector_profiles import get_sector_profile


def calculate_scorecard(stock_data: dict) -> dict:
    sector = stock_data.get("sector", "")
    profile = get_sector_profile(sector)
    weights = profile["scorecard_weights"]

    metrics = [
        {
            "name": "Earnings Consistency",
            "score": _score_tiered(_earnings_consistency_pct(stock_data), weights["earnings_consistency"],
                                     [(0.8, 1.0), (0.6, 0.8), (0.4, 0.6), (0.2, 0.4)]),
            "max": weights["earnings_consistency"],
            "value": f"{_earnings_consistency_pct(stock_data) * 100:.0f}%",
            "details": "% of years with positive EPS growth",
        },
        {
            "name": "ROIC",
            "score": _score_tiered(_roic(stock_data), weights["roic"],
                                     [(0.15, 1.0), (0.12, 0.8), (0.10, 0.6), (0.07, 0.4)]),
            "max": weights["roic"],
            "value": f"{_roic(stock_data) * 100:.1f}%",
            "details": "NOPAT / Invested Capital",
        },
        {
            "name": "FCF Growth",
            "score": _score_tiered(_fcf_cagr(stock_data), weights["fcf_growth"],
                                     [(0.10, 1.0), (0.07, 0.8), (0.05, 0.6), (0.03, 0.4), (0.0, 0.2)]),
            "max": weights["fcf_growth"],
            "value": f"{_fcf_cagr(stock_data) * 100:.1f}%",
            "details": "5yr Free Cash Flow CAGR",
        },
        {
            "name": "Profit Margin",
            "score": _score_tiered(_net_margin(stock_data), weights["profit_margin"],
                                     [(0.20, 1.0), (0.15, 0.8), (0.10, 0.6), (0.05, 0.4)]),
            "max": weights["profit_margin"],
            "value": f"{_net_margin(stock_data) * 100:.1f}%",
            "details": "Net income / Revenue",
        },
        {
            "name": "ROE",
            "score": _score_tiered(_roe(stock_data), weights["roe"],
                                     [(0.20, 1.0), (0.15, 0.8), (0.12, 0.6), (0.08, 0.4)]),
            "max": weights["roe"],
            "value": f"{_roe(stock_data) * 100:.1f}%",
            "details": "Net income / Stockholders equity",
        },
        {
            "name": "Debt-to-Equity",
            "score": _score_tiered_inverse(_debt_to_equity(stock_data), weights["debt_to_equity"],
                                             [(0.5, 1.0), (1.0, 0.8), (1.5, 0.6), (2.0, 0.4)]),
            "max": weights["debt_to_equity"],
            "value": f"{_debt_to_equity(stock_data):.2f}",
            "details": "Total debt / Stockholders equity",
        },
        {
            "name": "Interest Coverage",
            "score": _score_tiered(_interest_coverage(stock_data), weights["interest_coverage"],
                                     [(8, 1.0), (5, 0.8), (3, 0.6), (2, 0.4)]),
            "max": weights["interest_coverage"],
            "value": f"{_interest_coverage(stock_data):.1f}x",
            "details": "EBIT / Interest Expense",
        },
        {
            "name": "Revenue Growth",
            "score": _score_tiered(_revenue_cagr(stock_data), weights["revenue_growth"],
                                     [(0.10, 1.0), (0.07, 0.8), (0.05, 0.6), (0.03, 0.4), (0.0, 0.2)]),
            "max": weights["revenue_growth"],
            "value": f"{_revenue_cagr(stock_data) * 100:.1f}%",
            "details": "5yr Revenue CAGR",
        },
    ]

    total_score = sum(m["score"] for m in metrics)

    return {
        "total_score": round(total_score, 1),
        "grade": _get_grade(total_score),
        "sector": sector,
        "sector_label": _get_sector_label(sector),
        "metrics": metrics,
    }


def _score_tiered(value: float, max_points: float, tiers: list) -> float:
    """tiers = [(threshold, fraction_of_max), ...] sorted descending by threshold."""
    if max_points == 0:
        return 0
    for threshold, fraction in tiers:
        if value >= threshold:
            return round(max_points * fraction, 2)
    return 0


def _score_tiered_inverse(value: float, max_points: float, tiers: list) -> float:
    """For metrics where LOWER is better (e.g. debt-to-equity). tiers = [(threshold, fraction), ...] ascending."""
    if max_points == 0:
        return 0
    for threshold, fraction in tiers:
        if value <= threshold:
            return round(max_points * fraction, 2)
    return 0


def _get_grade(score: float) -> str:
    if score >= 90: return "A"
    if score >= 75: return "B"
    if score >= 60: return "C"
    if score >= 45: return "D"
    return "F"


def _get_sector_label(sector: str) -> str:
    profile = get_sector_profile(sector)
    for key, val in __import__("services.sector_profiles", fromlist=["SECTOR_PROFILES"]).SECTOR_PROFILES.items():
        if val is profile:
            return key
    return "Default"


# --- Metric calculations ---

def _net_income_series(stock_data):
    return stock_data.get("net_income", [])

def _revenue_series(stock_data):
    return stock_data.get("revenue", [])

def _fcf_series(stock_data):
    return stock_data.get("free_cash_flow", [])

def _eps_series(stock_data):
    return stock_data.get("eps", [])


def _cagr(series):
    if not series or len(series) < 2:
        return 0
    start, end = series[0], series[-1]
    years = len(series) - 1
    if start <= 0 or end <= 0:
        return 0
    return (end / start) ** (1 / years) - 1


def _revenue_cagr(stock_data):
    return _cagr(_revenue_series(stock_data))


def _fcf_cagr(stock_data):
    return _cagr(_fcf_series(stock_data))


def _net_margin(stock_data):
    revenue = _revenue_series(stock_data)
    net_income = _net_income_series(stock_data)
    if not revenue or not net_income or revenue[-1] == 0:
        return 0
    return net_income[-1] / revenue[-1]


def _roe(stock_data):
    net_income = _net_income_series(stock_data)
    equity = stock_data.get("stockholders_equity", [])
    if not net_income or not equity or equity[-1] == 0:
        return 0
    return net_income[-1] / equity[-1]


def _roic(stock_data):
    operating_income = stock_data.get("operating_income", [])
    debt = stock_data.get("total_debt", [])
    equity = stock_data.get("stockholders_equity", [])
    cash = stock_data.get("cash", [])

    if not operating_income or not equity:
        return 0

    latest_op_income = operating_income[-1]
    nopat = latest_op_income * (1 - 0.21)  # 21% tax rate

    latest_debt = debt[-1] if debt else 0
    latest_equity = equity[-1]
    latest_cash = cash[-1] if cash else 0

    invested_capital = latest_debt + latest_equity - latest_cash
    if invested_capital <= 0:
        invested_capital = latest_debt + latest_equity

    if invested_capital == 0:
        return 0

    return nopat / invested_capital


def _debt_to_equity(stock_data):
    debt = stock_data.get("total_debt", [])
    equity = stock_data.get("stockholders_equity", [])
    if not debt or not equity or equity[-1] == 0:
        return 0
    return debt[-1] / equity[-1]


def _interest_coverage(stock_data):
    ebit = stock_data.get("ebit", [])
    interest_expense = stock_data.get("interest_expense", [])
    if not ebit or not interest_expense or interest_expense[-1] == 0:
        return 10  # assume strong if no debt/interest
    return ebit[-1] / abs(interest_expense[-1])


def _earnings_consistency_pct(stock_data):
    eps = _eps_series(stock_data)
    if not eps or len(eps) < 2:
        return 0
    positive_growth_years = sum(
        1 for i in range(1, len(eps)) if eps[i] > eps[i - 1]
    )
    return positive_growth_years / (len(eps) - 1)
def calculate_scorecard_history(stock_data: dict) -> list:
    """
    Calculate the Buffett Scorecard score for each historical year available.
    Returns a list of {"year": ..., "score": ...} dicts, oldest to newest.
    """
    revenue = stock_data.get("revenue", [])
    years = stock_data.get("years", [])

    if not revenue or len(revenue) < 2:
        return []

    num_years = len(revenue)
    history = []

    for i in range(1, num_years + 1):
        sliced_data = {
            "sector": stock_data.get("sector", ""),
            "revenue": revenue[:i],
            "net_income": stock_data.get("net_income", [])[:i],
            "free_cash_flow": stock_data.get("free_cash_flow", [])[:i],
            "operating_income": stock_data.get("operating_income", [])[:i],
            "total_debt": stock_data.get("total_debt", [])[:i],
            "stockholders_equity": stock_data.get("stockholders_equity", [])[:i],
            "cash": stock_data.get("cash", [])[:i],
            "ebit": stock_data.get("ebit", [])[:i],
            "interest_expense": stock_data.get("interest_expense", [])[:i],
            "eps": stock_data.get("eps", [])[:i],
        }

        result = calculate_scorecard(sliced_data)
        year_label = years[i - 1] if i - 1 < len(years) else str(i)

        history.append({
            "year": year_label,
            "score": result["total_score"]
        })

    return history