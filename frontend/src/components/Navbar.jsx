import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Menu, Search, Settings, TrendingUp, X } from 'lucide-react';
import { OPEN_EVENT, isMac, openPalette, useFocusTrap, useScrollLock } from './CommandPalette';
import '../styles/shell.css';
import '../styles/shell-fx.css';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/screener', label: 'Screener' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/compare', label: 'Compare' },
];

// 2px brass line on the nav's bottom edge that follows page scroll; hidden when the page does not scroll.
const ScrollProgress = () => {
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 4) {
        el.style.opacity = '0';
        el.style.transform = 'scaleX(0)';
        return;
      }
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      el.style.opacity = '1';
      el.style.transform = `scaleX(${p})`;
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(queue) : null;
    ro?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return <span ref={ref} className="sh-progress" aria-hidden="true" />;
};

const pillSpring = { type: 'spring', stiffness: 500, damping: 40 };

const MobileSheet = ({ isActive, onClose }) => {
  const ref = useRef(null);
  useFocusTrap(ref, true);
  useScrollLock(true);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onPalette = () => onClose();
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onPalette);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onPalette);
    };
  }, [onClose]);

  return createPortal(
    <div className="sh-sheet" role="dialog" aria-modal="true" aria-label="Menu" id="sh-mobile-menu" ref={ref}>
      <div className="sh-sheet-head">
        <Link to="/" className="topnav-brand" onClick={onClose}>
          <TrendingUp size={26} className="topnav-logo" aria-hidden="true" />
          <span>Oracle's Edge</span>
        </Link>
        <button type="button" className="topnav-icon" onClick={onClose} aria-label="Close menu" autoFocus>
          <X size={20} />
        </button>
      </div>
      <button type="button" className="sh-sheet-search" onClick={() => { onClose(); openPalette(); }}>
        <Search size={18} aria-hidden="true" />
        <span>Search tickers and companies</span>
      </button>
      <nav className="sh-sheet-links" aria-label="Main">
        {LINKS.map(({ to, label }) => (
          <Link key={to} to={to} className={`sh-sheet-link${isActive(to) ? ' is-active' : ''}`} aria-current={isActive(to) ? 'page' : undefined} onClick={onClose}>
            {label}
          </Link>
        ))}
        <Link to="/settings" className={`sh-sheet-link${isActive('/settings') ? ' is-active' : ''}`} aria-current={isActive('/settings') ? 'page' : undefined} onClick={onClose}>
          Settings
        </Link>
      </nav>
    </div>,
    document.body
  );
};

const Navbar = () => {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hint, setHint] = useState('Ctrl K');
  const isActive = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  useEffect(() => {
    if (isMac()) setHint('⌘K');
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="topnav">
      <Link to="/" className="topnav-brand">
        <TrendingUp size={26} className="topnav-logo" aria-hidden="true" />
        <span className="topnav-name">Oracle's Edge</span>
      </Link>

      <nav className="topnav-links sh-desktop-only" aria-label="Main">
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
        <button type="button" className="sh-nav-search" onClick={openPalette} aria-label="Search" aria-keyshortcuts="Control+K Meta+K">
          <Search size={16} aria-hidden="true" />
          <span className="sh-nav-search-label">Search</span>
          <kbd className="sh-kbd" aria-hidden="true">{hint}</kbd>
        </button>
        <Link to="/settings" className={`topnav-icon sh-desktop-only${isActive('/settings') ? ' is-active' : ''}`} aria-label="Settings">
          <Settings size={19} />
        </Link>
        <button
          type="button"
          className="topnav-icon sh-mobile-only"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="sh-mobile-menu"
        >
          <Menu size={20} />
        </button>
      </div>

      <ScrollProgress />
      {menuOpen && <MobileSheet isActive={isActive} onClose={() => setMenuOpen(false)} />}
    </header>
  );
};

export default Navbar;
