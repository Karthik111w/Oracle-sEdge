import re
import html
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Optional
from datetime import datetime, timedelta

from services.stock_data import get_stock_data, get_returns
from services.scorecard import calculate_scorecard
import yfinance as yf


STOPWORDS = {
    'ACCOUNT', 'ACCOUNTS', 'TOTAL', 'CASH', 'PENDING', 'SHARE', 'SHARES', 'MANAGE', 'DIVIDENDS',
    'HAS', 'ACTIVITY', 'TODAY', 'LOW', 'HIGH', 'USD', 'COM', 'INC', 'CL', 'ADR', 'REP', 'TR',
    'STAGE', 'FUNDS', 'MONEY', 'MARKET', 'BROKER', 'BENEFICIAL', 'HELD', 'IN', 'OF', 'AND', 'OR',
    'COMMON', 'STOCK', 'SHS', 'CORP', 'CORPS', 'LLC', 'N/A', 'A', 'I', 'US', 'ETF', 'FUND', 'ET', 'NR'
}

TICKER_TOKEN_RE = re.compile(r'\b[A-Z0-9]{1,5}(?:[.-][A-Z0-9]{1,5})?\b')


def _normalize_ticker_token(token: str) -> str:
    return token.strip().upper()


def _is_ticker_candidate(token: str) -> bool:
    token = _normalize_ticker_token(token)
    if token in STOPWORDS:
        return False
    if token.isdigit():
        return False
    if not TICKER_TOKEN_RE.fullmatch(token):
        return False
    return True


def _parse_number_token(token: str) -> Optional[float]:
    if not token:
        return None
    cleaned = token.replace('$', '').replace(',', '').strip()
    cleaned = re.sub(r'^USD', '', cleaned, flags=re.IGNORECASE)
    if '%' in cleaned:
        return None
    if not re.match(r'^-?\d*\.?\d+$', cleaned):
        return None
    value = float(cleaned)
    if value != value:
        return None
    return value


def _validate_ticker(ticker: str) -> bool:
    ticker = _normalize_ticker_token(ticker)
    try:
        yf_ticker = yf.Ticker(ticker)
        hist = yf_ticker.history(period='5d')
        return hist is not None and not hist.empty
    except Exception:
        return False


def _find_shares_around(tokens: list[str], index: int) -> float:
    # Search forward first, then backward for a plausible share quantity.
    for j in range(index + 1, min(len(tokens), index + 8)):
        num = _parse_number_token(tokens[j])
        if num is not None:
            return num
    for j in range(max(0, index - 4), index):
        num = _parse_number_token(tokens[j])
        if num is not None:
            return num
    return 0.0


def parse_bulk_portfolio_text(raw_text: str) -> list[dict]:
    normalized = html.unescape(raw_text.replace('&amp;', '&')).strip()
    lines = [line.strip() for line in normalized.splitlines() if line.strip()]
    separator_index = next(
        (i for i, line in enumerate(lines) if 'pending activity' in line.lower() or 'account total' in line.lower()),
        len(lines)
    )

    ticker_lines = lines[:separator_index]
    tickers = []
    for line in ticker_lines:
        upper = line.upper().strip()
        if re.fullmatch(r'[A-Z0-9.-]{1,5}', upper) and upper not in STOPWORDS:
            if upper not in tickers:
                tickers.append(upper)

    if not tickers:
        return []

    share_lines = lines[separator_index:]
    shares = []
    for idx, line in enumerate(share_lines):
        if '/ SHARE' in line.upper():
            for prev in range(idx - 1, max(-1, idx - 6), -1):
                candidate = share_lines[prev].strip()
                if re.fullmatch(r'-?\d*\.?\d+', candidate) and '$' not in candidate and '%' not in candidate:
                    value = float(candidate)
                    if value > 0:
                        shares.append(round(value, 4))
                        break

    holdings = []
    for index, ticker in enumerate(tickers):
        shares_value = shares[index] if index < len(shares) else 0.0
        holdings.append({
            'ticker': ticker,
            'shares': shares_value,
        })

    return holdings


