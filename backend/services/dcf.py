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


def calculate_dcf(stock_data: dict, horizon: str = "long") -> dict:
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
    years = 5 if horizon == "short" else 10
    base_wacc = _calculate_wacc(beta) + profile.get("wacc_premium", 0.0)
    wacc = base_wacc + (0.02 if horizon == "short" else 0.0)
    terminal_rate = 0.015 if horizon == "short" else 0.03
    return years, wacc, terminal_rate


def _dcf_model(stock_data: dict, profile: dict, horizon: str = "long") -> dict:
    fcf = _series(stock_data, "free_cash_flow")
    shares = stock_data.get("shares_outstanding", 1)
    beta = stock_data.get("beta", 1.0)

    if not fcf or len(fcf) < 2 or _last_valid(fcf) is None:
        return {"error": "Insufficient FCF data"}

    latest_fcf = _last_valid(fcf)
    growth_rate = min(_calculate_cagr(fcf), profile.get("growth_cap", 0.1))
    years, wacc, terminal_rate = _get_valuation_params(horizon, beta, profile)

    projected = []
    for year in range(1, years + 1):
        fcf_year = latest_fcf * ((1 + growth_rate) ** year)
        discounted = fcf_year / ((1 + wacc) ** year)
        projected.append({"year": year, "fcf": fcf_year, "discounted_fcf": discounted})

    terminal_base = latest_fcf * ((1 + growth_rate) ** (years + 1))
    terminal_value = terminal_base / (wacc - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + wacc) ** years)

    total_pv = sum(p["discounted_fcf"] for p in projected) + terminal_value_discounted
    intrinsic_value = total_pv / shares

    return {
        "valuation_model": "dcf",
        "model_label": "Discounted Cash Flow (DCF)",
        "model_explanation": f"{('Short-term' if horizon == 'short' else 'Long-term')} DCF projection for {stock_data.get('sector', 'this sector')}.",
        "intrinsic_value": intrinsic_value,
        "wacc": wacc,
        "growth_rate": growth_rate,
        "terminal_rate": terminal_rate,
        "terminal_value_discounted": terminal_value_discounted,
        "projected_fcf": projected,
        "horizon": horizon,
    }


def _earnings_based_valuation(stock_data: dict, profile: dict, horizon: str = "long") -> dict:
    net_income = _series(stock_data, "net_income")
    book_value = _series(stock_data, "stockholders_equity")
    shares = stock_data.get("shares_outstanding", 1)
    beta = stock_data.get("beta", 1.0)

    if not net_income or not book_value or _last_valid(net_income) is None or _last_valid(book_value) is None:
        return {"error": "Insufficient earnings data for financial valuation"}

    latest_earnings = _last_valid(net_income)
    growth_rate = min(_calculate_cagr(net_income), profile.get("growth_cap", 0.1))
    years, discount_rate, terminal_rate = _get_valuation_params(horizon, beta, profile)

    projected = []
    for year in range(1, years + 1):
        earnings_year = latest_earnings * ((1 + growth_rate) ** year)
        discounted = earnings_year / ((1 + discount_rate) ** year)
        projected.append({"year": year, "fcf": earnings_year, "discounted_fcf": discounted})

    terminal_base = latest_earnings * ((1 + growth_rate) ** (years + 1))
    terminal_value = terminal_base / (discount_rate - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + discount_rate) ** years)

    total_pv = sum(p["discounted_fcf"] for p in projected) + terminal_value_discounted
    intrinsic_value = total_pv / shares

    return {
        "valuation_model": "earnings_based",
        "model_label": "Earnings-Based Valuation",
        "model_explanation": "Banks and financials are valued on earnings power and book value — FCF is not meaningful for leveraged financial institutions.",
        "intrinsic_value": intrinsic_value,
        "wacc": discount_rate,
        "growth_rate": growth_rate,
        "terminal_value_discounted": terminal_value_discounted,
        "projected_fcf": projected,
        "horizon": horizon,
    }


