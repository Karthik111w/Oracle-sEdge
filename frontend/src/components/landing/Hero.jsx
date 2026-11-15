import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import SearchBar from '../SearchBar';
import { CountUp, Magnetic } from '../fx';
import { LENSES } from '../home/lenses';
import { TICKER, analysisKey } from '../home/LensVerdictCard';
import { getStockAnalysis } from '../../api/client';
import { cached } from '../../api/cache';
import { verdictLabel, verdictTone } from '../../lib/verdict';
import { ringColor, stage } from '../three/stage';

const ease = [0.16, 1, 0.3, 1];
const ORDER = LENSES.map((l) => l.value);
const CYCLE_MS = 3600;

const rise = (delay) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease, delay },
});

// Opening screen: the headline cycles through the six investors while the lens array beside
// it brings the matching lens into focus and the readout shows that lens's live verdict.
export default function Hero() {
  const reduce = useReducedMotion();
  const [lens, setLens] = useState('buffett');
  const [verdicts, setVerdicts] = useState({});
  const hovering = useRef(false);

  // Load each lens one at a time so the cycle never waits on the network.
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const l of ORDER) {
        try {
          const d = await cached(analysisKey(TICKER, l), () => getStockAnalysis(TICKER, l, 'long'));
          if (!alive) return;
          setVerdicts((prev) => ({ ...prev, [l]: d }));
        } catch {
          // A lens that fails to load is skipped by the cycle.
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => {
      if (hovering.current || document.hidden || stage.journey > 0.02) return;
      setLens((cur) => {
        const i = ORDER.indexOf(cur);
        for (let k = 1; k <= ORDER.length; k++) {
          const next = ORDER[(i + k) % ORDER.length];
          if (verdicts[next]) return next;
        }
        return cur;
      });
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reduce, verdicts]);

  // The hero owns the focused lens until the lens section takes over on scroll.
  useEffect(() => {
    if (stage.journey <= 0.02) stage.lens = ORDER.indexOf(lens);
  }, [lens]);

  // Hand each lens's verdict to the 3D scene so every ring takes its colour.
  useEffect(() => {
    stage.verdicts = ORDER.map((l) => verdicts[l]?.classification);
  }, [verdicts]);

  const current = LENSES.find((l) => l.value === lens);
  const data = verdicts[lens];
  const tone = data ? verdictTone(data.classification) : 'mid';

  return (
    <section className="ld-hero">
      <div className="ld-hero-copy">
        <motion.p className="eyebrow" {...rise(0.1)}>
          Six lenses. One verdict.
        </motion.p>

        <h1 className="ld-title display">
          <span className="sr-only">See any stock the way legendary investors would.</span>
          <span aria-hidden="true">
            <motion.span className="ld-title-line" {...rise(0.18)}>
              See any stock
            </motion.span>
            <motion.span className="ld-title-line" {...rise(0.28)}>
              the way{' '}
              <span className="ld-roll">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.em
                    key={current.short}
                    className="ld-roll-word"
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ duration: 0.6, ease }}
                  >
                    {current.short}
                  </motion.em>
                </AnimatePresence>
              </span>
            </motion.span>
            <motion.span className="ld-title-line" {...rise(0.38)}>
              would.
            </motion.span>
          </span>
        </h1>

        <motion.p className="ld-sub" {...rise(0.5)}>
          Score any company through six investing philosophies. See its fair value, its margin of safety, and where the
          legends would disagree.
        </motion.p>

        <motion.div className="ld-search" {...rise(0.6)}>
          <SearchBar placeholder="Try KO, AAPL or BRK-B" />
        </motion.div>

        <motion.dl className="ld-stats" {...rise(0.72)}>
          <div>
            <dt>Investor lenses</dt>
            <dd className="mono">
              <CountUp value={6} />
            </dd>
          </div>
          <div>
            <dt>Fundamentals scored</dt>
            <dd className="mono">
              <CountUp value={8} />
            </dd>
          </div>
          <div>
            <dt>Companies ranked</dt>
            <dd className="mono">
              <CountUp value={69} />
            </dd>
          </div>
        </motion.dl>
      </div>

      {/* Live readout for the lens currently in focus in the 3D array. */}
      <motion.div
        className="ld-readout fx-spot"
        {...rise(0.9)}
        onPointerEnter={() => (hovering.current = true)}
        onPointerLeave={() => (hovering.current = false)}
      >
        <div className="ld-readout-head">
          <span className="mono ld-readout-ticker">{TICKER}</span>
          <span className="ld-readout-live">
            <span className="ld-dot" /> Live
          </span>
        </div>
        <div className="ld-readout-tabs" role="tablist" aria-label="Investor lens">
          {LENSES.map((l, i) => (
            <button
              key={l.value}
              type="button"
              role="tab"
              aria-selected={l.value === lens}
              className={`ld-readout-tab${l.value === lens ? ' is-active' : ''}`}
              onClick={() => setLens(l.value)}
            >
              <span className="mono">
                <span className="ld-ring-dot" style={{ background: verdicts[l.value] ? ringColor(verdicts[l.value].classification) : undefined }} />
                {String(i + 1).padStart(2, '0')}
              </span>
              {l.short}
            </button>
          ))}
        </div>
        <div className="ld-readout-body" aria-live="polite">
          {data ? (
            <>
              <p className={`ld-readout-verdict display tone-${tone}`}>{verdictLabel(data)}</p>
              <p className="ld-readout-score mono">
                <CountUp key={lens} value={data.scorecard?.total_score} duration={0.8} />
                <span>/100</span>
              </p>
              <p className="ld-readout-note">{data.classification_explanation}</p>
              <p className="ld-ring-key">
                Ring colour shows each lens&rsquo;s verdict:
                {['Buy', 'Watchlist', 'Hold', 'Avoid'].map((v) => (
                  <span key={v}>
                    <span className="ld-ring-dot" style={{ background: ringColor(v) }} /> {v}
                  </span>
                ))}
              </p>
              <Magnetic strength={0.2}>
                <Link to={`/stock/${TICKER}?investor=${lens}`} className="ld-readout-link">
                  Full {current.short} analysis <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </Magnetic>
            </>
          ) : (
            <div className="ld-readout-skel" aria-hidden="true">
              <span className="skel" />
              <span className="skel" />
              <span className="skel" />
            </div>
          )}
        </div>
      </motion.div>

      <motion.a href="#lenses" className="ld-scroll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}>
        <span>Travel through the lenses</span>
        <ArrowDown size={15} aria-hidden="true" />
      </motion.a>
    </section>
  );
}
