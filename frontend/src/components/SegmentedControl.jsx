import React from 'react';
import { motion } from 'motion/react';

// Pill group with a highlight that slides between options.
// `id` must be unique per control on the page (it scopes the shared layout animation).
const SegmentedControl = ({ id, label, options, value, onChange, tone = 'gold' }) => (
  <div className="segmented">
    {label && <span className="segmented-label">{label}</span>}
    <div className="segmented-track" role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segmented-option${active ? ' is-active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className={`segmented-thumb segmented-thumb--${tone}`}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="segmented-text">{opt.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

export default SegmentedControl;
