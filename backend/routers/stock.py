from fastapi import APIRouter, HTTPException, Request
from services.stock_data import get_stock_data, get_price_history
from services.scorecard import calculate_scorecard, calculate_scorecard_history
from services.dcf import calculate_dcf
from services.margin_of_safety import calculate_margin_of_safety
from services.risk_filter import check_risk_flags
from services.classifier import classify_stock
from services.ai_report import generate_ai_report

router = APIRouter(prefix="/api/stock", tags=["Stock"])

@router.get("/{ticker}/analysis")
def get_analysis(ticker: str):
    stock_data = get_stock_data(ticker)
    if not stock_data:
        raise HTTPException(status_code=404, detail="Stock not found or data unavailable")

    scorecard = calculate_scorecard(stock_data)
    dcf = calculate_dcf(stock_data)
    
    if dcf and dcf.get("intrinsic_value") is not None and stock_data.get("current_price") is not None:
        margin = calculate_margin_of_safety(dcf["intrinsic_value"], stock_data["current_price"])
    else:
        margin = None

    risk = check_risk_flags(stock_data)
    classification = classify_stock(scorecard["total_score"], margin["classification"] if margin else "Unknown", risk["is_avoid"])
    scorecard_trend = calculate_scorecard_history(stock_data)

    return {
        "stock_data": stock_data,
        "scorecard": scorecard,
        "scorecard_trend": scorecard_trend,
        "dcf": dcf,
        "margin": margin,
        "risk": risk,
        "classification": classification
    }

@router.get("/{ticker}/ai-report")
def get_ai_report_endpoint(ticker: str, request: Request):
    api_key = request.headers.get("X-Gemini-API-Key")
    model_name = request.headers.get("X-Gemini-Model", "gemini-2.5-flash")
    
    stock_data = get_stock_data(ticker)
    if not stock_data:
        raise HTTPException(status_code=404, detail="Stock not found")

    scorecard = calculate_scorecard(stock_data)
    dcf = calculate_dcf(stock_data)
    
    if dcf and dcf.get("intrinsic_value") is not None and stock_data.get("current_price") is not None:
        margin = calculate_margin_of_safety(dcf["intrinsic_value"], stock_data["current_price"])
    else:
        margin = None

    risk = check_risk_flags(stock_data)
    classification = classify_stock(scorecard["total_score"], margin["classification"] if margin else "Unknown", risk["is_avoid"])

    report_result = generate_ai_report(
        stock_data=stock_data,
        scorecard=scorecard,
        dcf=dcf,
        margin=margin,
        classification=classification,
        api_key=api_key,
        model_name=model_name
    )
    
    if report_result["error"]:
        # We don't raise an HTTPException because we want the frontend to show the error nicely
        pass
        
    return report_result

@router.get("/{ticker}/price-history")
def get_price_history_endpoint(ticker: str, period: str = "5y"):
    history = get_price_history(ticker, period=period)
    if not history:
        raise HTTPException(status_code=404, detail="Price history not found")
    return {"history": history}
