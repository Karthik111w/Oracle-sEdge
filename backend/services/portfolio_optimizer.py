import re
import html
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import Optional
from datetime import datetime, timedelta

from .stock_data import get_stock_data, get_returns
from .scorecard import calculate_scorecard, calculate_scorecard_by_investor
import yfinance as yf


STOPWORDS = {
    'ACCOUNT', 'ACCOUNTS', 'TOTAL', 'CASH', 'PENDING', 'SHARE', 'SHARES', 'MANAGE', 'DIVIDENDS',
    'HAS', 'ACTIVITY', 'TODAY', 'LOW', 'HIGH', 'USD', 'COM', 'INC', 'CL', 'ADR', 'REP', 'TR',
    'STAGE', 'FUNDS', 'MONEY', 'MARKET', 'BROKER', 'BENEFICIAL', 'HELD', 'IN', 'OF', 'AND', 'OR',
    'COMMON', 'STOCK', 'SHS', 'CORP', 'CORPS', 'LLC', 'N/A', 'A', 'I', 'US', 'ETF', 'FUND', 'ET', 'NR'
}

TICKER_TOKEN_RE = re.compile(r'\b[A-Z0-9]{1,5}(?:[.-][A-Z0-9]{1,5})?\b')

# Starter universe for each investor lens. Some names may not have stable yfinance/fundamental coverage,
# so each ticker is scored individually and skipped gracefully if it fails the data pipeline.
INVESTOR_CANDIDATE_UNIVERSE = {
    "buffett": ["BRK-B", "AAPL", "KO", "AXP", "MCO", "V", "MA", "COST", "JNJ", "PG"],
    "munger": ["BRK-B", "COST", "MCO", "V", "MA", "AAPL", "JNJ"],
    "graham": ["JNJ", "PG", "KO", "MO", "VZ", "T", "GIS", "KHC", "PFE", "CVX"],
    "lynch": ["COST", "SBUX", "NKE", "LULU", "CMG", "TJX", "ULTA", "DECK"],
    "oneil": ["NVDA", "AVGO", "TSLA", "PLTR", "CRWD", "NOW", "ANET", "MELI"],
    "soros": ["NVDA", "AAPL", "TSLA", "META", "GS", "JPM", "XOM", "FCX"],
}


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


def _score_percentile_thresholds(scores: list[float]) -> tuple[float, float, float]:
    """Return the 75th, 50th, and 25th percentiles for a set of scorecard scores."""
    if not scores:
        return (80.0, 70.0, 60.0)
    arr = np.asarray(scores, dtype=float)
    q75, q50, q25 = np.percentile(arr, [75, 50, 25])
    return (float(q75), float(q50), float(q25))


def _get_adaptive_recommendations(investor: str = "buffett", horizon: str = "long", top_n: int = 6) -> list[str]:
    """Score an investor-specific ticker universe using the existing scorecard model.

    Market trend/volatility only adds a small tie-break nudge; it does not gate eligibility.
    """
    investor_key = (investor or "buffett").lower()
    candidate_pool = INVESTOR_CANDIDATE_UNIVERSE.get(investor_key, INVESTOR_CANDIDATE_UNIVERSE["buffett"])
    if top_n <= 0:
        return []

    conditions = _get_market_conditions()
    trend = conditions.get("trend", "neutral")
    volatility = conditions.get("volatility", "medium")

    trend_boosts = {
        "bull": {"AAPL", "MSFT", "NVDA", "AVGO", "META", "AMZN", "COST", "BRK-B", "V"},
        "bear": {"BRK-B", "JNJ", "PG", "KO", "VZ", "CVX", "XOM", "MO", "WMT"},
        "neutral": {"AAPL", "BRK-B", "V", "COST", "JNJ", "MSFT"},
    }
    volatility_boosts = {"low": {"AAPL", "MSFT", "NVDA", "BRK-B", "COST"}, "medium": {"AAPL", "V", "BRK-B", "COST"}, "high": {"BRK-B", "JNJ", "PG", "KO", "V"}}

    scored: list[tuple[str, float]] = []
    for ticker in candidate_pool:
        try:
            stock_data = get_stock_data(ticker)
            if not stock_data:
                continue

            scorecard = calculate_scorecard_by_investor(stock_data, investor=investor_key, horizon=horizon)
            total_score = scorecard.get("total_score")
            if total_score is None:
                continue

            adjusted_score = float(total_score)
            if ticker in trend_boosts.get(trend, set()):
                adjusted_score += 2.0
            if ticker in volatility_boosts.get(volatility, set()):
                adjusted_score += 1.0

            scored.append((ticker, adjusted_score))
        except Exception:
            continue

    if not scored:
        return candidate_pool[:top_n]

    scored.sort(key=lambda item: (-item[1], item[0]))
    return [ticker for ticker, _ in scored[:top_n]]


def _strategy_bounds(current_weights: np.ndarray, scores: list[float], threshold: float, allow_wide: bool = False) -> list[tuple[float, float]]:
    max_position = 0.20
    bounds = []
    for cur, score in zip(current_weights, scores):
        if score >= threshold:
            upper = max_position
        elif allow_wide:
            upper = min(max_position, max(cur, 0.05))
        else:
            upper = min(max_position, max(cur, 0.01))
        bounds.append((0.0, upper))
    return bounds


