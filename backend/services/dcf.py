from services.sector_profiles import get_sector_profile


def calculate_dcf(stock_data: dict) -> dict:
    sector = stock_data.get("sector", "")
    profile = get_sector_profile(sector)
    model = profile["model"]

    if model == "earnings_based":
        return _earnings_based_valuation(stock_data, profile)
    elif model == "ddm":
        return _dividend_discount_model(stock_data, profile)
    elif model == "ffo":
        return _ffo_model(stock_data, profile)
    else:
        return _dcf_model(stock_data, profile)


def _dcf_model(stock_data: dict, profile: dict) -> dict:
    fcf = stock_data.get("free_cash_flow", [])
    shares = stock_data.get("shares_outstanding", 1)
    beta = stock_data.get("beta", 1.0)

    if not fcf or len(fcf) < 2:
        return {"error": "Insufficient FCF data"}

    latest_fcf = fcf[-1]
    growth_rate = min(_calculate_cagr(fcf), profile["growth_cap"])
    wacc = _calculate_wacc(beta) + profile["wacc_premium"]
    terminal_rate = profile["terminal_rate"]

    projected = []
    for year in range(1, 11):
        fcf_year = latest_fcf * ((1 + growth_rate) ** year)
        discounted = fcf_year / ((1 + wacc) ** year)
        projected.append({"year": year, "fcf": fcf_year, "discounted_fcf": discounted})

    fcf_year_11 = latest_fcf * ((1 + growth_rate) ** 11)
    terminal_value = fcf_year_11 / (wacc - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + wacc) ** 10)

    total_pv = sum(p["discounted_fcf"] for p in projected) + terminal_value_discounted
    intrinsic_value = total_pv / shares

    return {
        "valuation_model": "dcf",
        "model_label": "Discounted Cash Flow (DCF)",
        "model_explanation": f"Standard DCF used for {stock_data.get('sector', 'this sector')} — projects free cash flow over 10 years and discounts to present value.",
        "intrinsic_value": intrinsic_value,
        "wacc": wacc,
        "growth_rate": growth_rate,
        "terminal_value_discounted": terminal_value_discounted,
        "projected_fcf": projected,
    }


def _earnings_based_valuation(stock_data: dict, profile: dict) -> dict:
    net_income = stock_data.get("net_income", [])
    book_value = stock_data.get("stockholders_equity", [])
    shares = stock_data.get("shares_outstanding", 1)
    beta = stock_data.get("beta", 1.0)

    if not net_income or not book_value:
        return {"error": "Insufficient earnings data for financial valuation"}

    latest_earnings = net_income[-1]
    growth_rate = min(_calculate_cagr(net_income), profile["growth_cap"])
    discount_rate = _calculate_wacc(beta) + profile["wacc_premium"]
    terminal_rate = profile["terminal_rate"]

    projected = []
    for year in range(1, 11):
        earnings_year = latest_earnings * ((1 + growth_rate) ** year)
        discounted = earnings_year / ((1 + discount_rate) ** year)
        projected.append({"year": year, "fcf": earnings_year, "discounted_fcf": discounted})

    earnings_year_11 = latest_earnings * ((1 + growth_rate) ** 11)
    terminal_value = earnings_year_11 / (discount_rate - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + discount_rate) ** 10)

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
    }


def _dividend_discount_model(stock_data: dict, profile: dict) -> dict:
    dividends = stock_data.get("dividends", [])
    shares = stock_data.get("shares_outstanding", 1)
    beta = stock_data.get("beta", 1.0)

    if not dividends:
        return _dcf_model(stock_data, profile)

    latest_div = dividends[-1]
    growth_rate = min(_calculate_cagr(dividends), profile["growth_cap"])
    discount_rate = _calculate_wacc(beta) + profile["wacc_premium"]
    terminal_rate = profile["terminal_rate"]

    projected = []
    for year in range(1, 11):
        div_year = latest_div * ((1 + growth_rate) ** year)
        discounted = div_year / ((1 + discount_rate) ** year)
        projected.append({"year": year, "fcf": div_year, "discounted_fcf": discounted})

    div_year_11 = latest_div * ((1 + growth_rate) ** 11)
    terminal_value = div_year_11 / (discount_rate - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + discount_rate) ** 10)

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
    }


def _ffo_model(stock_data: dict, profile: dict) -> dict:
    net_income = stock_data.get("net_income", [])
    depreciation = stock_data.get("depreciation", [])
    shares = stock_data.get("shares_outstanding", 1)
    beta = stock_data.get("beta", 1.0)

    if not net_income or not depreciation:
        return _dcf_model(stock_data, profile)

    ffo_series = [ni + dep for ni, dep in zip(net_income, depreciation)]
    latest_ffo = ffo_series[-1]
    growth_rate = min(_calculate_cagr(ffo_series), profile["growth_cap"])
    discount_rate = _calculate_wacc(beta) + profile["wacc_premium"]
    terminal_rate = profile["terminal_rate"]

    projected = []
    for year in range(1, 11):
        ffo_year = latest_ffo * ((1 + growth_rate) ** year)
        discounted = ffo_year / ((1 + discount_rate) ** year)
        projected.append({"year": year, "fcf": ffo_year, "discounted_fcf": discounted})

    ffo_year_11 = latest_ffo * ((1 + growth_rate) ** 11)
    terminal_value = ffo_year_11 / (discount_rate - terminal_rate)
    terminal_value_discounted = terminal_value / ((1 + discount_rate) ** 10)

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
    risk_free_rate = 0.045
    market_premium = 0.055
    return risk_free_rate + beta * market_premium