def _get_current_price(ticker: str) -> float | None:
    """Fetch the most reliable current price for a ticker with fallback methods."""
    try:
        t = yf.Ticker(ticker)
        price = None
        fast_info = getattr(t, 'fast_info', None)
        if fast_info is not None:
            if isinstance(fast_info, dict):
                price = fast_info.get('lastPrice') or fast_info.get('last_price') or fast_info.get('previousClose')
            else:
                for attr in ('lastPrice', 'last_price', 'previous_close', 'regularMarketPrice', 'currentPrice'):
                    price = getattr(fast_info, attr, None)
                    if price:
                        break
        if not price or price <= 0:
            info = {}
            try:
                info = t.info or {}
            except Exception:
                info = {}
            for key in ('regularMarketPrice', 'previousClose', 'currentPrice', 'lastPrice', 'last_price'):
                candidate = info.get(key)
                if candidate and candidate > 0:
                    price = candidate
                    break
        if not price or price <= 0:
            hist = t.history(period='5d')
            if hist is not None and not hist.empty:
                price = float(hist['Close'].iloc[-1])
        if price is not None and price > 0:
            return float(price)
    except Exception:
        pass
    return None


def _get_prices_for_tickers(tickers: list[str]) -> dict[str, float]:
    """Fetch closing prices for multiple tickers in a batch to reduce rate limit failures."""
    prices: dict[str, float] = {}
    if not tickers:
        return prices

    try:
        data = yf.download(
            tickers,
            period='2d',
            interval='1d',
            auto_adjust=False,
            progress=False,
            threads=False,
        )
        if data is not None and not data.empty:
            if isinstance(data.columns, pd.MultiIndex):
                close = data['Close']
            else:
                close = data[['Close']].copy()
                close.columns = [tickers[0]]
            close = close.ffill().dropna(how='all')
            if not close.empty:
                latest = close.iloc[-1]
                for ticker in tickers:
                    if ticker in latest and pd.notna(latest[ticker]):
                        price = float(latest[ticker])
                        if price > 0:
                            prices[ticker] = price
    except Exception:
        pass
    return prices


def _get_market_conditions() -> dict:
    """Analyze current market conditions to determine trend and volatility.
    
    Returns dict with:
    - trend: 'bull', 'neutral', or 'bear'
    - volatility: 'low', 'medium', or 'high'
    - market_return_90d: float (annualized)
    """
    try:
        # Get S&P 500 performance (90-day trend)
        spy = yf.Ticker("SPY")
        hist = spy.history(period="90d")
        if hist is None or hist.empty or len(hist) < 20:
            return {"trend": "neutral", "volatility": "medium", "market_return_90d": 0.0}
        
        # Calculate 90-day return
        close_start = hist['Close'].iloc[0]
        close_end = hist['Close'].iloc[-1]
        ret_90d = (close_end - close_start) / close_start
        market_return_90d = (1 + ret_90d) ** (252/90) - 1  # Annualize
        
        # Determine trend
        if market_return_90d > 0.10:
            trend = "bull"
        elif market_return_90d < -0.05:
            trend = "bear"
        else:
            trend = "neutral"
        
        # Get VIX for volatility (inverse: high VIX = high fear/volatility)
        try:
            vix = yf.Ticker("^VIX")
            vix_info = vix.info
            vix_value = vix_info.get("regularMarketPrice", 20.0)
            if vix_value > 25:
                volatility = "high"
            elif vix_value > 15:
                volatility = "medium"
            else:
                volatility = "low"
        except:
            volatility = "medium"
        
        return {
            "trend": trend,
            "volatility": volatility,
            "market_return_90d": market_return_90d
        }
    except Exception:
        # Fallback to neutral conditions
        return {"trend": "neutral", "volatility": "medium", "market_return_90d": 0.0}


