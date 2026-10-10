// Mirrors INVESTOR_PROFILES in backend/services/scorecard.py.
// Weights are the base weights before sector adjustment; each lens sums to 100
// except Buffett, which weights all eight metrics equally.
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
    weights: { earnings_consistency: 1, roic: 1, fcf_growth: 1, profit_margin: 1, roe: 1, debt_to_equity: 1, interest_coverage: 1, revenue_growth: 1 },
  },
  {
    value: 'munger',
    short: 'Munger',
    label: 'Charlie Munger',
    philosophy: 'Exceptional businesses at fair prices. Quality over everything.',
    focus: 'High ROIC, wide moat, pricing power.',
    horizon: 'Long term',
    weights: { roic: 25, earnings_consistency: 20, profit_margin: 18, fcf_growth: 15, roe: 10, debt_to_equity: 7, interest_coverage: 4, revenue_growth: 1 },
  },
  {
    value: 'graham',
    short: 'Graham',
    label: 'Benjamin Graham',
    philosophy: 'Deep value and balance-sheet safety, bought with a large margin of safety.',
    focus: 'Debt safety, earnings consistency, conservative valuation.',
    horizon: 'Long term',
    weights: { debt_to_equity: 25, earnings_consistency: 25, interest_coverage: 20, profit_margin: 10, roe: 8, revenue_growth: 5, roic: 5, fcf_growth: 2 },
  },
  {
    value: 'lynch',
    short: 'Lynch',
    label: 'Peter Lynch',
    philosophy: 'Find fast growers before Wall Street does. Growth at a reasonable price.',
    focus: 'Revenue acceleration, earnings growth.',
    horizon: 'Shorter term',
    weights: { revenue_growth: 25, earnings_consistency: 20, fcf_growth: 15, profit_margin: 15, roe: 10, roic: 8, debt_to_equity: 5, interest_coverage: 2 },
  },
  {
    value: 'oneil',
    short: "O'Neil",
    label: "William O'Neil",
    philosophy: 'Buy the strongest earnings-growth leaders breaking out to new highs.',
    focus: 'CAN SLIM: earnings acceleration, revenue momentum, leadership.',
    horizon: 'Shorter term',
    weights: { revenue_growth: 30, earnings_consistency: 25, fcf_growth: 20, profit_margin: 15, roe: 5, roic: 3, debt_to_equity: 1, interest_coverage: 1 },
  },
  {
    value: 'soros',
    short: 'Soros',
    label: 'George Soros',
    philosophy: 'Spot macro shifts early and ride reflexive momentum before the crowd.',
    focus: 'Revenue momentum, FCF acceleration, macro trend alignment.',
    horizon: 'Shorter term',
    weights: { revenue_growth: 35, fcf_growth: 25, profit_margin: 15, earnings_consistency: 10, roe: 8, roic: 5, debt_to_equity: 1, interest_coverage: 1 },
  },
];

// Weights as percentages of the lens total, largest first.
export function weightShares(lens) {
  const total = Object.values(lens.weights).reduce((a, b) => a + b, 0);
  return METRICS.map(([key, name]) => ({ key, name, share: (lens.weights[key] / total) * 100 })).sort((a, b) => b.share - a.share);
}
