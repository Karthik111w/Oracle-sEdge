import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';
import { formatMoney } from './LensVerdictCard';
import { useMarketConditions, useTrackedRanking } from './useTracked';

const BASE_SPEED = 38; // px per second when the page is still
const VELOCITY_GAIN = 2.2; // extra px per frame per unit of Lenis scroll velocity

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : 'n/a');

function Items({ market, rows }) {
  const ret = market?.market_return_90d_pct;
  return (
    <>
      {market && (
        <>
          <span className="tape-item">
            <span className="tape-key">S&amp;P 500, 90d annualized</span>
            <span className={`mono tone-${ret >= 0 ? 'pos' : 'neg'}`}>
              {ret > 0 ? '+' : ''}
              {ret.toFixed(2)}%
            </span>
          </span>
          <span className="tape-item">
            <span className="tape-key">Trend</span>
            <span>{cap(market.market_trend)}</span>
          </span>
          <span className="tape-item">
            <span className="tape-key">VIX</span>
            <span>{cap(market.volatility)}</span>
          </span>
        </>
      )}
      {rows.map((d) => {
        const m = d.margin.margin_pct;
        return (
          <span key={d.stock_data.ticker} className="tape-item">
            <span className="mono tape-ticker">{d.stock_data.ticker}</span>
            <span className="mono">{formatMoney(d.margin.current_price)}</span>
            <span className={`mono tone-${m >= 0 ? 'pos' : 'neg'}`}>
              {m > 0 ? '+' : ''}
              {m.toFixed(1)}% vs fair
            </span>
            <span className="tape-key">{d.classification_label || d.classification}</span>
          </span>
        );
      })}
    </>
  );
}

// Market readings and the tracked stocks' margins on a tape that runs with the page:
// scrolling down speeds it up, scrolling up runs it backwards.
const TickerTape = () => {
  const reduce = useReducedMotion();
  const rows = useTrackedRanking();
  const market = useMarketConditions();
  const x = useMotionValue(0);
  const half = useRef(0);
  const track = useRef(null);
  const direction = useRef(1);
  const velocity = useRef(0);
  const hovering = useRef(false);
  const [measured, setMeasured] = useState(false);

  useLenis(({ velocity: v }) => {
    velocity.current = v;
    if (v > 0.1) direction.current = 1;
    else if (v < -0.1) direction.current = -1;
  });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      half.current = el.scrollWidth / 2;
      setMeasured(half.current > 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows, market.status]);

  useAnimationFrame((_, delta) => {
    if (reduce || hovering.current || !half.current) return;
    const dt = Math.min(delta, 64);
    const move = direction.current * (BASE_SPEED * (dt / 1000) + Math.abs(velocity.current) * VELOCITY_GAIN * (dt / 16.7));
    let next = x.get() - move;
    // Wrap within one copy of the content so the loop is seamless in both directions.
    if (next <= -half.current) next += half.current;
    if (next > 0) next -= half.current;
    x.set(next);
  });

  const marketData = market.status === 'ok' ? market.data : null;
  const loading = rows === null && market.status === 'loading';
  const empty = !loading && !marketData && (!rows || rows.length === 0);
  if (empty) return null;

  return (
    <div
      className={`tape${reduce ? ' is-static' : ''}`}
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => (hovering.current = false)}
      aria-label="Live market and margin of safety readings"
      role="region"
    >
      {loading ? (
        <div className="tape-track">
          <span className="skel skel-cell tape-skel" />
        </div>
      ) : (
        <motion.div ref={track} className="tape-track" style={{ x: reduce ? 0 : x, opacity: measured || reduce ? 1 : 0 }}>
          <span className="tape-copy">
            <Items market={marketData} rows={rows || []} />
          </span>
          {!reduce && (
            <span className="tape-copy" aria-hidden="true">
              <Items market={marketData} rows={rows || []} />
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TickerTape;
