import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

// Counts from 0 to `value` once it scrolls into view. `format` turns the number into text.
export default function CountUp({ value, format = (v) => Math.round(v).toString(), duration = 1.4, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const finite = Number.isFinite(value);

  useEffect(() => {
    if (!finite || !ref.current) return undefined;
    if (!inView || reduce) {
      ref.current.textContent = format(reduce || inView ? value : 0);
      return undefined;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
    // format is recreated by callers each render; the value is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce, finite, duration]);

  return (
    <span ref={ref} className={className}>
      {finite ? format(value) : 'n/a'}
    </span>
  );
}
