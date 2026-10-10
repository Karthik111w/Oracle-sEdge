import { useEffect, useState } from 'react';
import { getMarketConditions, getStockAnalysis } from '../../api/client';
import { cached } from '../../api/cache';
import { analysisKey } from './LensVerdictCard';

// A fixed set of large caps, scored live through the Buffett lens.
export const TRACKED = ['KO', 'PG', 'JNJ', 'AAPL', 'MSFT', 'V'];

// Live Buffett-lens analyses for TRACKED, ranked by margin of safety.
// rows: null while loading, [] if every request failed.
export function useTrackedRanking() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.allSettled(
      TRACKED.map((t) => cached(analysisKey(t, 'buffett'), () => getStockAnalysis(t, 'buffett', 'long')))
    ).then((settled) => {
      if (!alive) return;
      setRows(
        settled
          .filter((s) => s.status === 'fulfilled' && Number.isFinite(s.value?.margin?.margin_pct))
          .map((s) => s.value)
          .sort((a, b) => b.margin.margin_pct - a.margin.margin_pct)
      );
    });
    return () => {
      alive = false;
    };
  }, []);
  return rows;
}

// SPY trend and VIX read from /api/portfolio/market-conditions.
// status: 'loading' | 'ok' | 'error'.
export function useMarketConditions() {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    cached('market-conditions', () => getMarketConditions('buffett', 'long'))
      .then((d) => {
        if (!alive) return;
        // The backend falls back to neutral/medium/0 when yfinance fails; don't present that as data.
        const isFallback = d.market_trend === 'neutral' && d.market_return_90d_pct === 0;
        setState(isFallback ? { status: 'error' } : { status: 'ok', data: d });
      })
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
