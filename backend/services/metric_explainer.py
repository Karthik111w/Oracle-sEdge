import json
import os
import time
from typing import Optional

# Explanations depend only on the stock's data and the lens, not on whose key paid for them,
# so a short in-memory cache saves Gemini quota when the same analysis is opened again.
_CACHE: dict = {}
_CACHE_TTL_SECONDS = 6 * 60 * 60

FALLBACK_MODEL = "gemini-2.5-flash"


def _cache_get(key):
    hit = _CACHE.get(key)
    if hit and time.time() - hit[0] < _CACHE_TTL_SECONDS:
        return hit[1]
    return None


def _build_prompt(stock_data: dict, scorecard: dict, margin: Optional[dict], dcf: Optional[dict],
                  classification: str, classification_explanation: str) -> str:
    investor = scorecard.get("investor_label", "Warren Buffett")
    metrics = scorecard.get("metrics", [])
    total_weight = sum(m.get("max") or 0 for m in metrics) or 1

    metric_lines = []
    for m in metrics:
        weight_share = (m.get("max") or 0) / total_weight * 100
        metric_lines.append(
            f'- {m["name"]}: value {m.get("value", "N/A")} ({m.get("details", "")}); '
            f'scored {m.get("score") or 0:.1f} of {m.get("max") or 0:.1f} points; '
            f"{weight_share:.0f}% of this lens's total weight"
        )

    safe_margin = margin or {}
    safe_dcf = dcf or {}
    return f"""You explain stock fundamentals to self-directed investors in plain, specific language.
Explain how {stock_data.get('company_name', 'the company')} ({stock_data.get('ticker', '')}), a {stock_data.get('sector', 'Unknown')} company, looks through the {investor} lens.

Scorecard: {scorecard.get('total_score', 0):.1f}/100, grade {scorecard.get('grade', 'N/A')}.
Verdict: {classification}. Reason: {classification_explanation or 'N/A'}.
Fair value ${safe_dcf.get('intrinsic_value') or 0:.2f}, price ${stock_data.get('current_price') or 0:.2f}, margin of safety {safe_margin.get('margin_pct') or 0:.1f}%.
Metrics:
{chr(10).join(metric_lines)}

Return JSON only, with this shape:
{{"overview": string, "metrics": [{{"name": string, "reading": string, "why_it_matters": string}}]}}

Rules:
- "overview": 2 or 3 sentences summarising the overall reading and verdict for this stock.
- One entry in "metrics" for every metric above, using the exact metric name given.
- "reading": 1 or 2 sentences on what this stock's own number says. Quote the number. If the value is N/A, say the data is missing and what that means for the score.
- "why_it_matters": 1 or 2 sentences on why {investor} cares about this metric, tied to how much weight it carries in this lens.
- Use only the figures provided. Do not invent numbers, events or news.
- Plain sentences. No markdown, no em dashes, no exclamation marks, no hype words."""


def _parse(text: str, metric_names: list) -> dict:
    raw = text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw[raw.find("{"):]
    data = json.loads(raw)
    by_name = {m.get("name"): m for m in data.get("metrics", []) if isinstance(m, dict)}
    metrics = []
    for name in metric_names:
        m = by_name.get(name) or {}
        metrics.append({
            "name": name,
            "reading": str(m.get("reading", "")).strip(),
            "why_it_matters": str(m.get("why_it_matters", "")).strip(),
        })
    return {"overview": str(data.get("overview", "")).strip(), "metrics": metrics}


def explain_metrics(stock_data: dict, scorecard: dict, dcf: Optional[dict], margin: Optional[dict],
                    classification: str, classification_explanation: str = None, horizon: str = "long",
                    api_key: str = None, model_name: str = FALLBACK_MODEL) -> dict:
    """Per-metric explanations for the analysis slides.

    Returns {"overview", "metrics", "error": None} on success or {"error": str} on failure.
    The API key comes from the request header, falling back to GEMINI_API_KEY.
    """
    resolved_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not resolved_key:
        return {"error": "No Gemini API key configured. Add your key in Settings."}

    cache_key = (stock_data.get("ticker"), scorecard.get("investor"), horizon)
    cached = _cache_get(cache_key)
    if cached:
        return cached

    prompt = _build_prompt(stock_data, scorecard, margin, dcf, classification, classification_explanation)
    metric_names = [m["name"] for m in scorecard.get("metrics", [])]

    try:
        import google.generativeai as genai

        genai.configure(api_key=resolved_key)
    except Exception as e:  # pragma: no cover - import/config failure
        return {"error": f"Gemini is unavailable: {e}"}

    last_error = None
    for name in dict.fromkeys([model_name, FALLBACK_MODEL]):
        try:
            model = genai.GenerativeModel(name, generation_config={"response_mime_type": "application/json"})
            response = model.generate_content(prompt)
            result = {**_parse(response.text, metric_names), "error": None}
            _CACHE[cache_key] = (time.time(), result)
            return result
        except json.JSONDecodeError:
            last_error = "Gemini returned an unreadable response. Try again."
        except Exception as e:
            msg = str(e)
            if "api_key" in msg.lower() or "401" in msg or "403" in msg:
                return {"error": "Invalid Gemini API key. Please check your key in Settings."}
            last_error = f"Failed to generate explanations: {msg}"
            if "not found" not in msg.lower() and "not supported" not in msg.lower():
                break
    return {"error": last_error}
