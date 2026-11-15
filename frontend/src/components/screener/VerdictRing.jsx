import React from 'react';
import { motion } from 'motion/react';
import { ringColor } from '../three/stage';
import { isNum } from './format';

// Small SVG ring: the arc is the score (0 to 100), coloured by verdict. `children` sits in the middle.
export default function VerdictRing({ score, classification, size = 40, stroke = 3.5, children, label }) {
  const r = (size - stroke) / 2;
  const frac = isNum(score) ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const color = ringColor(classification);
  return (
    <span className="vr" style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-color-hover)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(frac, 0.001) }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {children && <span className="vr-mid">{children}</span>}
    </span>
  );
}