def _get_adaptive_recommendations() -> list[str]:
    """Get adaptive recommendations based on current market conditions.
    
    Bull market (strong growth): Growth & tech-heavy
    Neutral market (balanced): Mix of growth & quality & dividends
    Bear market (defensive): Defensive & high dividend
    High volatility: Quality & dividend-paying
    """
    conditions = _get_market_conditions()
    trend = conditions.get("trend", "neutral")
    volatility = conditions.get("volatility", "medium")
    
    # Define stock pools by strategy
    growth_stocks = ["AAPL", "MSFT", "NVDA", "GOOGL", "TSLA"]  # Growth & tech
    quality_stocks = ["BRK-B", "JNJ", "PG", "V", "MA"]  # Quality & moats
    dividend_stocks = ["KO", "PG", "JNJ", "V", "MCD"]  # High dividend/stable
    defensive_stocks = ["BRK-B", "PG", "JNJ", "KO", "MO"]  # Defensive plays
    
    # Select based on market conditions
    if trend == "bull" and volatility == "low":
        # Strong bull market: go for growth
        recs = ["AAPL", "MSFT", "NVDA", "GOOGL", "V"]
    elif trend == "bull" and volatility in ("medium", "high"):
        # Bull but volatile: balance growth with quality
        recs = ["AAPL", "MSFT", "BRK-B", "V", "JNJ"]
    elif trend == "bear" or volatility == "high":
        # Bear market or high volatility: defensive + quality
        recs = ["BRK-B", "JNJ", "PG", "KO", "V"]
    else:
        # Neutral: balanced mix (original recommendation)
        recs = ["AAPL", "BRK-B", "MSFT", "JNJ", "V", "COST"]
    
    return recs