def _minimize_sharpe(x0: np.ndarray, mean_returns: np.ndarray, cov_matrix: np.ndarray, bounds: list[tuple[float, float]]) -> np.ndarray:
    risk_free_annual = 0.045

    def neg_sharpe(weights: np.ndarray) -> float:
        port_return = np.dot(weights, mean_returns) * 252
        port_vol = np.sqrt(np.dot(weights, np.dot(cov_matrix * 252, weights)))
        if port_vol == 0:
            return 0.0
        return -((port_return - risk_free_annual) / port_vol)

    constraints = {"type": "eq", "fun": lambda w: np.sum(w) - 1.0}
    try:
        result = minimize(
            neg_sharpe,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 1000, "ftol": 1e-10},
        )
        optimized = result.x if result.success else x0
    except Exception:
        optimized = x0

    optimized = np.maximum(optimized, 0)
    weight_sum = np.sum(optimized)
    return optimized / weight_sum if weight_sum > 0 else optimized


def _build_strategy_result(name: str, label: str, description: str, tickers: list[str], prices: list[float], shares_list: list[float], market_values: list[float], current_weights: np.ndarray, optimized_weights: np.ndarray, scorecard_scores: list[float], daily_changes: list[float], threshold: float, total_value: float, mean_returns: np.ndarray, cov_matrix: np.ndarray) -> dict:
    holdings_response = []
    for i, ticker in enumerate(tickers):
        optimized_shares = round((optimized_weights[i] * total_value) / prices[i], 4) if prices[i] > 0 else 0.0
        score = scorecard_scores[i]
        holdings_response.append({
            "ticker": ticker,
            "shares": shares_list[i],
            "price": round(prices[i], 2),
            "daily_change_pct": round(daily_changes[i], 2),
            "market_value": round(market_values[i], 2),
            "current_weight": round(float(current_weights[i]), 4),
            "optimized_weight": round(float(optimized_weights[i]), 4),
            "optimized_shares": optimized_shares,
            "scorecard_score": round(score, 1) if score is not None else 70.0,
            "buffett_approved": (score if score is not None else 70.0) >= threshold,
        })

    opt_return = float(np.dot(optimized_weights, mean_returns) * 252)
    opt_vol = float(np.sqrt(np.dot(optimized_weights, np.dot(cov_matrix * 252, optimized_weights))))
    opt_sharpe = float((opt_return - 0.045) / opt_vol) if opt_vol > 0 else 0.0

    return {
        "name": name,
        "label": label,
        "description": description,
        "holdings": holdings_response,
        "optimized_return": round(opt_return, 4),
        "optimized_volatility": round(opt_vol, 4),
        "optimized_sharpe": round(opt_sharpe, 4),
    }


def optimize_portfolio(holdings: list[dict], use_recommendations: bool = False, cash_available: float = 0.0, account_value: float = 0.0, investor: str = "buffett", horizon: str = "long") -> dict:
    """Optimize a portfolio of holdings to maximize Sharpe ratio."""
    if not holdings and not use_recommendations:
        return _empty_result()

    if use_recommendations:
        # Get adaptive recommendations based on market conditions
        recs = _get_adaptive_recommendations(investor=investor, horizon=horizon)
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
    period = "6mo" if horizon == "short" else "2y"
    returns_df = get_returns(tickers, period=period)
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

    # 3. Run Investor Scorecard for each ticker
    scorecard_scores: list[float] = []
    daily_changes: list[float] = []
    for ticker in tickers:
        try:
            sd = get_stock_data(ticker)
            if sd:
                sc = calculate_scorecard_by_investor(sd, investor=investor, horizon=horizon)
                sc_score = sc.get("total_score")
                scorecard_scores.append(sc_score if sc_score is not None else 75.0)
                daily_changes.append(sd.get("daily_change_pct") or 0.0)
            else:
                scorecard_scores.append(70.0)
                daily_changes.append(0.0)
        except Exception:
            scorecard_scores.append(70.0)
            daily_changes.append(0.0)

    buffett_approved = [score >= 70 for score in scorecard_scores]

    # 4. Run three portfolio optimization versions using investor quality thresholds.
    current_return = float(np.dot(current_weights, mean_returns) * 252)
    current_vol = float(np.sqrt(np.dot(current_weights, np.dot(cov_matrix * 252, current_weights))))
    current_sharpe = float((current_return - 0.045) / current_vol) if current_vol > 0 else 0.0

    strategies = {}
    strategy_thresholds = _score_percentile_thresholds(scorecard_scores)
    strategy_definitions = [
        ("short_term", "Short Term", "Prioritize higher-scoring stocks and protect near-term volatility.", strategy_thresholds[0], False),
        ("balanced", "Balanced", "Blend growth and quality while limiting exposure to lower-score positions.", strategy_thresholds[1], False),
        ("long_term", "Long Term", "Reward durable businesses with reasonable conviction for a multi-year horizon.", strategy_thresholds[2], True),
    ]

    for key, label, description, threshold, allow_wide in strategy_definitions:
        bounds = _strategy_bounds(current_weights, scorecard_scores, threshold, allow_wide)
        optimized_weights = _minimize_sharpe(x0, mean_returns, cov_matrix, bounds)
        strategies[key] = _build_strategy_result(
            key,
            label,
            description,
            tickers,
            prices,
            shares_list,
            market_values,
            current_weights,
            optimized_weights,
            scorecard_scores,
            daily_changes,
            threshold,
            total_value,
            mean_returns,
            cov_matrix,
        )

    # 5. Build the baseline holdings response and strategy summaries.
    holdings_response = []
    for i in range(n):
        holdings_response.append({
            "ticker": tickers[i],
            "shares": shares_list[i],
            "price": round(prices[i], 2),
            "daily_change_pct": round(daily_changes[i], 2),
            "market_value": round(market_values[i], 2),
            "current_weight": round(float(current_weights[i]), 4),
            "optimized_weight": round(float(current_weights[i]), 4),
            "optimized_shares": round(shares_list[i], 4),
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
        "current_return": round(current_return, 4),
        "current_volatility": round(current_vol, 4),
        "strategies": strategies,
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
