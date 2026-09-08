from .sector_profiles import get_sector_profile
from . import sector_profiles
from .investor_sector_weights import get_investor_sector_weights, _normalize_sector

INVESTOR_PROFILES = {
    "buffett": {
        "label": "Warren Buffett",
        "term": "long",
        "philosophy": "Buy wonderful companies at fair prices and hold forever",
        "focus": "Business quality, moat, and intrinsic value",
        "weights": {
            "earnings_consistency": 1,
            "roic": 1,
            "fcf_growth": 1,
            "profit_margin": 1,
            "roe": 1,
            "debt_to_equity": 1,
            "interest_coverage": 1,
            "revenue_growth": 1,
        },
    },
    "munger": {
        "label": "Charlie Munger",
        "term": "long",
        "philosophy": "Exceptional businesses at fair prices — quality over everything",
        "focus": "High ROIC, wide moat, pricing power",
        "weights": {
            "roic": 25,
            "earnings_consistency": 20,
            "profit_margin": 18,
            "fcf_growth": 15,
            "roe": 10,
            "debt_to_equity": 7,
            "interest_coverage": 4,
            "revenue_growth": 1,
        },
    },
    "graham": {
        "label": "Benjamin Graham",
        "term": "long",
        "philosophy": "Deep value and balance sheet safety — buy with a large margin of safety",
        "focus": "Debt safety, earnings consistency, conservative valuation",
        "weights": {
            "debt_to_equity": 25,
            "earnings_consistency": 25,
            "interest_coverage": 20,
            "profit_margin": 10,
            "roe": 8,
            "revenue_growth": 5,
            "roic": 5,
            "fcf_growth": 2,
        },
    },
    "lynch": {
        "label": "Peter Lynch",
        "term": "short",
        "philosophy": "Find fast growers before Wall Street does — GARP investing",
        "focus": "Revenue acceleration, earnings growth, PEG ratio",
        "weights": {
            "revenue_growth": 25,
            "earnings_consistency": 20,
            "fcf_growth": 15,
            "profit_margin": 15,
            "roe": 10,
            "roic": 8,
            "debt_to_equity": 5,
            "interest_coverage": 2,
        },
    },
    "oneil": {
        "label": "William O'Neil",
        "term": "short",
        "philosophy": "Buy the strongest earnings growth leaders breaking out to new highs",
        "focus": "CAN SLIM — earnings acceleration, revenue momentum, market leadership",
        "weights": {
            "revenue_growth": 30,
            "earnings_consistency": 25,
            "fcf_growth": 20,
            "profit_margin": 15,
            "roe": 5,
            "roic": 3,
            "debt_to_equity": 1,
            "interest_coverage": 1,
        },
    },
    "soros": {
        "label": "George Soros",
        "term": "short",
        "philosophy": "Identify macro shifts early and ride reflexive momentum before the crowd",
        "focus": "Revenue momentum, FCF acceleration, macro trend alignment",
        "weights": {
            "revenue_growth": 35,
            "fcf_growth": 25,
            "profit_margin": 15,
            "earnings_consistency": 10,
            "roe": 8,
            "roic": 5,
            "debt_to_equity": 1,
            "interest_coverage": 1,
        },
    },
}

DEFAULT_THRESHOLDS = {
    "earnings_consistency": [(0.65, 1.0), (0.6, 0.8), (0.4, 0.6), (0.2, 0.4)],
    "roic": [(0.15, 1.0), (0.12, 0.8), (0.10, 0.6), (0.07, 0.4)],
    "fcf_growth": [(0.08, 1.0), (0.05, 0.8), (0.03, 0.6), (0.01, 0.4), (0.0, 0.2)],
    "profit_margin": [(0.20, 1.0), (0.15, 0.8), (0.10, 0.6), (0.05, 0.4)],
    "roe": [(0.20, 1.0), (0.15, 0.8), (0.12, 0.6), (0.08, 0.4)],
    "debt_to_equity": [(1.0, 1.0), (1.5, 0.8), (2.0, 0.6), (3.0, 0.4)],
    "interest_coverage": [(8, 1.0), (5, 0.8), (3, 0.6), (2, 0.4)],
    "revenue_growth": [(0.06, 1.0), (0.03, 0.8), (0.015, 0.6), (0.01, 0.4), (0.0, 0.2)],
}

