def calculate_margin_of_safety(intrinsic_value: float, current_price: float) -> dict:
    """Calculate margin of safety and classify the stock.

    Classifications:
    - 'Strong Buy': margin > 30%
    - 'Buy': 15% <= margin <= 30%
    - 'Fairly Valued': 0% <= margin < 15%
    - 'Overvalued': margin < 0%
    """
    if intrinsic_value is None or intrinsic_value == 0:
        return None

    margin = (intrinsic_value - current_price) / intrinsic_value * 100

    if margin > 30:
        classification = "Strong Buy"
    elif margin >= 15:
        classification = "Buy"
    elif margin >= 0:
        classification = "Fairly Valued"
    else:
        classification = "Overvalued"

    return {
        "margin_pct": round(margin, 2),
        "classification": classification,
        "intrinsic_value": round(intrinsic_value, 2),
        "current_price": round(current_price, 2),
    }
