import { useEffect, useRef, useState } from 'react';
import { ReactLenis } from 'lenis/react';
import gsap from 'gsap';

const reducedQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)');

// Lenis smooth scroll, driven by GSAP's ticker so it shares one frame loop with the GSAP tweens used elsewhere.
// Skipped entirely for people who prefer reduced motion.
export default function SmoothScroll() {
  const [reduce, setReduce] = useState(() => reducedQuery().matches);
  const lenisRef = useRef(null);

  useEffect(() => {
    const mq = reducedQuery();
    const onChange = (e) => setReduce(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const update = (time) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, [reduce]);

  if (reduce) return null;
  return <ReactLenis root ref={lenisRef} options={{ autoRaf: false, anchors: true, lerp: 0.12 }} />;
}
