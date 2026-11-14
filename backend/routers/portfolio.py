from typing import Annotated

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StringConstraints
from ..services.portfolio_optimizer import (
    optimize_portfolio,
    parse_bulk_portfolio_text,
    _get_market_conditions,
    _get_adaptive_recommendations,
)
from ..services.portfolio_analysis import analyze_portfolio, sanitize, PortfolioError

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])

MAX_HOLDINGS = 50
MAX_SHARES = 1e9
MAX_MONEY = 1e15

Ticker = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=12, pattern=r"^[A-Za-z0-9.\-^=]+$")]


class Holding(BaseModel):
    ticker: Ticker
    shares: float = Field(ge=0, le=MAX_SHARES, allow_inf_nan=False)

class PortfolioRequest(BaseModel):
    holdings: list[Holding] = Field(max_length=MAX_HOLDINGS)
    cash_available: float = Field(default=0.0, ge=0, le=MAX_MONEY, allow_inf_nan=False)
    account_value: float = Field(default=0.0, ge=0, le=MAX_MONEY, allow_inf_nan=False)
    use_recommendations: bool = False
    investor: str = "buffett"
    horizon: str = "long"

class BulkParseRequest(BaseModel):
    raw_text: str

class AnalyzeRequest(BaseModel):
    holdings: list[Holding] = Field(max_length=MAX_HOLDINGS)
    investor: str = "buffett"
    horizon: str = "long"

@router.post("/analyze")
def analyze_portfolio_endpoint(request: AnalyzeRequest):
    holdings = [{"ticker": h.ticker, "shares": h.shares} for h in request.holdings]
    try:
        return analyze_portfolio(holdings, request.investor, request.horizon)
    except PortfolioError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
def optimize_portfolio_endpoint(request: PortfolioRequest):
    holdings_dict = [{"ticker": h.ticker, "shares": h.shares} for h in request.holdings]
    try:
        result = optimize_portfolio(
            holdings_dict,
            request.use_recommendations,
            request.cash_available,
            request.account_value,
            investor=request.investor,
            horizon=request.horizon
        )
        return sanitize(result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parse-bulk")
def parse_bulk_portfolio_endpoint(request: BulkParseRequest):
    try:
        holdings = parse_bulk_portfolio_text(request.raw_text)
        return {"holdings": holdings}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/market-conditions")
def get_market_conditions_endpoint(investor: str = "buffett", horizon: str = "long"):
    """Get current market conditions and adaptive recommendations."""
    try:
        conditions = _get_market_conditions()
        recommendations = _get_adaptive_recommendations(investor=investor, horizon=horizon)
        return {
            "market_trend": conditions.get("trend"),
            "volatility": conditions.get("volatility"),
            "market_return_90d_pct": round(conditions.get("market_return_90d", 0) * 100, 2),
            "recommended_stocks": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