INVESTOR_THRESHOLDS = {
    "lynch": {
        "revenue_growth": [(0.15, 1.0), (0.10, 0.8), (0.07, 0.6), (0.05, 0.4)],
    },
    "graham": {
        "debt_to_equity": [(0.5, 1.0), (1.0, 0.8), (1.5, 0.6), (2.0, 0.4)],
    },
    "oneil": {
        # CAN SLIM demands very high growth — bar is much higher
        "revenue_growth": [(0.25, 1.0), (0.15, 0.8), (0.10, 0.6), (0.05, 0.4)],
        "earnings_consistency": [(0.80, 1.0), (0.70, 0.8), (0.60, 0.6), (0.50, 0.4)],
        "fcf_growth": [(0.20, 1.0), (0.12, 0.8), (0.07, 0.6), (0.03, 0.4), (0.0, 0.2)],
    },
    "soros": {
        # Soros cares most about revenue momentum — bar is high
        "revenue_growth": [(0.20, 1.0), (0.12, 0.8), (0.08, 0.6), (0.04, 0.4)],
        "fcf_growth": [(0.15, 1.0), (0.10, 0.8), (0.05, 0.6), (0.02, 0.4), (0.0, 0.2)],
    },
}


def calculate_scorecard(stock_data: dict) -> dict:
    return calculate_scorecard_by_investor(stock_data, "buffett")


