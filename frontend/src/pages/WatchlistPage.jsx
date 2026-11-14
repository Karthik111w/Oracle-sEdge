import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, GitCompare, Plus, X } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';
import TickerAutocomplete from '../components/TickerAutocomplete';
import { LENSES } from '../components/home/lenses';
import { displayName } from '../components/home/LensVerdictCard';
import { useAnalyses } from '../components/compare/useAnalyses';
import { VERDICT_TONE, fmtPrice, fmtSigned, isNum, toneOf } from '../components/screener/format';
import { cleanTicker, usePrefs, useRecentlyViewed, useWatchlist } from '../lib/storage';
import '../styles/watchlist.css';

const INVESTOR_OPTIONS = LENSES.map((l) => ({ value: l.value, label: l.short }));

// Reads one loaded analysis into the fields the table shows.
const read = (d) =>
  d && {
    name: displayName(d.stock_data?.company_name || ''),
    price: d.stock_data?.current_price,
    change: d.stock_data?.daily_change_pct,
    fair: d.margin?.intrinsic_value ?? d.dcf?.intrinsic_value,
    margin: d.margin?.margin_pct,
    score: d.scorecard?.total_score,
    verdict: d.classification_label || d.classification,
  };

const COLUMNS = [
  { key: 'ticker', label: 'Company', text: true },
  { key: 'price', label: 'Price', num: true },
  { key: 'change', label: 'Day', num: true },
  { key: 'fair', label: 'Fair value', num: true },
  { key: 'margin', label: 'Margin', num: true },
  { key: 'score', label: 'Score', num: true },
  { key: 'verdict', label: 'Verdict', text: true },
];

