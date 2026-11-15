import React from 'react';
import { motion } from 'motion/react';
import { VERDICTS } from '../../lib/verdict';
import { ringColor } from '../three/stage';

const spring = { type: 'spring', stiffness: 150, damping: 24, mass: 0.9 };

// One thin bar showing the verdict split. Each segment is a full-width element that is
// translated to its start and scaled to its share, so it moves on transforms only.
// Segments are a pointer shortcut; the figures above are the keyboard route to the same filters.
export default function VerdictBar({ counts, total, active, onToggle, labelFor }) {
  let start = 0;
  return (
    <div className="sc-vbar" role="img" aria-label={`Verdict split across ${total} companies: ${VERDICTS.map((v) => `${counts[v]} ${labelFor(v)}`).join(', ')}`}>
      {total > 0 &&
        VERDICTS.map((v) => {
          const frac = counts[v] / total;
          const x = start;
          start += frac;
          const dim = active.length > 0 && !active.includes(v);
          return (
            <motion.span
              key={v}
              className="sc-vbar-seg"
              style={{ background: ringColor(v), originX: 0 }}
              initial={{ scaleX: 0, x: `${x * 100}%` }}
              animate={{ scaleX: frac, x: `${x * 100}%`, opacity: dim ? 0.25 : 1 }}
              transition={spring}
              title={`${labelFor(v)}: ${counts[v]}`}
              onClick={() => onToggle(v)}
            />
          );
        })}
    </div>
  );
}
