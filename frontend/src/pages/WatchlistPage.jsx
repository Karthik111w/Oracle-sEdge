import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X, Star } from 'lucide-react';
import SearchBar from '../components/SearchBar';

const STORAGE_KEY = 'watchlist_tickers';

const WatchlistPage = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [tickerInput, setTickerInput] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch {
        setWatchlist([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const addTicker = () => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker) {
      setError('Enter a ticker symbol first.');
      return;
    }
    if (watchlist.includes(ticker)) {
      setError(`${ticker} is already on your watchlist.`);
      return;
    }
    setWatchlist(prev => [...prev, ticker]);
    setTickerInput('');
    setError(null);
  };

  const removeTicker = (ticker) => {
    setWatchlist(prev => prev.filter(item => item !== ticker));
  };

  const goToTicker = (ticker) => {
    navigate(`/stock/${ticker}`);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Watchlist</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)' }}>
            Save tickers you want to monitor over time. Buffett watches companies before he buys.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Star size={24} color="var(--color-primary)" />
          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>{watchlist.length} symbols</span>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              placeholder="Add ticker (e.g. AAPL)"
              style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
            <button
              type="button"
              onClick={addTicker}
              style={{ padding: '0.95rem 1.5rem', borderRadius: '999px', background: 'var(--color-primary)', color: '#000', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add
            </button>
          </div>
          {error && <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{error}</div>}
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Use this page to keep a persistent list of stocks you want to follow before committing capital.
          </div>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>No watchlist symbols yet</h3>
          <p style={{ margin: '0.75rem 0 0', color: 'var(--color-text-muted)' }}>
            Add a few names and they will stay saved in your browser.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {watchlist.map((ticker) => (
            <div key={ticker} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{ticker}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Saved watchlist symbol</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => goToTicker(ticker)} className="btn" style={{ padding: '0.75rem 1.25rem' }}>Analyze</button>
                <button type="button" onClick={() => removeTicker(ticker)} style={{ border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', borderRadius: '10px', padding: '0.75rem 1rem', cursor: 'pointer' }}>
                  <X size={16} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchlistPage;
