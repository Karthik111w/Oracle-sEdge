from fastapi import APIRouter

from ..services.market import get_market_overview

router = APIRouter(prefix="/api/market", tags=["Market"])


@router.get("/overview")
def market_overview():
    return get_market_overview()