const WatchlistPage = () => {
  const [prefs] = usePrefs();
  const [params, setParams] = useSearchParams();
  const investor = LENSES.some((l) => l.value === params.get('investor')) ? params.get('investor') : prefs.investor;
  const { tickers, add, remove } = useWatchlist();
  const recent = useRecentlyViewed();
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [picked, setPicked] = useState([]);

  const analyses = useAnalyses(tickers, investor, prefs.horizon);

  const submit = (raw) => {
    const t = cleanTicker(raw);
    if (!t) return setError('Enter a ticker symbol first.');
    if (tickers.includes(t)) return setError(`${t} is already on your watchlist.`);
    add(t);
    setInput('');
    setError(null);
  };

  const rows = useMemo(() => {
    const list = tickers.map((t, i) => ({ ticker: t, i, state: analyses[t] || { status: 'loading' } }));
    if (!sort.key) return list;
    const col = COLUMNS.find((c) => c.key === sort.key);
    const val = (r) => (sort.key === 'ticker' ? r.ticker : r.state.status === 'ok' ? read(r.state.d)[sort.key] : null);
    return [...list].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      const na = va === null || va === undefined || (col.num && !isNum(va));
      const nb = vb === null || vb === undefined || (col.num && !isNum(vb));
      if (na || nb) return na === nb ? a.i - b.i : na ? 1 : -1;
      const c = col.text ? String(va).localeCompare(String(vb)) : va - vb;
      return c * sort.dir || a.i - b.i;
    });
  }, [tickers, analyses, sort]);

  const loaded = rows.filter((r) => r.state.status === 'ok').map((r) => read(r.state.d));
  const counts = { Buy: 0, Watchlist: 0, Hold: 0, Avoid: 0 };
  loaded.forEach((r) => {
    if (r.verdict in counts) counts[r.verdict] += 1;
  });
  const scores = loaded.map((r) => r.score).filter(isNum);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const pending = rows.filter((r) => r.state.status === 'loading').length;

  const onSort = (col) => setSort((s) => (s.key === col.key ? { key: s.key, dir: -s.dir } : { key: col.key, dir: col.text ? 1 : -1 }));
  const selected = picked.filter((t) => tickers.includes(t));
  const togglePick = (t) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const canCompare = selected.length >= 2 && selected.length <= 4;
  const compareTo = `/compare?tickers=${selected.join(',')}&investor=${investor}`;
  const recentNotWatched = recent.filter((r) => !tickers.includes(r.ticker));

  const setInvestor = (v) => {
    const next = new URLSearchParams(params);
    next.set('investor', v);
    setParams(next, { replace: true });
  };

  return (
    <div className="page page--wide">
      <header className="page-head">
        <h1>Watchlist</h1>
        <p className="page-sub">Stocks you're following, scored live through the lens you choose. Saved in this browser.</p>
      </header>

      <div className="wl2-controls">
        <SegmentedControl id="wl-investor" label="Investor lens" options={INVESTOR_OPTIONS} value={investor} onChange={setInvestor} />
        <form
          className="wl2-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <div className="field">
            <span className="field-label">Add a ticker</span>
            <TickerAutocomplete
              value={input}
              onChange={(v) => {
                setInput(v);
                setError(null);
              }}
              onSelect={submit}
              placeholder="e.g. KO"
              ariaLabel="Add a ticker to the watchlist"
            />
          </div>
          <button type="submit" className="btn-solid">
            <Plus size={16} aria-hidden="true" /> Add
          </button>
        </form>
      </div>
      {error && <p className="tone-neg wl2-form-error" role="alert">{error}</p>}

      {tickers.length === 0 ? (
        <div className="wl2-empty">
          <h2>Nothing on your watchlist yet</h2>
          <p className="panel-text">Add a ticker above, star companies in the screener, or pick one you've looked at recently.</p>
        </div>
      ) : (
        <>
          <p className="wl2-summary" aria-live="polite">
            {loaded.length === 0 ? (
              'Scoring your watchlist'
            ) : (
              <>
                <strong>{counts.Buy}</strong> Buy, <strong>{counts.Watchlist}</strong> Watchlist, <strong>{counts.Hold}</strong> Hold, <strong>{counts.Avoid}</strong> Avoid
                {avg !== null && <> · average score <strong>{Math.round(avg)}</strong></>}
                {pending > 0 && ` · ${pending} still loading`}
              </>
            )}
          </p>
          <div className="wl2-actions">
            <Link to={compareTo} className="btn-quiet wl2-compare" aria-disabled={!canCompare} tabIndex={canCompare ? 0 : -1} onClick={(e) => !canCompare && e.preventDefault()}>
              <GitCompare size={14} aria-hidden="true" /> Compare selected
            </Link>
            <span>{selected.length === 0 ? 'Select 2 to 4 rows to compare.' : selected.length > 4 ? 'Compare supports up to 4 at a time.' : `${selected.length} selected`}</span>
          </div>

          <div className="wl2-scroll">
            <table className="wl2-table">
              <caption className="sr-only">Watchlist scored through the {investor} lens</caption>
              <thead>
                <tr>
                  {COLUMNS.map((c, i) => {
                    const active = sort.key === c.key;
                    return (
                      <th key={c.key} scope="col" className={`${i === 0 ? 'wl2-sticky ' : ''}${c.num ? 'num' : ''}`} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" className={`wl2-sort${active ? ' is-active' : ''}`} onClick={() => onSort(c)}>
                          {c.label}
                          {active && (sort.dir === 1 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="wl2-remove-col"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ ticker, state }) => {
                  const r = state.status === 'ok' ? read(state.d) : null;
                  return (
                    <tr key={ticker}>
                      <th scope="row" className="wl2-sticky">
                        <div className="wl2-pick">
                          <input type="checkbox" checked={selected.includes(ticker)} onChange={() => togglePick(ticker)} aria-label={`Select ${ticker} for comparison`} />
                          <Link to={`/stock/${ticker}?investor=${investor}`} className="wl2-company">
                            <span className="mono wl2-ticker">{ticker}</span>
                            <span className="wl2-name">{r ? r.name : state.status === 'error' ? 'Not found' : ' '}</span>
                          </Link>
                        </div>
                      </th>
                      {state.status === 'loading' ? (
                        [0, 1, 2, 3, 4, 5].map((k) => (
                          <td key={k}><span className="skel skel-cell" aria-hidden="true" /></td>
                        ))
                      ) : state.status === 'error' ? (
                        <td colSpan={6} className="wl2-err">Couldn't load this ticker.</td>
                      ) : (
                        <>
                          <td className="mono num">{fmtPrice(r.price)}</td>
                          <td className={`mono num tone-${toneOf(r.change)}`}>{fmtSigned(r.change, 2)}</td>
                          <td className="mono num">{fmtPrice(r.fair)}</td>
                          <td className={`mono num tone-${toneOf(r.margin)}`}>{fmtSigned(r.margin)}</td>
                          <td className="mono num">{isNum(r.score) ? Math.round(r.score) : 'n/a'}</td>
                          <td className={`wl2-verdict tone-${VERDICT_TONE[r.verdict] || 'mid'}`}>{r.verdict || 'n/a'}</td>
                        </>
                      )}
                      <td className="wl2-remove-col">
                        <button type="button" className="pf-remove" onClick={() => remove(ticker)} aria-label={`Remove ${ticker} from watchlist`}>
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {recentNotWatched.length > 0 && (
        <section className="wl2-recent" aria-labelledby="recent-title">
          <h2 id="recent-title">Recently viewed</h2>
          <ul className="wl2-chips">
            {recentNotWatched.map((r) => (
              <li key={r.ticker}>
                <Link to={`/stock/${r.ticker}`} className="mono">{r.ticker}</Link>
                <button type="button" onClick={() => add(r.ticker)} aria-label={`Add ${r.ticker} to watchlist`}>
                  <Plus size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default WatchlistPage;
