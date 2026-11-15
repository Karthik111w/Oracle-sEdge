import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { getMarketConditions, parseBulkHoldings } from '../api/client';
import { cleanTicker, useWatchlist } from '../lib/storage';
import TickerAutocomplete from './TickerAutocomplete';
import '../styles/portfolio.css';

const HOLDINGS_KEY = 'portfolio_holdings';
const CASH_KEY = 'portfolio_cash';
const ACCOUNT_KEY = 'portfolio_account_value';

// The backend rejects more than this many holdings.
const MAX_HOLDINGS = 50;
const limitMessage = (extra) => `A portfolio can hold at most ${MAX_HOLDINGS} holdings.${extra ? ` ${extra}` : ''}`;

const BLANK = { ticker: '', shares: '' };
const EXAMPLE = [
  { ticker: 'AAPL', shares: 10 },
  { ticker: 'MSFT', shares: 5 },
  { ticker: 'KO', shares: 40 },
  { ticker: 'JPM', shares: 8 },
  { ticker: 'XOM', shares: 15 },
];

const load = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the form still works for this visit
  }
};

function initialHoldings() {
  try {
    const parsed = JSON.parse(load(HOLDINGS_KEY));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((h) => ({ ticker: String(h.ticker || '').toUpperCase(), shares: h.shares === '' || h.shares == null ? '' : Number(h.shares) || 0 }));
    }
  } catch {
    // fall through to a blank form
  }
  return [{ ...BLANK }];
}

// Per-row problems, keyed by row index. Rows with neither ticker nor shares are ignored.
function validate(rows) {
  const errors = {};
  rows.forEach((h, i) => {
    const shares = h.shares === '' ? 0 : Number(h.shares);
    if (h.bad || !Number.isFinite(shares)) errors[i] = 'Enter a valid number of shares.';
    else if (shares < 0) errors[i] = 'Shares cannot be negative.';
    else if (!h.ticker.trim() && shares > 0) errors[i] = 'Enter a ticker for these shares.';
  });
  return errors;
}

// Merge duplicate tickers (shares add up) and drop blank rows.
function mergeRows(rows) {
  const byTicker = new Map();
  let merged = 0;
  rows.forEach((h) => {
    const ticker = cleanTicker(h.ticker);
    if (!ticker) return;
    const shares = Number(h.shares) || 0;
    if (byTicker.has(ticker)) {
      byTicker.get(ticker).shares += shares;
      merged += 1;
    } else {
      byTicker.set(ticker, { ticker, shares });
    }
  });
  return { list: [...byTicker.values()], merged };
}

