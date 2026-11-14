import { useEffect, useState } from 'react';
import { getStockAnalysis } from '../../api/client';
import { cached, peekCached } from '../../api/cache';

const TTL = 15 * 60 * 1000;
const keyFor = (ticker, investor, horizon) => `analysis:${ticker}:${investor}:${horizon}`;

// Loads one analysis per ticker, independently: a failed ticker only marks its own entry.
// Returns { [ticker]: { status: 'loading' | 'ok' | 'error', d } }.
export function useAnalyses(tickers, investor, horizon = 'long') {
  const list = tickers.join(',');
  const [byTicker, setByTicker] = useState({});

  useEffect(() => {
    let alive = true;
    list.split(',').filter(Boolean).forEach((t) => {
      const key = keyFor(t, investor, horizon);
      const hit = peekCached(key, TTL);
      setByTicker((prev) => ({ ...prev, [`${t}|${investor}|${horizon}`]: hit ? { status: 'ok', d: hit } : { status: 'loading' } }));
      if (hit) return;
      cached(key, () => getStockAnalysis(t, investor, horizon), TTL)
        .then((d) => alive && setByTicker((prev) => ({ ...prev, [`${t}|${investor}|${horizon}`]: { status: 'ok', d } })))
        .catch(() => alive && setByTicker((prev) => ({ ...prev, [`${t}|${investor}|${horizon}`]: { status: 'error' } })));
    });
    return () => {
      alive = false;
    };
  }, [list, investor, horizon]);

  const out = {};
  list.split(',').filter(Boolean).forEach((t) => {
    out[t] = byTicker[`${t}|${investor}|${horizon}`] || { status: 'loading' };
  });
  return out;
}
