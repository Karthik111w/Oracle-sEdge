import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import SearchBar from '../SearchBar';
import LensVerdictCard, { TICKER, analysisKey, formatMoney } from './LensVerdictCard';
import { LENSES } from './lenses';
import { getPriceHistory, getStockAnalysis } from '../../api/client';
import { cached } from '../../api/cache';

const ease = [0.16, 1, 0.3, 1];
const ORDER = LENSES.map((l) => l.value);
const CYCLE_MS = 4200;

// Weekly closes for the last five years: enough shape, a fraction of the points.
function useWeeklyCloses(ticker) {
  const [points, setPoints] = useState(null);
  useEffect(() => {
    let alive = true;
    cached(`history:${ticker}:5y`, () => getPriceHistory(ticker, '5y').then((d) => d.history.map((h) => h.close)), 6 * 60 * 60 * 1000)
      .then((closes) => alive && setPoints(closes.filter((_, i) => i % 5 === 0 || i === closes.length - 1)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ticker]);
  return points;
}

// The ticker's real price line with its fair value drawn across it.
// The space between the two lines is the margin of safety the card talks about.
function PriceBackdrop({ points, fair, price }) {
  const W = 1200;
  const H = 320;
  const geo = useMemo(() => {
    if (!points?.length || !Number.isFinite(fair)) return null;
    const lo = Math.min(...points, fair) * 0.85;
    const hi = Math.max(...points, fair) * 1.04;
    const y = (v) => H - ((v - lo) / (hi - lo)) * H;
    const step = W / (points.length - 1);
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${y(p).toFixed(1)}`).join(' ');
    return { line, area: `${line} L${W} ${H} L0 ${H} Z`, fairY: y(fair) };
  }, [points, fair]);

  if (!geo) return null;
  return (
    <div className="backdrop-chart" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="backdrop-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={geo.area} fill="url(#backdrop-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 1.4 }} />
        <motion.path
          d={geo.line}
          className="backdrop-price"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.3 }}
        />
        <motion.line
          x1="0"
          x2={W}
          y1={geo.fairY}
          y2={geo.fairY}
          className="backdrop-fair"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease, delay: 1.8 }}
        />
      </svg>
      <motion.p className="backdrop-legend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}>
        <span className="legend-swatch is-price" /> {TICKER} price, 5 years, now <span className="mono">{formatMoney(price)}</span>
        <span className="legend-swatch is-fair" /> Fair value <span className="mono">{formatMoney(fair)}</span>
      </motion.p>
    </div>
  );
}

const HomeHero = () => {
  const reduce = useReducedMotion();
  const heroRef = useRef(null);
  const [lens, setLens] = useState('buffett');
  const [autoplay, setAutoplay] = useState(true);
  const paused = useRef(false);
  const inView = useRef(true);
  const ready = useRef(new Set());
  const [buffett, setBuffett] = useState(null);
  const closes = useWeeklyCloses(TICKER);

  // Warm every lens in the background (one at a time) so autoplay never waits on the network.
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const l of ORDER) {
        try {
          const d = await cached(analysisKey(TICKER, l), () => getStockAnalysis(TICKER, l, 'long'));
          if (!alive) return;
          ready.current.add(l);
          if (l === 'buffett') setBuffett(d);
        } catch {
          // A failed lens is simply skipped by autoplay; the card shows its own error.
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => (inView.current = entry.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Step to the next lens whose data is already loaded, until the visitor takes over.
  useEffect(() => {
    if (!autoplay || reduce) return;
    const id = setInterval(() => {
      if (paused.current || !inView.current || document.hidden) return;
      setLens((cur) => {
        const i = ORDER.indexOf(cur);
        for (let k = 1; k <= ORDER.length; k++) {
          const next = ORDER[(i + k) % ORDER.length];
          if (ready.current.has(next)) return next;
        }
        return cur;
      });
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [autoplay, reduce]);

  const select = (value) => {
    setAutoplay(false);
    setLens(value);
  };

  // The chart drifts slower than the page and fades as the hero leaves.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const chartY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140]);
  const chartOpacity = useTransform(scrollYProgress, [0, 0.9], [1, reduce ? 1 : 0]);

  const short = LENSES.find((l) => l.value === lens)?.short || 'Buffett';

  return (
    <section ref={heroRef} className="home-hero">
      <motion.div className="home-hero-backdrop" style={{ y: chartY, opacity: chartOpacity }}>
        <PriceBackdrop points={closes} fair={buffett?.margin?.intrinsic_value} price={buffett?.margin?.current_price} />
      </motion.div>

      <div className="home-hero-copy">
        <h1 className="home-title">
          <span className="sr-only">See any stock the way legendary investors would.</span>
          <span aria-hidden="true">
            See any stock the way{' '}
            <motion.span layout className="roll" transition={{ layout: { duration: 0.45, ease } }}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={short}
                  className="roll-word"
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  exit={{ y: '-105%' }}
                  transition={{ duration: 0.55, ease }}
                >
                  {short}
                </motion.span>
              </AnimatePresence>
            </motion.span>{' '}
            would.
          </span>
        </h1>
        <p className="home-subtitle">
          Score any stock through six investing lenses. See fair value, margin of safety, and what each legend would say.
        </p>
        <SearchBar placeholder="Try KO, AAPL or BRK-B" />
      </div>

      <LensVerdictCard
        lens={lens}
        onSelect={select}
        onPause={() => (paused.current = true)}
        onResume={() => (paused.current = false)}
      />
    </section>
  );
};

export default HomeHero;
