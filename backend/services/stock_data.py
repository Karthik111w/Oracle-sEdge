import datetime as dt
import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional

from .cache import cached

STOCK_TTL = 15 * 60
FAILED_TTL = 60
HISTORY_TTL = 15 * 60
SEARCH_TTL = 60 * 60
HISTORY_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"}
WEEKLY_PERIODS = {"5y", "10y", "max"}


def safe_get(df: pd.DataFrame, labels: list[str]) -> Optional[pd.Series]:
    """Try multiple label variants to find a row in a yFinance financial statement DataFrame.

    yFinance index labels may be CamelCase ('TotalRevenue') or spaced ('Total Revenue').
    This helper tries each variant and returns the first match, or None if not found.
    """
    if df is None or df.empty:
        return None
    for label in labels:
        if label in df.index:
            return df.loc[label]
    return None


def _to_float(val) -> Optional[float]:
    """Convert a value to a plain Python float, returning None for NaN/missing."""
    if val is None:
        return None
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


def _series_to_list(series: Optional[pd.Series], years_count: int) -> list[Optional[float]]:
    """Convert a pandas Series to a list of floats aligned with the years, handling missing data."""
    if series is None:
        return [None] * years_count
    values = []
    for val in series:
        values.append(_to_float(val))
    # Pad if needed
    while len(values) < years_count:
        values.append(None)
    return values[:years_count]


def _profile_from_search(ticker: str) -> dict:
    """Name, sector and industry from Yahoo's search endpoint.

    Ticker.info (quoteSummary) is often throttled or returned partially on cloud hosts,
    which used to leave the sector as "Unknown" and silently switch the scorecard to
    default weights. Search is a separate, lighter endpoint that usually still answers.
    """
    try:
        for quote in yf.Search(ticker, max_results=5, news_count=0).quotes:
            if str(quote.get("symbol", "")).upper() == ticker:
                return {
                    "sector": quote.get("sectorDisp") or quote.get("sector"),
                    "industry": quote.get("industryDisp") or quote.get("industry"),
                    "shortName": quote.get("shortname") or quote.get("longname"),
                    "quoteType": quote.get("quoteType"),
                }
    except Exception:
        pass
    return {}


def _normalize_ticker(ticker) -> str:
    return str(ticker or "").strip().upper().replace(".", "-")


def _abs_list(values: list) -> list:
    return [abs(v) if v is not None else None for v in values]


MAX_PLAUSIBLE_YIELD = 0.25


def _dividend_yield_fraction(info: dict, price: Optional[float] = None) -> Optional[float]:
    """Dividend yield as a fraction, or None when it cannot be determined or looks wrong.

    Prefers dividendRate / price. The dividendYield field is a percent in current yfinance
    but was a fraction in older versions, so it is only used as a last resort (as a percent).
    """
    rate = _to_float(info.get("dividendRate"))
    price = price if price and price > 0 else _to_float(info.get("currentPrice") or info.get("regularMarketPrice"))
    candidate = None
    if rate is not None and rate >= 0 and price and price > 0:
        candidate = rate / price
    if candidate is None:
        candidate = _to_float(info.get("trailingAnnualDividendYield"))
    if candidate is None:
        percent = _to_float(info.get("dividendYield"))
        candidate = percent / 100 if percent is not None else None
    if candidate is None or candidate < 0 or candidate > MAX_PLAUSIBLE_YIELD:
        return None
    return candidate


def _next_earnings_date(t) -> Optional[str]:
    try:
        cal = t.calendar
        dates = cal.get("Earnings Date") if isinstance(cal, dict) else None
        today = dt.date.today()
        upcoming = sorted(d for d in (dates or []) if isinstance(d, dt.date) and d >= today)
        return upcoming[0].isoformat() if upcoming else None
    except Exception:
        return None


