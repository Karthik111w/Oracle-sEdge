// Weights are each investor's long-term weights averaged across sectors, from
// INVESTOR_SECTOR_WEIGHTS in backend/services/investor_sector_weights.py. They are also
// what the scorecard uses when a company's sector can't be identified. A company in a
// known sector is scored with that sector's own weights, so its analysis can differ.
export const METRICS = [
  ['earnings_consistency', 'Earnings consistency'],
  ['roic', 'ROIC'],
  ['fcf_growth', 'FCF growth'],
  ['profit_margin', 'Profit margin'],
  ['roe', 'ROE'],
  ['debt_to_equity', 'Debt to equity'],
  ['interest_coverage', 'Interest coverage'],
  ['revenue_growth', 'Revenue growth'],
];

export const LENSES = [
  {
    value: 'buffett',
    short: 'Buffett',
    label: 'Warren Buffett',
    philosophy: 'Buy wonderful companies at fair prices and hold forever.',
    focus: 'Business quality, moat and intrinsic value.',
    horizon: 'Long term',
    weights: { roic: 22.6, fcf_growth: 15.9, earnings_consistency: 15.4, profit_margin: 14.1, interest_coverage: 11.1, debt_to_equity: 9.7, roe: 7.5, revenue_growth: 3.8 },
  },
  {
    value: 'munger',
    short: 'Munger',
    label: 'Charlie Munger',
    philosophy: 'Exceptional businesses at fair prices. Quality over everything.',
    focus: 'High ROIC, wide moat, pricing power.',
    horizon: 'Long term',
    weights: { roic: 34.5, profit_margin: 14.8, fcf_growth: 12.4, earnings_consistency: 10.7, interest_coverage: 9.8, debt_to_equity: 8.2, roe: 6.8, revenue_growth: 2.8 },
  },
  {
    value: 'graham',
    short: 'Graham',
    label: 'Benjamin Graham',
    philosophy: 'Deep value and balance-sheet safety, bought with a large margin of safety.',
    focus: 'Debt safety, earnings consistency, conservative valuation.',
    horizon: 'Long term',
    weights: { earnings_consistency: 29.9, interest_coverage: 25.6, debt_to_equity: 23.7, profit_margin: 10.8, roe: 8.8, roic: 0.8, revenue_growth: 0.6, fcf_growth: 0.0 },
  },
  {
    value: 'lynch',
    short: 'Lynch',
    label: 'Peter Lynch',
    philosophy: 'Find fast growers before Wall Street does. Growth at a reasonable price.',
    focus: 'Revenue acceleration, earnings growth.',
    horizon: 'Shorter term',
    weights: { fcf_growth: 19.6, debt_to_equity: 19.1, earnings_consistency: 16.6, profit_margin: 15.6, revenue_growth: 13.8, interest_coverage: 11.5, roe: 2.3, roic: 1.4 },
  },
  {
    value: 'oneil',
    short: "O'Neil",
    label: "William O'Neil",
    philosophy: 'Buy the strongest earnings-growth leaders breaking out to new highs.',
    focus: 'CAN SLIM: earnings acceleration, revenue momentum, leadership.',
    horizon: 'Shorter term',
    weights: { roe: 29.1, revenue_growth: 28.6, profit_margin: 20.1, earnings_consistency: 13.0, fcf_growth: 9.2, roic: 0.0, debt_to_equity: 0.0, interest_coverage: 0.0 },
  },
  {
    value: 'soros',
    short: 'Soros',
    label: 'George Soros',
    philosophy: 'Spot macro shifts early and ride reflexive momentum before the crowd.',
    focus: 'Revenue momentum, FCF acceleration, macro trend alignment.',
    horizon: 'Shorter term',
    weights: { revenue_growth: 28.3, fcf_growth: 23.3, profit_margin: 14.9, debt_to_equity: 9.8, roe: 9.3, earnings_consistency: 7.8, interest_coverage: 6.6, roic: 0.0 },
  },
];

// Weights as percentages of the lens total, largest first.
export function weightShares(lens) {
  const total = Object.values(lens.weights).reduce((a, b) => a + b, 0);
  return METRICS.map(([key, name]) => ({ key, name, share: (lens.weights[key] / total) * 100 })).sort((a, b) => b.share - a.share);
}

// A metric counts only when it has weight and Yahoo Finance supplied the inputs
// (the backend sends score: null, value "N/A" when data is missing).
export const isScored = (m) => m.max > 0 && Number.isFinite(m.score);
