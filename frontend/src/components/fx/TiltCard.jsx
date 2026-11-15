import { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

// A surface that tilts in 3D toward the pointer and carries a soft light that follows it.
// Renders as `as` (default div); pass `to`/`href` props through for links.
export default function TiltCard({ as: Tag = motion.div, max = 7, className = '', children, ...rest }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, var(--fx-glare), transparent 62%)`;

  const onMove = (e) => {
    if (e.pointerType === 'touch') return;
    const box = ref.current.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width;
    const py = (e.clientY - box.top) / box.height;
    gx.set(px * 100);
    gy.set(py * 100);
    if (reduce) return;
    ry.set((px - 0.5) * 2 * max);
    rx.set((0.5 - py) * 2 * max);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <Tag
      ref={ref}
      className={`fx-tilt ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      {...rest}
    >
      <motion.span className="fx-tilt-glare" style={{ background: glare }} aria-hidden="true" />
      {children}
    </Tag>
  );
}
