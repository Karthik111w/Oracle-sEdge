from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.portfolio_optimizer import (
    optimize_portfolio,
    parse_bulk_portfolio_text,
    _get_market_conditions,
    _get_adaptive_recommendations,
)

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])

class Holding(BaseModel):
    ticker: str
    shares: float

class PortfolioRequest(BaseModel):
    holdings: list[Holding]
    cash_available: float = 0.0
    account_value: float = 0.0
    use_recommendations: bool = False

class BulkParseRequest(BaseModel):
    raw_text: str

@router.post("/optimize")
def optimize_portfolio_endpoint(request: PortfolioRequest):
    holdings_dict = [{"ticker": h.ticker, "shares": h.shares} for h in request.holdings]
    try:
        result = optimize_portfolio(
            holdings_dict,
            request.use_recommendations,
            request.cash_available,
            request.account_value
        )
        return result
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
def get_market_conditions_endpoint():
    """Get current market conditions and adaptive recommendations."""
    try:
        conditions = _get_market_conditions()
        recommendations = _get_adaptive_recommendations()
        return {
            "market_trend": conditions.get("trend"),
            "volatility": conditions.get("volatility"),
            "market_return_90d_pct": round(conditions.get("market_return_90d", 0) * 100, 2),
            "recommended_stocks": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
