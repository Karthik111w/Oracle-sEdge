import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { getStockAnalysis } from '../api/client';
import { cached } from '../api/cache';
import { analysisKey, displayName, formatMoney } from '../components/home/LensVerdictCard';

const STORAGE_KEY = 'watchlist_tickers';

function readList(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const VERDICT_TONE = { Buy: 'pos', Avoid: 'neg' };

// One watched ticker, scored live through the Buffett lens.
function WatchRow({ ticker, onRemove }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    cached(analysisKey(ticker, 'buffett'), () => getStockAnalysis(ticker, 'buffett', 'long'))
      .then((d) => alive && setState({ status: 'ok', d }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [ticker]);

  const d = state.d;
  const m = d?.margin?.margin_pct;
  const verdict = d?.classification_label || d?.classification;

  return (
    <div className="wl-row">
      <Link to={`/stock/${ticker}`} className="wl-main">
        <span className="ranking-company">
          <span className="mono ranking-ticker">{ticker}</span>
          <span className="ranking-name">{d ? displayName(d.stock_data.company_name) : state.status === 'error' ? 'Not found' : ''}</span>
        </span>
        {state.status === 'loading' ? (
          <>
            <span className="skel skel-cell" />
            <span className="skel skel-cell hide-sm" />
            <span className="skel skel-cell" />
            <span className="skel skel-cell hide-sm" />
          </>
        ) : state.status === 'error' ? (
          <span className="muted wl-error">Couldn't load this ticker.</span>
        ) : (
          <>
            <span className="mono num">{formatMoney(d.stock_data.current_price)}</span>
            <span className="mono num hide-sm">{formatMoney(d.margin?.intrinsic_value)}</span>
            <span className={`mono num tone-${m >= 0 ? 'pos' : 'neg'}`}>{Number.isFinite(m) ? `${m > 0 ? '+' : ''}${m.toFixed(1)}%` : 'n/a'}</span>
            <span className={`hide-sm wl-verdict tone-${VERDICT_TONE[verdict] || 'mid'}`}>
              {verdict} <span className="mono muted">{Math.round(d.scorecard.total_score)}</span>
            </span>
          </>
        )}
      </Link>
      <button type="button" className="pf-remove" onClick={() => onRemove(ticker)} aria-label={`Remove ${ticker} from watchlist`}>
        <X size={16} />
      </button>
    </div>
  );
}

const WatchlistPage = () => {
  const [watchlist, setWatchlist] = useState(() => readList(STORAGE_KEY));
  const [recent] = useState(() => readList('recently_viewed'));
  const [tickerInput, setTickerInput] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch {
      // storage unavailable; the list still works for this visit
    }
  }, [watchlist]);

  const add = (raw) => {
    const ticker = raw.trim().toUpperCase();
    if (!ticker) return setError('Enter a ticker symbol first.');
    if (watchlist.includes(ticker)) return setError(`${ticker} is already on your watchlist.`);
    setWatchlist((prev) => [...prev, ticker]);
    setTickerInput('');
    setError(null);
  };

  const remove = (ticker) => setWatchlist((prev) => prev.filter((t) => t !== ticker));
  const recentNotWatched = recent.filter((r) => !watchlist.includes(r.ticker));

  return (
    <div className="page">
      <header className="page-head">
        <h1>Watchlist</h1>
        <p className="page-sub">Stocks you're following, scored live through the Buffett lens. Saved in this browser.</p>
      </header>

      <form
        className="wl-form"
        onSubmit={(e) => {
          e.preventDefault();
          add(tickerInput);
        }}
      >
        <label className="field">
          <span className="field-label">Add a ticker</span>
          <input type="text" value={tickerInput} onChange={(e) => setTickerInput(e.target.value)} placeholder="e.g. KO" autoComplete="off" />
        </label>
        <button type="submit" className="btn-solid">
          <Plus size={16} aria-hidden="true" /> Add
        </button>
        {error && <span className="tone-neg pf-inline" role="alert">{error}</span>}
      </form>

      {watchlist.length === 0 ? (
        <div className="wl-empty">
          <h2>Nothing on your watchlist yet</h2>
          <p className="panel-text">Add a ticker above, or pick one you've looked at recently.</p>
        </div>
      ) : (
        <div className="wl-table">
          <div className="wl-row wl-head" aria-hidden="true">
            <div className="wl-main">
              <span>Company</span>
              <span className="num">Price</span>
              <span className="num hide-sm">Fair value</span>
              <span className="num">Margin</span>
              <span className="hide-sm">Verdict</span>
            </div>
            <span />
          </div>
          {watchlist.map((t) => (
            <WatchRow key={t} ticker={t} onRemove={remove} />
          ))}
        </div>
      )}

      {recentNotWatched.length > 0 && (
        <section className="wl-recent" aria-labelledby="recent-title">
          <h2 id="recent-title">Recently viewed</h2>
          <ul className="wl-chips">
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
