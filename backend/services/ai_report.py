import os
from typing import Optional


def _safe_div(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    """Safe division returning None if inputs are missing or denominator is zero."""
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


def _cagr(start_val: Optional[float], end_val: Optional[float], years: int) -> Optional[float]:
    """Compute CAGR. Both values must be positive."""
    if start_val is None or end_val is None or years <= 0:
        return None
    if start_val <= 0 or end_val <= 0:
        return None
    return (end_val / start_val) ** (1 / years) - 1


def generate_ai_report(
    stock_data: dict,
    scorecard: dict,
    dcf: dict,
    margin: dict,
    classification: str,
    api_key: str = None,
    model_name: str = "gemini-2.5-flash"
) -> dict:
    """Generate a Warren Buffett-style AI investment report using Google Gemini.

    The api_key is passed from the request header. Falls back to environment variable.
    Returns {"report": str, "error": None} on success, {"report": None, "error": str} on failure.
    """
    # Resolve API key
    resolved_key = api_key
    if not resolved_key:
        resolved_key = os.environ.get("GEMINI_API_KEY")
    if not resolved_key:
        return {"report": None, "error": "No Gemini API key configured. Add your key in Settings."}

    quote_type = stock_data.get("quote_type", "EQUITY")
    
    if quote_type == "ETF":
        etf_data = stock_data.get("etf_data") or {}
        expense_ratio = etf_data.get("expense_ratio")
        yield_val = etf_data.get("yield")
        er_str = f"{expense_ratio * 100:.2f}%" if expense_ratio is not None else "N/A"
        yield_str = f"{yield_val * 100:.2f}%" if yield_val is not None else "N/A"
        assets = etf_data.get("total_assets")
        assets_str = f"${assets / 1_000_000_000:.1f}B" if assets is not None else "N/A"
        
        prompt = f"""You are Warren Buffett analyzing a potential ETF investment. Write exactly 3 paragraphs — no headers, no bullet points, plain prose only.
Paragraph 1 — Fund Strategy: Assess the fund's strategy, category, and what it represents for a long-term investor.
Paragraph 2 — Fee Efficiency: Evaluate the expense ratio and asset size. Emphasize the importance of low fees and liquidity in compounding wealth.
Paragraph 3 — Verdict: Give your final verdict on whether this ETF is a sensible choice for a patient, long-term investor.
Speak in first person as Warren Buffett. Be direct, opinionated, and reference specific figures. Do not hedge excessively.
Fund: {stock_data.get('company_name', 'Unknown')} ({stock_data.get('ticker', 'N/A')}) — {etf_data.get('category', 'Unknown')}
Scorecard: {scorecard.get('total_score', 0)}/100 ({scorecard.get('grade', 'N/A')})
Key metrics: Expense Ratio {er_str}, Yield {yield_str}, Assets {assets_str}
Current price: ${stock_data.get('current_price', 0):.2f}"""
    else:
        # Compute derived metrics for the prompt
        fin = stock_data.get("financials", {})
        revenue = fin.get("revenue", [])
        net_income = fin.get("net_income", [])
        equity = fin.get("stockholders_equity", [])
        total_debt = fin.get("total_debt", [])
        free_cash_flow = fin.get("free_cash_flow", [])

        # Revenue CAGR
        rev_first = None
        rev_first_idx = -1
        rev_last = None
        rev_last_idx = -1
        for i, v in enumerate(revenue):
            if v is not None and v > 0:
                if rev_first is None:
                    rev_first = v
                    rev_first_idx = i
                rev_last = v
                rev_last_idx = i
        rev_years = rev_last_idx - rev_first_idx
        rev_cagr = _cagr(rev_first, rev_last, rev_years)
        rev_growth_str = f"{rev_cagr * 100:.1f}" if rev_cagr is not None else "N/A"

        # FCF CAGR
        fcf_first = None
        fcf_first_idx = -1
        fcf_last = None
        fcf_last_idx = -1
        for i, v in enumerate(free_cash_flow):
            if v is not None and v > 0:
                if fcf_first is None:
                    fcf_first = v
                    fcf_first_idx = i
                fcf_last = v
                fcf_last_idx = i
        fcf_years = fcf_last_idx - fcf_first_idx
        fcf_cagr = _cagr(fcf_first, fcf_last, fcf_years)
        fcf_growth_str = f"{fcf_cagr * 100:.1f}" if fcf_cagr is not None else "N/A"

        # Net margin (latest)
        latest_revenue = revenue[-1] if revenue else None
        latest_net_income = net_income[-1] if net_income else None
        net_margin_val = _safe_div(latest_net_income, latest_revenue)
        net_margin_str = f"{net_margin_val * 100:.1f}" if net_margin_val is not None else "N/A"

        # ROE (latest)
        latest_equity = equity[-1] if equity else None
        roe_val = _safe_div(latest_net_income, latest_equity)
        roe_str = f"{roe_val * 100:.1f}" if roe_val is not None else "N/A"

        # ROIC (latest)
        operating_income = fin.get("operating_income", [])
        total_assets = fin.get("total_assets", [])
        cash = fin.get("cash", [])
        latest_op_income = operating_income[-1] if operating_income else None
        latest_cash = cash[-1] if cash else None
        latest_debt = total_debt[-1] if total_debt else None
        nopat = latest_op_income * (1 - 0.21) if latest_op_income is not None else None
        invested_capital = None
        if latest_debt is not None and latest_equity is not None and latest_cash is not None:
            invested_capital = latest_debt + latest_equity - latest_cash
        elif latest_debt is not None and latest_equity is not None:
            invested_capital = latest_debt + latest_equity
        roic = _safe_div(nopat, invested_capital)
        roic_str = f"{roic * 100:.1f}" if roic is not None else "N/A"

        # Debt-to-equity (latest)
        de_val = _safe_div(latest_debt, latest_equity)
        de_str = f"{de_val:.2f}" if de_val is not None else "N/A"
        
        # Earnings consistency
        valid_pairs = 0
        growth_count = 0
        for i in range(1, len(net_income)):
            prev = net_income[i - 1]
            curr = net_income[i]
            if prev is not None and curr is not None:
                valid_pairs += 1
                if curr > prev:
                    growth_count += 1
        consistency = (growth_count / valid_pairs * 100) if valid_pairs > 0 else 0
        consistency_str = f"{consistency:.0f}"
        
        safe_margin = margin or {}
        safe_dcf = dcf or {}
        business_description = stock_data.get("business_description", "N/A")

        prompt = f"""You are Warren Buffett writing an investment memo. Write exactly 3 paragraphs — no headers, no bullet points, plain prose only.
Paragraph 1 — Business Quality & Moat: Describe what this company actually does, whether the business is simple enough to understand, and whether it has a durable competitive advantage. Consider pricing power, brand strength, switching costs, network effects, and whether this business will likely be stronger or weaker in 10 years. Do not just restate the metrics — think like a business owner.
Paragraph 2 — Financial Strength & Earnings Quality: Assess the profitability, free cash flow generation, return on invested capital, and debt levels. Comment on whether the earnings are consistent and trustworthy or lumpy and unreliable. Reference specific numbers. Flag anything that looks unusual or unsustainable.
Paragraph 3 — Valuation Verdict & Long-Term Conviction: State clearly whether you would buy this business today, and why. Reference the margin of safety. Consider whether the intrinsic value estimate is reliable given the earnings quality. End with a one-sentence conviction statement — would you hold this for 10 years or pass entirely?
Speak in first person as Warren Buffett. Be direct and opinionated. Reference specific financial figures. Do not hedge excessively. Think like a business owner evaluating whether to buy the whole company, not a trader looking at a chart.
Company: {stock_data.get('company_name', 'Unknown')} ({stock_data.get('ticker', 'N/A')}) — {stock_data.get('sector', 'Unknown')} — {stock_data.get('industry', 'Unknown')}
What the company does: {business_description}
Scorecard: {scorecard.get('total_score', 0)}/100 ({scorecard.get('grade', 'N/A')})
Key metrics: Revenue growth {rev_growth_str}%, FCF growth {fcf_growth_str}%, Net margin {net_margin_str}%, ROE {roe_str}%, ROIC {roic_str}%, Debt/Equity {de_str}, Earnings consistency {consistency_str}%
Intrinsic value: ${safe_dcf.get('intrinsic_value', 0):.2f} | Current price: ${stock_data.get('current_price', 0):.2f} | Margin of safety: {safe_margin.get('margin_pct', 0):.1f}%
Risk flags: {stock_data.get('risk_flags', 'N/A')}
Classification: {classification}"""

    try:
        import google.generativeai as genai

        genai.configure(api_key=resolved_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        return {"report": response.text, "error": None}
    except Exception as e:
        error_msg = str(e)
        fallback_model = "gemini-2.5-flash"
        if model_name != fallback_model and ("not found" in error_msg.lower() or "not supported for generatecontent" in error_msg.lower()):
            try:
                model = genai.GenerativeModel(fallback_model)
                response = model.generate_content(prompt)
                return {
                    "report": response.text,
                    "error": None,
                    "warning": f"Model {model_name} was unavailable, using {fallback_model} instead."
                }
            except Exception as fallback_error:
                fallback_msg = str(fallback_error)
                if "api_key" in fallback_msg.lower() or "401" in fallback_msg or "403" in fallback_msg:
                    return {"report": None, "error": "Invalid Gemini API key. Please check your key in Settings."}
                return {"report": None, "error": f"Failed to generate AI report with fallback model: {fallback_msg}"}

        if "api_key" in error_msg.lower() or "401" in error_msg or "403" in error_msg:
            return {"report": None, "error": "Invalid Gemini API key. Please check your key in Settings."}
        return {"report": None, "error": f"Failed to generate AI report: {error_msg}"}
