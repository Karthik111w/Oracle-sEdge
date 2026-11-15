import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download, Star } from 'lucide-react';
import { getScreener } from '../api/client';
import SegmentedControl from '../components/SegmentedControl';
import { displayName } from '../components/home/LensVerdictCard';
import { usePrefs, useWatchlist } from '../lib/storage';
import { HORIZON_OPTIONS, LENS_OPTIONS, VERDICTS, cleanHorizon, cleanLens, marginText, verdictLabel, verdictTone } from '../lib/verdict';
import { ariaSort, makeComparator, nextSort } from '../lib/table';
import { downloadCsv, fmtCap, fmtPlain, fmtPrice, fmtSigned, isNum, rowsToCsv, toneOf } from '../components/screener/format';
import '../styles/screener.css';

const POLL_MS = 4000;

const COLUMNS = [
  { key: 'ticker', label: 'Company', get: (r) => r.ticker, text: true },
  { key: 'sector', label: 'Sector', get: (r) => r.sector, text: true, hideSm: true },
  { key: 'price', label: 'Price', get: (r) => r.price, num: true },
  { key: 'change_pct', label: 'Day', get: (r) => r.change_pct, num: true },
  { key: 'market_cap', label: 'Market cap', get: (r) => r.market_cap, num: true },
  { key: 'score', label: 'Score', get: (r) => r.score, num: true },
  { key: 'grade', label: 'Grade', get: (r) => r.grade, text: true },
  { key: 'verdict', label: 'Verdict', get: (r) => verdictLabel(r), text: true },
  { key: 'margin_pct', label: 'Margin of safety', get: (r) => r.margin_pct, num: true },
  { key: 'pe', label: 'P/E', get: (r) => r.pe, num: true },
  { key: 'dividend_yield', label: 'Yield', get: (r) => r.dividend_yield, num: true },
];

const timeText = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;
};

// Filters and sort survive leaving the page and coming back, for this browser session.
const VIEW_KEY = 'oe_screener_view';
const DEFAULT_VIEW = { query: '', sectors: [], verdicts: [], belowFair: false, noFlags: false, minScore: 0, sort: { key: 'score', dir: -1 } };

function readView() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(VIEW_KEY));
    return saved && typeof saved === 'object' ? { ...DEFAULT_VIEW, ...saved } : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

function SkeletonRows() {
  return Array.from({ length: 10 }).map((_, i) => (
    <tr key={i} aria-hidden="true">
      <td className="sc-sticky"><span className="skel skel-cell wide" /></td>
      {COLUMNS.slice(1).map((c) => (
        <td key={c.key} className={c.hideSm ? 'hide-sm' : undefined}><span className="skel skel-cell" /></td>
      ))}
      <td />
    </tr>
  ));
}

