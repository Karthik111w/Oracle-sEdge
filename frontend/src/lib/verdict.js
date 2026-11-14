import { LENSES } from '../components/home/lenses';

// The backend sends two fields: `classification` is always one of Buy / Watchlist / Hold /
// Avoid (or "ETF Index"); `classification_label` is the wording for the chosen horizon
// (short term reads Trade / Watch / Pass / Avoid). Filter, count and colour on the first,
// display the second.
export const VERDICTS = ['Buy', 'Watchlist', 'Hold', 'Avoid'];

const TONE = { Buy: 'pos', Avoid: 'neg' };

export const verdictTone = (classification) => TONE[classification] || 'mid';

export const verdictLabel = (row) => row?.classification_label || row?.classification || 'n/a';

// Margin of safety is (fair value - price) / fair value, in percent points. It has no lower
// bound, so a price far above fair value reads as thousands of percent; cap what is shown.
export function marginText(marginPct) {
  if (!Number.isFinite(marginPct)) return 'n/a';
  if (marginPct < -999) return 'below -999%';
  return `${marginPct > 0 ? '+' : ''}${marginPct.toFixed(1)}%`;
}

// One set of control options for every page.
export const LENS_OPTIONS = LENSES.map((l) => ({ value: l.value, label: l.label }));
export const LENS_OPTIONS_SHORT = LENSES.map((l) => ({ value: l.value, label: l.short }));
export const HORIZON_OPTIONS = [
  { value: 'long', label: 'Long term' },
  { value: 'short', label: 'Short term' },
];

export const lensLabel = (value) => LENSES.find((l) => l.value === value)?.label || value;
export const cleanHorizon = (value) => (value === 'short' ? 'short' : 'long');
export const cleanLens = (value) => (LENSES.some((l) => l.value === value) ? value : 'buffett');

// What the valuation model discounts, for copy: "free cash flow", "earnings", "dividends".
export function cashStreamNoun(valuationModel) {
  if (valuationModel === 'earnings_based') return 'earnings';
  if (valuationModel === 'ddm' || valuationModel === 'ffo') return 'dividends';
  return 'free cash flow';
}