def _build_stats(info: dict, t, price: Optional[float] = None) -> dict:
    return {
        "pe_trailing": _to_float(info.get("trailingPE")),
        "pe_forward": _to_float(info.get("forwardPE")),
        "peg": _to_float(info.get("trailingPegRatio") if info.get("trailingPegRatio") is not None else info.get("pegRatio")),
        "price_to_book": _to_float(info.get("priceToBook")),
        "price_to_sales": _to_float(info.get("priceToSalesTrailing12Months")),
        "ev_to_ebitda": _to_float(info.get("enterpriseToEbitda")),
        "eps_trailing": _to_float(info.get("trailingEps")),
        "eps_forward": _to_float(info.get("forwardEps")),
        "dividend_yield": _dividend_yield_fraction(info, price),
        "payout_ratio": _to_float(info.get("payoutRatio")),
        "fifty_two_week_low": _to_float(info.get("fiftyTwoWeekLow")),
        "fifty_two_week_high": _to_float(info.get("fiftyTwoWeekHigh")),
        "average_volume": _to_float(info.get("averageVolume")),
        "analyst_target_mean": _to_float(info.get("targetMeanPrice")),
        "analyst_target_low": _to_float(info.get("targetLowPrice")),
        "analyst_target_high": _to_float(info.get("targetHighPrice")),
        "analyst_count": _to_float(info.get("numberOfAnalystOpinions")),
        "recommendation": info.get("recommendationKey") if isinstance(info.get("recommendationKey"), str) else None,
        "next_earnings_date": _next_earnings_date(t),
    }


def get_stock_data(ticker: str) -> Optional[dict]:
    """Fetch and normalize all financial data for a ticker into a clean dict structure.

    Returns None if the ticker is invalid or no data is available. Results are cached for 15 minutes
    (failures for 60 seconds).
    """
    ticker = _normalize_ticker(ticker)
    if not ticker:
        return None
    return cached(
        ("stock", ticker),
        lambda value: STOCK_TTL if value is not None else FAILED_TTL,
        lambda: _fetch_stock_data(ticker),
    )