def _dividend_discount_model(stock_data: dict, profile: dict, horizon: str = "long") -> dict:
    dividends = _series(stock_data, "dividends")
    shares = stock_data.get("shares_outstanding", 1)
    beta = stock_data.get("beta", 1.0)

    if not dividends or _last_valid(dividends) is None:
        return _dcf_model(stock_data, profile, horizon)

    latest_div = _last_valid(dividends)
    growth_rate = min(_calculate_cagr(dividends), profile.get("growth_cap", 0.1))
    years, discount_rate, terminal_rate = _get_valuation_params(horizon, beta, profile)

    projected = []
    for year in range(1, years + 1):
        div_year = latest_div * ((1 + growth_rate) ** year)
        discounted = div_year / ((1 + discount_rate) ** year)
        projected.append({"year": year, "fcf": div_year, "discounted_fcf": discounted})

    terminal_base = latest_div * ((1 + growth_rate) ** (years + 1))
    terminal_value = terminal_base / (discount_rate - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + discount_rate) ** years)

    total_pv = sum(p["discounted_fcf"] for p in projected) + terminal_value_discounted
    intrinsic_value = total_pv / shares

    return {
        "valuation_model": "ddm",
        "model_label": "Dividend Discount Model (DDM)",
        "model_explanation": "Utilities with stable regulated dividends are best valued by discounting future dividend streams — more reliable than FCF for this sector.",
        "intrinsic_value": intrinsic_value,
        "wacc": discount_rate,
        "growth_rate": growth_rate,
        "terminal_value_discounted": terminal_value_discounted,
        "projected_fcf": projected,
        "horizon": horizon,
    }


def _ffo_model(stock_data: dict, profile: dict, horizon: str = "long") -> dict:
    net_income = _series(stock_data, "net_income")
    depreciation = _series(stock_data, "depreciation")
    shares = stock_data.get("shares_outstanding", 1)
    beta = stock_data.get("beta", 1.0)

    if not net_income or not depreciation or _last_valid(net_income) is None or _last_valid(depreciation) is None:
        return _dcf_model(stock_data, profile, horizon)

    ffo_series = [ni + dep for ni, dep in zip(net_income, depreciation)]
    if not ffo_series or _last_valid(ffo_series) is None:
        return _dcf_model(stock_data, profile, horizon)

    latest_ffo = _last_valid(ffo_series)
    growth_rate = min(_calculate_cagr(ffo_series), profile.get("growth_cap", 0.1))
    years, discount_rate, terminal_rate = _get_valuation_params(horizon, beta, profile)

    projected = []
    for year in range(1, years + 1):
        ffo_year = latest_ffo * ((1 + growth_rate) ** year)
        discounted = ffo_year / ((1 + discount_rate) ** year)
        projected.append({"year": year, "fcf": ffo_year, "discounted_fcf": discounted})

    terminal_base = latest_ffo * ((1 + growth_rate) ** (years + 1))
    terminal_value = terminal_base / (discount_rate - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + discount_rate) ** years)

    total_pv = sum(p["discounted_fcf"] for p in projected) + terminal_value_discounted
    intrinsic_value = total_pv / shares

    return {
        "valuation_model": "ffo",
        "model_label": "Funds From Operations (FFO) Model",
        "model_explanation": "REITs are valued on FFO — adds back depreciation to net income since real estate depreciation doesn't reflect true cash generation.",
        "intrinsic_value": intrinsic_value,
        "wacc": discount_rate,
        "growth_rate": growth_rate,
        "terminal_value_discounted": terminal_value_discounted,
        "projected_fcf": projected,
        "horizon": horizon,
    }


def _calculate_cagr(series: list) -> float:
    if not series or len(series) < 2:
        return 0.05
    try:
        start, end = series[0], series[-1]
        years = len(series) - 1
        if start <= 0 or end <= 0:
            return 0.05
        return (end / start) ** (1 / years) - 1
    except Exception:
        return 0.05


def _calculate_wacc(beta: float) -> float:
    risk_free_rate = 0.03
    market_premium = 0.05
    wacc = risk_free_rate + beta * market_premium
    return max(wacc, 0.07)