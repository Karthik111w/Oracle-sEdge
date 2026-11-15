// Backend ratios (return, volatility, drawdown, weights) are fractions (0.12 = 12%); the *FromFraction
// helpers multiply by 100. Day change and margin of safety are already percent points: use signedPoints.
export const pctFromFraction = (v, digits = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : 'n/a');

export const signedPctFromFraction = (v, digits = 1) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${(v * 100).toFixed(digits)}%` : 'n/a');

// For values already in percent units (day change, margin of safety).
export const signedPoints = (v, digits = 2) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(digits)}%` : 'n/a');

export const num = (v, digits = 2) => (Number.isFinite(v) ? v.toFixed(digits) : 'n/a');

export const tone = (v) => (!Number.isFinite(v) || v === 0 ? '' : v > 0 ? 'tone-pos' : 'tone-neg');
