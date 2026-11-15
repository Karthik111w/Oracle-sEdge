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

let webglSupport;

// Probes once and releases the probe's context: browsers cap live WebGL contexts per page.
export function canUseWebGL() {
  if (webglSupport !== undefined) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    webglSupport = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
