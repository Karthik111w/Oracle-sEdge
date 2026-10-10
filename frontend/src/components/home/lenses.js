// Mirrors INVESTOR_PROFILES in backend/services/scorecard.py.
// Weights are the three heaviest base weights, before sector adjustment.
export const LENSES = [
  {
    value: 'buffett',
    short: 'Buffett',
    label: 'Warren Buffett',
    philosophy: 'Buy wonderful companies at fair prices and hold forever.',
    focus: 'Business quality, moat and intrinsic value.',
    weights: null, // all eight metrics weighted equally
    horizon: 'Long term',
  },
  {
    value: 'munger',
    short: 'Munger',
    label: 'Charlie Munger',
    philosophy: 'Exceptional businesses at fair prices. Quality over everything.',
    focus: 'High ROIC, wide moat, pricing power.',
    weights: [['ROIC', 25], ['Earnings consistency', 20], ['Profit margin', 18]],
    horizon: 'Long term',
  },
  {
    value: 'graham',
    short: 'Graham',
    label: 'Benjamin Graham',
    philosophy: 'Deep value and balance-sheet safety, bought with a large margin of safety.',
    focus: 'Debt safety, earnings consistency, conservative valuation.',
    weights: [['Debt to equity', 25], ['Earnings consistency', 25], ['Interest coverage', 20]],
    horizon: 'Long term',
  },
  {
    value: 'lynch',
    short: 'Lynch',
    label: 'Peter Lynch',
    philosophy: 'Find fast growers before Wall Street does. Growth at a reasonable price.',
    focus: 'Revenue acceleration, earnings growth.',
    weights: [['Revenue growth', 25], ['Earnings consistency', 20], ['FCF growth', 15]],
    horizon: 'Shorter term',
  },
  {
    value: 'oneil',
    short: "O'Neil",
    label: "William O'Neil",
    philosophy: 'Buy the strongest earnings-growth leaders breaking out to new highs.',
    focus: 'CAN SLIM: earnings acceleration, revenue momentum, leadership.',
    weights: [['Revenue growth', 30], ['Earnings consistency', 25], ['FCF growth', 20]],
    horizon: 'Shorter term',
  },
  {
    value: 'soros',
    short: 'Soros',
    label: 'George Soros',
    philosophy: 'Spot macro shifts early and ride reflexive momentum before the crowd.',
    focus: 'Revenue momentum, FCF acceleration, macro trend alignment.',
    weights: [['Revenue growth', 35], ['FCF growth', 25], ['Profit margin', 15]],
    horizon: 'Shorter term',
  },
];
