import React, { useState } from 'react';
import PortfolioForm from '../components/PortfolioForm';
import PortfolioCharts from '../components/PortfolioCharts';
import LoadingSpinner from '../components/LoadingSpinner';
import { optimizePortfolio } from '../api/client';
import { AlertCircle, Info } from 'lucide-react';

const PortfolioPage = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleOptimize = async (holdings, cashAvailable = 0, useRecommendations = false, accountValue = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await optimizePortfolio(holdings, cashAvailable, useRecommendations, accountValue);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0' }}>Portfolio Optimizer</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', maxWidth: '800px', lineHeight: '1.6' }}>
          Input your current holdings to see how you could improve your risk-adjusted returns (Sharpe Ratio). 
          <strong> The Buffett Rule:</strong> The optimizer will only recommend increasing your allocation for companies that score 70 or higher on our business quality scorecard.
        </p>
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
                Optimization complete. Stocks with a Buffett Score below 70 were restricted from increasing their portfolio weight.
              </span>
            </div>
            
            <PortfolioCharts results={results} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PortfolioPage;
