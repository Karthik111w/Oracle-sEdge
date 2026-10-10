import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { getStockAnalysis } from '../api/client';
import SegmentedControl from '../components/SegmentedControl';
import { displayName, formatMoney } from '../components/home/LensVerdictCard';
import { LENSES } from '../components/home/lenses';

const INVESTOR_OPTIONS = LENSES.map((l) => ({ value: l.value, label: l.label }));

// Metric values arrive as display strings ("17.5%", "N/A"); parse for comparison only.
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v ?? '').replace(/[%,x$]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const metricValue = (data, name) => data.scorecard?.metrics?.find((m) => m.name === name)?.value;

// Trailing P/E from the latest annual EPS; null when earnings are negative or missing.
function trailingPE(data) {
  const eps = data.stock_data?.financials?.eps || [];
  const latest = [...eps].reverse().find((e) => e !== null && e !== undefined);
  const price = data.stock_data?.current_price;
  return latest > 0 && price ? price / latest : null;
}

const pctText = (v) => (Number.isFinite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(1)}%` : 'n/a');

const metricRow = (label, name, better) => ({
  label,
  get: (d) => num(metricValue(d, name)),
  show: (_, d) => metricValue(d, name) ?? 'n/a',
  better,
});

// Each row: label, how to read it for a stock, and which direction is better.
const ROWS = [
  { label: 'Score', get: (d) => d.scorecard?.total_score, show: (v, d) => `${Math.round(v)}/100, grade ${d.scorecard?.grade}`, better: 'high' },
  { label: 'Fair value', get: (d) => d.dcf?.intrinsic_value, show: (v) => formatMoney(v) },
  { label: 'Price', get: (d) => d.stock_data?.current_price, show: (v) => formatMoney(v) },
  { label: 'Margin of safety', get: (d) => d.margin?.margin_pct, show: pctText, better: 'high', tone: true },
  { label: 'P/E (trailing)', get: trailingPE, show: (v) => v.toFixed(1), better: 'low' },
  metricRow('ROE', 'ROE', 'high'),
  metricRow('ROIC', 'ROIC', 'high'),
  metricRow('Profit margin', 'Profit Margin', 'high'),
  metricRow('Revenue growth', 'Revenue Growth', 'high'),
  metricRow('Debt to equity', 'Debt-to-Equity', 'low'),
];

function winner(row, a, b) {
  const va = row.get(a);
  const vb = row.get(b);
  if (!row.better || va == null || vb == null || va === vb) return null;
  if (row.better === 'high') return va > vb ? 'a' : 'b';
  return va < vb ? 'a' : 'b';
}

// Plain, rule-based differences between the two. Not AI-generated.
function differences(a, b, lensLabel) {
  const ta = a.stock_data.ticker;
  const tb = b.stock_data.ticker;
  const sa = Math.round(a.scorecard.total_score);
  const sb = Math.round(b.scorecard.total_score);
  const ma = a.margin?.margin_pct;
  const mb = b.margin?.margin_pct;
  const lines = [];

  if (sa === sb) lines.push(`Both score ${sa}/100 through the ${lensLabel} lens.`);
  else lines.push(`${sa > sb ? ta : tb} scores higher through the ${lensLabel} lens (${Math.max(sa, sb)} vs ${Math.min(sa, sb)}).`);

  if (Number.isFinite(ma) && Number.isFinite(mb)) {
    if (ma >= 0 && mb >= 0) lines.push(`Both trade below fair value. ${ma > mb ? ta : tb} has the wider margin of safety.`);
    else if (ma < 0 && mb < 0) lines.push(`Both trade above fair value. ${ma > mb ? ta : tb} is closer to it (${pctText(Math.max(ma, mb))}).`);
    else lines.push(`${ma >= 0 ? ta : tb} trades below fair value; ${ma >= 0 ? tb : ta} trades above it.`);
  }

  const va = a.classification_label || a.classification;
  const vb = b.classification_label || b.classification;
  lines.push(va === vb ? `Both get the same verdict: ${va}.` : `Verdicts differ: ${ta} is ${va}, ${tb} is ${vb}.`);
  return lines;
}

const VERDICT_TONE = { Buy: 'pos', Avoid: 'neg' };

function CompareSkeleton() {
  return (
    <div className="cmp-table" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="cmp-row">
          <span className="skel skel-cell" />
          <span className="skel skel-cell" />
          <span className="skel skel-cell" />
        </div>
      ))}
    </div>
  );
}

const ComparePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leftTicker, setLeftTicker] = useState('AAPL');
  const [rightTicker, setRightTicker] = useState('MSFT');
  const [selectedInvestor, setSelectedInvestor] = useState(searchParams.get('investor') || 'buffett');
  const [leftData, setLeftData] = useState(null);
  const [rightData, setRightData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComparison = async (investorKey, lTicker, rTicker) => {
    setLoading(true);
    setError(null);
    try {
      const [left, right] = await Promise.all([
        getStockAnalysis(lTicker, investorKey),
        getStockAnalysis(rTicker, investorKey),
      ]);
      setLeftData(left);
      setRightData(right);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestorSelect = (investorKey) => {
    setSelectedInvestor(investorKey);
    setSearchParams({ investor: investorKey, tickers: `${leftTicker},${rightTicker}` });
    fetchComparison(investorKey, leftTicker, rightTicker);
  };

  const handleCompareSubmit = (e) => {
    e.preventDefault();
    if (!leftTicker.trim() || !rightTicker.trim()) return;
    const l = leftTicker.trim().toUpperCase();
    const r = rightTicker.trim().toUpperCase();
    setLeftTicker(l);
    setRightTicker(r);
    setSearchParams({ investor: selectedInvestor, tickers: `${l},${r}` });
    fetchComparison(selectedInvestor, l, r);
  };

  useEffect(() => {
    const tickers = searchParams.get('tickers');
    let l = 'AAPL';
    let r = 'MSFT';
    if (tickers) {
      const parts = tickers.split(',').map((t) => t.trim().toUpperCase());
      if (parts[0]) l = parts[0];
      if (parts[1]) r = parts[1];
    }
    setLeftTicker(l);
    setRightTicker(r);
    const investor = searchParams.get('investor') || 'buffett';
    setSelectedInvestor(investor);
    fetchComparison(investor, l, r);
  }, []);

  const lensLabel = LENSES.find((l) => l.value === selectedInvestor)?.label || 'Warren Buffett';
  const ready = leftData && rightData && !loading;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Compare</h1>
        <p className="page-sub">Two stocks, one investor lens, side by side.</p>
      </header>

      <div className="cmp-controls">
        <SegmentedControl id="compare-investor" label="Investor lens" options={INVESTOR_OPTIONS} value={selectedInvestor} onChange={handleInvestorSelect} />
        <form onSubmit={handleCompareSubmit} className="cmp-form">
          <label className="field">
            <span className="field-label">First ticker</span>
            <input type="text" value={leftTicker} onChange={(e) => setLeftTicker(e.target.value)} placeholder="AAPL" autoComplete="off" />
          </label>
          <label className="field">
            <span className="field-label">Second ticker</span>
            <input type="text" value={rightTicker} onChange={(e) => setRightTicker(e.target.value)} placeholder="MSFT" autoComplete="off" />
          </label>
          <button type="submit" className="btn-solid" disabled={loading}>
            {loading ? 'Comparing' : 'Compare'}
          </button>
        </form>
      </div>

      {error ? (
        <p className="inline-error" role="alert">
          Couldn't load that comparison: {error}
        </p>
      ) : !ready ? (
        <CompareSkeleton />
      ) : (
        <>
          <div className="cmp-table">
            <div className="cmp-row cmp-head">
              <span />
              {[leftData, rightData].map((d) => (
                <Link key={d.stock_data.ticker} to={`/stock/${d.stock_data.ticker}?investor=${selectedInvestor}`} className="cmp-stock">
                  <span className="mono cmp-ticker">
                    {d.stock_data.ticker} <ArrowUpRight size={14} aria-hidden="true" />
                  </span>
                  <span className="cmp-name">{displayName(d.stock_data.company_name)}</span>
                </Link>
              ))}
            </div>

            <div className="cmp-row">
              <span className="cmp-label">Verdict</span>
              {[leftData, rightData].map((d) => {
                const v = d.classification_label || d.classification;
                return (
                  <span key={d.stock_data.ticker} className={`cmp-verdict tone-${VERDICT_TONE[v] || 'mid'}`}>
                    {v}
                  </span>
                );
              })}
            </div>

            {ROWS.map((row) => {
              const win = winner(row, leftData, rightData);
              return (
                <div key={row.label} className="cmp-row">
                  <span className="cmp-label">{row.label}</span>
                  {[leftData, rightData].map((d, i) => {
                    const v = row.get(d);
                    const isWin = win === (i === 0 ? 'a' : 'b');
                    const tone = row.tone && Number.isFinite(v) ? ` tone-${v >= 0 ? 'pos' : 'neg'}` : '';
                    return (
                      <span key={d.stock_data.ticker} className={`mono cmp-value${isWin ? ' is-better' : ''}${tone}`}>
                        {v == null ? 'n/a' : row.show(v, d)}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <p className="cmp-legend">Bold marks the stronger value where higher or lower is clearly better.</p>

          <div className="cmp-notes">
            <section>
              <h2>How they differ</h2>
              <ul className="plain-list">
                {differences(leftData, rightData, lensLabel).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Risk flags</h2>
              <div className="cmp-flags">
                {[leftData, rightData].map((d) => (
                  <div key={d.stock_data.ticker}>
                    <div className="mono cmp-flags-ticker">{d.stock_data.ticker}</div>
                    {d.risk?.flags?.length ? (
                      <ul className="plain-list">
                        {d.risk.flags.map((f) => (
                          <li key={f.flag}>
                            <span className="tone-neg">{f.flag}</span>
                            <span className="muted"> {f.description}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No red flags in the latest filings.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default ComparePage;
