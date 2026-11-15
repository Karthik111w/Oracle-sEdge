import React, { lazy, Suspense, useState } from 'react';
import { motion } from 'motion/react';
import { CountUp } from '../fx';
import { canUseWebGL, prefersReducedMotion } from '../three/stage';
import { verdictTone } from '../../lib/verdict';
import { vClass, vStyle } from './verdictColor';
import { finite } from './format';

const ScoreOrb = lazy(() => import('../three/ScoreOrb'));
const ease = [0.16, 1, 0.3, 1];

// Static stand-in for the WebGL gauge, the same size: a track and an arc stroked in the verdict colour.
function StaticRing({ score, full }) {
  const frac = full ? 1 : Math.min(1, Math.max(0, (score || 0) / 100));
  return (
    <svg className="an-orb-svg" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="44" className="an-orb-track" />
      <circle cx="50" cy="50" r="33" className="an-orb-inner" />
      <g transform="rotate(-90 50 50)">
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          className="an-orb-arc"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: frac }}
          transition={{ duration: 1.4, ease, delay: 0.2 }}
        />
      </g>
    </svg>
  );
}

// The verdict centrepiece: a 3D gauge where WebGL and motion are available, with the score
// counting up in the middle either way. Funds get a closed ring and "ETF" instead of a score.
const VerdictOrb = ({ score, classification, etf = false }) => {
  const [webgl] = useState(() => !etf && canUseWebGL() && !prefersReducedMotion());
  const hasScore = !etf && finite(score);
  return (
    <div className={`an-orb ${vClass(classification)}`} style={vStyle(classification)}>
      {webgl && hasScore ? (
        <Suspense fallback={<StaticRing score={score} />}>
          <div className="an-orb-gl">
            <ScoreOrb score={score} tone={verdictTone(classification)} />
          </div>
        </Suspense>
      ) : (
        <StaticRing score={score} full={etf || !hasScore} />
      )}
      <div className="an-orb-center">
        {etf ? (
          <span className="mono an-orb-num an-orb-num--text">ETF</span>
        ) : hasScore ? (
          <>
            <CountUp className="mono an-orb-num" value={score} duration={1.6} />
            <span className="mono an-orb-of">/ 100</span>
          </>
        ) : (
          <span className="mono an-orb-num an-orb-num--text">n/a</span>
        )}
      </div>
    </div>
  );
};

export default VerdictOrb;
