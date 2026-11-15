import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

// A figure that counts up the first time it is seen, then tweens from its previous value
// whenever it changes (filters, lens), so it never snaps back to zero.
export default function Num({ value, format = (v) => Math.round(v).toString(), duration = 0.9, className }) {
  const ref = useRef(null);
  const from = useRef(0);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const finite = Number.isFinite(value);

  useEffect(() => {
    if (!finite || !ref.current) return undefined;
    if (!inView || reduce) {
      ref.current.textContent = format(reduce ? value : from.current);
      if (reduce) from.current = value;
      return undefined;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        from.current = v;
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce, finite, duration]);

  return (
    <span ref={ref} className={className}>
      {finite ? format(inView ? value : from.current) : 'n/a'}
    </span>
  );
}