def optimize_portfolio(holdings: list[dict], use_recommendations: bool = False, cash_available: float = 0.0, account_value: float = 0.0) -> dict:
    """Optimize a portfolio of holdings to maximize Sharpe ratio."""
    if not holdings and not use_recommendations:
        return _empty_result()

    if use_recommendations:
        # Get adaptive recommendations based on market conditions
        recs = _get_adaptive_recommendations()
        existing = set(h["ticker"].upper() for h in holdings)
        for r in recs:
            if r not in existing:
                holdings.append({"ticker": r, "shares": 0.0})

    tickers = [h["ticker"].upper() for h in holdings]
    shares_list = [float(h["shares"]) for h in holdings]

    batch_prices = _get_prices_for_tickers(tickers)
    prices = []
    valid_tickers = []
    valid_shares = []
    invalid_tickers = []

    for i, ticker in enumerate(tickers):
        price = batch_prices.get(ticker)
        if price is None:
            price = _get_current_price(ticker)
        if price is None or price <= 0:
            invalid_tickers.append(ticker)
            continue
        prices.append(price)
        valid_tickers.append(ticker)
        valid_shares.append(shares_list[i])

    if not valid_tickers:
        raise ValueError(
            "Unable to verify prices for any tickers. Please check your symbols and try again."
        )

    tickers = valid_tickers
    shares_list = valid_shares
    n = len(tickers)

    market_values = [prices[i] * shares_list[i] for i in range(n)]
    cash_available = max(0.0, cash_available)

    if account_value > 0:
        portfolio_value = sum(market_values)
        cash_available = account_value - portfolio_value
        if cash_available < 0:
            raise ValueError(
                "Account value is less than the current holdings market value. "
                "Please enter a higher account value or adjust your holdings."
            )
    total_value = sum(market_values) + cash_available
    
    if total_value <= 0:
        current_weights = np.zeros(n)
        x0 = np.ones(n) / n if n > 0 else np.zeros(n)
    else:
        current_weights = np.array([mv / total_value for mv in market_values])
        x0 = current_weights.copy()

    # 2. Fetch returns
    returns_df = get_returns(tickers, period="2y")
    if returns_df.empty or len(returns_df) < 30:
        return _empty_result()

    # Ensure columns are in the same order as tickers
    # Handle the case where some tickers might be missing
    available_tickers = [t for t in tickers if t in returns_df.columns]
    if len(available_tickers) < n:
        # Fill missing tickers with zero returns
        for t in tickers:
            if t not in returns_df.columns:
                returns_df[t] = 0.0

    returns_df = returns_df[tickers]
    mean_returns = returns_df.mean().values
    cov_matrix = returns_df.cov().values

    # 3. Run Buffett Scorecard for each ticker
    scorecard_scores: list[float] = []
    for ticker in tickers:
        try:
            sd = get_stock_data(ticker)
            if sd:
                sc = calculate_scorecard(sd)
                scorecard_scores.append(sc["total_score"])
            else:
                scorecard_scores.append(0.0)
        except Exception:
            scorecard_scores.append(0.0)

    buffett_approved = [score >= 70 for score in scorecard_scores]

    # 4. Optimize
    risk_free_daily = 0.045 / 252
    risk_free_annual = 0.045

    def neg_sharpe(weights: np.ndarray) -> float:
        port_return = np.dot(weights, mean_returns) * 252
        port_vol = np.sqrt(np.dot(weights, np.dot(cov_matrix * 252, weights)))
        if port_vol == 0:
            return 0.0
        sharpe = (port_return - risk_free_annual) / port_vol
        return -sharpe

    # Constraints: sum of weights = 1
    constraints = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}

    # Bounds: (0, 1) for approved stocks, (0, current_weight) for non-approved
    bounds = []
    for i in range(n):
        if buffett_approved[i]:
            bounds.append((0.0, 1.0))
        else:
            # Cap at current weight — don't increase allocation to low-scoring stocks
            bounds.append((0.0, max(float(current_weights[i]), 0.01)))

    try:
        result = minimize(
            neg_sharpe,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 1000, "ftol": 1e-10},
        )
        optimized_weights = result.x if result.success else current_weights
    except Exception:
        optimized_weights = current_weights

    # Ensure weights are non-negative and sum to 1
    optimized_weights = np.maximum(optimized_weights, 0)
    weight_sum = np.sum(optimized_weights)
    if weight_sum > 0:
        optimized_weights = optimized_weights / weight_sum

    # 5. Calculate Sharpe ratios before and after
    current_return = float(np.dot(current_weights, mean_returns) * 252)
    current_vol = float(np.sqrt(np.dot(current_weights, np.dot(cov_matrix * 252, current_weights))))
    current_sharpe = float((current_return - risk_free_annual) / current_vol) if current_vol > 0 else 0.0

    opt_return = float(np.dot(optimized_weights, mean_returns) * 252)
    opt_vol = float(np.sqrt(np.dot(optimized_weights, np.dot(cov_matrix * 252, optimized_weights))))
    opt_sharpe = float((opt_return - risk_free_annual) / opt_vol) if opt_vol > 0 else 0.0

    # Build holdings response
    holdings_response = []
    for i in range(n):
        optimized_shares = round((optimized_weights[i] * total_value) / prices[i], 4) if prices[i] > 0 else 0.0
        holdings_response.append({
            "ticker": tickers[i],
            "shares": shares_list[i],
            "price": round(prices[i], 2),
            "market_value": round(market_values[i], 2),
            "current_weight": round(float(current_weights[i]), 4),
            "optimized_weight": round(float(optimized_weights[i]), 4),
            "optimized_shares": optimized_shares,
            "scorecard_score": round(scorecard_scores[i], 1),
            "buffett_approved": buffett_approved[i],
        })

    current_portfolio_value = round(sum(market_values), 2)
    account_value = round(current_portfolio_value + cash_available, 2)

    return {
        "holdings": holdings_response,
        "current_portfolio_value": current_portfolio_value,
        "cash_available": round(cash_available, 2),
        "account_value": account_value,
        "total_value": account_value,
        "current_sharpe": round(current_sharpe, 4),
        "optimized_sharpe": round(opt_sharpe, 4),
        "current_return": round(current_return, 4),
        "optimized_return": round(opt_return, 4),
        "current_volatility": round(current_vol, 4),
        "optimized_volatility": round(opt_vol, 4),
    }


def _empty_result() -> dict:
    """Return an empty optimization result."""
    return {
        "holdings": [],
        "current_portfolio_value": 0.0,
        "cash_available": 0.0,
        "account_value": 0.0,
        "total_value": 0.0,
        "current_sharpe": 0.0,
        "optimized_sharpe": 0.0,
        "current_return": 0.0,
        "optimized_return": 0.0,
        "current_volatility": 0.0,
        "optimized_volatility": 0.0,
    }
