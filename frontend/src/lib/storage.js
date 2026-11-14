import { useCallback, useEffect, useState } from 'react';

// Browser-only persistence shared across pages. Every read and write is guarded:
// storage can be unavailable (private mode) and the app must still work for the visit.
const CHANGE_EVENT = 'oe-storage';

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: the in-memory state still applies
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
}

// useState backed by localStorage, kept in sync across components and tabs.
export function useStored(key, fallback) {
  const [value, setValue] = useState(() => readJson(key, fallback));

  useEffect(() => {
    const sync = (e) => {
      const changed = e.type === 'storage' ? e.key : e.detail?.key;
      if (changed === key) setValue(readJson(key, fallback));
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
    // fallback is a literal at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(readJson(key, fallback)) : next;
      writeJson(key, resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  return [value, update];
}

export const cleanTicker = (raw) => (raw || '').trim().toUpperCase().replace('.', '-');

const WATCHLIST_KEY = 'watchlist_tickers';

// { tickers, has(t), add(t), remove(t), toggle(t) }; tickers is an array of uppercase symbols.
export function useWatchlist() {
  const [stored, setStored] = useStored(WATCHLIST_KEY, []);
  const tickers = Array.isArray(stored) ? stored : [];
  const has = (t) => tickers.includes(cleanTicker(t));
  const add = (t) => {
    const ticker = cleanTicker(t);
    if (ticker) setStored((prev) => (Array.isArray(prev) && prev.includes(ticker) ? prev : [...(prev || []), ticker]));
  };
  const remove = (t) => setStored((prev) => (prev || []).filter((x) => x !== cleanTicker(t)));
  const toggle = (t) => (has(t) ? remove(t) : add(t));
  return { tickers, has, add, remove, toggle };
}

const PREFS_KEY = 'oe_prefs';
const DEFAULT_PREFS = { investor: 'buffett', horizon: 'long' };

// Default lens and horizon chosen in Settings: [prefs, setPrefs(partial)].
export function usePrefs() {
  const [stored, setStored] = useStored(PREFS_KEY, DEFAULT_PREFS);
  const prefs = { ...DEFAULT_PREFS, ...(stored || {}) };
  const setPrefs = (partial) => setStored((prev) => ({ ...DEFAULT_PREFS, ...(prev || {}), ...partial }));
  return [prefs, setPrefs];
}

// Recently viewed tickers, written by the analysis page: [{ ticker, name, price, change, changeVal }]
export function useRecentlyViewed() {
  const [stored] = useStored('recently_viewed', []);
  return Array.isArray(stored) ? stored : [];
}
