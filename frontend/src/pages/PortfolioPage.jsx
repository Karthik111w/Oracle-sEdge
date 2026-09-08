import React, { useState } from 'react';
import PortfolioForm from '../components/PortfolioForm';
import PortfolioCharts from '../components/PortfolioCharts';
import LoadingSpinner from '../components/LoadingSpinner';
import { optimizePortfolio } from '../api/client';
import { AlertCircle, Info } from 'lucide-react';

const INVESTOR_OPTIONS = [
  { value: 'buffett', label: 'Warren Buffett' },
  { value: 'lynch', label: 'Peter Lynch' },
  { value: 'graham', label: 'Benjamin Graham' },
  { value: 'munger', label: 'Charlie Munger' },
  { value: 'oneil', label: "William O'Neil" },
  { value: 'soros', label: 'George Soros' },
];

const HORIZON_OPTIONS = [
  { value: 'long', label: 'Long-term' },
  { value: 'short', label: 'Short-term' },
];

const PortfolioPage = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeStrategy, setActiveStrategy] = useState('balanced');
  const [selectedInvestor, setSelectedInvestor] = useState('buffett');
  const [selectedHorizon, setSelectedHorizon] = useState('long');
  const [error, setError] = useState(null);
  const [lastHoldingsParams, setLastHoldingsParams] = useState(null);

  const handleOptimize = async (holdings, cashAvailable = 0, useRecommendations = false, accountValue = 0) => {
    setLoading(true);
    setError(null);
    setLastHoldingsParams({ holdings, cashAvailable, useRecommendations, accountValue });
    try {
      const data = await optimizePortfolio(
        holdings,
        cashAvailable,
        useRecommendations,
        accountValue,
        selectedInvestor,
        selectedHorizon
      );
      setResults(data);
      setActiveStrategy('balanced');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestorSelect = (investorKey) => {
    setSelectedInvestor(investorKey);
    if (lastHoldingsParams) {
      handleOptimize(
        lastHoldingsParams.holdings,
        lastHoldingsParams.cashAvailable,
        lastHoldingsParams.useRecommendations,
        lastHoldingsParams.accountValue
      );
    }
  };

  const handleHorizonSelect = (horizonKey) => {
    setSelectedHorizon(horizonKey);
    if (lastHoldingsParams) {
      handleOptimize(
        lastHoldingsParams.holdings,
        lastHoldingsParams.cashAvailable,
        lastHoldingsParams.useRecommendations,
        lastHoldingsParams.accountValue
      );
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0' }}>Portfolio Optimizer</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', maxWidth: '700px', lineHeight: '1.6' }}>
            Input your current holdings to optimize risk-adjusted Sharpe Ratio. Scoring thresholds adapt to your selected legendary investor framework.
          </p>
        </div>

        {/* Investor & Horizon Selectors */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
              Investor Lens
            </span>
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.9)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              {INVESTOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleInvestorSelect(opt.value)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: selectedInvestor === opt.value ? 700 : 500,
                    background: selectedInvestor === opt.value ? 'linear-gradient(135deg, var(--color-gold), #b8922f)' : 'transparent',
                    color: selectedInvestor === opt.value ? '#0f172a' : 'var(--color-text-secondary)',
                    boxShadow: selectedInvestor === opt.value ? '0 0 12px rgba(212, 168, 83, 0.35)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
              Horizon
            </span>
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.9)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              {HORIZON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleHorizonSelect(opt.value)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: selectedHorizon === opt.value ? 700 : 500,
                    background: selectedHorizon === opt.value ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                    color: selectedHorizon === opt.value ? '#ffffff' : 'var(--color-text-secondary)',
                    boxShadow: selectedHorizon === opt.value ? '0 0 12px rgba(6, 182, 212, 0.35)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          marginBottom: '2rem', 
          padding: '1.5rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid var(--color-danger)', 
          borderRadius: '8px',
          color: 'var(--color-danger)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <AlertCircle size={24} />
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0' }}>Optimization Failed</h4>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}>
        <PortfolioForm onSubmit={handleOptimize} loading={loading} />
        
        {loading ? (
          <div className="card" style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner text="Running Mean-Variance Optimization..." />
            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Fetching 2 years of daily returns and calculating covariance matrix...
            </p>
          </div>
        ) : results ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(212, 168, 83, 0.1)', border: '1px solid var(--color-primary)', borderRadius: '8px', color: 'var(--color-text)' }}>
              <Info size={20} color="var(--color-primary)" />
              <span style={{ fontSize: '0.95rem' }}>
                Optimization complete. Choose a strategy to compare short-term, balanced, and long-term recommendations.
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {Object.entries(results.strategies || {}).map(([key, strategy]) => (
                <button
                  key={key}
                  onClick={() => setActiveStrategy(key)}
                  style={{
                    padding: '0.85rem 1.2rem',
                    borderRadius: '999px',
                    border: activeStrategy === key ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: activeStrategy === key ? 'var(--color-primary)' : 'transparent',
                    color: activeStrategy === key ? '#000' : 'var(--color-text)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {strategy.label}
                </button>
              ))}
            </div>

            {results.strategies?.[activeStrategy] ? (
              <div>
                <div style={{ marginBottom: '1rem', padding: '1rem 1.25rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <strong>{results.strategies[activeStrategy].label}</strong> — {results.strategies[activeStrategy].description}
                </div>
                <PortfolioCharts results={results} activeStrategy={activeStrategy} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PortfolioPage;
