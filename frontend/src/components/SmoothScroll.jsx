import { useEffect, useRef, useState } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reducedQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)');

// Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger and Lenis share one frame loop.
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

  useLenis(ScrollTrigger.update);

  if (reduce) return null;
  return <ReactLenis root ref={lenisRef} options={{ autoRaf: false, anchors: true, lerp: 0.12 }} />;
}
