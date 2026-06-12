import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, TrendingUp } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--color-text)' }}>
        <div style={{ color: 'var(--color-primary)' }}>
          <TrendingUp size={28} />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Oracle's Edge</span>
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link 
          to="/" 
          style={{ 
            textDecoration: 'none', 
            color: location.pathname === '/' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
        >
          Home
        </Link>
        <Link 
          to="/portfolio" 
          style={{ 
            textDecoration: 'none', 
            color: location.pathname === '/portfolio' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
        >
          Portfolio
        </Link>
        <Link 
          to="/watchlist" 
          style={{ 
            textDecoration: 'none', 
            color: location.pathname === '/watchlist' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
        >
          Watchlist
        </Link>
        <Link 
          to="/compare" 
          style={{ 
            textDecoration: 'none', 
            color: location.pathname === '/compare' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
        >
          Compare
        </Link>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 0.5rem' }}></div>
        
        <Link to="/settings" style={{ color: location.pathname === '/settings' ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
          <Settings size={20} />
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
};

export default Navbar;
