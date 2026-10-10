import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Settings, TrendingUp } from 'lucide-react';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/compare', label: 'Compare' },
];

const pillSpring = { type: 'spring', stiffness: 500, damping: 40 };

const Navbar = () => {
  const { pathname } = useLocation();
  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <header className="topnav">
      <Link to="/" className="topnav-brand">
        <TrendingUp size={26} className="topnav-logo" aria-hidden="true" />
        <span className="topnav-name">Oracle's Edge</span>
      </Link>

      <nav className="topnav-links" aria-label="Main">
        {LINKS.map(({ to, label }) => {
          const active = isActive(to);
          return (
            <Link key={to} to={to} className={`topnav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
              {active && <motion.span layoutId="topnav-pill" className="topnav-pill" transition={pillSpring} />}
              <span className="topnav-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="topnav-actions">
        <Link to="/settings" className={`topnav-icon${isActive('/settings') ? ' is-active' : ''}`} aria-label="Settings">
          <Settings size={19} />
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
