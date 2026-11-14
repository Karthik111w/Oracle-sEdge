import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';
import TickerAutocomplete from '../components/TickerAutocomplete';
import { displayName, formatMoney } from '../components/home/LensVerdictCard';
import { LENSES } from '../components/home/lenses';
import { CompareRadar, ComparePerformance } from '../components/compare/CompareCharts';
import { useAnalyses } from '../components/compare/useAnalyses';
import { SeriesSwatch } from '../components/compare/series.jsx';
import { fmtCap, fmtPlain, fmtSigned, isNum } from '../components/screener/format';
import { cleanTicker, usePrefs } from '../lib/storage';
import '../styles/compare.css';

const INVESTOR_OPTIONS = LENSES.map((l) => ({ value: l.value, label: l.short }));
const MAX = 4;
const DEFAULT_TICKERS = ['AAPL', 'MSFT'];
const VERDICT_TONE = { Buy: 'pos', Avoid: 'neg' };

const parseNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v ?? '').replace(/[%,x$]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const metricOf = (d, key) => d.scorecard?.metrics?.find((m) => m.metric === key);
const stat = (d, key) => {
  const v = d.stock_data?.stats?.[key];
  return isNum(v) ? v : null;
};

// Trailing P/E from stats, else from the latest annual EPS; null when earnings are negative or missing.
function trailingPE(d) {
  const s = stat(d, 'pe_trailing');
  if (s !== null) return s;
  const eps = d.stock_data?.financials?.eps || [];
  const latest = [...eps].reverse().find((e) => isNum(e));
  const price = d.stock_data?.current_price;
  return latest > 0 && price ? price / latest : null;
}

const metricRow = (label, key, better) => ({
  label,
  get: (d) => {
    const m = metricOf(d, key);
    return m ? (isNum(m.raw_value) ? m.raw_value : parseNum(m.value)) : null;
  },
  show: (_, d) => metricOf(d, key)?.value ?? 'n/a',
  better,
});

// Each row: label, how to read it for a stock, and which direction is better.
const ROWS = [
  { label: 'Score', get: (d) => d.scorecard?.total_score, show: (v, d) => `${Math.round(v)}/100, grade ${d.scorecard?.grade}`, better: 'high' },
  { label: 'Fair value', get: (d) => d.margin?.intrinsic_value ?? d.dcf?.intrinsic_value, show: (v) => formatMoney(v) },
  { label: 'Price', get: (d) => d.stock_data?.current_price, show: (v) => formatMoney(v) },
  { label: 'Margin of safety', get: (d) => d.margin?.margin_pct, show: (v) => fmtSigned(v), better: 'high', tone: true },
  { label: 'P/E (trailing)', get: trailingPE, show: (v) => fmtPlain(v), better: 'low' },
  { label: 'P/E (forward)', get: (d) => stat(d, 'pe_forward'), show: (v) => fmtPlain(v), better: 'low' },
  { label: 'Dividend yield', get: (d) => stat(d, 'dividend_yield'), show: (v) => `${(v * 100).toFixed(2)}%`, better: 'high' },
  { label: 'Market cap', get: (d) => d.stock_data?.market_cap, show: (v) => fmtCap(v) },
  { label: 'Beta', get: (d) => d.stock_data?.beta, show: (v) => v.toFixed(2) },
  metricRow('ROE', 'roe', 'high'),
  metricRow('ROIC', 'roic', 'high'),
  metricRow('Profit margin', 'profit_margin', 'high'),
  metricRow('Revenue growth', 'revenue_growth', 'high'),
  metricRow('Debt to equity', 'debt_to_equity', 'low'),
];

// Indexes (within `items`) that hold the best value for a row; ties all count, all-equal counts for none.
function bestIndexes(row, items) {
  if (!row.better) return [];
  const vals = items.map(({ d }) => {
    const v = row.get(d);
    return isNum(v) ? v : null;
  });
  const present = vals.filter((v) => v !== null);
  if (present.length < 2) return [];
  const best = row.better === 'high' ? Math.max(...present) : Math.min(...present);
  if (present.every((v) => v === best)) return [];
  return vals.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
}

const joinNames = (names) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// Plain, rule-based differences. Not AI-generated.
function differences(items, lensLabel) {
  if (items.length < 2) return [];
  const lines = [];
  const scored = items.map(({ ticker, d }) => ({ ticker, score: Math.round(d.scorecard?.total_score) })).filter((x) => isNum(x.score));
  if (scored.length >= 2) {
    const top = Math.max(...scored.map((s) => s.score));
    const low = Math.min(...scored.map((s) => s.score));
    const leaders = scored.filter((s) => s.score === top).map((s) => s.ticker);
    if (top === low) lines.push(`All score ${top}/100 through the ${lensLabel} lens.`);
    else if (leaders.length === 1) lines.push(`${leaders[0]} scores highest through the ${lensLabel} lens (${top}/100). ${scored.filter((s) => s.score === low).map((s) => s.ticker).join(', ')} scores lowest (${low}).`);
    else lines.push(`${joinNames(leaders)} score highest through the ${lensLabel} lens (${top}/100 each).`);
  }

  const margins = items.map(({ ticker, d }) => ({ ticker, m: d.margin?.margin_pct })).filter((x) => isNum(x.m));
  if (margins.length >= 2) {
    const below = margins.filter((x) => x.m >= 0).map((x) => x.ticker);
    const best = margins.reduce((a, b) => (b.m > a.m ? b : a));
    if (below.length === margins.length) lines.push(`All trade below fair value. ${best.ticker} has the widest margin of safety (${fmtSigned(best.m)}).`);
    else if (below.length === 0) lines.push(`All trade above fair value. ${best.ticker} is closest to it (${fmtSigned(best.m)}).`);
    else lines.push(`${joinNames(below)} ${below.length === 1 ? 'trades' : 'trade'} below fair value; the rest trade above it. ${best.ticker} has the widest margin (${fmtSigned(best.m)}).`);
  }

  const groups = {};
  items.forEach(({ ticker, d }) => {
    const v = d.classification_label || d.classification;
    if (v) (groups[v] ||= []).push(ticker);
  });
  const keys = Object.keys(groups);
  if (keys.length === 1) lines.push(`All get the same verdict: ${keys[0]}.`);
  else if (keys.length > 1) lines.push(`Verdicts split: ${keys.map((k) => `${k} (${groups[k].join(', ')})`).join('; ')}.`);
  return lines;
}

const ComparePage = () => {
  const [prefs] = usePrefs();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [notice, setNotice] = useState(null);

  const tickers = useMemo(() => {
    if (!params.has('tickers')) return DEFAULT_TICKERS;
    const list = (params.get('tickers') || '').split(',').map(cleanTicker).filter(Boolean);
    return [...new Set(list)].slice(0, MAX);
  }, [params]);
  const investor = LENSES.some((l) => l.value === params.get('investor')) ? params.get('investor') : params.has('tickers') ? prefs.investor : 'buffett';

  const update = (nextTickers, nextInvestor = investor) => setParams({ tickers: nextTickers.join(','), investor: nextInvestor });

  const addTicker = (raw) => {
    const t = cleanTicker(raw);
    if (!t) return;
    if (tickers.includes(t)) return setNotice(`${t} is already in the comparison.`);
    if (tickers.length >= MAX) return setNotice(`Compare up to ${MAX} stocks. Remove one first.`);
    setNotice(null);
    setInput('');
    update([...tickers, t]);
  };
  const removeTicker = (t) => {
    setNotice(null);
    update(tickers.filter((x) => x !== t));
  };

  const analyses = useAnalyses(tickers, investor, 'long');
  const all = tickers.map((t, index) => ({ ticker: t, index, state: analyses[t] }));
  const items = all.filter((x) => x.state.status === 'ok').map((x) => ({ ...x, d: x.state.d }));
  const lensLabel = LENSES.find((l) => l.value === investor)?.label || 'Warren Buffett';
  const full = tickers.length >= MAX;

  const bests = useMemo(() => {
    const map = {};
    ROWS.forEach((row) => {
      const idx = bestIndexes(row, items);
      map[row.label] = new Set(idx.map((i) => items[i].ticker));
    });
    return map;
  }, [items]);

  return (
    <div className="page page--wide">
      <header className="page-head">
        <h1>Compare</h1>
        <p className="page-sub">Two to four stocks, one investor lens, side by side.</p>
      </header>

      <div className="cmp2-controls">
        <SegmentedControl id="compare-investor" label="Investor lens" options={INVESTOR_OPTIONS} value={investor} onChange={(v) => update(tickers, v)} />
        <form
          className="cmp2-add"
          onSubmit={(e) => {
            e.preventDefault();
            addTicker(input);
          }}
        >
          <div className="field">
            <span className="field-label">Add a ticker ({tickers.length} of {MAX})</span>
            <TickerAutocomplete value={input} onChange={(v) => { setInput(v); setNotice(null); }} onSelect={addTicker} placeholder={full ? 'Comparison is full' : 'e.g. KO'} ariaLabel="Add a ticker to compare" />
          </div>
          <button type="submit" className="btn-solid" disabled={full || !input.trim()}>
            <Plus size={16} aria-hidden="true" /> Add
          </button>
        </form>
      </div>

      <ul className="cmp2-chips" aria-label="Tickers in this comparison">
        {all.map(({ ticker, index, state }) => (
          <li key={ticker} className={state.status === 'error' ? 'is-error' : undefined}>
            <SeriesSwatch index={index} />
            <span className="mono">{ticker}</span>
            <button type="button" onClick={() => removeTicker(ticker)} aria-label={`Remove ${ticker}`}>
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <p className="cmp2-notice tone-neg" role="alert" hidden={!notice}>{notice}</p>

      {tickers.length < 2 ? (
        <p className="panel-text">Add at least two tickers to compare them.</p>
      ) : (
        <>
          <div className="cmp2-scroll">
            <table className="cmp2-table">
              <caption className="sr-only">Side by side comparison through the {lensLabel} lens</caption>
              <thead>
                <tr>
                  <td className="cmp2-sticky" />
                  {all.map(({ ticker, state }) => (
                    <th key={ticker} scope="col" className="cmp2-colhead">
                      {state.status === 'ok' ? (
                        <Link to={`/stock/${ticker}?investor=${investor}`} className="cmp2-stock">
                          <span className="mono cmp2-ticker">{ticker} <ArrowUpRight size={14} aria-hidden="true" /></span>
                          <span className="cmp2-name">{displayName(state.state?.d?.stock_data?.company_name || '')}</span>
                        </Link>
                      ) : (
                        <span className="cmp2-stock">
                          <span className="mono cmp2-ticker">{ticker}</span>
                          <span className="cmp2-name">{state.status === 'error' ? 'Could not load' : ' '}</span>
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row" className="cmp2-sticky cmp2-label">Verdict</th>
                  {all.map(({ ticker, state }) => {
                    const v = state.status === 'ok' ? state.d.classification_label || state.d.classification : null;
                    return state.status === 'loading' ? (
                      <td key={ticker}><span className="skel skel-cell" aria-hidden="true" /></td>
                    ) : (
                      <td key={ticker} className={`cmp2-verdict tone-${VERDICT_TONE[v] || 'mid'}`}>{v || 'n/a'}</td>
                    );
                  })}
                </tr>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="cmp2-sticky cmp2-label">{row.label}</th>
                    {all.map(({ ticker, state }) => {
                      if (state.status === 'loading') return <td key={ticker}><span className="skel skel-cell" aria-hidden="true" /></td>;
                      if (state.status === 'error') return <td key={ticker} className="muted">n/a</td>;
                      const v = row.get(state.d);
                      const win = bests[row.label]?.has(ticker);
                      const tone = row.tone && isNum(v) ? ` tone-${v >= 0 ? 'pos' : 'neg'}` : '';
                      return (
                        <td key={ticker} className={`mono cmp2-value${win ? ' is-better' : ''}${tone}`}>
                          {isNum(v) ? row.show(v, state.d) : 'n/a'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cmp2-key">Bold marks the stronger value where higher or lower is clearly better.</p>
          {all.some((x) => x.state.status === 'error') && (
            <p className="inline-error" role="alert">
              Couldn't load {all.filter((x) => x.state.status === 'error').map((x) => x.ticker).join(', ')}. Check the symbol or remove it.
            </p>
          )}

          {items.length >= 2 && (
            <>
              <div className="cmp2-grid">
                <CompareRadar items={items} />
                <ComparePerformance items={items} />
              </div>

              <div className="cmp2-notes">
                <section>
                  <h2>How they differ</h2>
                  <ul className="plain-list">
                    {differences(items, lensLabel).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2>Risk flags</h2>
                  <div className="cmp2-flags">
                    {items.map(({ ticker, d }) => (
                      <div key={ticker}>
                        <div className="mono cmp2-flags-ticker">{ticker}</div>
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
        </>
      )}
    </div>
  );
};

export default ComparePage;
