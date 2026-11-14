from .sector_profiles import get_sector_profile


def _financials(stock_data: dict) -> dict:
    return stock_data.get("financials", {})


def _series(stock_data: dict, key: str) -> list:
    financials = _financials(stock_data)
    return financials.get(key) or stock_data.get(key) or []


def _last_valid(series: list) -> float | None:
    if not series:
        return None
    for value in reversed(series):
        if value is not None:
            return value
    return None


# Yahoo gives only 3-5 years of statements, so a negative trailing CAGR is usually one bad
# year rather than a business in decline. Don't project shrinkage for a decade.
GROWTH_FLOOR = 0.0
# Average this many recent years for the starting cash flow, so one-off swings don't set it.
BASE_YEARS = 3
# Bear/bull cases: growth this much lower/higher, discount rate this much higher/lower.
SCENARIO_GROWTH_SHIFT = 0.03
SCENARIO_RATE_SHIFT = 0.01
# Keep the discount rate at least this far above terminal growth, or the terminal value explodes.
MIN_RATE_SPREAD = 0.04


def _growth_input(series: list, cap: float) -> float:
    """Historical CAGR between the oldest and newest positive values, bounded to [GROWTH_FLOOR, cap]."""
    points = [(i, v) for i, v in enumerate(series or []) if v is not None and v > 0]
    if len(points) < 2 or points[-1][0] == points[0][0]:
        growth = 0.05
    else:
        (i0, start), (i1, end) = points[0], points[-1]
        growth = (end / start) ** (1 / (i1 - i0)) - 1
    return max(GROWTH_FLOOR, min(growth, cap))


# Per-share series are used only when at least this share of the reported years has a share count.
MIN_SHARE_COVERAGE = 0.6


def _resolve_shares(stock_data: dict) -> float | None:
    """Current share count, or the latest positive diluted count from the statements."""
    for candidate in (stock_data.get("shares_outstanding"), _last_positive(_financials(stock_data).get("shares"))):
        if isinstance(candidate, (int, float)) and candidate > 0 and candidate != float("inf"):
            return float(candidate)
    return None


def _last_positive(series: list | None) -> float | None:
    for value in reversed(series or []):
        if value is not None and value > 0:
            return value
    return None


def _per_share_series(series: list, stock_data: dict) -> list | None:
    """series[i] / diluted shares[i], or None when too few years have a share count.

    Growth measured on company totals credits existing holders with growth that came
    from issuing new shares, so growth and base are taken from this series instead.
    """
    shares = _financials(stock_data).get("shares") or []
    reported = [i for i, v in enumerate(series or []) if v is not None]
    if not reported:
        return None
    result = [None] * len(series)
    covered = 0
    for i in reported:
        if i < len(shares) and shares[i] is not None and shares[i] > 0:
            result[i] = series[i] / shares[i]
            covered += 1
    if covered < 2 or covered / len(reported) < MIN_SHARE_COVERAGE:
        return None
    return result


def _stream_inputs(series: list, stock_data: dict, shares: float, cap: float) -> tuple[float | None, float]:
    """(base as a company total, starting growth) for a cash-stream series.

    Uses the per-share series when available (base = per-share base x current shares).
    """
    per_share = _per_share_series(series, stock_data)
    if per_share is None:
        return _normalized_base(series), _growth_input(series, cap)
    base = _normalized_base(per_share)
    return (base * shares if base is not None else None), _growth_input(per_share, cap)


def _normalized_base(series: list) -> float | None:
    """Mean of the last BASE_YEARS reported values, or the latest value if any of them is not positive."""
    recent = [v for v in (series or []) if v is not None][-BASE_YEARS:]
    if not recent:
        return None
    if all(v > 0 for v in recent):
        return sum(recent) / len(recent)
    return recent[-1]


def _project(base: float, start_growth: float, years: int, discount_rate: float, terminal_rate: float) -> dict:
    """Project `base` forward with growth fading linearly from start_growth to terminal_rate.

    Year 1 grows at start_growth, the final year at terminal_rate. After that the
    stream grows at terminal_rate forever (Gordon growth), discounted back to today.
    """
    projected = []
    value = base
    for year in range(1, years + 1):
        fade = (year - 1) / (years - 1) if years > 1 else 1.0
        growth = start_growth + (terminal_rate - start_growth) * fade
        value *= 1 + growth
        discounted = value / ((1 + discount_rate) ** year)
        projected.append({"year": year, "fcf": value, "discounted_fcf": discounted, "growth": growth})

    terminal_value = value * (1 + terminal_rate) / (discount_rate - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + discount_rate) ** years)
    total_pv = sum(p["discounted_fcf"] for p in projected) + terminal_value_discounted
    return {"projected": projected, "terminal_value_discounted": terminal_value_discounted, "total_pv": total_pv}


# Starting-growth search range for the reverse DCF.
IMPLIED_GROWTH_RANGE = (-0.10, 0.60)


def _per_share(base: float, growth: float, years: int, rate: float, terminal_rate: float, shares: float) -> float:
    return _project(base, growth, years, rate, terminal_rate)["total_pv"] / shares


