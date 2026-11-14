import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react';
import { cleanTicker, useRecentlyViewed, useWatchlist } from '../lib/storage';
import { SearchResultText, useTickerSearch } from './TickerAutocomplete';
import '../styles/shell.css';

export const OPEN_EVENT = 'oe-open-palette';
export const openPalette = () => window.dispatchEvent(new CustomEvent(OPEN_EVENT));

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');

const PAGES = [
  { to: '/screener', label: 'Screener', hint: 'Rank companies through a lens' },
  { to: '/portfolio', label: 'Portfolio', hint: 'Analyze and optimize holdings' },
  { to: '/watchlist', label: 'Watchlist', hint: 'Your saved tickers' },
  { to: '/compare', label: 'Compare', hint: 'Side by side' },
  { to: '/settings', label: 'Settings', hint: 'API key, defaults and data' },
];

const TICKER_LIKE = /^[A-Za-z]{1,6}([.-][A-Za-z]{1,2})?$/;

let lockCount = 0;
// Locks page scroll (body overflow and Lenis) while any modal surface is open.
export function useScrollLock(active) {
  const lenis = useLenis();
  useEffect(() => {
    if (!active) return undefined;
    lockCount += 1;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenis?.stop();
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = prev;
        lenis?.start();
      }
    };
  }, [active, lenis]);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Keeps Tab inside `ref` while active and returns focus to the previous element on close.
export function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const nodes = [...ref.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || !ref.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !ref.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
  }, [ref, active]);
}

const isTypingTarget = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

const Palette = ({ onClose }) => {
  const uid = useId();
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const recent = useRecentlyViewed();
  const watchlist = useWatchlist();
  const { status, results } = useTickerSearch(query);
  const q = query.trim();

  useFocusTrap(dialogRef, true);
  useScrollLock(true);

  const go = useCallback(
    (to) => {
      onClose();
      navigate(to);
    },
    [navigate, onClose]
  );
  const goStock = useCallback((symbol) => go(`/stock/${encodeURIComponent(cleanTicker(symbol))}`), [go]);

  // Sections of options; `flat` is the keyboard order.
  const sections = useMemo(() => {
    if (!q) {
      const out = [];
      const seen = new Set();
      const rec = recent
        .filter((r) => r?.ticker)
        .slice(0, 5)
        .map((r) => {
          seen.add(r.ticker);
          return { key: `r-${r.ticker}`, kind: 'stock', symbol: r.ticker, name: r.name };
        });
      if (rec.length) out.push({ title: 'Recently viewed', items: rec });
      const wl = watchlist.tickers
        .filter((t) => !seen.has(t))
        .slice(0, 6)
        .map((t) => ({ key: `w-${t}`, kind: 'stock', symbol: t }));
      if (wl.length) out.push({ title: 'Watchlist', items: wl });
      out.push({ title: 'Pages', items: PAGES.map((p) => ({ key: `p-${p.to}`, kind: 'page', ...p })) });
      return out;
    }
    const out = [];
    const clean = cleanTicker(q);
    const exact = results.some((r) => r.symbol === clean);
    const stocks = [];
    if (TICKER_LIKE.test(q) && !exact) stocks.push({ key: 'analyze', kind: 'analyze', symbol: clean });
    results.forEach((r, i) => stocks.push({ key: `s-${r.symbol}-${i}`, kind: 'result', item: r, symbol: r.symbol }));
    if (stocks.length) out.push({ title: 'Companies', items: stocks });
    const pages = PAGES.filter((p) => p.label.toLowerCase().startsWith(q.toLowerCase()));
    if (pages.length) out.push({ title: 'Pages', items: pages.map((p) => ({ key: `p-${p.to}`, kind: 'page', ...p })) });
    return out;
  }, [q, results, recent, watchlist.tickers]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    setActive(0);
  }, [sections]);

  useEffect(() => {
    document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, uid]);

  const run = (opt) => {
    if (!opt) return;
    if (opt.kind === 'page') go(opt.to);
    else goStock(opt.symbol);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = flat.length;
      if (n) setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flat[active]);
    }
  };

  let index = -1;
  const showNote = q && !flat.length;

  return createPortal(
    <div className="sh-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="sh-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search and jump to"
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <div className="sh-palette-bar">
          <Search size={18} aria-hidden="true" className="sh-palette-icon" />
          <input
            autoFocus
            type="text"
            className="sh-palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a ticker or company"
            aria-label="Search tickers, companies and pages"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={`${uid}-list`}
            aria-autocomplete="list"
            aria-activedescendant={flat.length ? `${uid}-opt-${active}` : undefined}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <kbd className="sh-kbd">Esc</kbd>
        </div>

        <div className="sh-palette-body">
          <div id={`${uid}-list`} role="listbox" aria-label="Results" className="sh-palette-list">
            {sections.map((section) => (
              <div key={section.title} role="group" aria-label={section.title} className="sh-group">
                <p className="sh-group-title" aria-hidden="true">{section.title}</p>
                {section.items.map((opt) => {
                  index += 1;
                  const i = index;
                  return (
                    <div
                      key={opt.key}
                      id={`${uid}-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      className={`sh-opt${opt.kind === 'page' ? ' sh-opt--page' : ''}${i === active ? ' is-active' : ''}`}
                      onMouseMove={() => i !== active && setActive(i)}
                      onClick={() => run(opt)}
                    >
                      {opt.kind === 'result' && <SearchResultText item={opt.item} />}
                      {opt.kind === 'analyze' && (
                        <>
                          <span className="sh-opt-sym mono">{opt.symbol}</span>
                          <span className="sh-opt-name">Analyze {opt.symbol}</span>
                        </>
                      )}
                      {opt.kind === 'stock' && (
                        <>
                          <span className="sh-opt-sym mono">{opt.symbol}</span>
                          <span className="sh-opt-name">{opt.name || ''}</span>
                        </>
                      )}
                      {opt.kind === 'page' && (
                        <>
                          <span className="sh-opt-page">{opt.label}</span>
                          <span className="sh-opt-name">{opt.hint}</span>
                          <ArrowRight size={14} aria-hidden="true" className="sh-opt-go" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="sh-palette-status" role="status" aria-live="polite">
            {q && status === 'loading' && 'Searching...'}
            {q && status === 'error' && 'Search is unavailable right now. Enter still opens a typed ticker.'}
            {showNote && status === 'ok' && 'No matches.'}
          </p>
        </div>

        <div className="sh-palette-foot" aria-hidden="true">
          <span><kbd className="sh-kbd">&uarr;</kbd><kbd className="sh-kbd">&darr;</kbd> Move</span>
          <span><kbd className="sh-kbd"><CornerDownLeft size={11} /></kbd> Open</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(document.activeElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return open ? <Palette onClose={close} /> : null;
};

export default CommandPalette;
