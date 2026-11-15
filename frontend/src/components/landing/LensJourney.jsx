import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from 'motion/react';
import { useLenis } from 'lenis/react';
import LensVerdictCard from '../home/LensVerdictCard';
import { LENSES, weightShares } from '../home/lenses';
import { stage } from '../three/stage';

const ease = [0.16, 1, 0.3, 1];
const COUNT = LENSES.length;

// A tall section whose inner frame stays pinned while the page scrolls. Scroll progress
// drives both the camera's trip down the 3D lens array and which investor is described.
export default function LensJourney() {
  const root = useRef(null);
  const lenis = useLenis();
  const [index, setIndex] = useState(0);
  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    stage.journey = p;
    if (p <= 0.02) return;
    const i = Math.min(COUNT - 1, Math.max(0, Math.floor(((p - 0.1) / 0.9) * COUNT)));
    stage.lens = i;
    setIndex(i);
  });

  const lens = LENSES[index];
  const weights = weightShares(lens).slice(0, 4);

  // Jump the page to the scroll position where a given lens is in focus.
  const goTo = (i) => {
    const el = root.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + span * (0.1 + ((i + 0.5) / COUNT) * 0.9);
    if (lenis) lenis.scrollTo(top, { duration: 1.1 });
    else window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section ref={root} className="ld-journey" id="lenses" aria-labelledby="journey-title">
      <div className="ld-journey-frame">
        <div className="ld-journey-copy">
          <p className="eyebrow" id="journey-title">
            One company, six readings
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lens.value}
              className="ld-journey-text"
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -24, filter: 'blur(8px)' }}
              transition={{ duration: 0.5, ease }}
            >
              <p className="ld-journey-count mono">
                {String(index + 1).padStart(2, '0')} <span>/ {String(COUNT).padStart(2, '0')}</span>
              </p>
              <h2 className="ld-journey-name display">{lens.label}</h2>
              <p className="ld-journey-philosophy">{lens.philosophy}</p>
              <ul className="ld-weights" aria-label={`What the ${lens.short} lens weighs most`}>
                {weights.map((w, i) => (
                  <li key={w.key}>
                    <span className="ld-weight-name">{w.name}</span>
                    <span className="ld-weight-bar">
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: w.share / weights[0].share }}
                        transition={{ duration: 0.9, ease, delay: 0.15 + i * 0.07 }}
                      />
                    </span>
                    <span className="ld-weight-value mono">{Math.round(w.share)}%</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="ld-journey-card">
          <LensVerdictCard lens={lens.value} onSelect={(value) => goTo(LENSES.findIndex((l) => l.value === value))} onPause={() => {}} onResume={() => {}} />
        </div>

        <ol className="ld-journey-rail" aria-label="Lenses">
          {LENSES.map((l, i) => (
            <li key={l.value}>
              <button type="button" className={i === index ? 'is-active' : ''} onClick={() => goTo(i)} aria-current={i === index ? 'step' : undefined}>
                <span className="sr-only">{l.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
