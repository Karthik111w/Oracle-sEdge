import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { getMarketConditions, parseBulkHoldings } from '../api/client';

const PortfolioForm = ({ onSubmit, loading, selectedInvestor = 'buffett', selectedHorizon = 'long' }) => {
  const [holdings, setHoldings] = useState([
    { ticker: 'AAPL', shares: 10 },
    { ticker: 'MSFT', shares: 5 },
    { ticker: '', shares: '' }
  ]);
  const [cashAvailable, setCashAvailable] = useState('0');
  const [accountValue, setAccountValue] = useState('0');
  const [useRecommendations, setUseRecommendations] = useState(false);
  const [marketConditions, setMarketConditions] = useState(null);
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [bulkTickers, setBulkTickers] = useState('');
  const [bulkError, setBulkError] = useState(null);

  useEffect(() => {
    const savedHoldings = localStorage.getItem('portfolio_holdings');
    const savedCash = localStorage.getItem('portfolio_cash');
    if (savedHoldings) {
      try {
        const parsed = JSON.parse(savedHoldings);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHoldings(parsed.map(h => ({ ticker: h.ticker || '', shares: Number(h.shares) || 0 })));
        }
      } catch (err) {
        console.warn('Failed to load saved portfolio holdings', err);
      }
    }
    if (savedCash !== null) {
      setCashAvailable(savedCash);
    }
    const savedAccountValue = localStorage.getItem('portfolio_account_value');
    if (savedAccountValue !== null) {
      setAccountValue(savedAccountValue);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('portfolio_holdings', JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem('portfolio_cash', cashAvailable.toString());
  }, [cashAvailable]);

  useEffect(() => {
    localStorage.setItem('portfolio_account_value', accountValue.toString());
  }, [accountValue]);

  useEffect(() => {
    setMarketConditions(null);
  }, [selectedInvestor, selectedHorizon]);

  useEffect(() => {
    if (useRecommendations && !marketConditions && !conditionsLoading) {
      setConditionsLoading(true);
      getMarketConditions(selectedInvestor, selectedHorizon)
        .then(data => {
          setMarketConditions(data);
          setConditionsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setConditionsLoading(false);
        });
    }
  }, [useRecommendations, marketConditions, conditionsLoading, selectedInvestor, selectedHorizon]);

  const handleHoldingChange = (index, field, value) => {
    const newHoldings = [...holdings];
    if (field === 'shares') {
      newHoldings[index][field] = value === '' ? '' : Number(value);
    } else {
      newHoldings[index][field] = value.toUpperCase();
    }
    setHoldings(newHoldings);
  };

  const addRow = () => {
    setHoldings([...holdings, { ticker: '', shares: '' }]);
  };

  const removeRow = (index) => {
    const newHoldings = holdings.filter((_, i) => i !== index);
    setHoldings(newHoldings);
  };

  const parseBulkTickers = async () => {
    const rawText = bulkTickers.trim();
    if (!rawText) {
      setBulkError('Enter at least one valid ticker.');
      return;
    }

    setBulkError(null);
    try {
      const data = await parseBulkHoldings(rawText);
      const newRows = (data.holdings || [])
        .filter((h) => h.ticker && h.ticker.trim())
        .map((h) => ({ ticker: h.ticker.toUpperCase(), shares: Number(h.shares) || 0 }))
        .filter((h) => !holdings.some((existing) => existing.ticker.toUpperCase() === h.ticker));

      if (newRows.length === 0) {
        setBulkError('No new ticker/share pairs were found.');
        return;
      }

      setHoldings((prev) => [...prev, ...newRows, { ticker: '', shares: '' }]);
      setBulkTickers('');
      setBulkError(null);
    } catch (err) {
      setBulkError(err.message || 'Failed to parse bulk holdings.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Filter out empty ticker rows, but ALLOW shares = 0
    const validHoldings = holdings
      .filter(h => h.ticker.trim() !== '')
      .map(h => ({ ticker: h.ticker.trim().toUpperCase(), shares: Number(h.shares) || 0 }));

    const cash = Number(cashAvailable) || 0;
    const account = Number(accountValue) || 0;
    if (validHoldings.length > 0) {
      onSubmit(validHoldings, cash, useRecommendations, account);
    }
  };

  const cap = (v) => (v ? v[0].toUpperCase() + v.slice(1) : 'n/a');

  return (
    <section className="panel" aria-labelledby="holdings-title">
      <header className="panel-head">
        <div>
          <h2 id="holdings-title">Your holdings</h2>
          <p className="panel-note">Saved in this browser. Enter shares as 0 to include a ticker you don't own yet.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="pf-form">
        <div className="pf-rows">
          <div className="pf-row pf-row--head" aria-hidden="true">
            <span>Ticker</span>
            <span>Shares</span>
            <span />
          </div>
          {holdings.map((holding, index) => (
            <div key={index} className="pf-row">
              <input
                type="text"
                placeholder="e.g. AAPL"
                aria-label={`Ticker ${index + 1}`}
                value={holding.ticker}
                onChange={(e) => handleHoldingChange(index, 'ticker', e.target.value)}
                autoComplete="off"
              />
              <input
                type="number"
                placeholder="0"
                min="0"
                step="any"
                aria-label={`Shares ${index + 1}`}
                value={holding.shares}
                onChange={(e) => handleHoldingChange(index, 'shares', e.target.value)}
              />
              <button type="button" className="pf-remove" onClick={() => removeRow(index)} aria-label={`Remove row ${index + 1}`}>
                <X size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="btn-quiet pf-add" onClick={addRow}>
            <Plus size={14} aria-hidden="true" /> Add row
          </button>
        </div>

        <div className="pf-money">
          <label className="field">
            <span className="field-label">Total account value</span>
            <input type="number" placeholder="0" min="0" step="any" value={accountValue} onChange={(e) => setAccountValue(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Available cash</span>
            <input type="number" placeholder="0" min="0" step="any" value={cashAvailable} onChange={(e) => setCashAvailable(e.target.value)} />
          </label>
          <p className="panel-note pf-money-note">
            Fill in total account value to have cash worked out from your holdings. Otherwise, fill in available cash only.
          </p>
        </div>

        <details className="pf-bulk">
          <summary>Paste a list of tickers</summary>
          <label className="field">
            <span className="field-label">Tickers, separated by commas, spaces or new lines</span>
            <textarea value={bulkTickers} onChange={(e) => setBulkTickers(e.target.value)} placeholder="KO, PG, JNJ" rows={3} />
          </label>
          <div className="pf-bulk-actions">
            <button type="button" className="btn-quiet" onClick={parseBulkTickers}>
              Add to holdings
            </button>
            {bulkError && <span className="tone-neg pf-inline">{bulkError}</span>}
          </div>
        </details>

        <label className="pf-check">
          <input type="checkbox" checked={useRecommendations} onChange={(e) => setUseRecommendations(e.target.checked)} />
          <span>Also test adding stocks recommended for the current market</span>
        </label>

        {useRecommendations && (
          <div className="pf-reco" aria-live="polite">
            {conditionsLoading ? (
              <p className="panel-note">Loading market conditions</p>
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
                  Candidates: <span className="mono">{marketConditions.recommended_stocks.join(', ')}</span>
                </p>
              </>
            ) : null}
          </div>
        )}

        <div className="pf-submit">
          <button type="submit" className="btn-solid" disabled={loading}>
            {loading ? 'Optimizing' : 'Optimize portfolio'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default PortfolioForm;
