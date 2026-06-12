import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const SearchBar = ({ initialValue = '' }) => {
  const [ticker, setTicker] = useState(initialValue);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticker.trim()) {
      navigate(`/stock/${ticker.trim().toUpperCase()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar" style={{ position: 'relative', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
        <Search size={24} />
      </div>
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Enter stock ticker (e.g., AAPL)"
        style={{
          width: '100%',
          padding: '1.25rem 1.25rem 1.25rem 3.5rem',
          fontSize: '1.25rem',
          borderRadius: '999px',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          outline: 'none',
          transition: 'all 0.3s'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--color-primary)';
          e.target.style.boxShadow = '0 0 0 3px rgba(212, 168, 83, 0.2)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--color-border)';
          e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        }}
      />
      <button 
        type="submit" 
        style={{
          position: 'absolute',
          right: '0.5rem',
          top: '0.5rem',
          bottom: '0.5rem',
          padding: '0 1.5rem',
          borderRadius: '999px',
          background: 'var(--color-primary)',
          color: '#000',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.filter = 'brightness(1.1)'}
        onMouseLeave={(e) => e.target.style.filter = 'brightness(1)'}
      >
        Analyze
      </button>
    </form>
  );
};

export default SearchBar;
