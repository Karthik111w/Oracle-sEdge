"""
Investor-Sector Scorecard Weights
==================================
Research-backed weight matrices for each investor × sector combination.
Each row sums to 100 points across the 8 scorecard metrics.

Metrics:
  revenue_growth, earnings_consistency, fcf_growth, profit_margin,
  roe, roic, debt_to_equity, interest_coverage

Sources:
  - Buffett: Berkshire Hathaway Annual Letters, shareholder meetings, Charlie Rose interviews
  - Munger: Poor Charlie's Almanack, Daily Journal meeting transcripts
  - Graham: Security Analysis (1934/1951), The Intelligent Investor (1949)
  - Lynch: One Up On Wall Street, Beating the Street, Fidelity Magellan reports
  - O'Neil: How to Make Money in Stocks, IBD CAN SLIM methodology, IBD 50 list composition
  - Soros: The Alchemy of Finance, Soros on Soros, Open Society Foundation interviews
"""

# ---------------------------------------------------------------------------
# FULL 6 × 11 WEIGHT MATRIX
# Each sub-dict maps metric_key → integer weight (rows sum to 100)
# ---------------------------------------------------------------------------

INVESTOR_SECTOR_WEIGHTS: dict[str, dict[str, dict[str, int]]] = {

    # =========================================================================
    # WARREN BUFFETT
    # Philosophy: Economic moats, owner earnings (FCF), high ROIC/ROE,
    #             minimal debt in capital-intensive sectors.
    # Key rule: D/E and interest_coverage are irrelevant for banks & financials
    #           (deposits are operating liabilities, not funded debt).
    # Sources: Annual letters 1977-2023, Sun Valley speech 1999, CNBC interviews
    # =========================================================================
    "buffett": {
        "Technology": {
            # Historically avoided; only buys when moat is consumer-ecosystem
            # (Apple = consumer product, not tech). Emphasises ROIC, FCF, margin.
            "revenue_growth":       15,
            "earnings_consistency":  0,
            "fcf_growth":           25,
            "profit_margin":        20,
            "roe":                  15,
            "roic":                 25,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Financial Services": {
            # Core Berkshire pillar. ROE is the primary lens for banks.
            # D/E and interest_coverage explicitly irrelevant (Graham Ch.18 rule).
            "revenue_growth":       15,
            "earnings_consistency": 25,
            "fcf_growth":            0,
            "profit_margin":        20,
            "roe":                  30,
            "roic":                 10,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Consumer Cyclical": {
            # Selective — demands ROIC and balance sheet discipline.
            "revenue_growth":        0,
            "earnings_consistency": 20,
            "fcf_growth":           10,
            "profit_margin":        20,
            "roe":                   0,
            "roic":                 25,
            "debt_to_equity":       15,
            "interest_coverage":    10,
        },
        "Consumer Defensive": {
            # Quintessential Buffett sweet spot: KO, See's Candies, Kraft Heinz.
            # Pricing power = highest ROIC on minimal tangible assets.
            "revenue_growth":        0,
            "earnings_consistency": 20,
            "fcf_growth":           10,
            "profit_margin":        15,
            "roe":                  25,
            "roic":                 30,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Healthcare": {
            # Favours cash-generative pharma/diagnostics; avoids binary biotech.
            # DaVita (DVA) ~40% stake: life-sustaining, sticky FCF.
            "revenue_growth":       15,
            "earnings_consistency": 15,
            "fcf_growth":           25,
            "profit_margin":        20,
            "roe":                   0,
            "roic":                 25,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Industrials": {
            # BNSF, Precision Castparts — critical infrastructure monopolies.
            # Needs high ROIC (capital-intensive), strong FCF, and solvency.
            "revenue_growth":        0,
            "earnings_consistency": 15,
            "fcf_growth":           20,
            "profit_margin":         0,
            "roe":                   0,
            "roic":                 30,
            "debt_to_equity":       15,
            "interest_coverage":    20,
        },
        "Basic Materials": {
            # Avoids commodity businesses (no pricing power).
            # Only buys lowest-cost producers with fortress balance sheets.
            "revenue_growth":        0,
            "earnings_consistency": 10,
            "fcf_growth":            0,
            "profit_margin":        10,
            "roe":                   0,
            "roic":                 30,
            "debt_to_equity":       25,
            "interest_coverage":    25,
        },
        "Energy": {
            # OXY, CVX, PetroChina — Permian low-cost extraction + FCF return.
            "revenue_growth":        0,
            "earnings_consistency":  0,
            "fcf_growth":           30,
            "profit_margin":        15,
            "roe":                   0,
            "roic":                 25,
            "debt_to_equity":       15,
            "interest_coverage":    15,
        },
        "Utilities": {
            # BHE model: stable rate-base returns. Now cautious on wildfire risk.
            "revenue_growth":        0,
            "earnings_consistency": 25,
            "fcf_growth":            0,
            "profit_margin":        10,
            "roe":                  15,
            "roic":                  0,
            "debt_to_equity":       20,
            "interest_coverage":    30,
        },
        "Real Estate": {
            # Avoids REITs (dividend payout mandate prevents compounding).
            # Evaluates on FFO (FCF proxy), interest coverage, debt safety.
            "revenue_growth":        0,
            "earnings_consistency": 15,
            "fcf_growth":           30,
            "profit_margin":        10,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       20,
            "interest_coverage":    25,
        },
        "Communication Services": {
            # Charter, Liberty, Sirius — recurring subscriber FCF + buybacks.
            "revenue_growth":       10,
            "earnings_consistency": 15,
            "fcf_growth":           30,
            "profit_margin":        20,
            "roe":                   0,
            "roic":                 25,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
    },

    # =========================================================================
    # CHARLIE MUNGER
    # Philosophy: Ultra-high incremental ROIC, pricing power (profit_margin),
    #             Lollapalooza effects, scale economics shared with customers.
    # Key rule: Same D/E exemption as Buffett for financials.
    #           Despises commodity businesses and fast-fashion retail.
    # Sources: Poor Charlie's Almanack, Wesco & Daily Journal annual meetings
    # =========================================================================
    "munger": {
        "Technology": {
            # TSMC, BYD — winner-take-all economic moats. Max ROIC + margin.
            "revenue_growth":       20,
            "earnings_consistency":  0,
            "fcf_growth":           20,
            "profit_margin":        25,
            "roe":                   0,
            "roic":                 35,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Financial Services": {
            # Wesco, Daily Journal portfolio (WFC, BAC, USB). ROE is king.
            "revenue_growth":        0,
            "earnings_consistency": 25,
            "fcf_growth":            0,
            "profit_margin":        20,
            "roe":                  35,
            "roic":                 20,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Consumer Cyclical": {
            # Costco director for 26 years. Scale economics shared = ROIC moat.
            "revenue_growth":       25,
            "earnings_consistency": 10,
            "fcf_growth":            0,
            "profit_margin":        20,
            "roe":                   0,
            "roic":                 35,
            "debt_to_equity":       10,
            "interest_coverage":     0,
        },
        "Consumer Defensive": {
            # See's Candies taught Munger that pricing power = ROIC miracle.
            # Maximum ROIC and ROE emphasis.
            "revenue_growth":        0,
            "earnings_consistency": 15,
            "fcf_growth":            0,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                 40,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Healthcare": {
            # Medical IP and diagnostics with switching costs.
            "revenue_growth":        0,
            "earnings_consistency": 20,
            "fcf_growth":           20,
            "profit_margin":        25,
            "roe":                   0,
            "roic":                 35,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Industrials": {
            # Engineering excellence: Precision Castparts, BNSF, Marmon.
            "revenue_growth":        0,
            "earnings_consistency": 10,
            "fcf_growth":           25,
            "profit_margin":         0,
            "roe":                   0,
            "roic":                 35,
            "debt_to_equity":       10,
            "interest_coverage":    20,
        },
        "Basic Materials": {
            # Despises commodities — only lowest-cost producers with moats.
            "revenue_growth":        0,
            "earnings_consistency":  0,
            "fcf_growth":            0,
            "profit_margin":        15,
            "roe":                   0,
            "roic":                 35,
            "debt_to_equity":       25,
            "interest_coverage":    25,
        },
        "Energy": {
            # Long-term royalty assets and low-cost reserves (OXY, CVX).
            "revenue_growth":        0,
            "earnings_consistency":  0,
            "fcf_growth":           30,
            "profit_margin":        10,
            "roe":                   0,
            "roic":                 30,
            "debt_to_equity":       10,
            "interest_coverage":    20,
        },
        "Utilities": {
            # Stable capital sinks, cautious on regulatory suppression.
            "revenue_growth":        0,
            "earnings_consistency": 25,
            "fcf_growth":            0,
            "profit_margin":         0,
            "roe":                  20,
            "roic":                  0,
            "debt_to_equity":       25,
            "interest_coverage":    30,
        },
        "Real Estate": {
            # Knows real estate math; avoids REITs for compounding reasons.
            "revenue_growth":        0,
            "earnings_consistency":  0,
            "fcf_growth":           25,
            "profit_margin":         0,
            "roe":                   0,
            "roic":                 30,
            "debt_to_equity":       20,
            "interest_coverage":    25,
        },
        "Communication Services": {
            # Daily Journal legal monopoly model. Despises streaming capex wars.
            "revenue_growth":        0,
            "earnings_consistency": 15,
            "fcf_growth":           25,
            "profit_margin":        25,
            "roe":                   0,
            "roic":                 35,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
    },

    # =========================================================================
    # BENJAMIN GRAHAM
    # Philosophy: Verified balance sheet assets, tangible margin of safety,
    #             10-year earnings record, low debt across industrial sectors.
    # Key rules:
    #   - D/E and interest_coverage = 0 for Financial Services & banks
    #     (deposits are operating liabilities per Security Analysis Ch.18 & 44)
    #   - Utilities: allowed higher D/E (up to 2.0x) due to regulated rate base,
    #     but interest_coverage >= 3.0x mandatory (per Security Analysis)
    #   - Tech: strict avoidance (speculative growth violates investment definition)
    # Sources: Security Analysis (1934/1951), The Intelligent Investor (1949)
    # =========================================================================
    "graham": {
        "Technology": {
            # Explicitly avoided — future growth projections violate margin of safety.
            # If forced to score: earnings stability and balance sheet safety only.
            "revenue_growth":        0,
            "earnings_consistency": 35,
            "fcf_growth":            0,
            "profit_margin":        15,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       25,
            "interest_coverage":    25,
        },
        "Financial Services": {
            # GEICO investment 1948 — deep value below tangible book.
            # D/E irrelevant for banks; ROE and 10-year earnings consistency rule.
            "revenue_growth":       10,
            "earnings_consistency": 35,
            "fcf_growth":            0,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                 10,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Consumer Cyclical": {
            # Net-net cigar butts during recessions. Strict D/E to avoid bankruptcy.
            "revenue_growth":        0,
            "earnings_consistency": 25,
            "fcf_growth":            0,
            "profit_margin":        10,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       30,
            "interest_coverage":    25,
        },
        "Consumer Defensive": {
            # Defensive investor core — KO, P&G, 20yr dividend records.
            "revenue_growth":        0,
            "earnings_consistency": 35,
            "fcf_growth":            0,
            "profit_margin":        15,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       20,
            "interest_coverage":    20,
        },
        "Healthcare": {
            # Mature pharma with 10yr earnings and low debt. Excludes biotech.
            "revenue_growth":        0,
            "earnings_consistency": 35,
            "fcf_growth":            0,
            "profit_margin":        15,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       20,
            "interest_coverage":    20,
        },
        "Industrials": {
            # Classic net-net hunting ground. Current Ratio >= 2, D/E < 1.
            "revenue_growth":        0,
            "earnings_consistency": 25,
            "fcf_growth":            0,
            "profit_margin":        10,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       30,
            "interest_coverage":    25,
        },
        "Basic Materials": {
            # Steel/mining bought below NCAV in depressions. Max solvency focus.
            "revenue_growth":        0,
            "earnings_consistency": 20,
            "fcf_growth":            0,
            "profit_margin":        10,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       30,
            "interest_coverage":    30,
        },
        "Energy": {
            # Integrated oil majors at low P/E and P/B.
            "revenue_growth":        0,
            "earnings_consistency": 25,
            "fcf_growth":            0,
            "profit_margin":        15,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       25,
            "interest_coverage":    25,
        },
        "Utilities": {
            # Premier defensive sector per The Intelligent Investor.
            # Special rule: D/E up to 2.0x permitted; interest_coverage >= 3x critical.
            "revenue_growth":        0,
            "earnings_consistency": 30,
            "fcf_growth":            0,
            "profit_margin":         5,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       20,
            "interest_coverage":    35,
        },
        "Real Estate": {
            # Asset value play; physical liquidation value > market cap.
            "revenue_growth":        0,
            "earnings_consistency": 20,
            "fcf_growth":            0,
            "profit_margin":        10,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       30,
            "interest_coverage":    30,
        },
        "Communication Services": {
            # AT&T treated as defensive utility proxy with unbroken dividends.
            "revenue_growth":        0,
            "earnings_consistency": 30,
            "fcf_growth":            0,
            "profit_margin":        10,
            "roe":                   5,
            "roic":                  0,
            "debt_to_equity":       20,
            "interest_coverage":    35,
        },
    },

    # =========================================================================
    # PETER LYNCH
    # Philosophy: 6 stock categories (Fast Growers, Stalwarts, Cyclicals,
    #             Turnarounds, Asset Plays, Slow Growers). PEG ratio < 1.0.
    # Key rules:
    #   - Fast Growers (Tech, Consumer Cyclical, Healthcare): max revenue_growth
    #   - Cyclicals (Industrials, Basic Materials, Energy): max D/E + interest_coverage
    #   - Stalwarts (Consumer Defensive, Comms): balance earnings + margins
    #   - Financials: ROE + earnings consistency (S&L demutualizations play)
    # Sources: One Up On Wall Street, Beating the Street, Magellan annual reports
    # =========================================================================
    "lynch": {
        "Technology": {
            # "Fast Growers" — ADP, Micron at cyclical bottom. Clean balance sheets.
            "revenue_growth":       30,
            "earnings_consistency":  0,
            "fcf_growth":           20,
            "profit_margin":        20,
            "roe":                   0,
            "roic":                 15,
            "debt_to_equity":       15,
            "interest_coverage":     0,
        },
        "Financial Services": {
            # Fannie Mae, S&L demutualizations. ROE + earnings consistency.
            "revenue_growth":       20,
            "earnings_consistency": 25,
            "fcf_growth":            0,
            "profit_margin":        15,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":       15,
            "interest_coverage":     0,
        },
        "Consumer Cyclical": {
            # Signature Lynch hunting ground — retail rollouts (Gap, Home Depot).
            # FCF-funded expansion mandatory; if debt rises while comps slow, sell.
            "revenue_growth":       30,
            "earnings_consistency": 20,
            "fcf_growth":           10,
            "profit_margin":        15,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       15,
            "interest_coverage":    10,
        },
        "Consumer Defensive": {
            # "Stalwarts" — Kellogg, P&G, Colgate. Portfolio shock absorbers.
            "revenue_growth":       15,
            "earnings_consistency": 30,
            "fcf_growth":           20,
            "profit_margin":        20,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       15,
            "interest_coverage":     0,
        },
        "Healthcare": {
            # "Fast Growers" — Medtronic, Humana, HMO expansion.
            "revenue_growth":       25,
            "earnings_consistency": 15,
            "fcf_growth":           25,
            "profit_margin":        20,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       15,
            "interest_coverage":     0,
        },
        "Industrials": {
            # "Cyclicals / Turnarounds" — Chrysler 1982 Iacocca play.
            # Strict solvency check to survive the downcycle.
            "revenue_growth":        0,
            "earnings_consistency": 15,
            "fcf_growth":           20,
            "profit_margin":        15,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       25,
            "interest_coverage":    25,
        },
        "Basic Materials": {
            # "Cyclicals" — warns P/E looks cheap at peak, expensive at trough.
            "revenue_growth":        0,
            "earnings_consistency": 10,
            "fcf_growth":           20,
            "profit_margin":        15,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       30,
            "interest_coverage":    25,
        },
        "Energy": {
            # "Asset Plays" — Schlumberger at zero-debt when rigs idle.
            "revenue_growth":       10,
            "earnings_consistency":  0,
            "fcf_growth":           30,
            "profit_margin":        15,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       25,
            "interest_coverage":    20,
        },
        "Utilities": {
            # "Slow Growers / Turnarounds" — GPU after Three Mile Island.
            "revenue_growth":        0,
            "earnings_consistency": 25,
            "fcf_growth":           15,
            "profit_margin":        10,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       20,
            "interest_coverage":    30,
        },
        "Real Estate": {
            # "Asset Plays" — Pebble Beach land at historical cost.
            "revenue_growth":        0,
            "earnings_consistency": 15,
            "fcf_growth":           25,
            "profit_margin":        10,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       25,
            "interest_coverage":    25,
        },
        "Communication Services": {
            # "Fast Growers / Stalwarts" — Baby Bells, TCI cable subscription.
            "revenue_growth":       25,
            "earnings_consistency": 15,
            "fcf_growth":           25,
            "profit_margin":        20,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       15,
            "interest_coverage":     0,
        },
    },

    # =========================================================================
    # WILLIAM O'NEIL (CAN SLIM)
    # Philosophy: Buy the strongest earnings/revenue growth leaders breaking out
    #             to new highs with institutional sponsorship (RSI >= 80–90).
    # Key rules:
    #   - C: Current quarterly EPS up 25%+, revenue up 25%+
    #   - A: Annual EPS growth 25-50%+, ROE >= 17% mandatory
    #   - D/E and interest_coverage virtually ignored (growth trumps safety)
    #   - Utilities explicitly labelled "defensive laggards" — avoid
    # Sources: How to Make Money in Stocks (4th ed.), IBD CAN SLIM manual
    # =========================================================================
    "oneil": {
        "Technology": {
            # #1 source of CAN SLIM market leaders: MSFT, CSCO, AAPL, NVDA.
            "revenue_growth":       35,
            "earnings_consistency": 10,
            "fcf_growth":           10,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Financial Services": {
            # Only fast-growing fintech/brokerage booms (Schwab 1990s).
            "revenue_growth":       30,
            "earnings_consistency": 20,
            "fcf_growth":            0,
            "profit_margin":        15,
            "roe":                  35,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Consumer Cyclical": {
            # Walmart, Home Depot, Starbucks, Lululemon — roll-out fast growers.
            "revenue_growth":       35,
            "earnings_consistency": 10,
            "fcf_growth":           10,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Consumer Defensive": {
            # Normally avoided as laggard; only if viral new product EPS surge.
            "revenue_growth":       30,
            "earnings_consistency": 15,
            "fcf_growth":           10,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Healthcare": {
            # #2 pillar: FDA approvals, ISRG, Amgen, Dexcom. Earnings breakouts.
            "revenue_growth":       35,
            "earnings_consistency": 10,
            "fcf_growth":           10,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Industrials": {
            # Only when sector group ranks top 10-20 of IBD 197 groups.
            "revenue_growth":       30,
            "earnings_consistency": 20,
            "fcf_growth":           10,
            "profit_margin":        15,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Basic Materials": {
            # Potash/Mosaic 2007-08 ag supercycle — only when group is #1.
            "revenue_growth":       35,
            "earnings_consistency": 10,
            "fcf_growth":           10,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Energy": {
            # Only in commodity supercycles (1973-79, 2004-08, 2021-22).
            "revenue_growth":       35,
            "earnings_consistency":  0,
            "fcf_growth":           20,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Utilities": {
            # Explicitly "defensive laggards" — screen for any growth outliers.
            "revenue_growth":       30,
            "earnings_consistency": 20,
            "fcf_growth":            0,
            "profit_margin":        20,
            "roe":                  30,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Real Estate": {
            # Homebuilders (Lennar, NVR) during housing boom; not REITs.
            "revenue_growth":       35,
            "earnings_consistency": 10,
            "fcf_growth":           10,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Communication Services": {
            # Digital media leaders; avoids legacy telecom slow-growers.
            "revenue_growth":       35,
            "earnings_consistency": 10,
            "fcf_growth":           10,
            "profit_margin":        20,
            "roe":                  25,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
    },

    # =========================================================================
    # GEORGE SOROS
    # Philosophy: Reflexivity theory — market prices shape fundamentals (and
    #             vice versa), creating boom-bust cycles. Identify macro shifts
    #             early, ride momentum, exit before the trend reverses.
    # Key rules:
    #   - Revenue momentum is the primary early signal of reflexive boom
    #   - FCF acceleration confirms the trend is real, not just optically inflated
    #   - In Financials/Real Estate: D/E is a reflexivity SIGNAL (rising leverage
    #     = boom phase; credit contraction = bust signal) — weight it differently
    #   - Consumer Defensive: boring, no macro momentum — minimal interest
    # Sources: The Alchemy of Finance (1987), Soros on Soros (1995),
    #          Open Society Foundation memoirs, Quantum Fund 13-F filings
    # =========================================================================
    "soros": {
        "Technology": {
            # Secular macro growth trend (internet 1999, AI 2023-present).
            # Revenue momentum + FCF acceleration = reflexive boom signal.
            "revenue_growth":       40,
            "earnings_consistency":  5,
            "fcf_growth":           25,
            "profit_margin":        20,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Financial Services": {
            # Broke the Bank of England (1992 sterling). Reflexivity core sector.
            # Rising D/E signals boom; D/E contraction signals bust.
            # Revenue_growth + ROE = confirmation of reflexive credit expansion.
            "revenue_growth":       30,
            "earnings_consistency": 15,
            "fcf_growth":            0,
            "profit_margin":        10,
            "roe":                  30,
            "roic":                  0,
            "debt_to_equity":       15,
            "interest_coverage":     0,
        },
        "Consumer Cyclical": {
            # Macro consumer spending cycle plays. Revenue + FCF momentum.
            "revenue_growth":       35,
            "earnings_consistency":  5,
            "fcf_growth":           25,
            "profit_margin":        20,
            "roe":                  15,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Consumer Defensive": {
            # Least interesting to Soros — stable, no macro momentum signal.
            # Equal-weight across available metrics as a neutral holding.
            "revenue_growth":       20,
            "earnings_consistency": 20,
            "fcf_growth":           20,
            "profit_margin":        20,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":       10,
            "interest_coverage":     0,
        },
        "Healthcare": {
            # Macro pharma regulatory tailwinds + demographic boom.
            "revenue_growth":       35,
            "earnings_consistency":  5,
            "fcf_growth":           25,
            "profit_margin":        25,
            "roe":                  10,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
        "Industrials": {
            # Macro capex cycle plays. FCF + revenue acceleration = boom signal.
            "revenue_growth":       30,
            "earnings_consistency":  0,
            "fcf_growth":           30,
            "profit_margin":        10,
            "roe":                   5,
            "roic":                  0,
            "debt_to_equity":       10,
            "interest_coverage":    15,
        },
        "Basic Materials": {
            # Commodity supercycle macro plays (gold, copper, lithium).
            "revenue_growth":       30,
            "earnings_consistency":  0,
            "fcf_growth":           30,
            "profit_margin":        10,
            "roe":                   5,
            "roic":                  0,
            "debt_to_equity":       10,
            "interest_coverage":    15,
        },
        "Energy": {
            # Oil macro cycle core Soros play. Revenue + FCF momentum dominant.
            "revenue_growth":       35,
            "earnings_consistency":  0,
            "fcf_growth":           35,
            "profit_margin":        10,
            "roe":                   0,
            "roic":                  0,
            "debt_to_equity":       10,
            "interest_coverage":    10,
        },
        "Utilities": {
            # Infrastructure macro — rising rate environment signals bust.
            # D/E elevated = reflexive warning. Interest coverage critical.
            "revenue_growth":       15,
            "earnings_consistency": 20,
            "fcf_growth":           10,
            "profit_margin":        10,
            "roe":                   5,
            "roic":                  0,
            "debt_to_equity":       25,
            "interest_coverage":    15,
        },
        "Real Estate": {
            # Reflexivity poster child: rising prices → more lending → more prices.
            # D/E rising = boom signal; collateral spiral. FCF confirms real income.
            "revenue_growth":       25,
            "earnings_consistency":  5,
            "fcf_growth":           20,
            "profit_margin":         5,
            "roe":                   5,
            "roic":                  0,
            "debt_to_equity":       25,
            "interest_coverage":    15,
        },
        "Communication Services": {
            # Digital media macro secular growth. Revenue + FCF momentum.
            "revenue_growth":       40,
            "earnings_consistency":  5,
            "fcf_growth":           30,
            "profit_margin":        20,
            "roe":                   5,
            "roic":                  0,
            "debt_to_equity":        0,
            "interest_coverage":     0,
        },
    },
}

# ---------------------------------------------------------------------------
# SECTOR NAME NORMALIZER
# yFinance returns different sector names than GICS standards.
# Map all known variants to our canonical keys.
# ---------------------------------------------------------------------------
_SECTOR_ALIASES: dict[str, str] = {
    # yFinance → canonical key in INVESTOR_SECTOR_WEIGHTS
    "consumer cyclical":       "Consumer Cyclical",
    "consumer discretionary":  "Consumer Cyclical",
    "consumer defensive":      "Consumer Defensive",
    "consumer staples":        "Consumer Defensive",
    "financial services":      "Financial Services",
    "financial":               "Financial Services",
    "financials":              "Financial Services",
    "technology":              "Technology",
    "information technology":  "Technology",
    "healthcare":              "Healthcare",
    "health care":             "Healthcare",
    "industrials":             "Industrials",
    "industrial":              "Industrials",
    "basic materials":         "Basic Materials",
    "materials":               "Basic Materials",
    "energy":                  "Energy",
    "utilities":               "Utilities",
    "real estate":             "Real Estate",
    "communication services":  "Communication Services",
    "communications":          "Communication Services",
    "telecom":                 "Communication Services",
}


def _normalize_sector(sector: str) -> str:
    """Normalize a yFinance sector string to our canonical key."""
    if not sector:
        return ""
    return _SECTOR_ALIASES.get(sector.strip().lower(), sector.strip())


# ---------------------------------------------------------------------------
# HORIZON ADJUSTMENT
# Short-term investors boost revenue_growth and fcf_growth,
# and reduce patience-based metrics (earnings_consistency, roic).
# Applied proportionally then renormalized.
# ---------------------------------------------------------------------------
_SHORT_TERM_MULTIPLIERS: dict[str, float] = {
    "revenue_growth":       1.25,
    "fcf_growth":           1.20,
    "earnings_consistency": 0.80,
    "roic":                 0.85,
    "profit_margin":        1.00,
    "roe":                  1.00,
    "debt_to_equity":       1.00,
    "interest_coverage":    1.00,
}


def _apply_horizon(weights: dict[str, int], horizon: str) -> dict[str, float]:
    """Apply horizon multipliers and return adjusted (un-normalized) weights."""
    if horizon != "short":
        return {k: float(v) for k, v in weights.items()}
    adjusted = {k: v * _SHORT_TERM_MULTIPLIERS.get(k, 1.0) for k, v in weights.items()}
    return adjusted


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------

def get_investor_sector_weights(
    investor_key: str,
    sector: str,
    horizon: str = "long",
) -> dict[str, float]:
    """
    Return scorecard weights (summing to 100) for the given investor × sector.

    Falls back to a simple equal-weight default if the combination is not found.
    Applies horizon adjustment (short vs. long term) before returning.
    """
    investor_data = INVESTOR_SECTOR_WEIGHTS.get(investor_key)
    if not investor_data:
        # Unknown investor — fall back to Buffett
        investor_data = INVESTOR_SECTOR_WEIGHTS["buffett"]

    canonical_sector = _normalize_sector(sector)
    raw_weights = investor_data.get(canonical_sector)

    if not raw_weights:
        # Sector not found — compute investor average across all sectors
        all_metrics = list(next(iter(investor_data.values())).keys())
        raw_weights = {
            metric: round(
                sum(s.get(metric, 0) for s in investor_data.values()) / len(investor_data),
                1,
            )
            for metric in all_metrics
        }

    # Apply horizon adjustment
    adjusted = _apply_horizon(raw_weights, horizon)

    # Normalize to 100
    total = sum(adjusted.values())
    if total == 0:
        n = len(adjusted)
        return {k: round(100.0 / n, 2) for k in adjusted}

    return {k: round(v * 100.0 / total, 2) for k, v in adjusted.items()}