def calculate_scorecard_by_investor(stock_data: dict, investor: str = "buffett", horizon: str = "long") -> dict:
    investor_key = (investor or "buffett").lower()
    profile = INVESTOR_PROFILES.get(investor_key, INVESTOR_PROFILES["buffett"])
    investor_label = profile["label"]
    sector = stock_data.get("sector", "")

    if stock_data.get("quote_type") == "ETF":
        etf = stock_data.get("etf_data") or {}
        return {
            "investor": investor_key,
            "investor_label": investor_label,
            "horizon": horizon,
            "total_score": None,
            "grade": "ETF",
            "grade_explanation": "Exchange-Traded Funds (ETFs) represent diversified baskets of assets. Fundamental ratio scorecards apply to corporate balance sheets.",
            "sector": stock_data.get("sector") or "ETF / Fund",
            "sector_label": "ETF / Fund",
            "investor_sector_note": "Fundamental ratio scorecard skipped for ETF index asset.",
            "metrics": [],
            "is_etf": True,
            "etf_data": etf
        }

    # Use research-backed investor × sector weights
    weights = get_investor_sector_weights(investor_key, sector, horizon)
    canonical_sector = _normalize_sector(sector)
    has_specific_sector = bool(canonical_sector)
    thresholds = _get_thresholds_for_investor(investor_key)

    metrics = [
        {
            "name": "Earnings Consistency",
            "metric": "earnings_consistency",
            "value": _earnings_consistency_pct(stock_data),
            "score": _score_tiered(_earnings_consistency_pct(stock_data), weights["earnings_consistency"], thresholds["earnings_consistency"]),
            "max": weights["earnings_consistency"],
            "details": "% of years with positive EPS growth",
            "value_label": _format_pct(_earnings_consistency_pct(stock_data)),
        },
        {
            "name": "ROIC",
            "metric": "roic",
            "value": _roic(stock_data),
            "score": _score_tiered(_roic(stock_data), weights["roic"], thresholds["roic"]),
            "max": weights["roic"],
            "details": "NOPAT / Invested Capital",
            "value_label": _format_pct(_roic(stock_data)),
        },
        {
            "name": "FCF Growth",
            "metric": "fcf_growth",
            "value": _fcf_cagr(stock_data),
            "score": _score_tiered(_fcf_cagr(stock_data), weights["fcf_growth"], thresholds["fcf_growth"]),
            "max": weights["fcf_growth"],
            "details": "5yr Free Cash Flow CAGR",
            "value_label": _format_pct(_fcf_cagr(stock_data)),
        },
        {
            "name": "Profit Margin",
            "metric": "profit_margin",
            "value": _net_margin(stock_data),
            "score": _score_tiered(_net_margin(stock_data), weights["profit_margin"], thresholds["profit_margin"]),
            "max": weights["profit_margin"],
            "details": "Net income / Revenue",
            "value_label": _format_pct(_net_margin(stock_data)),
        },
        {
            "name": "ROE",
            "metric": "roe",
            "value": _roe(stock_data),
            "score": _score_tiered(_roe(stock_data), weights["roe"], thresholds["roe"]),
            "max": weights["roe"],
            "details": "Net income / Stockholders equity",
            "value_label": _format_pct(_roe(stock_data)),
        },
        {
            "name": "Debt-to-Equity",
            "metric": "debt_to_equity",
            "value": _debt_to_equity(stock_data),
            "score": _score_tiered_inverse(_debt_to_equity(stock_data), weights["debt_to_equity"], thresholds["debt_to_equity"]),
            "max": weights["debt_to_equity"],
            "details": "Total debt / Stockholders equity",
            "value_label": _format_ratio(_debt_to_equity(stock_data)),
        },
        {
            "name": "Interest Coverage",
            "metric": "interest_coverage",
            "value": _interest_coverage(stock_data),
            "score": _score_tiered(_interest_coverage(stock_data), weights["interest_coverage"], thresholds["interest_coverage"]),
            "max": weights["interest_coverage"],
            "details": "EBIT / Interest Expense",
            "value_label": _format_multiple(_interest_coverage(stock_data)),
        },
        {
            "name": "Revenue Growth",
            "metric": "revenue_growth",
            "value": _revenue_cagr(stock_data),
            "score": _score_tiered(_revenue_cagr(stock_data), weights["revenue_growth"], thresholds["revenue_growth"]),
            "max": weights["revenue_growth"],
            "details": "5yr Revenue CAGR",
            "value_label": _format_pct(_revenue_cagr(stock_data)),
        },
    ]

    total_points = 0
    available_max = 0
    for metric in metrics:
        if metric["score"] is not None:
            total_points += metric["score"]
            available_max += metric["max"]
        else:
            metric["score"] = None
            metric["value_label"] = "N/A"

    total_score = round(total_points * 100 / available_max, 1) if available_max else 0
    grade = _get_grade(total_score)
    print(f"[DEBUG] scorecard computed: investor={investor_key}, horizon={horizon}, total_score={total_score}, grade={grade}")

    return {
        "investor": investor_key,
        "investor_label": investor_label,
        "horizon": horizon,
        "total_score": total_score,
        "grade": grade,
        "grade_explanation": _get_grade_explanation(grade, investor_label),
        "sector": sector,
        "sector_label": _get_sector_label(sector),
        "investor_sector_note": (
            f"Weights calibrated to {investor_label}'s documented approach to {canonical_sector or 'this'} sector"
            if has_specific_sector
            else f"Using {investor_label}'s default weights (sector unrecognised)"
        ),
        "metrics": [{
            "name": metric["name"],
            "score": metric["score"],
            "max": metric["max"],
            "value": metric["value_label"],
            "details": metric["details"],
        } for metric in metrics],
    }


def _get_thresholds_for_investor(investor: str) -> dict:
    thresholds = DEFAULT_THRESHOLDS.copy()
    overrides = INVESTOR_THRESHOLDS.get(investor, {})
    thresholds.update(overrides)
    return thresholds


