import React, { useEffect, useState } from 'react';
import { getMarketConditions } from '../../api/client';
import { cached } from '../../api/cache';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : 'n/a');

// Live market read from /api/portfolio/market-conditions (SPY trend + VIX).
const MarketStrip = () => {
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

  if (state.status === 'error') {
    return (
      <div className="market-strip">
        <span className="market-strip-label">Market</span>
        <span className="muted">Live market data is unavailable right now.</span>
      </div>
    );
  }

  const d = state.data;
  const ret = d?.market_return_90d_pct;
  const items = [
    { label: 'S&P 500, 90d annualized', value: d ? `${ret > 0 ? '+' : ''}${ret.toFixed(2)}%` : null, tone: ret >= 0 ? 'pos' : 'neg', numeric: true },
    { label: 'Trend', value: d ? cap(d.market_trend) : null },
    { label: 'Volatility (VIX)', value: d ? cap(d.volatility) : null },
  ];

  return (
    <div className="market-strip" aria-busy={state.status === 'loading'}>
      <span className="market-strip-label">
        <span className="live-dot" /> Market
      </span>
      {items.map((it) => (
        <div key={it.label} className="market-item">
          <span className="market-item-label">{it.label}</span>
          {it.value === null ? (
            <span className="skel skel-cell" />
          ) : (
            <span className={`market-item-value${it.numeric ? ' mono' : ''}${it.tone ? ` tone-${it.tone}` : ''}`}>{it.value}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default MarketStrip;