def _fetch_stock_data(ticker: str) -> Optional[dict]:
    try:
        t = yf.Ticker(ticker)

        # Fetch financial statements
        income_stmt = t.income_stmt
        balance_sheet = t.balance_sheet
        cashflow = t.cashflow
        try:
            info = t.info or {}
        except Exception:
            info = {}
        if not info.get("sector") or not (info.get("shortName") or info.get("longName")):
            fallback = _profile_from_search(ticker)
            info = {**{k: v for k, v in fallback.items() if v}, **{k: v for k, v in info.items() if v}}
        fast = t.fast_info

        # Extract years from income statement columns if available (most recent first in yFinance)
        years_columns = []
        if income_stmt is not None and not income_stmt.empty:
            years_columns = list(income_stmt.columns)

        years_count = len(years_columns)
        year_strings = [str(col.year) if hasattr(col, "year") else str(col) for col in years_columns]

        # --- Extract rows from financial statements ---
        revenue_series = safe_get(income_stmt, ["TotalRevenue", "Total Revenue"])
        net_income_series = safe_get(income_stmt, ["NetIncome", "Net Income"])
        ebit_series = safe_get(income_stmt, ["EBIT", "Ebit"])
        operating_income_series = safe_get(income_stmt, ["OperatingIncome", "Operating Income"])
        interest_expense_series = safe_get(income_stmt, ["InterestExpense", "Interest Expense"])
        eps_series = safe_get(income_stmt, ["DilutedEPS", "Diluted EPS", "BasicEPS", "Basic EPS", "EPS"])

        total_debt_series = safe_get(balance_sheet, ["TotalDebt", "Total Debt"])
        equity_series = safe_get(balance_sheet, [
            "StockholdersEquity", "Stockholders Equity",
            "Total Stockholder Equity", "TotalStockholderEquity",
            "CommonStockEquity", "Common Stock Equity",
        ])
        total_assets_series = safe_get(balance_sheet, ["TotalAssets", "Total Assets"])
        cash_series = safe_get(balance_sheet, [
            "CashAndCashEquivalents", "Cash And Cash Equivalents",
            "CashCashEquivalentsAndShortTermInvestments",
            "Cash Cash Equivalents And Short Term Investments",
        ])

        fcf_series = safe_get(cashflow, ["FreeCashFlow", "Free Cash Flow"])
        ocf_series = safe_get(cashflow, ["OperatingCashFlow", "Operating Cash Flow"])
        capex_series = safe_get(cashflow, ["CapitalExpenditure", "Capital Expenditure"])
        depreciation_series = safe_get(cashflow, [
            "DepreciationAndAmortization", "Depreciation And Amortization",
            "DepreciationAmortizationDepletion", "Depreciation Amortization Depletion",
            "Depreciation", "DepreciationDepletionAndAmortization",
        ])
        dividends_series = safe_get(cashflow, [
            "CashDividendsPaid", "Cash Dividends Paid",
            "CommonStockDividendPaid", "Common Stock Dividend Paid",
        ])
        gross_profit_series = safe_get(income_stmt, ["GrossProfit", "Gross Profit"])
        shares_series = safe_get(income_stmt, [
            "DilutedAverageShares", "Diluted Average Shares",
            "BasicAverageShares", "Basic Average Shares",
        ])

        # --- Build value lists (yFinance order: most recent first) ---
        revenue = _series_to_list(revenue_series, years_count)
        net_income = _series_to_list(net_income_series, years_count)
        ebit = _series_to_list(ebit_series, years_count)
        operating_income = _series_to_list(operating_income_series, years_count)
        interest_expense = _series_to_list(interest_expense_series, years_count)
        eps = _series_to_list(eps_series, years_count)
        total_debt = _series_to_list(total_debt_series, years_count)
        stockholders_equity = _series_to_list(equity_series, years_count)
        total_assets = _series_to_list(total_assets_series, years_count)
        cash = _series_to_list(cash_series, years_count)
        free_cash_flow = _series_to_list(fcf_series, years_count)
        operating_cash_flow = _series_to_list(ocf_series, years_count)
        capital_expenditure = _series_to_list(capex_series, years_count)
        gross_profit = _series_to_list(gross_profit_series, years_count)
        depreciation = _abs_list(_series_to_list(depreciation_series, years_count))
        dividends_paid = _abs_list(_series_to_list(dividends_series, years_count))
        shares = _series_to_list(shares_series, years_count)

        # --- Reverse all to chronological order (oldest first) ---
        year_strings.reverse()
        revenue.reverse()
        net_income.reverse()
        ebit.reverse()
        operating_income.reverse()
        interest_expense.reverse()
        total_debt.reverse()
        stockholders_equity.reverse()
        total_assets.reverse()
        cash.reverse()
        free_cash_flow.reverse()
        operating_cash_flow.reverse()
        capital_expenditure.reverse()
        eps.reverse()
        gross_profit.reverse()
        depreciation.reverse()
        dividends_paid.reverse()
        shares.reverse()

        # --- Extract scalar info ---
        current_price = _to_float(getattr(fast, "last_price", None))
        previous_close = _to_float(getattr(fast, "previous_close", None))
        daily_change_pct = None
        if current_price and previous_close and previous_close > 0:
            daily_change_pct = (current_price - previous_close) / previous_close * 100
        elif info.get("regularMarketChangePercent"):
            daily_change_pct = _to_float(info.get("regularMarketChangePercent"))
        
        market_cap = _to_float(getattr(fast, "market_cap", None))
        shares_outstanding = _to_float(getattr(fast, "shares", None))
        beta = _to_float(info.get("beta"))
        sector = info.get("sector") or "Unknown"
        industry = info.get("industry") or "Unknown"
        company_name = info.get("shortName") or info.get("longName") or info.get("companyName") or ticker.upper()
        quote_type = info.get("quoteType", "EQUITY")

        # ETF specific fields
        etf_yield = _to_float(info.get("yield"))
        expense_ratio = _to_float(info.get("expenseRatio"))
        nav_price = _to_float(info.get("navPrice"))
        category = info.get("category")
        ytd_return = _to_float(info.get("ytdReturn"))
        five_year_return = _to_float(info.get("fiveYearAverageReturn"))
        etf_total_assets = _to_float(info.get("totalAssets"))

        summary = info.get("longBusinessSummary")
        summary = summary if isinstance(summary, str) and summary.strip() else None
        description = None
        if summary:
            description = summary if len(summary) <= 600 else summary[:597].rsplit(" ", 1)[0] + "..."
        employees = _to_float(info.get("fullTimeEmployees"))

        return {
            "ticker": ticker.upper(),
            "company_name": company_name,
            "sector": sector,
            "industry": industry,
            "quote_type": quote_type,
            "current_price": current_price,
            "daily_change_pct": daily_change_pct,
            "market_cap": market_cap,
            "shares_outstanding": shares_outstanding,
            "beta": beta if beta is not None else 1.0,
            "business_summary": summary,
            "business_description": description,
            "website": info.get("website") or None,
            "employees": int(employees) if employees is not None else None,
            "country": info.get("country") or None,
            "exchange": info.get("exchange") or info.get("fullExchangeName") or None,
            "stats": _build_stats(info, t, current_price),
            "etf_data": {
                "yield": etf_yield,
                "expense_ratio": expense_ratio,
                "nav_price": nav_price,
                "category": category,
                "ytd_return": ytd_return,
                "five_year_return": five_year_return,
                "total_assets": etf_total_assets
            } if quote_type == "ETF" else None,
            "financials": {
                "years": year_strings,
                "revenue": revenue,
                "net_income": net_income,
                "ebit": ebit,
                "operating_income": operating_income,
                "interest_expense": interest_expense,
                "eps": eps,
                "total_debt": total_debt,
                "stockholders_equity": stockholders_equity,
                "total_assets": total_assets,
                "cash": cash,
                "free_cash_flow": free_cash_flow,
                "operating_cash_flow": operating_cash_flow,
                "capital_expenditure": capital_expenditure,
                "gross_profit": gross_profit,
                "depreciation": depreciation,
                "dividends_paid": dividends_paid,
                "dividends": dividends_paid,
                "shares": shares,
            },
        }
    except Exception:
        return None


