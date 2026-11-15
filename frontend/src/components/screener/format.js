import { verdictLabel } from '../../lib/verdict';

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function fmtCap(v) {
  if (!isNum(v)) return 'n/a';
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString('en-US')}`;
}

export const fmtPrice = (v) => (isNum(v) ? v.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'n/a');

export const fmtSigned = (v, digits = 1) => (isNum(v) ? `${v > 0 ? '+' : ''}${v.toFixed(digits)}%` : 'n/a');

export const fmtPlain = (v, digits = 1) => (isNum(v) ? v.toFixed(digits) : 'n/a');

export const toneOf = (v) => (isNum(v) ? (v >= 0 ? 'pos' : 'neg') : 'mid');

const round = (v, digits) => (isNum(v) ? Number(v.toFixed(digits)) : null);

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function rowsToCsv(rows) {
  const header = ['Ticker', 'Name', 'Sector', 'Price', 'Day change %', 'Market cap', 'Score', 'Grade', 'Verdict', 'Margin of safety %', 'Fair value', 'P/E', 'Dividend yield %', 'Risk flags'];
  const lines = rows.map((r) =>
    [
      r.ticker,
      r.name,
      r.sector,
      round(r.price, 2),
      round(r.change_pct, 2),
      isNum(r.market_cap) ? Math.round(r.market_cap) : null,
      round(r.score, 1),
      r.grade,
      verdictLabel(r),
      round(r.margin_pct, 2),
      round(r.intrinsic_value, 2),
      round(r.pe, 2),
      round(isNum(r.dividend_yield) ? r.dividend_yield * 100 : null, 2),
      r.risk_flags,
    ]
      .map(csvCell)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

export function downloadCsv(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
