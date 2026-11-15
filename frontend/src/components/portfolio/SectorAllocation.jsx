import React, { useState } from 'react';
import { motion } from 'motion/react';
import { formatMoney } from '../home/LensVerdictCard';
import { pctFromFraction } from './format';

// Gold steps, largest first. The legend names every sector with its percentage, so the
// shade is never the only way to tell them apart.
const SHADES = [1, 0.78, 0.6, 0.46, 0.35, 0.27, 0.2, 0.15];
const shadeColor = (i) => `color-mix(in srgb, var(--color-gold) ${SHADES[i % SHADES.length] * 100}%, var(--bg-hover))`;

const R = 70;
const GAP = 0.012; // fraction of the circle left between slices

const pt = (a) => `${(R * Math.cos(a)).toFixed(3)} ${(R * Math.sin(a)).toFixed(3)}`;
const arc = (f0, f1) => {
  const a0 = f0 * 2 * Math.PI - Math.PI / 2;
  const a1 = f1 * 2 * Math.PI - Math.PI / 2;
  return `M ${pt(a0)} A ${R} ${R} 0 ${f1 - f0 > 0.5 ? 1 : 0} 1 ${pt(a1)}`;
};

const SectorAllocation = ({ sectors }) => {
  const [active, setActive] = useState(null);
  const rows = [...sectors].filter((s) => Number.isFinite(s.weight) && s.weight > 0).sort((a, b) => b.weight - a.weight);
  if (rows.length === 0) return <p className="panel-note">No sector data for these holdings.</p>;
  const total = rows.reduce((s, r) => s + r.weight, 0) || 1;
  const summary = rows.map((r) => `${r.sector} ${pctFromFraction(r.weight, 0)}`).join(', ');

  let acc = 0;
  const slices = rows.map((r, i) => {
    const frac = r.weight / total;
    const start = acc;
    acc += frac;
    const mid = (start + frac / 2) * 2 * Math.PI - Math.PI / 2;
    return { ...r, i, frac, start, dx: Math.cos(mid), dy: Math.sin(mid) };
  });
  const focus = active != null ? slices[active] : null;

  return (
    <div className="pfx-sector">
      <div className="pfx-donut" role="img" aria-label={`Sector allocation: ${summary}`}>
        <svg viewBox="-100 -100 200 200" aria-hidden="true">
          <circle r={R} fill="none" className="pfx-donut-track" strokeWidth="22" />
          {slices.map((s) => {
            const lift = active === s.i ? 6 : 0;
            return (
              <motion.g key={s.sector} animate={{ x: s.dx * lift, y: s.dy * lift }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
                <motion.path
                  className={`pfx-slice${active === s.i ? ' is-active' : ''}${active != null && active !== s.i ? ' is-dim' : ''}`}
                  d={arc(s.start + GAP / 2, s.start + Math.max(GAP, s.frac - GAP / 2))}
                  fill="none"
                  stroke={shadeColor(s.i)}
                  strokeWidth={active === s.i ? 26 : 22}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: s.i * 0.08 }}
                  onPointerEnter={() => setActive(s.i)}
                  onPointerLeave={() => setActive(null)}
                />
              </motion.g>
            );
          })}
        </svg>
        <div className="pfx-donut-center" aria-hidden="true">
          <span className="pfx-donut-val mono">{focus ? pctFromFraction(focus.weight) : rows.length}</span>
          <span className="pfx-donut-cap">{focus ? focus.sector || 'Unknown' : rows.length === 1 ? 'sector' : 'sectors'}</span>
          {focus && <span className="pfx-donut-sub mono">{formatMoney(focus.value)}</span>}
        </div>
      </div>
      <ul className="pf2-legend">
        {rows.map((r, i) => (
          <li
            key={r.sector}
            className={active === i ? 'is-active' : ''}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
          >
            <span className="pf2-swatch" style={{ background: shadeColor(i) }} aria-hidden="true" />
            <span className="pf2-legend-name">{r.sector || 'Unknown'}</span>
            <span className="mono pf2-legend-val">{pctFromFraction(r.weight)}</span>
            <span className="mono muted pf2-legend-money hide-sm">{formatMoney(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SectorAllocation;
