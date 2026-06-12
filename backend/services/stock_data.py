import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional


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


def get_stock_data(ticker: str) -> Optional[dict]:
    """Fetch and normalize all financial data for a ticker into a clean dict structure.

    Returns None if the ticker is invalid or no data is available.
    """
    try:
        t = yf.Ticker(ticker)

        # Fetch financial statements
        income_stmt = t.income_stmt
        balance_sheet = t.balance_sheet
        cashflow = t.cashflow
        info = t.info or {}
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

        # --- Build value lists (yFinance order: most recent first) ---
        revenue = _series_to_list(revenue_series, years_count)
        net_income = _series_to_list(net_income_series, years_count)
        ebit = _series_to_list(ebit_series, years_count)
        operating_income = _series_to_list(operating_income_series, years_count)
        interest_expense = _series_to_list(interest_expense_series, years_count)
        total_debt = _series_to_list(total_debt_series, years_count)
        stockholders_equity = _series_to_list(equity_series, years_count)
        total_assets = _series_to_list(total_assets_series, years_count)
        cash = _series_to_list(cash_series, years_count)
        free_cash_flow = _series_to_list(fcf_series, years_count)
        operating_cash_flow = _series_to_list(ocf_series, years_count)
        capital_expenditure = _series_to_list(capex_series, years_count)

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

        # --- Extract scalar info ---
        current_price = _to_float(getattr(fast, "last_price", None))
        market_cap = _to_float(getattr(fast, "market_cap", None))
        shares_outstanding = _to_float(getattr(fast, "shares", None))
        beta = _to_float(info.get("beta"))
        sector = info.get("sector", "Unknown")
        industry = info.get("industry", "Unknown")
        company_name = info.get("shortName") or info.get("longName") or info.get("companyName") or ticker.upper()
        quote_type = info.get("quoteType", "EQUITY")

        # ETF specific fields
        etf_yield = _to_float(info.get("yield"))
        expense_ratio = _to_float(info.get("expenseRatio"))
        nav_price = _to_float(info.get("navPrice"))
        category = info.get("category")
        ytd_return = _to_float(info.get("ytdReturn"))
        five_year_return = _to_float(info.get("fiveYearAverageReturn"))
        total_assets = _to_float(info.get("totalAssets"))

        return {
            "ticker": ticker.upper(),
            "company_name": company_name,
            "sector": sector,
            "industry": industry,
            "quote_type": quote_type,
            "current_price": current_price,
            "market_cap": market_cap,
            "shares_outstanding": shares_outstanding,
            "beta": beta if beta is not None else 1.0,
            "etf_data": {
                "yield": etf_yield,
                "expense_ratio": expense_ratio,
                "nav_price": nav_price,
                "category": category,
                "ytd_return": ytd_return,
                "five_year_return": five_year_return,
                "total_assets": total_assets
            } if quote_type == "ETF" else None,
            "financials": {
                "years": year_strings,
                "revenue": revenue,
                "net_income": net_income,
                "ebit": ebit,
                "operating_income": operating_income,
                "interest_expense": interest_expense,
                "total_debt": total_debt,
                "stockholders_equity": stockholders_equity,
                "total_assets": total_assets,
                "cash": cash,
                "free_cash_flow": free_cash_flow,
                "operating_cash_flow": operating_cash_flow,
                "capital_expenditure": capital_expenditure,
            },
        }
    except Exception:
        return None


def get_price_history(ticker: str, period: str = "5y") -> list[dict]:
    """Return daily OHLCV price history as a list of dicts.

    Keys: date, open, high, low, close, volume.
    """
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=period)
        if hist is None or hist.empty:
            return []

        records: list[dict] = []
        for idx, row in hist.iterrows():
            records.append({
                "date": idx.strftime("%Y-%m-%d") if hasattr(idx, "strftime") else str(idx),
                "open": _to_float(row.get("Open")),
                "high": _to_float(row.get("High")),
                "low": _to_float(row.get("Low")),
                "close": _to_float(row.get("Close")),
                "volume": int(row.get("Volume", 0)) if row.get("Volume") is not None else 0,
            })
        return records
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
