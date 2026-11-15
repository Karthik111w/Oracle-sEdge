import React, { useRef } from 'react';
import { useInView } from 'motion/react';

// Renders its children the first time it scrolls into view, so chart draw-in animations
// play when the reader gets there rather than while the section is still off screen.
const OnView = ({ className, style, margin = '0px 0px -8% 0px', fallback = null, children }) => {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin });
  return (
    <div ref={ref} className={className} style={style}>
      {seen ? children : fallback}
    </div>
  );
};

export default OnView;
