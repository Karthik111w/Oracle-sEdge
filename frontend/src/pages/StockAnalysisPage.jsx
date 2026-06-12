import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStockAnalysis } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ScoreCard from '../components/ScoreCard';
import DCFChart from '../components/DCFChart';
import MarginGauge from '../components/MarginGauge';
import ETFProfileCard from '../components/ETFProfileCard';
import RiskFlags from '../components/RiskFlags';
import AIReport from '../components/AIReport';
import ClassificationBadge from '../components/ClassificationBadge';
import SearchBar from '../components/SearchBar';
import { ArrowLeft, AlertCircle } from 'lucide-react';

const StockAnalysisPage = () => {
  const { ticker } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getStockAnalysis(ticker);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text={`Analyzing ${ticker}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <SearchBar initialValue={ticker} />
        </div>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', borderTop: '4px solid var(--color-danger)' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0' }}>Ticker Not Found</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
            We could not analyze <strong>{ticker.toUpperCase()}</strong>. Please check the ticker symbol and try again.
          </p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>{error}</p>
          <Link to="/" className="btn">Return Home</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <div style={{ width: '300px' }}>
          <SearchBar />
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '2rem',
        padding: '2rem',
        background: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        backdropFilter: 'blur(20px)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>{data.stock_data.company_name}</h1>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '1.25rem'
            }}>
              {data.stock_data.ticker}
            </span>
          </div>
          <div style={{ color: 'var(--color-text-muted)', display: 'flex', gap: '1rem' }}>
            <span>{data.stock_data.sector}</span>
            <span>•</span>
            <span>{data.stock_data.industry}</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
            ${data.stock_data.current_price.toFixed(2)}
          </div>
          <ClassificationBadge classification={data.classification} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Risk Section - Full Width */}
        <RiskFlags riskData={data.risk} />

        {/* Top Grid: Scorecard + (Margin + DCF) OR ETF Profile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          <ScoreCard scorecard={data.scorecard} />
          
          {data.stock_data.quote_type === "ETF" ? (
            <ETFProfileCard stockData={data.stock_data} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <MarginGauge margin={data.margin} />
              <DCFChart dcf={data.dcf} />
            </div>
          )}
        </div>

        {/* Bottom Section: AI Report */}
        <AIReport ticker={ticker} />
      </div>
    </div>
  );
};

export default StockAnalysisPage;