const ScreenerPage = () => {
  const [prefs] = usePrefs();
  const [params, setParams] = useSearchParams();
  const watchlist = useWatchlist();

  const investor = cleanLens(params.get('investor') || prefs.investor);
  const horizon = cleanHorizon(params.get('horizon') || prefs.horizon);

  // A normal push: each lens change is a history entry, so Back steps through the lenses
  // and then leaves the page. The URL is never rewritten on load.
  const setLens = (patch) => {
    const next = new URLSearchParams(params);
    next.set('investor', patch.investor ?? investor);
    next.set('horizon', patch.horizon ?? horizon);
    setParams(next);
  };

  // data holds the latest response for the current lens; rows stay put while a poll is in flight.
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const lensRef = useRef('');

  useEffect(() => {
    const lens = `${investor}:${horizon}`;
    lensRef.current = lens;
    setData(null);
    setError(null);
    let timer;
    let stopped = false;

    const load = () => {
      getScreener(investor, horizon)
        .then((res) => {
          if (stopped) return;
          setData(res);
          setError(null);
          if (res.status === 'warming' || res.refreshing) timer = setTimeout(load, POLL_MS);
        })
        .catch((err) => {
          if (stopped) return;
          setError(err.message || 'Request failed');
          timer = setTimeout(load, POLL_MS * 2);
        });
    };
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [investor, horizon]);

  const [view, setView] = useState(readView);
  const { query, sectors, verdicts, belowFair, noFlags, minScore, sort } = view;
  const patchView = (patch) => setView((v) => ({ ...v, ...patch }));
  useEffect(() => {
    try {
      sessionStorage.setItem(VIEW_KEY, JSON.stringify(view));
    } catch {
      // session storage unavailable: filters just reset on the next visit
    }
  }, [view]);

  const rows = data?.rows || [];
  const allSectors = useMemo(() => [...new Set(rows.map((r) => r.sector).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[5];
    const byTicker = (a, b) => a.ticker.localeCompare(b.ticker);
    return rows
      .filter((r) => {
        if (q && !`${r.ticker} ${r.name || ''}`.toLowerCase().includes(q)) return false;
        if (sectors.length && !sectors.includes(r.sector)) return false;
        if (verdicts.length && !verdicts.includes(r.classification)) return false;
        if (belowFair && !(isNum(r.margin_pct) && r.margin_pct > 0)) return false;
        if (noFlags && r.risk_flags > 0) return false;
        if (minScore > 0 && !(isNum(r.score) && r.score >= minScore)) return false;
        return true;
      })
      .sort(makeComparator(col.get, { text: col.text, dir: sort.dir, tiebreak: byTicker }));
  }, [rows, query, sectors, verdicts, belowFair, noFlags, minScore, sort]);

  const filtersOn = Boolean(query.trim()) || sectors.length > 0 || verdicts.length > 0 || belowFair || noFlags || minScore > 0;
  const clearFilters = () => patchView({ query: '', sectors: [], verdicts: [], belowFair: false, noFlags: false, minScore: 0 });

  const toggleIn = (field, value) => setView((v) => ({ ...v, [field]: v[field].includes(value) ? v[field].filter((x) => x !== value) : [...v[field], value] }));

  const onSort = (col) => patchView({ sort: nextSort(sort, col) });
  // Chip text follows the horizon wording (Trade / Watch / Pass for short term).
  const chipLabel = (v) => verdictLabel(rows.find((r) => r.classification === v) || { classification: v });

  const exportCsv = () => downloadCsv(`screener-${investor}-${horizon}.csv`, rowsToCsv(filtered));

  const warming = data?.status === 'warming';
  const refreshing = Boolean(data?.refreshing) && !warming;
  const done = data?.progress?.done ?? 0;
  const total = data?.progress?.total ?? 0;
  const updated = timeText(data?.updated_at);
  const suffix = `?investor=${investor}&horizon=${horizon}`;
  const loadingFirst = !data && !error;

  return (
    <div className="page page--wide sc-page">
      <header className="page-head">
        <h1>Screener</h1>
        <p className="page-sub">Rank the tracked universe through any investor lens. Scores, verdicts and fair values follow the lens and horizon you pick.</p>
      </header>

      <div className="sc-lens">
        <SegmentedControl id="sc-investor" label="Investor lens" options={LENS_OPTIONS} value={investor} onChange={(v) => setLens({ investor: v })} />
        <SegmentedControl id="sc-horizon" label="Horizon" options={HORIZON_OPTIONS} value={horizon} onChange={(v) => setLens({ horizon: v })} tone="teal" />
      </div>

      <section className="sc-filters" aria-label="Filters">
        <div className="sc-filter-row">
          <label className="field sc-search">
            <span className="field-label">Ticker or name</span>
            <input type="search" value={query} onChange={(e) => patchView({ query: e.target.value })} placeholder="e.g. KO or Coca" autoComplete="off" />
          </label>
          <label className="field sc-slider">
            <span className="field-label">
              Minimum score <span className="mono sc-slider-val">{minScore}</span>
            </span>
            <input type="range" min="0" max="100" step="5" value={minScore} onChange={(e) => patchView({ minScore: Number(e.target.value) })} />
          </label>
          <div className="sc-toggles">
            <label className="sc-check">
              <input type="checkbox" checked={belowFair} onChange={(e) => patchView({ belowFair: e.target.checked })} />
              <span>Below fair value only</span>
            </label>
            <label className="sc-check">
              <input type="checkbox" checked={noFlags} onChange={(e) => patchView({ noFlags: e.target.checked })} />
              <span>No risk flags</span>
            </label>
          </div>
        </div>

        <div className="sc-chip-group" role="group" aria-label="Verdict">
          <span className="sc-chip-label">Verdict</span>
          {VERDICTS.map((v) => (
            <button key={v} type="button" className="sc-chip" aria-pressed={verdicts.includes(v)} onClick={() => toggleIn('verdicts', v)}>
              {chipLabel(v)}
            </button>
          ))}
        </div>

        {allSectors.length > 0 && (
          <div className="sc-chip-group" role="group" aria-label="Sector">
            <span className="sc-chip-label">Sector</span>
            {allSectors.map((s) => (
              <button key={s} type="button" className="sc-chip" aria-pressed={sectors.includes(s)} onClick={() => toggleIn('sectors', s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="sc-status" aria-live="polite">
        {refreshing && <span>Refreshing scores{updated ? `, last updated ${updated}` : ''}</span>}
        {warming && (
          <div className="sc-progress">
            <span>Scoring {done} of {total} companies</span>
            <span className="sc-bar" role="progressbar" aria-label="Scoring progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
              <span style={{ width: total ? `${Math.min(100, (done / total) * 100)}%` : '0%' }} />
            </span>
          </div>
        )}
      </div>

      <div className="sc-bar-row">
        <p className="sc-count">
          {loadingFirst ? 'Loading' : `${filtered.length} of ${rows.length} companies`}
          {updated && <span className="muted"> · updated {updated}</span>}
        </p>
        <button type="button" className="btn-quiet sc-export" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download size={14} aria-hidden="true" /> Export CSV
        </button>
      </div>

      {error && !data ? (
        <p className="inline-error" role="alert">Couldn't load the screener: {error}. Retrying.</p>
      ) : (
        <div className="sc-scroll">
          <table className="sc-table">
            <caption className="sr-only">Screened companies, sorted by {sort.key}</caption>
            <thead>
              <tr>
                {COLUMNS.map((c, i) => {
                  const active = sort.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      className={`${i === 0 ? 'sc-sticky ' : ''}${c.num ? 'num ' : ''}${c.hideSm ? 'hide-sm' : ''}`}
                      aria-sort={ariaSort(sort, c.key)}
                    >
                      <button type="button" className={`sc-sort${active ? ' is-active' : ''}`} onClick={() => onSort(c)}>
                        {c.label}
                        {active && (sort.dir === 1 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                      </button>
                    </th>
                  );
                })}
                <th scope="col" className="sc-star-col"><span className="sr-only">Watchlist</span></th>
              </tr>
            </thead>
            <tbody>
              {loadingFirst && <SkeletonRows />}
              {filtered.map((r) => {
                const starred = watchlist.has(r.ticker);
                return (
                  <tr key={r.ticker}>
                    <th scope="row" className="sc-sticky">
                      <Link to={`/stock/${r.ticker}${suffix}`} className="sc-company">
                        <span className="mono sc-ticker">{r.ticker}</span>
                        <span className="sc-name">{displayName(r.name || '')}</span>
                      </Link>
                    </th>
                    <td className="hide-sm sc-sector">{r.sector || 'n/a'}</td>
                    <td className="mono num">{fmtPrice(r.price)}</td>
                    <td className={`mono num tone-${toneOf(r.change_pct)}`}>{fmtSigned(r.change_pct, 2)}</td>
                    <td className="mono num">{fmtCap(r.market_cap)}</td>
                    <td className="num">
                      <span className="sc-score">
                        <span className="mono">{isNum(r.score) ? Math.round(r.score) : 'n/a'}</span>
                        <span className="sc-meter" aria-hidden="true"><span style={{ width: `${isNum(r.score) ? Math.max(0, Math.min(100, r.score)) : 0}%` }} /></span>
                      </span>
                    </td>
                    <td className="mono">{r.grade || 'n/a'}</td>
                    <td className={`sc-verdict tone-${verdictTone(r.classification)}`}>{verdictLabel(r)}</td>
                    <td className={`mono num tone-${toneOf(r.margin_pct)}`}>{marginText(r.margin_pct)}</td>
                    <td className="mono num">{fmtPlain(r.pe)}</td>
                    <td className="mono num">{isNum(r.dividend_yield) ? `${(r.dividend_yield * 100).toFixed(2)}%` : 'n/a'}</td>
                    <td className="sc-star-col">
                      <button
                        type="button"
                        className={`sc-star${starred ? ' is-on' : ''}`}
                        aria-pressed={starred}
                        aria-label={`${starred ? 'Remove' : 'Add'} ${r.ticker} ${starred ? 'from' : 'to'} watchlist`}
                        onClick={() => watchlist.toggle(r.ticker)}
                      >
                        <Star size={16} fill={starred ? 'currentColor' : 'none'} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && filtered.length === 0 && (
            <div className="sc-empty">
              {rows.length === 0 ? (
                <p className="panel-text">{warming ? 'Scores will appear here as companies are scored.' : 'No companies returned.'}</p>
              ) : (
                <>
                  <p className="panel-text">No companies match these filters.</p>
                  {filtersOn && <button type="button" className="btn-quiet" onClick={clearFilters}>Clear filters</button>}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScreenerPage;
