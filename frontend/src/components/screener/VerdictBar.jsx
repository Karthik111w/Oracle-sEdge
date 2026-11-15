import React from 'react';
import { motion } from 'motion/react';
import { VERDICTS } from '../../lib/verdict';
import { ringColor } from '../three/stage';

const spring = { type: 'spring', stiffness: 150, damping: 24, mass: 0.9 };

// One thin bar showing the verdict split. Each segment is a full-width element that is
// translated to its start and scaled to its share, so it moves on transforms only.
// The real buttons sit over the track with a taller hit area; they filter by verdict.
export default function VerdictBar({ counts, total, active, onToggle, labelFor }) {
  let start = 0;
  const segs = VERDICTS.map((v) => {
    const frac = total > 0 ? counts[v] / total : 0;
    const seg = { v, frac, x: start };
    start += frac;
    return seg;
  });
  return (
    <div className="sc-vbar" role="group" aria-label={`Verdict split across ${total} companies. Select a verdict to filter.`}>
      <div className="sc-vbar-track" aria-hidden="true">
        {total > 0 &&
          segs.map(({ v, frac, x }) => {
            const dim = active.length > 0 && !active.includes(v);
            return (
              <motion.span
                key={v}
                className="sc-vbar-seg"
                style={{ background: ringColor(v), originX: 0 }}
                initial={{ scaleX: 0, x: `${x * 100}%` }}
                animate={{ scaleX: frac, x: `${x * 100}%`, opacity: dim ? 0.25 : 1 }}
                transition={spring}
              />
            );
          })}
      </div>
      {total > 0 &&
        segs.map(({ v, frac, x }) =>
          frac > 0 ? (
            <button
              key={v}
              type="button"
              className="sc-vbar-btn"
              style={{ left: `${x * 100}%`, width: `${frac * 100}%` }}
              aria-pressed={active.includes(v)}
              aria-label={`${labelFor(v)}: ${counts[v]}`}
              title={`${labelFor(v)}: ${counts[v]}`}
              onClick={() => onToggle(v)}
            />
          ) : null
        )}
    </div>
  );
}
