import React, { useState } from 'react';
import { getStockAnalysis } from '../api/client';
import SearchBar from '../components/SearchBar';
import ScoreCard from '../components/ScoreCard';
import ScorecardTrend from '../components/ScorecardTrend';
import LoadingSpinner from '../components/LoadingSpinner';

const ComparePage = () => {
  const [leftTicker, setLeftTicker] = useState('AAPL');
  const [rightTicker, setRightTicker] = useState('MSFT');
  const [leftData, setLeftData] = useState(null);
  const [rightData, setRightData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const compare = async (e) => {
    e.preventDefault();
    if (!leftTicker.trim() || !rightTicker.trim()) return;
    setLoading(true);
    setError(null);
    setLeftData(null);
    setRightData(null);

    try {
      const [left, right] = await Promise.all([
        getStockAnalysis(leftTicker.trim().toUpperCase()),
        getStockAnalysis(rightTicker.trim().toUpperCase())
      ]);
      setLeftData(left);
      setRightData(right);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSummary = (data) => {
    if (!data) return null;
    const stock = data.stock_data;
    return (
      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stock.company_name}</div>
            <div style={{ color: 'var(--color-text-muted)' }}>{stock.ticker} • {stock.sector}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>${stock.current_price?.toFixed(2)}</div>
            <div style={{ color: 'var(--color-text-muted)' }}>{data.classification}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Buffett Score</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.scorecard.total_score}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Latest ROIC</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.scorecard.metrics.find(m => m.name === 'ROIC')?.value || 'N/A'}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Net Margin</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.scorecard.metrics.find(m => m.name === 'Profit Margin')?.value || 'N/A'}</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Grade</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{data.scorecard.grade}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Comparison Mode</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
          Compare two companies side-by-side to see which one looks stronger from a Buffett perspective.
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={compare} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Left ticker</label>
            <input type="text" value={leftTicker} onChange={(e) => setLeftTicker(e.target.value)} style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Right ticker</label>
            <input type="text" value={rightTicker} onChange={(e) => setRightTicker(e.target.value)} style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
          </div>
          <button type="submit" style={{ padding: '0.95rem 1.5rem', borderRadius: '999px', background: 'var(--color-primary)', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Compare</button>
        </form>
      </div>

      {loading && (
        <div className="card" style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner text="Fetching comparisons..." />
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--color-danger)' }}>
          <strong style={{ color: 'var(--color-danger)' }}>Error:</strong> {error}
        </div>
      )}

      {leftData && rightData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            {renderSummary(leftData)}
            <ScoreCard scorecard={leftData.scorecard} />
            <ScorecardTrend trend={leftData.scorecard_trend} />
          </div>
          <div>
            {renderSummary(rightData)}
            <ScoreCard scorecard={rightData.scorecard} />
            <ScorecardTrend trend={rightData.scorecard_trend} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparePage;
