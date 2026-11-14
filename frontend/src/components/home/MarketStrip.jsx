import React from 'react';
import { useMarketOverview } from './useTracked';
import '../../styles/shell.css';

const W = 72;
const H = 24;

function Sparkline({ values, tone }) {
  const pts = (values || []).filter(Number.isFinite);
  if (pts.length < 2) return <span className="sh-spark" aria-hidden="true" />;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const points = pts.map((v, i) => `${((i / (pts.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - min) / span) * (H - 4)).toFixed(1)}`).join(' ');
  return (
    <svg className={`sh-spark is-${tone}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polyline points={points} fill="none" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const fmtLevel = (v) => v.toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2, minimumFractionDigits: v >= 1000 ? 0 : 2 });

const MarketStrip = () => {
  const { status, indices } = useMarketOverview();
  if (status === 'error') return null;

  return (
    <section className="sh-strip" aria-label="Market indices" aria-busy={status === 'loading'}>
      {status === 'loading' &&
        [0, 1, 2, 3].map((i) => (
          <div key={i} className="sh-strip-cell" aria-hidden="true">
            <span className="skel skel-cell" style={{ width: '45%' }} />
            <span className="skel skel-cell" style={{ width: '70%', height: 18 }} />
          </div>
        ))}
      {indices.map((ix) => {
        const ch = Number.isFinite(ix.change_pct) ? ix.change_pct : null;
        const tone = ch === null ? 'mid' : ch >= 0 ? 'pos' : 'neg';
        return (
          <div key={ix.symbol} className="sh-strip-cell">
            <span className="sh-strip-name">{ix.name || ix.symbol}</span>
            <span className="sh-strip-row">
              <span className="mono sh-strip-level">{fmtLevel(ix.price)}</span>
              <span className={`mono sh-strip-change tone-${tone}`}>{ch === null ? 'n/a' : `${ch > 0 ? '+' : ''}${ch.toFixed(2)}%`}</span>
            </span>
            <Sparkline values={ix.spark} tone={tone} />
          </div>
        );
      })}
    </section>
  );
};

export default MarketStrip;