def _adjust_weights_for_horizon(weights: dict, horizon: str) -> dict:
    adjusted = weights.copy()
    if horizon == "short":
        adjusted["revenue_growth"] = adjusted.get("revenue_growth", 0) + 3
        adjusted["fcf_growth"] = adjusted.get("fcf_growth", 0) + 2
        adjusted["earnings_consistency"] = max(1, adjusted.get("earnings_consistency", 0) - 2)
        adjusted["roic"] = max(1, adjusted.get("roic", 0) - 2)
    return adjusted


def _combine_investor_and_sector_weights(investor_weights: dict, sector_weights: dict) -> dict:
    combined = {
        metric: investor_weights.get(metric, 0) * sector_weights.get(metric, 0)
        for metric in investor_weights
    }
    total = sum(combined.values())
    if total == 0:
        return sector_weights.copy()
    return {metric: round(value * 100.0 / total, 2) for metric, value in combined.items()}


def _get_grade_explanation(grade: str, investor_label: str) -> str:
    explanations = {
        "A": f"Exceptional business by {investor_label} standards",
        "B": f"Strong business by {investor_label} standards with minor weaknesses",
        "C": f"Decent business by {investor_label} standards but not a clear opportunity",
        "D": f"Weak business by {investor_label} standards — proceed with caution",
        "F": f"Fails {investor_label}'s core criteria — avoid",
    }
    return explanations.get(grade, "No grade explanation available")


def _score_tiered(value: float | None, max_points: float, tiers: list) -> float | None:
    """tiers = [(threshold, fraction_of_max), ...] sorted descending by threshold."""
    if max_points == 0 or value is None:
        return None
    for threshold, fraction in tiers:
        if value >= threshold:
            return round(max_points * fraction, 2)
    return 0.0


def _score_tiered_inverse(value: float | None, max_points: float, tiers: list) -> float | None:
    """For metrics where LOWER is better (e.g. debt-to-equity). tiers = [(threshold, fraction), ...] ascending."""
    if max_points == 0 or value is None:
        return None
    for threshold, fraction in tiers:
        if value <= threshold:
            return round(max_points * fraction, 2)
    return 0.0


def _get_grade(score: float) -> str:
    if score >= 90: return "A"
    if score >= 75: return "B"
    if score >= 60: return "C"
    if score >= 45: return "D"
    return "F"


def _last_valid(series: list[float | None]) -> float | None:
    if not series:
        return None
    for value in reversed(series):
        if value is not None:
            return value
    return None


def _format_pct(value: float | None) -> str:
    return "N/A" if value is None else f"{value * 100:.1f}%"


def _format_ratio(value: float | None) -> str:
    return "N/A" if value is None else f"{value:.2f}"


def _format_multiple(value: float | None) -> str:
    return "N/A" if value is None else f"{value:.1f}x"


def _get_sector_label(sector: str) -> str:
    profile = get_sector_profile(sector)
    for key, val in sector_profiles.SECTOR_PROFILES.items():
        if val is profile:
            return key
    return "Default"


# --- Metric calculations ---

def _financials(stock_data):
    return stock_data.get("financials", stock_data)


def _net_income_series(stock_data):
    data = _financials(stock_data)
    return data.get("net_income", [])


def _revenue_series(stock_data):
    data = _financials(stock_data)
    return data.get("revenue", [])


def _fcf_series(stock_data):
    data = _financials(stock_data)
    return data.get("free_cash_flow", [])


def _eps_series(stock_data):
    data = _financials(stock_data)
    return data.get("eps", [])


def _cagr(series):
    if not series:
        return None
    values = [value for value in series if value is not None]
    if len(values) < 2:
        return None
    start, end = values[0], values[-1]
    years = len(values) - 1
    if start <= 0 or end <= 0:
        return None
    return (end / start) ** (1 / years) - 1


def _revenue_cagr(stock_data):
    return _cagr(_revenue_series(stock_data))


def _fcf_cagr(stock_data):
    return _cagr(_fcf_series(stock_data))


