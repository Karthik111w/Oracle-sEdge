from fastapi import APIRouter, HTTPException, Request
from ..services.stock_data import get_stock_data, get_price_history, search_tickers
from ..services.scorecard import calculate_scorecard_history, INVESTOR_PROFILES
from ..services.analysis import build_analysis, build_lens_summary, normalize_investor, normalize_horizon
from ..services.ai_report import generate_ai_report
from ..services.metric_explainer import explain_metrics
from ..services import ai_guard

router = APIRouter(prefix="/api/stock", tags=["Stock"])

@router.get("/investors")
def get_investors():
    """Return all investor profiles with term/philosophy metadata."""
    return {
        "investors": [
            {
                "key": key,
                "label": profile["label"],
                "term": profile.get("term", "long"),
                "philosophy": profile.get("philosophy", ""),
                "focus": profile.get("focus", ""),
            }
            for key, profile in INVESTOR_PROFILES.items()
        ]
    }


@router.get("/search")
def search_stocks(q: str = ""):
    """Ticker and company name search for the header search box."""
    query = q.strip()
    if not query:
        return {"results": []}
    return {"results": search_tickers(query)}


@router.get("/{ticker}/analysis")
def get_analysis(ticker: str, investor: str = "buffett", horizon: str = "long"):
    investor = normalize_investor(investor)
    horizon = normalize_horizon(horizon)
    stock_data = get_stock_data(ticker)
    if not stock_data:
        raise HTTPException(status_code=404, detail="Stock not found or data unavailable")

    analysis = build_analysis(stock_data, investor, horizon)
    classification_details = analysis["classification_details"]

    return {
        "stock_data": stock_data,
        "scorecard": analysis["scorecard"],
        "scorecard_trend": calculate_scorecard_history(stock_data),
        "dcf": analysis["dcf"],
        "margin": analysis["margin"],
        "risk": analysis["risk"],
        "classification": classification_details["classification"],
        "classification_label": classification_details["horizon_label"],
        "classification_explanation": classification_details["explanation"],
    }


@router.get("/{ticker}/lenses")
def get_lenses(ticker: str, horizon: str = "long"):
    """Every investor lens scored over one data fetch, with a consensus summary."""
    stock_data = get_stock_data(ticker)
    if not stock_data:
        raise HTTPException(status_code=404, detail="Stock not found or data unavailable")
    return build_lens_summary(stock_data, normalize_horizon(horizon))


@router.get("/{ticker}/ai-report")
def get_ai_report_endpoint(ticker: str, request: Request, investor: str = "buffett", horizon: str = "long"):
    api_key, model_name, before_call = ai_guard.resolve(request)
    
    stock_data = get_stock_data(ticker)
    if not stock_data:
        raise HTTPException(status_code=404, detail="Stock not found")

    investor = normalize_investor(investor)
    horizon = normalize_horizon(horizon)
    analysis = build_analysis(stock_data, investor, horizon)
    scorecard, dcf, margin = analysis["scorecard"], analysis["dcf"], analysis["margin"]
    classification_details = analysis["classification_details"]

    report_result = generate_ai_report(
        stock_data=stock_data,
        scorecard=scorecard,
        dcf=dcf,
        margin=margin,
        classification=classification_details["classification"],
        classification_explanation=classification_details["explanation"],
        api_key=api_key,
        model_name=model_name,
        before_call=before_call,
    )
    
    if report_result["error"]:
        # We don't raise an HTTPException because we want the frontend to show the error nicely
        pass
        
    return report_result

@router.get("/{ticker}/metric-explanations")
def get_metric_explanations(ticker: str, request: Request, investor: str = "buffett", horizon: str = "long"):
    """Plain-language reading of each scorecard metric for the analysis slides (Gemini)."""
    api_key, model_name, before_call = ai_guard.resolve(request)

    stock_data = get_stock_data(ticker)
    if not stock_data:
        raise HTTPException(status_code=404, detail="Stock not found")

    investor = normalize_investor(investor)
    horizon = normalize_horizon(horizon)
    analysis = build_analysis(stock_data, investor, horizon)
    scorecard, dcf, margin = analysis["scorecard"], analysis["dcf"], analysis["margin"]
    classification_details = analysis["classification_details"]

    # Errors are returned in the body (not raised) so the slides can show them inline.
    return explain_metrics(
        stock_data=stock_data,
        scorecard={**scorecard, "investor": investor},
        dcf=dcf,
        margin=margin,
        classification=classification_details["classification"],
        classification_explanation=classification_details["explanation"],
        horizon=horizon,
        api_key=api_key,
        model_name=model_name,
        before_call=before_call,
    )


@router.get("/{ticker}/price-history")
def get_price_history_endpoint(ticker: str, period: str = "5y"):
    history = get_price_history(ticker, period=period)
    if not history:
        raise HTTPException(status_code=404, detail="Price history not found")
    return {"history": history}
