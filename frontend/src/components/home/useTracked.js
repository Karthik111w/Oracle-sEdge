import { useEffect, useState } from 'react';
import { getMarketConditions, getMarketOverview, getScreener, getStockAnalysis } from '../../api/client';
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

// Index levels for the strip under the hero. status: 'loading' | 'ok' | 'error'; hidden on error or no indices.
export function useMarketOverview() {
  const [state, setState] = useState({ status: 'loading', indices: [] });
  useEffect(() => {
    let alive = true;
    cached('market-overview', getMarketOverview, 2 * 60 * 1000)
      .then((d) => {
        if (!alive) return;
        const indices = Array.isArray(d?.indices) ? d.indices.filter((i) => i && i.symbol && Number.isFinite(i.price)) : [];
        setState(indices.length ? { status: 'ok', indices } : { status: 'error', indices: [] });
      })
      .catch(() => alive && setState({ status: 'error', indices: [] }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

const SCREENER_TTL = 5 * 60 * 1000;
const screenerReady = new Map();
const POLL_MS = 5000;

// Screener rows for one lens. Polls every 5s while the backend is still scoring (status "warming")
// or serving a stale result while it refreshes.
// state: { status: 'loading' | 'warming' | 'ready' | 'error', rows, progress }
export function useScreener(investor, horizon) {
  const [state, setState] = useState({ status: 'loading', rows: [], progress: null });
  useEffect(() => {
    let alive = true;
    let timer;
    const key = `${investor}:${horizon}`;
    const hit = screenerReady.get(key);
    if (hit && Date.now() - hit.at < SCREENER_TTL) {
      setState({ status: 'ready', rows: hit.rows, progress: null });
      return undefined;
    }
    setState({ status: 'loading', rows: [], progress: null });

    const load = () => {
      getScreener(investor, horizon)
        .then((d) => {
          if (!alive) return;
          const rows = Array.isArray(d?.rows) ? d.rows : [];
          if (d?.status === 'warming') {
            setState({ status: 'warming', rows, progress: d.progress || null });
            timer = setTimeout(load, POLL_MS);
          } else {
            setState({ status: 'ready', rows, progress: null });
            if (d?.refreshing) timer = setTimeout(load, POLL_MS);
            else screenerReady.set(key, { at: Date.now(), rows });
          }
        })
        .catch(() => alive && setState({ status: 'error', rows: [], progress: null }));
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [investor, horizon]);
  return state;
}
