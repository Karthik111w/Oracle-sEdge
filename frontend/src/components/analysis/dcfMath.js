// Same maths as backend/services/dcf.py `_project`: growth fades linearly from the starting
// rate in year 1 to the terminal rate in the final year, then the stream grows at the
// terminal rate forever (Gordon growth), discounted back to today.
export const MIN_RATE_SPREAD = 0.04;

export function projectDcf({ base, growth, discount, terminal, years }) {
  let value = base;
  let pv = 0;
  for (let year = 1; year <= years; year += 1) {
    const fade = years > 1 ? (year - 1) / (years - 1) : 1;
    const g = growth + (terminal - growth) * fade;
    value *= 1 + g;
    pv += value / (1 + discount) ** year;
  }
  const terminalValue = (value * (1 + terminal)) / (discount - terminal);
  return pv + terminalValue / (1 + discount) ** years;
}

// Per-share fair value, or null when an input is missing or the rates make no sense.
export function fairValuePerShare({ base, growth, discount, terminal, years, shares }) {
  if (![base, growth, discount, terminal, years, shares].every(Number.isFinite)) return null;
  if (shares <= 0 || years < 1 || discount - terminal < MIN_RATE_SPREAD - 1e-9) return null;
  return projectDcf({ base, growth, discount, terminal, years }) / shares;
}

// Margin of safety as the backend defines it: (fair value - price) / fair value, in percent.
export function marginOfSafety(fair, price) {
  if (!Number.isFinite(fair) || !Number.isFinite(price) || fair <= 0) return null;
  return ((fair - price) / fair) * 100;
}
