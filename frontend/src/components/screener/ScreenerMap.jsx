import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ringColor } from '../three/stage';
import { displayName } from '../home/LensVerdictCard';
import { marginText, verdictLabel } from '../../lib/verdict';
import { fmtPrice, isNum } from './format';

const X_MIN = -150;
const X_MAX = 100;
const X_TICKS = [-150, -100, -50, 0, 50, 100];
const Y_TICKS = [0, 25, 50, 75, 100];
const PAD = { top: 14, right: 18, bottom: 38, left: 40 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Margin of safety against score. Bubble area follows market cap. Pointer-first: the table
// view is the keyboard route to the same rows.
export default function ScreenerMap({ rows, suffix, stale }) {
  const navigate = useNavigate();
  const wrap = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const narrow = width > 0 && width < 560;
  const height = narrow ? 400 : 520;
  const iw = Math.max(0, width - PAD.left - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const sx = (m) => PAD.left + ((clamp(m, X_MIN + 6, X_MAX - 6) - X_MIN) / (X_MAX - X_MIN)) * iw;
  const sy = (s) => PAD.top + (1 - clamp(s, 0, 100) / 100) * ih;

  const { plotted, hidden } = useMemo(() => {
    const ok = rows.filter((r) => isNum(r.margin_pct) && isNum(r.score));
    const maxCap = Math.max(1, ...ok.map((r) => (isNum(r.market_cap) ? r.market_cap : 0)));
    const minR = narrow ? 5 : 6;
    const maxR = narrow ? 18 : 28;
    const list = ok
      .map((r) => ({ r, rad: minR + (maxR - minR) * Math.sqrt((isNum(r.market_cap) ? r.market_cap : 0) / maxCap) }))
      // big bubbles first so small ones stay on top and reachable
      .sort((a, b) => b.rad - a.rad);
    return { plotted: list, hidden: rows.length - ok.length };
  }, [rows, narrow]);

  const hovered = hover && plotted.find((p) => p.r.ticker === hover.ticker);
  const zeroX = PAD.left + ((0 - X_MIN) / (X_MAX - X_MIN)) * iw;
  const tip = hovered && {
    left: clamp(sx(hovered.r.margin_pct), 110, Math.max(110, width - 110)),
    top: sy(hovered.r.score),
    below: sy(hovered.r.score) < 150,
  };

  return (
    <div className={`sc-map${stale ? ' is-stale' : ''}`} ref={wrap} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Scatter map of ${plotted.length} companies: margin of safety across, score up. Use the table view to read or open individual rows with a keyboard.`}>
          <rect x={zeroX} y={PAD.top} width={Math.max(0, PAD.left + iw - zeroX)} height={ih} className="sc-map-zone" />
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + iw} y1={sy(t)} y2={sy(t)} className={t === 50 ? 'sc-map-mid' : 'sc-map-grid'} />
              <text x={PAD.left - 10} y={sy(t) + 4} textAnchor="end" className="sc-map-tick">{t}</text>
            </g>
          ))}
          {X_TICKS.map((t) => {
            const x = PAD.left + ((t - X_MIN) / (X_MAX - X_MIN)) * iw;
            return (
              <text key={t} x={x} y={height - PAD.bottom + 18} textAnchor="middle" className="sc-map-tick">{t > 0 ? `+${t}` : t}%</text>
            );
          })}
          <text x={PAD.left + iw / 2} y={height - 6} textAnchor="middle" className="sc-map-axis">Margin of safety</text>
          <text transform={`translate(11 ${PAD.top + ih / 2}) rotate(-90)`} textAnchor="middle" className="sc-map-axis">Score</text>

          <line x1={zeroX} x2={zeroX} y1={PAD.top} y2={PAD.top + ih} className="sc-map-zero" />
          <text x={zeroX + 6} y={PAD.top + ih - 8} className="sc-map-zero-label">fair value</text>

          <text x={PAD.left + 10} y={PAD.top + 18} className="sc-map-quad">High score, above fair value</text>
          <text x={PAD.left + iw - 10} y={PAD.top + 18} textAnchor="end" className="sc-map-quad">High score, below fair value</text>
          <text x={PAD.left + 10} y={PAD.top + ih - 22} className="sc-map-quad">Low score, above fair value</text>
          <text x={PAD.left + iw - 10} y={PAD.top + ih - 22} textAnchor="end" className="sc-map-quad">Low score, below fair value</text>

          <AnimatePresence>
            {plotted.map(({ r, rad }) => {
              const color = ringColor(r.classification);
              const on = hover?.ticker === r.ticker;
              const cx = sx(r.margin_pct);
              const cy = sy(r.score);
              return (
                <motion.g
                  key={r.ticker}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hover && !on ? 0.35 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="sc-map-dot"
                  onPointerEnter={() => setHover({ ticker: r.ticker })}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => navigate(`/stock/${r.ticker}${suffix}`)}
                >
                  <motion.circle
                    initial={{ cx, cy, r: 0 }}
                    animate={{ cx, cy, r: on ? rad + 3 : rad }}
                    transition={{ cx: { type: 'spring', stiffness: 90, damping: 18 }, cy: { type: 'spring', stiffness: 90, damping: 18 }, r: { duration: 0.2 } }}
                    fill={color}
                    fillOpacity={0.3}
                    stroke={color}
                    strokeWidth={on ? 2.4 : 1.4}
                  />
                  {rad >= 14 && (
                    <motion.text initial={{ x: cx, y: cy + 3.5 }} animate={{ x: cx, y: cy + 3.5 }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} textAnchor="middle" className="sc-map-label">
                      {r.ticker}
                    </motion.text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>
      )}

      <AnimatePresence>
        {hovered && (
          <motion.div
            key="tip"
            className="sc-map-tip"
            style={{ left: tip.left, top: tip.top, translateX: '-50%', translateY: tip.below ? '18px' : 'calc(-100% - 18px)' }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            aria-hidden="true"
          >
            <span className="sc-map-tip-top">
              <span className="mono sc-map-tip-ticker">{hovered.r.ticker}</span>
              <span className="sc-map-tip-verdict"><i style={{ background: ringColor(hovered.r.classification) }} />{verdictLabel(hovered.r)}</span>
            </span>
            <span className="sc-map-tip-name">{displayName(hovered.r.name || '')}</span>
            <span className="sc-map-tip-grid">
              <span>Price</span><span className="mono">{fmtPrice(hovered.r.price)}</span>
              <span>Score</span><span className="mono">{Math.round(hovered.r.score)}</span>
              <span>Margin</span><span className="mono">{marginText(hovered.r.margin_pct)}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {hidden > 0 && <p className="sc-map-note">{hidden} {hidden === 1 ? 'company has' : 'companies have'} no margin of safety and {hidden === 1 ? 'is' : 'are'} left off the map. Margins beyond the edges sit on the edge.</p>}
    </div>
  );
}
