import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

// Counts from 0 to `value` once it scrolls into view. `format` turns the number into text.
// The true value is always in the DOM for screen readers, find-in-page and copy; the
// animated digits are a separate, aria-hidden node that only this component writes to.
export default function CountUp({ value, format = (v) => Math.round(v).toString(), duration = 1.4, className }) {
  const wrap = useRef(null);
  const visual = useRef(null);
  const inView = useInView(wrap, { once: true });
  const reduce = useReducedMotion();
  const finite = Number.isFinite(value);
  const finalText = finite ? format(value) : 'n/a';

  useEffect(() => {
    const node = visual.current;
    if (!node) return undefined;
    if (!finite || reduce) {
      node.textContent = finalText;
      return undefined;
    }
    if (!inView) {
      node.textContent = format(0);
      return undefined;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
      onComplete: () => {
        node.textContent = finalText;
      },
    });
    return () => controls.stop();
    // format is recreated by callers each render; the value and its text are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, finalText, inView, reduce, finite, duration]);

  return (
    <span ref={wrap} className={className}>
      <span className="sr-only">{finalText}</span>
      <span ref={visual} aria-hidden="true" />
    </span>
  );
}
