import React, { useEffect, useId, useRef, useState } from 'react';
import { searchTickers } from '../api/client';
import { cached } from '../api/cache';
import '../styles/shell.css';

const TYPE_LABELS = { EQUITY: 'Stock', ETF: 'ETF', MUTUALFUND: 'Fund', INDEX: 'Index', CRYPTOCURRENCY: 'Crypto', CURRENCY: 'Currency', FUTURE: 'Future' };

export const formatType = (type) => {
  if (!type) return '';
  const key = String(type).toUpperCase();
  return TYPE_LABELS[key] || key.charAt(0) + key.slice(1).toLowerCase();
};

// Debounced symbol search. Responses that arrive after the query changed are ignored.
// status: 'idle' | 'loading' | 'ok' | 'error'
export function useTickerSearch(query, delay = 200) {
  const [state, setState] = useState({ status: 'idle', results: [], query: '' });
  const q = (query || '').trim();

  useEffect(() => {
    if (!q) {
      setState({ status: 'idle', results: [], query: '' });
      return undefined;
    }
    let stale = false;
    setState((s) => ({ ...s, status: 'loading' }));
    const timer = setTimeout(() => {
      cached(`search:${q.toLowerCase()}`, () => searchTickers(q), 5 * 60 * 1000)
        .then((results) => {
          if (!stale) setState({ status: 'ok', results: Array.isArray(results) ? results : [], query: q });
        })
        .catch(() => {
          if (!stale) setState({ status: 'error', results: [], query: q });
        });
    }, delay);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q, delay]);

  return state;
}

export function SearchResultText({ item }) {
  const meta = [item.exchange, formatType(item.type)].filter(Boolean).join(' · ');
  return (
    <>
      <span className="sh-opt-sym mono">{item.symbol}</span>
      <span className="sh-opt-name">{item.name || ''}</span>
      {meta && <span className="sh-opt-meta">{meta}</span>}
    </>
  );
}

// Controlled ticker input with a search-as-you-type dropdown (ARIA combobox).
// Enter with no highlighted suggestion is left to the parent form.
const TickerAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Search by ticker or company',
  ariaLabel = 'Stock ticker',
  autoFocus = false,
  className = '',
  inputClassName = '',
}) => {
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef(null);
  const { status, results } = useTickerSearch(value);
  const text = (value || '').trim();

  const showPanel = open && text.length > 0;
  const hasOptions = results.length > 0;

  useEffect(() => {
    setActive(-1);
  }, [results]);

  useEffect(() => {
    if (active < 0) return;
    document.getElementById(`${uid}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, uid]);

  const choose = (item) => {
    setOpen(false);
    onChange?.(item.symbol);
    onSelect?.(item.symbol);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!hasOptions) return;
      e.preventDefault();
      setOpen(true);
      const n = results.length;
      setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === 'Enter') {
      if (showPanel && active >= 0 && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === 'Escape') {
      if (showPanel) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
  };

  const expanded = showPanel && hasOptions;

  return (
    <div className={`sh-ac ${className}`.trim()}>
      <input
        type="text"
        className={inputClassName}
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${uid}-opt-${active}` : undefined}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
        autoFocus={autoFocus}
      />
      <div className="sh-ac-panel" hidden={!showPanel}>
        <ul id={listId} ref={listRef} role="listbox" aria-label="Suggestions" className="sh-opt-list" hidden={!expanded}>
          {results.map((item, i) => (
            <li
              key={`${item.symbol}-${i}`}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`sh-opt${i === active ? ' is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
            >
              <SearchResultText item={item} />
            </li>
          ))}
        </ul>
        {showPanel && !hasOptions && (
          <p className="sh-ac-note" role="status">
            {status === 'error' ? 'Suggestions are unavailable right now.' : status === 'ok' ? 'No matches.' : 'Searching...'}
          </p>
        )}
      </div>
    </div>
  );
};

export default TickerAutocomplete;
