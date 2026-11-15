import { useEffect } from 'react';

// One page-wide pointer listener that feeds --mx / --my (in px, relative to the element) to
// whichever .panel, .fx-spot or .fx-tilt the pointer is over, so CSS can draw a light there.
export default function Spotlight() {
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return undefined;
    let frame = 0;
    let last = null;
    const onMove = (e) => {
      last = e;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = last.target instanceof Element ? last.target.closest('.panel, .fx-spot') : null;
        if (!el) return;
        const box = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${last.clientX - box.left}px`);
        el.style.setProperty('--my', `${last.clientY - box.top}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
