import { formatMoney } from '../home/LensVerdictCard';

export const finite = (v) => typeof v === 'number' && Number.isFinite(v);

export const money = formatMoney;

// $45.8B, $320M, $1.2T. Keeps the sign.
export function compactMoney(v) {
  if (!finite(v)) return 'n/a';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  const units = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) return `${sign}$${(abs / size).toFixed(abs / size >= 100 ? 0 : 1).replace(/\.0$/, '')}${suffix}`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

// Fraction (0.021) to "2.1%".
export const pct = (v, digits = 1) => (finite(v) ? `${(v * 100).toFixed(digits)}%` : 'n/a');

// Already a percentage number (4.2) to "+4.2%".
export const signedPct = (v, digits = 1) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(digits)}%` : 'n/a');

export const num = (v, digits = 1) => (finite(v) ? v.toFixed(digits) : 'n/a');

export const toneOf = (v) => (!finite(v) ? 'mid' : v >= 0 ? 'pos' : 'neg');
