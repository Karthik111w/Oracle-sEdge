import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ArrowRight } from 'lucide-react';
import TickerAutocomplete from './TickerAutocomplete';
import { cleanTicker } from '../lib/storage';

const SearchBar = ({ initialValue = '', placeholder = 'Enter stock ticker (e.g., AAPL)', compact = false }) => {
  const [ticker, setTicker] = useState(initialValue);
  const navigate = useNavigate();

  const open = (symbol) => navigate(`/stock/${encodeURIComponent(cleanTicker(symbol))}`);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ticker.trim()) open(ticker);
  };

  return (
    <form onSubmit={handleSubmit} className={`ticker-search sh-search${compact ? ' ticker-search--compact' : ''}`} role="search">
      <Search className="ticker-search-icon" size={compact ? 18 : 20} aria-hidden="true" />
      <TickerAutocomplete
        value={ticker}
        onChange={setTicker}
        onSelect={open}
        placeholder={placeholder}
        ariaLabel="Stock ticker"
        className="sh-ac--inline"
        inputClassName="ticker-search-input"
      />
      <motion.button
        type="submit"
        className="ticker-search-btn"
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.1 }}
      >
        <span>Analyze</span>
        <ArrowRight size={16} aria-hidden="true" />
      </motion.button>
    </form>
  );
};

export default SearchBar;