def _implied_growth(base: float, price: float | None, years: int, rate: float, terminal_rate: float, shares: float) -> tuple[float | None, str | None]:
    """Starting growth at which the base-case per-share value equals `price` (bisection).

    Returns (growth, bound). When no solution lies in the search range the nearest bound is
    returned with bound "above" or "below"; (None, None) only when there is no price.
    """
    if price is None or price <= 0:
        return None, None
    low, high = IMPLIED_GROWTH_RANGE
    if _per_share(base, low, years, rate, terminal_rate, shares) - price > 0:
        return low, "below"
    if _per_share(base, high, years, rate, terminal_rate, shares) - price < 0:
        return high, "above"
    for _ in range(80):
        mid = (low + high) / 2
        if _per_share(base, mid, years, rate, terminal_rate, shares) - price < 0:
            low = mid
        else:
            high = mid
    return (low + high) / 2, None


def _window(center: float, step: float, floor: float) -> tuple[list[float], int]:
    """Five ascending values spaced `step` apart starting at max(center - 2*step, floor).

    The window shifts up instead of clamping values, so there are no duplicates. The value
    nearest the center is replaced by the center itself and its index is returned.
    """
    start = max(center - 2 * step, floor)
    values = [start + step * k for k in range(5)]
    index = min(range(5), key=lambda k: abs(values[k] - center))
    values[index] = center
    return values, index


def _sensitivity(base: float, growth: float, years: int, rate: float, terminal_rate: float, shares: float) -> dict:
    """5x5 per-share values: rows are discount rates, columns are starting growth rates."""
    growth_rates, base_col = _window(growth, 0.02, 0.0)
    discount_rates, base_row = _window(rate, 0.01, terminal_rate + MIN_RATE_SPREAD)
    return {
        "growth_rates": growth_rates,
        "discount_rates": discount_rates,
        "base_row": base_row,
        "base_col": base_col,
        "values": [[_per_share(base, g, years, r, terminal_rate, shares) for g in growth_rates] for r in discount_rates],
    }


def _valuation(base: float, growth: float, cap: float, shares: float, horizon: str, beta: float, profile: dict, price: float | None = None) -> dict:
    """Base-case projection plus bear and bull cases, as per-share values."""
    years, discount_rate, terminal_rate = _get_valuation_params(horizon, beta, profile)

    def case(g_shift: float, r_shift: float) -> tuple[float, float, dict]:
        g = max(GROWTH_FLOOR, min(growth + g_shift, cap))
        r = max(discount_rate + r_shift, terminal_rate + MIN_RATE_SPREAD)
        return g, r, _project(base, g, years, r, terminal_rate)

    g, r, base_case = case(0.0, 0.0)
    scenarios = {}
    for name, g_shift, r_shift in (
        ("bear", -SCENARIO_GROWTH_SHIFT, SCENARIO_RATE_SHIFT),
        ("base", 0.0, 0.0),
        ("bull", SCENARIO_GROWTH_SHIFT, -SCENARIO_RATE_SHIFT),
    ):
        sg, sr, result = case(g_shift, r_shift)
        scenarios[name] = {"intrinsic_value": result["total_pv"] / shares, "growth_rate": sg, "discount_rate": sr}

    implied_growth, implied_bound = _implied_growth(base, price, years, r, terminal_rate, shares)
    return {
        "intrinsic_value": base_case["total_pv"] / shares,
        "discount_rate": r,
        "growth_rate": g,
        "terminal_rate": terminal_rate,
        "terminal_value_discounted": base_case["terminal_value_discounted"],
        "projected_fcf": base_case["projected"],
        "scenarios": scenarios,
        "horizon": horizon,
        "years": years,
        "shares": shares,
        "base_value": base,
        "growth_cap": cap,
        "implied_growth": implied_growth,
        "implied_growth_bound": implied_bound,
        "sensitivity": _sensitivity(base, g, years, r, terminal_rate, shares),
    }


def calculate_dcf(stock_data: dict, horizon: str = "long") -> dict:
    if stock_data.get("quote_type") == "ETF":
        return {
            "is_etf": True,
            "valuation_model": "etf",
            "model_label": "ETF Index Fund",
            "model_explanation": "DCF valuation is not applicable to ETFs as they represent diversified baskets of assets without individual corporate free cash flows.",
            "intrinsic_value": None,
            "error": "DCF valuation not applicable to ETFs"
        }
    if _resolve_shares(stock_data) is None:
        return {"error": "Share count unavailable"}
    sector = stock_data.get("sector", "")
    profile = get_sector_profile(sector)
    model = profile["model"]

    if model == "earnings_based":
        return _earnings_based_valuation(stock_data, profile, horizon)
    elif model == "ddm":
        return _dividend_discount_model(stock_data, profile, horizon)
    elif model == "ffo":
        return _ffo_model(stock_data, profile, horizon)
    else:
        return _dcf_model(stock_data, profile, horizon)


