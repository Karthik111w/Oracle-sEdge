import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ArrowRight } from 'lucide-react';

const SearchBar = ({ initialValue = '', placeholder = 'Enter stock ticker (e.g., AAPL)', compact = false }) => {
  const [ticker, setTicker] = useState(initialValue);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticker.trim()) {
      navigate(`/stock/${ticker.trim().toUpperCase()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`ticker-search${compact ? ' ticker-search--compact' : ''}`} role="search">
      <Search className="ticker-search-icon" size={compact ? 18 : 20} aria-hidden="true" />
      <input
        type="text"
        className="ticker-search-input"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder={placeholder}
        aria-label="Stock ticker"
        autoComplete="off"
        spellCheck="false"
      />
      <motion.button
        type="submit"
        className="ticker-search-btn"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <span>Analyze</span>
        <ArrowRight size={16} aria-hidden="true" />
      </motion.button>
    </form>
  );
};

export default SearchBar;
