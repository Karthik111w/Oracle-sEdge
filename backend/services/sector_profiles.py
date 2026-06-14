SECTOR_PROFILES = {
    "Technology": {
        "model": "dcf",
        "growth_cap": 0.30,
        "terminal_rate": 0.03,
        "wacc_premium": 0.01,
        "scorecard_weights": {
            "earnings_consistency": 15,
            "roic": 20,
            "fcf_growth": 20,
            "profit_margin": 15,
            "roe": 10,
            "debt_to_equity": 8,
            "interest_coverage": 7,
            "revenue_growth": 5,
        }
    },
    "Financial Services": {
        "model": "earnings_based",
        "growth_cap": 0.15,
        "terminal_rate": 0.03,
        "wacc_premium": 0.0,
        "scorecard_weights": {
            "earnings_consistency": 25,
            "roic": 5,
            "fcf_growth": 0,
            "profit_margin": 10,
            "roe": 25,
            "debt_to_equity": 5,
            "interest_coverage": 5,
            "revenue_growth": 25,
        }
    },
    "Consumer Staples": {
        "model": "dcf",
        "growth_cap": 0.12,
        "terminal_rate": 0.025,
        "wacc_premium": -0.01,
        "scorecard_weights": {
            "earnings_consistency": 25,
            "roic": 15,
            "fcf_growth": 20,
            "profit_margin": 15,
            "roe": 10,
            "debt_to_equity": 8,
            "interest_coverage": 5,
            "revenue_growth": 2,
        }
    },
    "Utilities": {
        "model": "ddm",
        "growth_cap": 0.06,
        "terminal_rate": 0.02,
        "wacc_premium": -0.01,
        "scorecard_weights": {
            "earnings_consistency": 30,
            "roic": 10,
            "fcf_growth": 15,
            "profit_margin": 10,
            "roe": 10,
            "debt_to_equity": 10,
            "interest_coverage": 10,
            "revenue_growth": 5,
        }
    },
    "Real Estate": {
        "model": "ffo",
        "growth_cap": 0.10,
        "terminal_rate": 0.025,
        "wacc_premium": 0.0,
        "scorecard_weights": {
            "earnings_consistency": 20,
            "roic": 10,
            "fcf_growth": 20,
            "profit_margin": 10,
            "roe": 15,
            "debt_to_equity": 8,
            "interest_coverage": 12,
            "revenue_growth": 5,
        }
    },
    "Healthcare": {
        "model": "dcf",
        "growth_cap": 0.20,
        "terminal_rate": 0.03,
        "wacc_premium": 0.01,
        "scorecard_weights": {
            "earnings_consistency": 20,
            "roic": 18,
            "fcf_growth": 18,
            "profit_margin": 15,
            "roe": 10,
            "debt_to_equity": 10,
            "interest_coverage": 7,
            "revenue_growth": 2,
        }
    },
    "Energy": {
        "model": "dcf",
        "growth_cap": 0.15,
        "terminal_rate": 0.02,
        "wacc_premium": 0.02,
        "scorecard_weights": {
            "earnings_consistency": 15,
            "roic": 20,
            "fcf_growth": 20,
            "profit_margin": 15,
            "roe": 10,
            "debt_to_equity": 10,
            "interest_coverage": 8,
            "revenue_growth": 2,
        }
    },
    "Industrials": {
        "model": "dcf",
        "growth_cap": 0.15,
        "terminal_rate": 0.025,
        "wacc_premium": 0.0,
        "scorecard_weights": {
            "earnings_consistency": 20,
            "roic": 18,
            "fcf_growth": 15,
            "profit_margin": 12,
            "roe": 12,
            "debt_to_equity": 10,
            "interest_coverage": 8,
            "revenue_growth": 5,
        }
    },
    "Communication Services": {
        "model": "dcf",
        "growth_cap": 0.20,
        "terminal_rate": 0.03,
        "wacc_premium": 0.0,
        "scorecard_weights": {
            "earnings_consistency": 18,
            "roic": 18,
            "fcf_growth": 18,
            "profit_margin": 15,
            "roe": 12,
            "debt_to_equity": 8,
            "interest_coverage": 7,
            "revenue_growth": 4,
        }
    },
    "Consumer Discretionary": {
        "model": "dcf",
        "growth_cap": 0.20,
        "terminal_rate": 0.03,
        "wacc_premium": 0.0,
        "scorecard_weights": {
            "earnings_consistency": 20,
            "roic": 18,
            "fcf_growth": 15,
            "profit_margin": 12,
            "roe": 12,
            "debt_to_equity": 10,
            "interest_coverage": 8,
            "revenue_growth": 5,
        }
    },
    "Default": {
        "model": "dcf",
        "growth_cap": 0.25,
        "terminal_rate": 0.03,
        "wacc_premium": 0.0,
        "scorecard_weights": {
            "earnings_consistency": 20,
            "roic": 18,
            "fcf_growth": 15,
            "profit_margin": 15,
            "roe": 12,
            "debt_to_equity": 10,
            "interest_coverage": 8,
            "revenue_growth": 2,
        }
    },
}

def get_sector_profile(sector: str) -> dict:
    """Match sector string from yFinance to a profile."""
    if not sector:
        return SECTOR_PROFILES["Default"]
    for key in SECTOR_PROFILES:
        if key.lower() in sector.lower() or sector.lower() in key.lower():
            return SECTOR_PROFILES[key]
    return SECTOR_PROFILES["Default"]