def _get_valuation_params(horizon: str, beta: float, profile: dict) -> tuple[int, float, float]:
    horizon_key = (horizon or "balanced").lower()
    if horizon_key == "short":
        years, discount_adjustment, terminal_rate = 5, 0.02, 0.015
    elif horizon_key == "balanced":
        years, discount_adjustment, terminal_rate = 7, 0.01, 0.0225
    else:
        years, discount_adjustment, terminal_rate = 10, 0.0, 0.03

    base_cost_of_equity = _calculate_cost_of_equity(beta) + profile.get("wacc_premium", 0.0)
    discount_rate = base_cost_of_equity + discount_adjustment
    return years, discount_rate, terminal_rate


def _run(stock_data: dict, profile: dict, horizon: str, series: list) -> dict | None:
    """Valuation of one cash-stream series, or None when it has no positive base."""
    shares = _resolve_shares(stock_data)
    cap = profile.get("growth_cap", 0.1)
    base, growth = _stream_inputs(series, stock_data, shares, cap)
    if base is None or base <= 0:
        return None
    return _valuation(base, growth, cap, shares, horizon, stock_data.get("beta", 1.0), profile, stock_data.get("current_price"))


def _dcf_model(stock_data: dict, profile: dict, horizon: str = "long") -> dict:
    fcf = _series(stock_data, "free_cash_flow")

    if not fcf or len(fcf) < 2 or _last_valid(fcf) is None:
        return {"error": "Insufficient FCF data"}

    valuation = _run(stock_data, profile, horizon, fcf)
    if valuation is None:
        return {"error": "Free cash flow is negative, so there is no cash stream to discount"}

    return {
        "valuation_model": "dcf",
        "model_label": "Discounted Cash Flow (DCF)",
        "model_explanation": f"{('Short-term' if horizon == 'short' else 'Long-term')} DCF projection for {stock_data.get('sector', 'this sector')}.",
        **valuation,
    }


def _earnings_based_valuation(stock_data: dict, profile: dict, horizon: str = "long") -> dict:
    net_income = _series(stock_data, "net_income")
    book_value = _series(stock_data, "stockholders_equity")

    if not net_income or not book_value or _last_valid(net_income) is None or _last_valid(book_value) is None:
        return {"error": "Insufficient earnings data for financial valuation"}

    valuation = _run(stock_data, profile, horizon, net_income)
    if valuation is None:
        return {"error": "Earnings are negative, so there is no earnings stream to discount"}

    return {
        "valuation_model": "earnings_based",
        "model_label": "Earnings-Based Valuation",
        "model_explanation": "Banks and financials are valued on earnings power and book value — FCF is not meaningful for leveraged financial institutions.",
        **valuation,
    }


def _dividend_discount_model(stock_data: dict, profile: dict, horizon: str = "long") -> dict:
    dividends = _series(stock_data, "dividends")

    if not dividends or _last_valid(dividends) is None:
        return _dcf_model(stock_data, profile, horizon)

    valuation = _run(stock_data, profile, horizon, dividends)
    if valuation is None:
        return _dcf_model(stock_data, profile, horizon)

    return {
        "valuation_model": "ddm",
        "model_label": "Dividend Discount Model (DDM)",
        "model_explanation": "Utilities with stable regulated dividends are best valued by discounting future dividend streams — more reliable than FCF for this sector.",
        **valuation,
    }


def _ffo_model(stock_data: dict, profile: dict, horizon: str = "long") -> dict:
    # FFO (net income + depreciation) is not cash a shareholder receives, so value the
    # dividends actually paid when there are any, and use FFO only as the fallback.
    dividends = _series(stock_data, "dividends")
    if dividends and _last_valid(dividends) is not None:
        valuation = _run(stock_data, profile, horizon, dividends)
        if valuation is not None:
            return {
                "valuation_model": "ffo",
                "model_label": "Funds From Operations (FFO) Model",
                "model_explanation": "REITs are valued on the cash they actually distribute, the dividend per share, because FFO (net income plus depreciation) is not all paid out and part of it is spent maintaining properties. FFO is used only when no dividend history is available.",
                **valuation,
            }

    net_income = _series(stock_data, "net_income")
    depreciation = _series(stock_data, "depreciation")

    if not net_income or not depreciation or _last_valid(net_income) is None or _last_valid(depreciation) is None:
        return _dcf_model(stock_data, profile, horizon)

    ffo_series = [ni + dep if ni is not None and dep is not None else None for ni, dep in zip(net_income, depreciation)]
    if not ffo_series or _last_valid(ffo_series) is None:
        return _dcf_model(stock_data, profile, horizon)

    valuation = _run(stock_data, profile, horizon, ffo_series)
    if valuation is None:
        return _dcf_model(stock_data, profile, horizon)

    return {
        "valuation_model": "ffo",
        "model_label": "Funds From Operations (FFO) Model",
        "model_explanation": "REITs are valued on FFO, which adds back depreciation to net income since real estate depreciation doesn't reflect true cash generation. Dividend history was not available, so the cash actually distributed could not be used.",
        **valuation,
    }


def _calculate_cost_of_equity(beta: float) -> float:
    risk_free_rate = 0.03
    market_premium = 0.05
    cost_of_equity = risk_free_rate + beta * market_premium
    return max(cost_of_equity, 0.07)