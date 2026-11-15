import React, { Suspense, lazy, useRef, useState } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import Hero from '../components/landing/Hero';
import LensJourney from '../components/landing/LensJourney';
import FeatureBento from '../components/landing/FeatureBento';
import TickerTape from '../components/home/TickerTape';
import MarketStrip from '../components/home/MarketStrip';
import MarginRanking from '../components/home/MarginRanking';
import ScreenerTeaser from '../components/home/ScreenerTeaser';
import { Reveal } from '../components/fx';
import { canUseWebGL, prefersReducedMotion, stage } from '../components/three/stage';
import '../styles/home.css';

// three.js is large; load it after the first paint and only where it can run.
const HomeStage = lazy(() => import('../components/three/HomeStage'));

const HomePage = () => {
  const [webgl] = useState(() => canUseWebGL() && !prefersReducedMotion());
  const [stageActive, setStageActive] = useState(true);
  const after = useRef(null);

  // Once the sections after the lens journey reach the top, lift the 3D scene away and stop drawing it.
  const { scrollYProgress } = useScroll({ target: after, offset: ['start end', 'start 20%'] });
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    stage.exit = p;
    setStageActive(p < 1);
  });

  return (
    <div className="ld">
      {webgl ? (
        <Suspense fallback={null}>
          <HomeStage active={stageActive} />
        </Suspense>
      ) : (
        <div className="stage-fallback" aria-hidden="true" />
      )}

      <div className="ld-wrap">
        <Hero />
      </div>

      <TickerTape />

      <div className="ld-wrap">
        <LensJourney />
      </div>

      <div className="ld-wrap ld-after home" ref={after}>
        <Reveal>
          <MarketStrip />
        </Reveal>
        <Reveal>
          <MarginRanking />
        </Reveal>
        <Reveal>
          <ScreenerTeaser />
        </Reveal>
        <FeatureBento />

        <footer className="ld-footer">
          <p className="ld-footer-mark display" aria-hidden="true">
            Oracle&rsquo;s <em>Edge</em>
          </p>
          <div className="ld-footer-grid">
            <div>
              <h2>Methodology</h2>
              <p>
                Each lens scores eight fundamentals (earnings consistency, ROIC, FCF growth, profit margin, ROE, debt to
                equity, interest coverage and revenue growth) with its own weights, adjusted for the company&rsquo;s sector.
                Fair value comes from a discounted cash flow model measured per share; margin of safety is how far the
                price sits below it. <a href="#lenses">See the lens weights</a>.
              </p>
            </div>
            <div>
              <h2>Disclaimer</h2>
              <p>Not financial advice. Data from Yahoo Finance and company filings, and may be delayed or incomplete.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
