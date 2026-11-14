export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const VERDICTS = ['Buy', 'Watchlist', 'Hold', 'Avoid'];
export const VERDICT_TONE = { Buy: 'pos', Avoid: 'neg' };

export const verdictOf = (row) => row.classification_label || row.classification || null;

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
      r.price,
      isNum(r.change_pct) ? r.change_pct.toFixed(2) : null,
      r.market_cap,
      isNum(r.score) ? r.score.toFixed(1) : null,
      r.grade,
      verdictOf(r),
      r.margin_pct,
      r.intrinsic_value,
      isNum(r.pe) ? r.pe.toFixed(2) : null,
      isNum(r.dividend_yield) ? (r.dividend_yield * 100).toFixed(2) : null,
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
