// Backend ratios (return, volatility, drawdown, weights) are fractions; scores and day change are not.
export const pct = (v, digits = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : 'n/a');

export const signedPct = (v, digits = 1) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${(v * 100).toFixed(digits)}%` : 'n/a');

// For values already in percent units (day change, margin of safety).
export const signedPoints = (v, digits = 2) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(digits)}%` : 'n/a');

export const num = (v, digits = 2) => (Number.isFinite(v) ? v.toFixed(digits) : 'n/a');

export const tone = (v) => (!Number.isFinite(v) || v === 0 ? '' : v > 0 ? 'tone-pos' : 'tone-neg');