def get_price_history(ticker: str, period: str = "5y") -> list[dict]:
    """Return price history as a list of dicts (daily, or weekly closes for 5y and longer).

    Keys: date, open, high, low, close, volume. Unknown periods fall back to 5y.
    """
    ticker = _normalize_ticker(ticker)
    if not ticker:
        return []
    period = period if period in HISTORY_PERIODS else "5y"
    return cached(
        ("history", ticker, period),
        lambda value: HISTORY_TTL if value else FAILED_TTL,
        lambda: _fetch_price_history(ticker, period),
    )


def _fetch_price_history(ticker: str, period: str) -> list[dict]:
    try:
        hist = yf.Ticker(ticker).history(period=period)
        if hist is None or hist.empty:
            return []

        if period in WEEKLY_PERIODS:
            weekly = hist.resample("W")
            last_day = hist.index.to_series().resample("W").last()
            hist = weekly.agg({
                "Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum",
            }).dropna(subset=["Close"])
            hist.index = last_day.loc[hist.index]  # label each week by its last trading day, not the Sunday

        records: list[dict] = []
        for idx, row in hist.iterrows():
            volume = _to_float(row.get("Volume"))
            records.append({
                "date": idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx),
                "open": _to_float(row.get("Open")),
                "high": _to_float(row.get("High")),
                "low": _to_float(row.get("Low")),
                "close": _to_float(row.get("Close")),
                "volume": int(volume) if volume is not None else 0,
            })
        return records
    except Exception:
        return []


def search_tickers(query: str, limit: int = 8) -> list[dict]:
    """Search Yahoo for equities and ETFs matching a name or symbol. Returns [] on any failure."""
    query = str(query or "").strip()
    if not query:
        return []
    key = ("search", query.lower(), limit)
    return cached(key, lambda value: SEARCH_TTL if value else FAILED_TTL, lambda: _fetch_search(query, limit))


def _fetch_search(query: str, limit: int) -> list[dict]:
    try:
        quotes = yf.Search(query, max_results=max(limit * 2, limit), news_count=0).quotes or []
        results = []
        for quote in quotes:
            if str(quote.get("quoteType", "")).upper() not in ("EQUITY", "ETF"):
                continue
            symbol = quote.get("symbol")
            if not symbol:
                continue
            results.append({
                "symbol": symbol,
                "name": quote.get("shortname") or quote.get("longname") or symbol,
                "exchange": quote.get("exchDisp") or quote.get("exchange"),
                "type": str(quote.get("quoteType")).upper(),
                "sector": quote.get("sectorDisp") or quote.get("sector"),
            })
            if len(results) >= limit:
                break
        return results
    except Exception:
        return []


def get_returns(tickers: list[str], period: str = "2y") -> pd.DataFrame:
    """Return a DataFrame of daily returns for multiple tickers (for portfolio optimization).

    Columns are ticker symbols, rows are dates. Missing data is forward-filled then dropped.
    """
    try:
        data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
        if data is None or data.empty:
            return pd.DataFrame()

        # yf.download returns MultiIndex columns when multiple tickers
        if isinstance(data.columns, pd.MultiIndex):
            close = data["Close"]
        else:
            # Single ticker — wrap in DataFrame with ticker column
            close = data[["Close"]].copy()
            close.columns = [tickers[0]]

        close = close.ffill().dropna()
        returns = close.pct_change().dropna()
        return returns
    except Exception:
        return pd.DataFrame()
