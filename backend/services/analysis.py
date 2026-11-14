from .scorecard import calculate_scorecard_by_investor, INVESTOR_PROFILES
from .dcf import calculate_dcf
from .margin_of_safety import calculate_margin_of_safety
from .risk_filter import check_risk_flags
from .classifier import classify_stock

DEFAULT_INVESTOR = "buffett"
DEFAULT_HORIZON = "long"
VALID_HORIZONS = ("short", "balanced", "long")
CLASSES = ("Buy", "Watchlist", "Hold", "Avoid")


def normalize_investor(investor: str | None) -> str:
    key = (investor or "").strip().lower()
    return key if key in INVESTOR_PROFILES else DEFAULT_INVESTOR


def normalize_horizon(horizon: str | None) -> str:
    key = (horizon or "").strip().lower()
    return key if key in VALID_HORIZONS else DEFAULT_HORIZON


def _margin_and_risk(stock_data: dict, dcf: dict | None) -> tuple[dict | None, dict]:
    price = stock_data.get("current_price")
    if dcf and dcf.get("intrinsic_value") is not None and price is not None:
        margin = calculate_margin_of_safety(dcf["intrinsic_value"], price)
    else:
        margin = None
    risk = check_risk_flags(stock_data, sector=stock_data.get("sector", ""))
    return margin, risk


def _classify(scorecard: dict, margin: dict | None, risk: dict, horizon: str) -> dict:
    return classify_stock(scorecard, margin["margin_pct"] if margin else -100.0, risk["is_avoid"], horizon)


def build_analysis(stock_data: dict, investor: str = DEFAULT_INVESTOR, horizon: str = DEFAULT_HORIZON) -> dict:
    """Scorecard, valuation, margin of safety, risk flags and classification for one investor lens."""
    investor = normalize_investor(investor)
    horizon = normalize_horizon(horizon)
    scorecard = calculate_scorecard_by_investor(stock_data, investor, horizon)
    dcf = calculate_dcf(stock_data, horizon)
    margin, risk = _margin_and_risk(stock_data, dcf)
    return {
        "scorecard": scorecard,
        "dcf": dcf,
        "margin": margin,
        "risk": risk,
        "classification_details": _classify(scorecard, margin, risk, horizon),
    }


def build_lens_summary(stock_data: dict, horizon: str = DEFAULT_HORIZON) -> dict:
    """Score the same stock under every investor lens, sharing one DCF and one risk check."""
    horizon = normalize_horizon(horizon)
    ticker = stock_data.get("ticker")
    counts = {name: 0 for name in CLASSES}

    if stock_data.get("quote_type") == "ETF":
        return {
            "ticker": ticker,
            "horizon": horizon,
            "lenses": [],
            "consensus": {
                "counts": counts,
                "average_score": None,
                "top_lens": None,
                "summary": f"{ticker} is an ETF, so investor lens scoring does not apply.",
            },
        }

    dcf = calculate_dcf(stock_data, horizon)
    margin, risk = _margin_and_risk(stock_data, dcf)

    lenses = []
    for key, profile in INVESTOR_PROFILES.items():
        scorecard = calculate_scorecard_by_investor(stock_data, key, horizon)
        details = _classify(scorecard, margin, risk, horizon)
        if details["classification"] in counts:
            counts[details["classification"]] += 1
        lenses.append({
            "investor": key,
            "label": profile["label"],
            "term": profile.get("term", "long"),
            "score": scorecard["total_score"],
            "grade": scorecard["grade"],
            "classification": details["classification"],
            "classification_label": details["horizon_label"],
            "explanation": details["explanation"],
        })

    scores = [lens["score"] for lens in lenses if lens["score"] is not None]
    top = max(lenses, key=lambda lens: lens["score"] if lens["score"] is not None else -1) if lenses else None
    average = round(sum(scores) / len(scores), 1) if scores else None

    summary = ""
    if lenses:
        common, common_count = max(counts.items(), key=lambda item: item[1])
        summary = f"{common_count} of {len(lenses)} lenses rate {ticker} as {common}"
        if top and top["score"] is not None:
            summary += f"; {top['label'].split()[-1]} scores it highest at {round(top['score'])}"
        summary += "."

    return {
        "ticker": ticker,
        "horizon": horizon,
        "lenses": lenses,
        "consensus": {
            "counts": counts,
            "average_score": average,
            "top_lens": top["investor"] if top else None,
            "summary": summary,
        },
    }
