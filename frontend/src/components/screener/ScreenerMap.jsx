import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ringColor } from '../three/stage';
import { displayName } from '../home/LensVerdictCard';
import { marginText, verdictLabel } from '../../lib/verdict';
import { fmtPrice, isNum } from './format';

const X_MIN = -150;
const X_MAX = 100;
const X_TICKS = [-150, -100, -50, 0, 50, 100];
const Y_TICKS = [0, 25, 50, 75, 100];
const PAD = { top: 40, right: 18, bottom: 38, left: 40 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Small stable number in [0, 1) from a ticker, so jitter does not change between renders.
const hash01 = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};
const VERDICT_CLASS = { Buy: 'Buy', Watchlist: 'Watchlist', Hold: 'Hold', Avoid: 'Avoid' };

// Margin of safety against score. Bubble area follows market cap. Pointer-first: the table
// view is the keyboard route to the same rows.
export default function ScreenerMap({ rows, suffix, stale }) {
  const navigate = useNavigate();
  const wrap = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  // Touch: the first tap shows the tooltip, a second tap on the same bubble (or its Open link) navigates.
  const [touchMode, setTouchMode] = useState(false);
  const tapped = useRef(null);

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
  const maxR = narrow ? 18 : 28;
  const minR = narrow ? 5 : 6;
  // Data is mapped inside the plot inset by the largest radius, so no bubble is clipped or reaches the captions.
  const innerW = Math.max(1, iw - 2 * maxR);
  const innerH = Math.max(1, ih - 2 * maxR);
  const sxRaw = (m) => PAD.left + maxR + ((m - X_MIN) / (X_MAX - X_MIN)) * innerW;
  const sx = (m) => sxRaw(clamp(m, X_MIN, X_MAX));
  const sy = (s) => PAD.top + maxR + (1 - clamp(s, 0, 100) / 100) * innerH;

  const { plotted, hidden } = useMemo(() => {
    const ok = rows.filter((r) => isNum(r.margin_pct) && isNum(r.score));
    const maxCap = Math.max(1, ...ok.map((r) => (isNum(r.market_cap) ? r.market_cap : 0)));
    const list = ok
      .map((r) => ({ r, rad: minR + (maxR - minR) * Math.sqrt((isNum(r.market_cap) ? r.market_cap : 0) / maxCap) }))
      // big bubbles first so small ones stay on top and reachable
      .sort((a, b) => b.rad - a.rad);
    return { plotted: list, hidden: rows.length - ok.length };
  }, [rows, minR, maxR]);

  // Final positions. Margins beyond the axis pile up on an edge, so those points get a stable
  // inward jitter and are pushed apart vertically; they carry an edge chevron. Labels are
  // placed largest first and dropped when they would sit on an earlier one.
  const placed = useMemo(() => {
    if (!width) return [];
    const out = plotted.map((p) => {
      const m = p.r.margin_pct;
      const side = m < X_MIN ? -1 : m > X_MAX ? 1 : 0;
      let cx = sx(m);
      let cy = sy(p.r.score);
      if (side) {
        cx -= side * hash01(`x${p.r.ticker}`) * Math.min(26, maxR);
        cy += (hash01(`y${p.r.ticker}`) - 0.5) * 14;
      }
      return { ...p, side, cx, cy };
    });
    const top = PAD.top + maxR;
    const bottom = PAD.top + ih - maxR;
    [-1, 1].forEach((side) => {
      const col = out.filter((o) => o.side === side).sort((a, b) => a.cy - b.cy);
      col.forEach((o, i) => {
        if (i === 0) return;
        const prev = col[i - 1];
        const gap = (o.rad + prev.rad) * 0.7;
        if (o.cy - prev.cy < gap) o.cy = prev.cy + gap;
      });
      // pushing down can run past the plot: shift the whole column back up when it does
      const over = col.length ? col[col.length - 1].cy - bottom : 0;
      if (over > 0) col.forEach((o) => { o.cy = Math.max(top, o.cy - over); });
    });
    const boxes = [];
    out.forEach((o) => {
      o.label = false;
      if (o.rad < 14) return;
      const w = o.r.ticker.length * 6 + 6;
      const box = { x0: o.cx - w / 2, x1: o.cx + w / 2, y0: o.cy - 6, y1: o.cy + 7 };
      if (boxes.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) return;
      boxes.push(box);
      o.label = true;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotted, width, height]);

  const hovered = hover && placed.find((p) => p.r.ticker === hover.ticker);
  const zeroX = sxRaw(0);
  const tip = hovered && {
    left: clamp(hovered.cx, 110, Math.max(110, width - 110)),
    top: hovered.cy,
    below: hovered.cy < 150,
  };
  const clearTap = () => {
    tapped.current = null;
    setHover(null);
  };
  const openStock = (ticker) => navigate(`/stock/${ticker}${suffix}`);

  return (
    <div className={`sc-map${stale ? ' is-stale' : ''}`} ref={wrap} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} onPointerDown={(e) => { if (!e.target.closest?.('.sc-map-dot')) clearTap(); }} role="img" aria-label={`Scatter map of ${plotted.length} companies: margin of safety across, score up. Use the table view to read or open individual rows with a keyboard.`}>
          <rect x={zeroX} y={PAD.top} width={Math.max(0, PAD.left + iw - zeroX)} height={ih} className="sc-map-zone" />
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + iw} y1={sy(t)} y2={sy(t)} className={t === 50 ? 'sc-map-mid' : 'sc-map-grid'} />
              <text x={PAD.left - 10} y={sy(t) + 4} textAnchor="end" className="sc-map-tick">{t}</text>
            </g>
          ))}
          {X_TICKS.map((t) => {
            const x = sxRaw(t);
            return (
              <text key={t} x={x} y={height - PAD.bottom + 18} textAnchor="middle" className="sc-map-tick">{t > 0 ? `+${t}` : t}%</text>
            );
          })}
          <text x={PAD.left + iw / 2} y={height - 6} textAnchor="middle" className="sc-map-axis">Margin of safety</text>
          <text transform={`translate(11 ${PAD.top + ih / 2}) rotate(-90)`} textAnchor="middle" className="sc-map-axis">Score</text>

          <line x1={zeroX} x2={zeroX} y1={PAD.top} y2={PAD.top + ih} className="sc-map-zero" />
          <text x={zeroX + 6} y={PAD.top + ih - 8} className="sc-map-zero-label">fair value</text>

          <text x={PAD.left + 10} y={20} className="sc-map-quad">{narrow ? 'High, above fair value' : 'High score, above fair value'}</text>
          <text x={PAD.left + iw - 10} y={20} textAnchor="end" className="sc-map-quad">{narrow ? 'High, below fair value' : 'High score, below fair value'}</text>
          <text x={PAD.left + 10} y={PAD.top + ih - 22} className="sc-map-quad">{narrow ? 'Low, above' : 'Low score, above fair value'}</text>
          <text x={PAD.left + iw - 10} y={PAD.top + ih - 22} textAnchor="end" className="sc-map-quad">{narrow ? 'Low, below' : 'Low score, below fair value'}</text>

          <AnimatePresence>
            {placed.map(({ r, rad, cx, cy, side, label }) => {
              const on = hover?.ticker === r.ticker;
              return (
                <motion.g
                  key={r.ticker}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hover && !on ? 0.35 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`sc-map-dot sc-map-b--${VERDICT_CLASS[r.classification] || 'Watchlist'}`}
                  style={{ '--bub': ringColor(r.classification) }}
                  onPointerEnter={(e) => { if (e.pointerType !== 'touch') setHover({ ticker: r.ticker }); }}
                  onPointerLeave={(e) => { if (e.pointerType !== 'touch') setHover(null); }}
                  onPointerDown={(e) => { if (e.pointerType === 'touch') setTouchMode(true); }}
                  onClick={() => {
                    if (touchMode && tapped.current !== r.ticker) {
                      tapped.current = r.ticker;
                      setHover({ ticker: r.ticker });
                      return;
                    }
                    openStock(r.ticker);
                  }}
                >
                  <motion.circle
                    className="sc-map-bubble"
                    initial={{ cx, cy, r: 0 }}
                    animate={{ cx, cy, r: on ? rad + 3 : rad }}
                    transition={{ cx: { type: 'spring', stiffness: 90, damping: 18 }, cy: { type: 'spring', stiffness: 90, damping: 18 }, r: { duration: 0.2 } }}
                    strokeWidth={on ? 2.4 : 1.4}
                  />
                  {side !== 0 && (
                    <path className="sc-map-chev" d={side < 0 ? `M ${PAD.left + 9} ${cy - 4.5} L ${PAD.left + 4} ${cy} L ${PAD.left + 9} ${cy + 4.5}` : `M ${PAD.left + iw - 9} ${cy - 4.5} L ${PAD.left + iw - 4} ${cy} L ${PAD.left + iw - 9} ${cy + 4.5}`} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {label && (
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
            className={`sc-map-tip${touchMode ? ' is-touch' : ''}`}
            style={{ left: tip.left, top: tip.top, translateX: '-50%', translateY: tip.below ? '18px' : 'calc(-100% - 18px)' }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            aria-hidden={touchMode ? undefined : 'true'}
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
            {touchMode && <Link to={`/stock/${hovered.r.ticker}${suffix}`} className="sc-map-tip-open">Open {hovered.r.ticker}</Link>}
          </motion.div>
        )}
      </AnimatePresence>
      {hidden > 0 && <p className="sc-map-note">{hidden} {hidden === 1 ? 'company has' : 'companies have'} no margin of safety and {hidden === 1 ? 'is' : 'are'} left off the map. Margins beyond the edges sit on the edge.</p>}
    </div>
  );
}
