// Mutable state shared between the DOM (scroll, pointer, active lens) and the WebGL scene.
// The scene reads it every frame; writing here never re-renders React.
export const stage = {
  journey: 0, // 0..1 progress through the six-lens section
  lens: 0, // index of the lens in focus
  exit: 0, // 0..1 fade once the page has scrolled past the lens section
  pointerX: 0, // -1..1
  pointerY: 0,
  // Verdict per lens (Buy / Watchlist / Hold / Avoid) for the stock on show; colours each ring.
  verdicts: [],
};

// Ring colour for a verdict. Unknown (still loading) stays brass.
export const VERDICT_RING = {
  Buy: '#34d399',
  Watchlist: '#e3b25a',
  Hold: '#9aa9c7',
  Avoid: '#f2685f',
};
export const ringColor = (classification) => VERDICT_RING[classification] || '#e3b25a';

export function canUseWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    return false;
  }
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
