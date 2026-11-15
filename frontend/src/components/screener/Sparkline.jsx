import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getPriceHistory } from '../../api/client';
import { cached } from '../../api/cache';

const W = 96;
const H = 28;

// Last 30 closes for a ticker, or null while loading / when the request fails (callers show nothing).
export function useSparkPoints(ticker) {
  const [pts, setPts] = useState(null);
  useEffect(() => {
    let alive = true;
    cached(`spark:${ticker}:1mo`, () => getPriceHistory(ticker, '1mo'), 10 * 60 * 1000)
      .then((res) => {
        const closes = (res?.history || []).map((p) => p.close).filter((c) => Number.isFinite(c)).slice(-30);
        if (alive) setPts(closes.length >= 2 ? closes : null);
      })
      .catch(() => alive && setPts(null));
    return () => {
      alive = false;
    };
  }, [ticker]);
  return pts;
}

export default function Sparkline({ ticker }) {
  const pts = useSparkPoints(ticker);
  if (!pts) return <span className="spark spark--empty" aria-hidden="true" />;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * (W - 4) + 2).toFixed(1)} ${(H - 3 - ((v - min) / span) * (H - 6)).toFixed(1)}`).join(' ');
  const up = pts[pts.length - 1] >= pts[0];
  const change = ((pts[pts.length - 1] / pts[0] - 1) * 100).toFixed(1);
  return (
    <span className="spark" role="img" aria-label={`${ticker} price over the last month, ${up ? 'up' : 'down'} ${Math.abs(change)} percent`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <motion.path
          d={d}
          fill="none"
          stroke={up ? 'var(--color-success)' : 'var(--color-danger)'}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
    </span>
  );
}
