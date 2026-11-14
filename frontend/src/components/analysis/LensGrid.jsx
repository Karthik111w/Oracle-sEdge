import React, { useEffect, useState } from 'react';
import { getLensSummary } from '../../api/client';
import { cached } from '../../api/cache';
import { LENSES } from '../home/lenses';
import { finite } from './format';
import { verdictTone } from './Overview';

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
        <div className="an-lenses" aria-hidden="true">
          {LENSES.map((l) => (
            <span key={l.value} className="skel an-lens-skel" />
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
      <ul className="an-lenses">
        {lenses.map((l) => {
          const label = l.classification_label || l.classification;
          const selected = l.investor === investor;
          return (
            <li key={l.investor}>
              <button type="button" className={`an-lens${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(l.investor)} title={l.explanation}>
                <span className="an-lens-name">{SHORT[l.investor] || l.label}</span>
                <span className="an-lens-score">
                  <span className="mono an-lens-num">{finite(l.score) ? Math.round(l.score) : 'n/a'}</span>
                  <span className="muted mono an-lens-grade">{l.grade || ''}</span>
                </span>
                <span className={`an-lens-verdict tone-${verdictTone(label)}`}>{label}</span>
                <span className="muted an-lens-term">{l.term === 'short' ? 'Short-term lens' : 'Long-term lens'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LensGrid;
