import React from 'react';

// One entry per compared ticker. Colour comes from theme tokens; the dash pattern is a second cue.
export const SERIES = [
  { color: 'var(--color-gold)', dash: undefined },
  { color: 'var(--text-primary)', dash: '6 4' },
  { color: 'var(--color-success)', dash: '2 3' },
  { color: 'var(--color-info)', dash: '10 3 2 3' },
];

export const SeriesSwatch = ({ index }) => {
  const s = SERIES[index % SERIES.length];
  return (
    <svg width="26" height="8" viewBox="0 0 26 8" aria-hidden="true" className="cmp2-swatch">
      <line x1="1" y1="4" x2="25" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} strokeLinecap="round" />
    </svg>
  );
};
