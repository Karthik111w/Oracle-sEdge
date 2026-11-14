from fastapi import APIRouter

from ..services import screener

router = APIRouter(prefix="/api/screener", tags=["Screener"])


@router.get("/universe")
def get_universe():
    return {"tickers": screener.UNIVERSE}


@router.get("")
def get_screener(investor: str = "buffett", horizon: str = "long"):
    return screener.get_screener(investor, horizon)
