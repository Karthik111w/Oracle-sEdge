import React, { useState } from 'react';
import { LENSES } from './lenses';

const LensGuide = () => {
  const [active, setActive] = useState(LENSES[0].value);
  const lens = LENSES.find((l) => l.value === active);

  return (
    <section className="home-section" id="lenses" aria-labelledby="lenses-title">
      <div className="section-head">
        <div>
          <h2 id="lenses-title">What each lens checks</h2>
          <p className="section-sub">
            Every lens scores the same eight fundamentals. What changes is how much each one counts.
          </p>
        </div>
      </div>

      <div className="guide">
        <div className="guide-tabs" role="tablist" aria-label="Investor">
          {LENSES.map((l) => (
            <button
              key={l.value}
              type="button"
              role="tab"
              id={`guide-tab-${l.value}`}
              aria-selected={l.value === active}
              aria-controls="guide-panel"
              className={`guide-tab${l.value === active ? ' is-active' : ''}`}
              onClick={() => setActive(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="guide-panel" id="guide-panel" role="tabpanel" aria-labelledby={`guide-tab-${active}`}>
          <p className="guide-philosophy">{lens.philosophy}</p>
          <dl className="guide-facts">
            <div>
              <dt>Looks for</dt>
              <dd>{lens.focus}</dd>
            </div>
            <div>
              <dt>Heaviest weights</dt>
              <dd>
                {lens.weights ? (
                  <ul className="guide-weights">
                    {lens.weights.map(([name, w]) => (
                      <li key={name}>
                        <span>{name}</span>
                        <span className="mono">{w}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  'All eight metrics weighted equally'
                )}
              </dd>
            </div>
            <div>
              <dt>Horizon</dt>
              <dd>{lens.horizon}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
};

export default LensGuide;
