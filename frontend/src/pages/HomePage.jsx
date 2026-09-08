import React, { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, BarChart3, Star, ArrowUpRight, ArrowDownRight, ChevronRight, Activity } from 'lucide-react';

const HomePage = () => {
  const popularPicks = [
    { ticker: 'AAPL', name: 'Apple Inc.', change: '+12.4%', points: [10, 15, 12, 18, 22, 28, 35, 32, 40] },
    { ticker: 'BRK-B', name: 'Berkshire Hathaway', change: '+8.7%', points: [20, 22, 25, 23, 28, 30, 32, 34, 38] },
    { ticker: 'MSFT', name: 'Microsoft Corp.', change: '+15.2%', points: [15, 18, 22, 28, 25, 32, 38, 42, 50] }
  ];

  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const marketSnapshot = [
    { name: 'S&P 500', value: '5,241.53', change: '+1.23%', positive: true },
    { name: 'NASDAQ', value: '16,733.62', change: '+1.58%', positive: true },
    { name: 'DOW JONES', value: '39,872.99', change: '+0.98%', positive: true },
    { name: 'VIX', value: '12.45', change: '-2.35%', positive: false }
  ];

  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
      if (saved && saved.length > 0) {
        setRecentlyViewed(saved);
      } else {
        setRecentlyViewed([
          { ticker: 'AAPL', name: 'Apple Inc.', price: '$192.65', change: '+12.4%', changeVal: 12.4 },
          { ticker: 'MSFT', name: 'Microsoft Corp.', price: '$415.32', change: '+15.2%', changeVal: 15.2 },
          { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', price: '$498.71', change: '+6.3%', changeVal: 6.3 }
        ]);
      }
    } catch {
      setRecentlyViewed([]);
    }

    const savedWatchlist = localStorage.getItem('watchlist_tickers');
    if (savedWatchlist) {
      try {
        setWatchlist(JSON.parse(savedWatchlist));
      } catch {
        setWatchlist([]);
      }
    }
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>
      
      {/* Hero Section with Ambient Teal Glow */}
      <div style={{ textAlign: 'center', marginBottom: '3.5rem', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '180px',
          background: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.22) 0%, rgba(6, 182, 212, 0) 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0
        }}></div>

        <h1 style={{ 
          fontSize: '3.8rem', 
          fontWeight: 900, 
          letterSpacing: '-0.03em', 
          margin: '0 0 1rem 0',
          position: 'relative',
          zIndex: 1,
          color: 'var(--text-heading)'
        }}>
          Investment analysis<br />
          <span style={{ 
            background: 'linear-gradient(135deg, var(--text-heading) 0%, var(--color-teal) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            through the eyes of legends
          </span>
        </h1>

        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6', position: 'relative', zIndex: 1 }}>
          Make smarter decisions with legendary investment principles, advanced DCF models, and AI-powered insights.
        </p>
      </div>

      {/* Prominent Search Bar */}
      <div style={{ marginBottom: '4rem' }}>
        <SearchBar placeholder="Search any stock ticker..." />
      </div>

      {/* Popular Analysis Section with Sparklines */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Popular Analysis</h3>
          <Link to="/compare" style={{ color: 'var(--text-muted)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View all <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {popularPicks.map(pick => (
            <Link 
              key={pick.ticker} 
              to={`/stock/${pick.ticker}`}
              className="card"
              style={{ 
                textDecoration: 'none', 
                padding: '1.25rem 1.5rem', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.25s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)' }}>{pick.ticker}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{pick.name}</div>
                </div>
                <span style={{ 
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '6px', 
                  background: 'var(--color-success-bg)', 
                  color: 'var(--color-success)', 
                  fontWeight: 700, 
                  fontSize: '0.85rem' 
                }}>
                  {pick.change}
                </span>
              </div>

              {/* Mini Sparkline SVG */}
              <div style={{ height: '40px', width: '100%' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path
                    d={`M 0 35 Q 20 25, 40 28 T 80 15 L 100 5`}
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Split Row: Recently Viewed vs Market Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        
        {/* Recently Viewed */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recently Viewed</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>View all</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentlyViewed.map(item => {
              const isNeg = item.change?.startsWith('-') || item.changeVal < 0;
              return (
                <Link 
                  key={item.ticker} 
                  to={`/stock/${item.ticker}`} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '10px', 
                    background: 'var(--bg-row)', 
                    border: '1px solid var(--border-color)',
                    textDecoration: 'none',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                      {item.ticker[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.ticker}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.name}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.price}</span>
                    <span style={{ color: isNeg ? 'var(--color-danger)' : 'var(--color-success)', fontSize: '0.85rem', fontWeight: 700 }}>{item.change}</span>
                    <ChevronRight size={14} color="var(--color-text-muted)" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Market Snapshot */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} color="var(--color-teal)" /> Market Snapshot
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>As of 10:30 AM ET</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {marketSnapshot.map(m => (
              <div key={m.name} style={{ background: 'var(--bg-row)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.25rem 0' }}>{m.value}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: m.positive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {m.change}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default HomePage;
