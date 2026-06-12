import React, { useState, useEffect } from 'react';
import { Plus, X, PieChart, Zap, TrendingUp, Gauge } from 'lucide-react';
import { getMarketConditions, parseBulkHoldings } from '../api/client';

const PortfolioForm = ({ onSubmit, loading }) => {
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
    if (useRecommendations && !marketConditions && !conditionsLoading) {
      setConditionsLoading(true);
      getMarketConditions()
        .then(data => {
          setMarketConditions(data);
          setConditionsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setConditionsLoading(false);
        });
    }
  }, [useRecommendations, marketConditions, conditionsLoading]);

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

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <PieChart size={24} color="var(--color-primary)" />
        Current Holdings
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          <div>Ticker Symbol</div>
          <div>Number of Shares</div>
          <div></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {holdings.map((holding, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="e.g. AAPL"
                value={holding.ticker}
                onChange={(e) => handleHoldingChange(index, 'ticker', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
              />
              <input
                type="number"
                placeholder="0"
                min="0"
                step="any"
                value={holding.shares}
                onChange={(e) => handleHoldingChange(index, 'shares', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}
              />
              <button 
                type="button" 
                onClick={() => removeRow(index)}
                disabled={holdings.length <= 1}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-danger)',
                  cursor: holdings.length <= 1 ? 'not-allowed' : 'pointer',
                  opacity: holdings.length <= 1 ? 0.3 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Total Account Value</div>
            <input
              type="number"
              placeholder="0"
              min="0"
              step="any"
              value={accountValue}
              onChange={(e) => setAccountValue(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)'
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Available Cash</div>
            <input
              type="number"
              placeholder="0"
              min="0"
              step="any"
              value={cashAvailable}
              onChange={(e) => setCashAvailable(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)'
              }}
            />
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Enter your total account value if you want the optimizer to derive cash available from current holdings. Otherwise, fill only available cash.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 600, color: 'var(--color-text)' }}>Bulk ticker import</label>
            <textarea
              value={bulkTickers}
              onChange={(e) => setBulkTickers(e.target.value)}
              placeholder="Paste tickers separated by commas, newlines, or spaces."
              rows={4}
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" onClick={parseBulkTickers} style={{ padding: '0.9rem 1.2rem', borderRadius: '999px', background: 'var(--color-primary)', border: 'none', color: '#000', cursor: 'pointer' }}>
                Add tickers to portfolio
              </button>
              {bulkError && <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{bulkError}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={addRow}
              style={{
                background: 'transparent',
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Plus size={16} /> Add Row
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useRecommendations}
                  onChange={(e) => setUseRecommendations(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.95rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} color="var(--color-primary)" />
                  Test adding recommended stocks
                </span>
              </label>
              
              <button 
                type="submit" 
                className="btn" 
                disabled={loading}
                style={{ padding: '0.75rem 2rem', marginLeft: 'auto' }}
              >
                {loading ? 'Optimizing...' : 'Optimize Portfolio'}
              </button>
            </div>
          </div>

          {useRecommendations && (
            <div style={{ 
              padding: '1.25rem', 
              background: 'rgba(99, 102, 241, 0.05)', 
              border: '1px solid rgba(99, 102, 241, 0.2)', 
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <TrendingUp size={18} color="var(--color-primary)" />
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text)' }}>Market-Adaptive Recommendations</h4>
              </div>
              
              {conditionsLoading ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>Loading market conditions...</p>
              ) : marketConditions ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Market Trend:</span>
                    <div style={{ 
                      color: marketConditions.market_trend === 'bull' ? 'var(--color-success)' : 
                             marketConditions.market_trend === 'bear' ? 'var(--color-danger)' : 
                             'var(--color-warning)',
                      fontWeight: 600,
                      marginTop: '0.25rem'
                    }}>
                      {marketConditions.market_trend === 'bull' ? '📈' : 
                       marketConditions.market_trend === 'bear' ? '📉' : 
                       '➡️'} {marketConditions.market_trend.charAt(0).toUpperCase() + marketConditions.market_trend.slice(1)}
                    </div>
                  </div>
                  
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Volatility:</span>
                    <div style={{ 
                      color: marketConditions.volatility === 'low' ? 'var(--color-success)' : 
                             marketConditions.volatility === 'high' ? 'var(--color-danger)' : 
                             'var(--color-warning)',
                      fontWeight: 600,
                      marginTop: '0.25rem'
                    }}>
                      {marketConditions.volatility === 'low' ? '🟢' : 
                       marketConditions.volatility === 'high' ? '🔴' : 
                       '🟡'} {marketConditions.volatility.charAt(0).toUpperCase() + marketConditions.volatility.slice(1)}
                    </div>
                  </div>
                  
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>90-Day Return:</span>
                    <div style={{ 
                      color: marketConditions.market_return_90d_pct >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 600,
                      marginTop: '0.25rem'
                    }}>
                      {marketConditions.market_return_90d_pct > 0 ? '+' : ''}{marketConditions.market_return_90d_pct}%
                    </div>
                  </div>
                </div>
              ) : null}
              
              {marketConditions && (
                <div style={{ 
                  paddingTop: '1rem', 
                  borderTop: '1px solid rgba(99, 102, 241, 0.2)',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)'
                }}>
                  <span style={{ fontWeight: 500 }}>Recommended stocks:</span>
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {marketConditions.recommended_stocks.map((ticker, idx) => (
                      <span key={idx} style={{ 
                        background: 'rgba(99, 102, 241, 0.15)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        color: 'var(--color-text)'
                      }}>
                        {ticker}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default PortfolioForm;