const PortfolioForm = ({ onAnalyze, onOptimize, busy, selectedInvestor = 'buffett', selectedHorizon = 'long' }) => {
  const [holdings, setHoldings] = useState(initialHoldings);
  const [cashAvailable, setCashAvailable] = useState(() => load(CASH_KEY) ?? '0');
  const [accountValue, setAccountValue] = useState(() => load(ACCOUNT_KEY) ?? '0');
  const [useRecommendations, setUseRecommendations] = useState(false);
  const [marketConditions, setMarketConditions] = useState(null);
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [bulkTickers, setBulkTickers] = useState('');
  const [bulkError, setBulkError] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const watchlist = useWatchlist();

  useEffect(() => save(HOLDINGS_KEY, JSON.stringify(holdings)), [holdings]);
  useEffect(() => save(CASH_KEY, String(cashAvailable)), [cashAvailable]);
  useEffect(() => save(ACCOUNT_KEY, String(accountValue)), [accountValue]);

  useEffect(() => {
    setMarketConditions(null);
  }, [selectedInvestor, selectedHorizon]);

  useEffect(() => {
    if (useRecommendations && !marketConditions && !conditionsLoading) {
      setConditionsLoading(true);
      getMarketConditions(selectedInvestor, selectedHorizon)
        .then((data) => setMarketConditions(data))
        .catch((err) => console.error(err))
        .finally(() => setConditionsLoading(false));
    }
  }, [useRecommendations, marketConditions, conditionsLoading, selectedInvestor, selectedHorizon]);

  const edit = (next) => {
    setHoldings(next);
    setErrors({});
    setNotice(null);
  };

  const changeRow = (index, field, value, badInput = false) => {
    edit(
      holdings.map((h, i) => {
        if (i !== index) return h;
        // kept as typed so an invalid entry (1e400) still reaches validation and shows its message
        // badInput: the browser holds text it cannot read as a number (1e400), and reports value ''
        if (field === 'shares') return { ...h, shares: value, bad: badInput };
        return { ...h, ticker: value.toUpperCase() };
      })
    );
  };

  const filledCount = holdings.filter((h) => h.ticker.trim()).length;
  const atLimit = holdings.length >= MAX_HOLDINGS;

  const addRow = () => {
    if (atLimit) return setErrors({ form: limitMessage('Remove a row before adding another.') });
    edit([...holdings, { ...BLANK }]);
  };
  const removeRow = (index) => {
    const next = holdings.filter((_, i) => i !== index);
    edit(next.length ? next : [{ ...BLANK }]);
  };

  const isEmpty = holdings.every((h) => !h.ticker.trim() && !h.shares);
  const loadExample = () => edit(EXAMPLE.map((h) => ({ ...h })));

  const inList = new Set(holdings.map((h) => cleanTicker(h.ticker)).filter(Boolean));
  const watchOptions = watchlist.tickers.filter((t) => !inList.has(t));
  const addFromWatchlist = (ticker) => {
    if (!ticker) return;
    if (filledCount >= MAX_HOLDINGS) return setErrors({ form: limitMessage('Remove a holding before adding another.') });
    edit([...holdings.filter((h) => h.ticker.trim() || h.shares !== ''), { ticker, shares: '' }]);
  };

  const parseBulk = async () => {
    const rawText = bulkTickers.trim();
    if (!rawText) {
      setBulkError('Enter at least one valid ticker.');
      return;
    }
    setBulkError(null);
    try {
      // A plain list ("KO, JPM MSFT") is split here; anything else is treated as a pasted
      // brokerage statement and parsed by the backend, which expects one ticker per line.
      const plainList = /^[A-Za-z0-9.\-\s,]+$/.test(rawText);
      const data = plainList
        ? { holdings: rawText.split(/[\s,]+/).filter(Boolean).map((t) => ({ ticker: t, shares: 0 })) }
        : await parseBulkHoldings(rawText);
      const newRows = (data.holdings || [])
        .filter((h) => h.ticker && h.ticker.trim())
        .map((h) => ({ ticker: h.ticker.toUpperCase(), shares: Number(h.shares) || 0 }))
        .filter((h, i, all) => all.findIndex((o) => o.ticker === h.ticker) === i)
        .filter((h) => !holdings.some((existing) => existing.ticker.toUpperCase() === h.ticker));
      if (newRows.length === 0) {
        setBulkError('No new ticker/share pairs were found.');
        return;
      }
      if (filledCount + newRows.length > MAX_HOLDINGS) {
        const room = Math.max(0, MAX_HOLDINGS - filledCount);
        setBulkError(limitMessage(`You have ${filledCount} and tried to add ${newRows.length} more; there is room for ${room}.`));
        return;
      }
      edit([...holdings.filter((h) => h.ticker.trim()), ...newRows]);
      setBulkTickers('');
    } catch (err) {
      setBulkError(err.message || 'Failed to parse bulk holdings.');
    }
  };

  // mode: 'analyze' needs at least one position with shares; 'optimize' also accepts 0 shares.
  const submit = (mode) => {
    const found = validate(holdings);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    const { list, merged } = mergeRows(holdings);
    if (list.length === 0) {
      setErrors({ form: 'Add at least one ticker.' });
      return;
    }
    if (list.length > MAX_HOLDINGS) {
      setErrors({ form: limitMessage(`You have ${list.length}. Remove ${list.length - MAX_HOLDINGS} to continue.`) });
      return;
    }
    if (mode === 'analyze' && !list.some((h) => h.shares > 0)) {
      setErrors({ form: 'Enter the number of shares you own for at least one ticker to analyze the portfolio.' });
      return;
    }
    if (merged > 0) {
      setHoldings([...list]);
      setNotice(`Merged ${merged} duplicate ${merged === 1 ? 'ticker' : 'tickers'}; their shares were added together.`);
    } else {
      setNotice(null);
    }
    setErrors({});
    const req = {
      holdings: mode === 'analyze' ? list.filter((h) => h.shares > 0) : list,
      cashAvailable: Number(cashAvailable) || 0,
      accountValue: Number(accountValue) || 0,
      useRecommendations,
    };
    (mode === 'analyze' ? onAnalyze : onOptimize)(req);
  };

  const cap = (v) => (v ? v[0].toUpperCase() + v.slice(1) : 'n/a');

  return (
    <section className="panel" aria-labelledby="holdings-title">
      <header className="panel-head">
        <div>
          <h2 id="holdings-title">Your holdings</h2>
          <p className="panel-note">Saved in this browser. Shares of 0 are allowed for the optimizer, to test a ticker you do not own yet.</p>
        </div>
        <div className="pf2-head-actions">
          {isEmpty && (
            <button type="button" className="btn-quiet" onClick={loadExample}>
              Load example
            </button>
          )}
          <label className="pf2-watch">
            <span className="sr-only">Add from watchlist</span>
            <select value="" onChange={(e) => addFromWatchlist(e.target.value)} disabled={watchOptions.length === 0} aria-label="Add from watchlist">
              <option value="">{watchlist.tickers.length === 0 ? 'No watchlist yet' : watchOptions.length === 0 ? 'All added' : 'Add from watchlist'}</option>
              {watchOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit('analyze');
        }}
        className="pf2-form"
        noValidate
      >
        <div className="pf2-rows">
          <div className="pf2-row pf2-row--head" aria-hidden="true">
            <span>Ticker</span>
            <span>Shares</span>
            <span />
          </div>
          {holdings.map((holding, index) => (
            <div key={index} className="pf2-row-wrap">
              <div className="pf2-row">
                <TickerAutocomplete
                  value={holding.ticker}
                  onChange={(text) => changeRow(index, 'ticker', text)}
                  placeholder="e.g. AAPL"
                  ariaLabel={`Ticker ${index + 1}`}
                  className="pf2-ac"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  min="0"
                  step="any"
                  aria-label={`Shares ${index + 1}`}
                  aria-invalid={errors[index] ? 'true' : undefined}
                  value={holding.shares}
                  onChange={(e) => changeRow(index, 'shares', e.target.value, e.target.validity.badInput)}
                />
                <button type="button" className="pf2-remove" onClick={() => removeRow(index)} aria-label={`Remove row ${index + 1}`}>
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              {errors[index] && (
                <p className="pf2-row-error" role="alert">
                  {errors[index]}
                </p>
              )}
            </div>
          ))}
          <button type="button" className="btn-quiet pf2-add" onClick={addRow} aria-disabled={atLimit}>
            <Plus size={14} aria-hidden="true" /> Add row
          </button>
          <p className="panel-note pf2-count">{filledCount} of {MAX_HOLDINGS} holdings</p>
        </div>

        <div className="pf2-money">
          <label className="field">
            <span className="field-label">Total account value</span>
            <input type="number" placeholder="0" min="0" step="any" value={accountValue} onChange={(e) => setAccountValue(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Available cash</span>
            <input type="number" placeholder="0" min="0" step="any" value={cashAvailable} onChange={(e) => setCashAvailable(e.target.value)} />
          </label>
          <p className="panel-note pf2-money-note">
            Used by the optimizer. Fill in total account value to have cash worked out from your holdings, otherwise fill in available cash only.
          </p>
        </div>

        <details className="pf2-bulk">
          <summary>Paste a list of tickers or a brokerage statement</summary>
          <label className="field">
            <span className="field-label">Tickers, separated by commas, spaces or new lines</span>
            <textarea value={bulkTickers} onChange={(e) => setBulkTickers(e.target.value)} placeholder="KO, PG, JNJ" rows={3} />
          </label>
          <div className="pf2-bulk-actions">
            <button type="button" className="btn-quiet" onClick={parseBulk}>
              Add to holdings
            </button>
            {bulkError && <span className="tone-neg pf2-inline">{bulkError}</span>}
          </div>
        </details>

        <label className="pf2-check">
          <input type="checkbox" checked={useRecommendations} onChange={(e) => setUseRecommendations(e.target.checked)} />
          <span>Optimizer: also test adding stocks recommended for the current market</span>
        </label>

        {useRecommendations && (
          <div className="pf2-reco" aria-live="polite">
            {conditionsLoading ? (
              <div className="skel skel-md" aria-label="Loading market conditions" />
            ) : marketConditions ? (
              <>
                <dl className="deck-facts">
                  <div>
                    <dt>Market trend</dt>
                    <dd>{cap(marketConditions.market_trend)}</dd>
                  </div>
                  <div>
                    <dt>Volatility (VIX)</dt>
                    <dd>{cap(marketConditions.volatility)}</dd>
                  </div>
                  <div>
                    <dt>S&amp;P 500, 90d annualized</dt>
                    <dd className={`mono tone-${marketConditions.market_return_90d_pct >= 0 ? 'pos' : 'neg'}`}>
                      {marketConditions.market_return_90d_pct > 0 ? '+' : ''}
                      {marketConditions.market_return_90d_pct}%
                    </dd>
                  </div>
                </dl>
                <p className="panel-text">
                  Candidates: <span className="mono">{(marketConditions.recommended_stocks || []).join(', ')}</span>
                </p>
              </>
            ) : null}
          </div>
        )}

        {errors.form && (
          <p className="inline-error pf2-form-error" role="alert">
            {errors.form}
          </p>
        )}
        {notice && (
          <p className="panel-note pf2-notice" role="status">
            {notice}
          </p>
        )}

        <div className="pf2-submit">
          <button type="button" className="btn-quiet pf2-secondary" disabled={busy} onClick={() => submit('optimize')}>
            Optimize weights
          </button>
          <button type="submit" className="btn-solid" disabled={busy}>
            Analyze portfolio
          </button>
        </div>
      </form>
    </section>
  );
};

export default PortfolioForm;
