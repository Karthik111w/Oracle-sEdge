import React, { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, BarChart3, Star } from 'lucide-react';

const HomePage = () => {
  const popularPicks = [
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'BRK-B', name: 'Berkshire Hathaway' },
    { ticker: 'MSFT', name: 'Microsoft Corp.' },
    { ticker: 'JNJ', name: 'Johnson & Johnson' },
    { ticker: 'KO', name: 'Coca-Cola Co.' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.' }
  ];

  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('watchlist_tickers');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch {
        setWatchlist([]);
      }
    }
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ 
          fontSize: '4rem', 
          fontWeight: 800, 
          letterSpacing: '-0.03em', 
          margin: '0 0 1rem 0',
          background: 'linear-gradient(90deg, var(--color-text) 0%, var(--color-primary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block'
        }}>
          Oracle's Edge
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Invest like Buffett. Business quality first, stock price second. 
          Discover intrinsic value with professional DCF models and AI analysis.
        </p>
      </div>

      <div style={{ marginBottom: '4rem' }}>
        <SearchBar />
      </div>

      <div style={{ marginBottom: '4rem' }}>
        <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text)', marginBottom: '1.5rem', textAlign: 'center' }}>Popular Analysis</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '1rem' 
        }}>
          {popularPicks.map(pick => (
            <Link 
              key={pick.ticker} 
              to={`/stock/${pick.ticker}`}
              className="card"
              style={{ 
                textDecoration: 'none', 
                padding: '1rem', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '0.25rem',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(212, 168, 83, 0.15)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>{pick.ticker}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pick.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '4rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Watchlist</h3>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)' }}>
              Keep your watchlist close and move names into the portfolio when they become attractive.
            </p>
          </div>
          <Link to="/watchlist" className="btn" style={{ padding: '0.9rem 1.4rem', borderRadius: '999px' }}>Manage Watchlist</Link>
        </div>

        {watchlist.length === 0 ? (
          <div style={{ marginTop: '1.5rem', color: 'var(--color-text-muted)' }}>No saved symbols yet. Add your first watchlist name on the Watchlist page.</div>
        ) : (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {watchlist.slice(0, 12).map(symbol => (
              <Link key={symbol} to={`/stock/${symbol}`} className="chip" style={{ padding: '0.75rem 1rem', borderRadius: '999px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)' }}>
                {symbol}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '2rem',
        marginTop: '5rem',
        paddingTop: '3rem',
        borderTop: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(212, 168, 83, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <Shield size={24} />
          </div>
          <h4 style={{ margin: 0 }}>Margin of Safety</h4>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>We calculate intrinsic value using a 2-stage DCF model to ensure you're buying with a proper margin of safety.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(212, 168, 83, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <TrendingUp size={24} />
          </div>
          <h4 style={{ margin: 0 }}>Business Quality</h4>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Our 100-point scorecard evaluates ROE, ROIC, margin trends, and debt to ensure the underlying business is sound.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(212, 168, 83, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <BarChart3 size={24} />
          </div>
          <h4 style={{ margin: 0 }}>AI Analyst</h4>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Powered by Gemini 2.5, get a comprehensive written report explaining the investment case just like Buffett would.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