def _net_margin(stock_data):
    revenue = _revenue_series(stock_data)
    net_income = _net_income_series(stock_data)
    latest_revenue = _last_valid(revenue)
    latest_net_income = _last_valid(net_income)
    if latest_revenue is None or latest_revenue == 0 or latest_net_income is None:
        return None
    return latest_net_income / latest_revenue


def _roe(stock_data):
    net_income = _net_income_series(stock_data)
    data = _financials(stock_data)
    equity = data.get("stockholders_equity", [])
    latest_net_income = _last_valid(net_income)
    latest_equity = _last_valid(equity)
    if latest_net_income is None or latest_equity is None or latest_equity == 0:
        return None
    return latest_net_income / latest_equity


def _roic(stock_data):
    data = _financials(stock_data)
    operating_income = data.get("operating_income", [])
    debt = data.get("total_debt", [])
    equity = data.get("stockholders_equity", [])
    cash = data.get("cash", [])

    latest_op_income = _last_valid(operating_income)
    latest_equity = _last_valid(equity)
    if latest_op_income is None or latest_equity is None:
        return None

    nopat = latest_op_income * (1 - 0.21)  # 21% tax rate
    latest_debt = _last_valid(debt) or 0
    latest_cash = _last_valid(cash) or 0

    invested_capital = latest_debt + latest_equity - latest_cash
    if invested_capital <= 0:
        invested_capital = latest_debt + latest_equity

    if invested_capital == 0:
        return None

    return nopat / invested_capital


def _debt_to_equity(stock_data):
    data = _financials(stock_data)
    debt = data.get("total_debt", [])
    equity = data.get("stockholders_equity", [])
    latest_debt = _last_valid(debt)
    latest_equity = _last_valid(equity)
    if latest_debt is None or latest_equity is None or latest_equity == 0:
        return None
    return latest_debt / latest_equity


def _interest_coverage(stock_data):
    data = _financials(stock_data)
    ebit = data.get("ebit", [])
    interest_expense = data.get("interest_expense", [])
    latest_ebit = _last_valid(ebit)
    latest_interest = _last_valid(interest_expense)
    if latest_ebit is None or latest_interest is None or latest_interest == 0:
        return None
    return latest_ebit / abs(latest_interest)


def _earnings_consistency_pct(stock_data):
    eps = [value for value in _eps_series(stock_data) if value is not None]
    if len(eps) < 2:
        return None
    positive_growth_years = sum(
        1 for i in range(1, len(eps)) if eps[i] > eps[i - 1]
    )
    return positive_growth_years / (len(eps) - 1)
def calculate_scorecard_history(stock_data: dict) -> list:
    """
    Calculate the Buffett Scorecard score for each historical year available.
    Returns a list of {"year": ..., "score": ...} dicts, oldest to newest.
    """
    data = _financials(stock_data)
    revenue = data.get("revenue", [])
    years = data.get("years", [])

    if not revenue or len(revenue) < 2:
        return []

    num_years = len(revenue)
    history = []

    for i in range(1, num_years + 1):
        sliced_data = {
            "sector": stock_data.get("sector", ""),
            "financials": {
                "years": years[:i],
                "revenue": revenue[:i],
                "net_income": data.get("net_income", [])[:i],
                "free_cash_flow": data.get("free_cash_flow", [])[:i],
                "operating_income": data.get("operating_income", [])[:i],
                "total_debt": data.get("total_debt", [])[:i],
                "stockholders_equity": data.get("stockholders_equity", [])[:i],
                "cash": data.get("cash", [])[:i],
                "ebit": data.get("ebit", [])[:i],
                "interest_expense": data.get("interest_expense", [])[:i],
                "eps": data.get("eps", [])[:i],
            },
        }

        result = calculate_scorecard(sliced_data)
        year_label = years[i - 1] if i - 1 < len(years) else str(i)

        history.append({
            "year": year_label,
            "score": result["total_score"]
        })

    return history