import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CountUp } from '../fx';
import { getLensSummary } from '../../api/client';
import { cached } from '../../api/cache';
import { LENSES } from '../home/lenses';
import { finite } from './format';
import { verdictLabel } from '../../lib/verdict';
import { vClass, vStyle } from './verdictColor';

const ease = [0.16, 1, 0.3, 1];

const SHORT = Object.fromEntries(LENSES.map((l) => [l.value, l.short]));

// All six investors side by side. Choosing a card switches the whole page to that lens.
const LensGrid = ({ ticker, horizon, investor, onSelect }) => {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    cached(`lenses:${ticker}:${horizon}`, () => getLensSummary(ticker, horizon), 10 * 60 * 1000)
      .then((r) => alive && setState({ status: 'ok', ...r }))
      .catch((e) => alive && setState({ status: 'error', message: e.message }));
    return () => {
      alive = false;
    };
  }, [ticker, horizon, attempt]);

  if (state.status === 'error') {
    return (
      <div className="an-lens-msg">
        <p className="inline-error">Could not load the lens summary. {state.message}</p>
        <button type="button" className="btn-quiet" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div aria-busy="true">
        <span className="skel an-lens-skel-line" aria-hidden="true" />
        <div className="an-rings" aria-hidden="true">
          {LENSES.map((l) => (
            <span key={l.value} className="an-ring-skel">
              <span className="skel an-ring-skel-dial" />
              <span className="skel an-ring-skel-line" />
            </span>
          ))}
        </div>
      </div>
    );
  }

  const lenses = state.lenses || [];
  if (lenses.length === 0) return <p className="muted">No lens results are available for this ticker.</p>;

  return (
    <div>
      {state.consensus?.summary && <p className="an-consensus">{state.consensus.summary}</p>}
      <ul className="an-rings">
        {lenses.map((l, i) => {
          const label = verdictLabel(l);
          const selected = l.investor === investor;
          const frac = finite(l.score) ? Math.min(1, Math.max(0, l.score / 100)) : 0;
          return (
            <li key={l.investor}>
              <button type="button" className={`an-ring ${vClass(l.classification)}${selected ? ' is-selected' : ''}`} style={vStyle(l.classification)} aria-pressed={selected} onClick={() => onSelect(l.investor)} title={l.explanation}>
                <span className="an-ring-dial">
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="42" className="an-ring-track" />
                    <g transform="rotate(-90 50 50)">
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="an-ring-arc"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: frac }}
                        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                        transition={{ duration: 1.1, ease, delay: i * 0.08 }}
                      />
                    </g>
                  </svg>
                  <span className="an-ring-score mono">
                    {finite(l.score) ? <CountUp value={l.score} duration={1.2} /> : 'n/a'}
                  </span>
                </span>
                <span className="an-ring-name">{SHORT[l.investor] || l.label}</span>
                <span className="an-ring-verdict">{label}</span>
                <span className="muted an-ring-term">{l.grade ? `Grade ${l.grade}, ` : ''}{l.term === 'short' ? 'short term' : 'long term'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LensGrid;
