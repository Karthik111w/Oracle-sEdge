import React from 'react';
import { finite, money, signedPct } from './format';

// Price, the model's fair value and the analyst target on one scale, as bars from zero.
const TargetCompare = ({ price, fair, target, low, high }) => {
  if (!finite(target)) return null;
  const rows = [
    { key: 'price', label: 'Price', value: price },
    { key: 'fair', label: 'Model fair value', value: fair },
    { key: 'target', label: 'Analyst target', value: target },
  ].filter((r) => finite(r.value) && r.value > 0);
  if (rows.length < 2) return null;
  const hasRange = finite(low) && finite(high) && high >= low;
  const max = Math.max(...rows.map((r) => r.value), hasRange ? high : 0) * 1.05;
  const at = (v) => `${(v / max) * 100}%`;
  const vs = (v) => (finite(price) && price > 0 && v !== price ? ` (${signedPct(((v - price) / price) * 100)} vs price)` : '');
  const summary = rows.map((r) => `${r.label} ${money(r.value)}${r.key === 'price' ? '' : vs(r.value)}`).join('. ');

  return (
    <section className="panel" aria-labelledby="an-compare-title">
      <header className="panel-head">
        <div>
          <h3 id="an-compare-title" className="an-h3">Price, model and analysts</h3>
          <p className="panel-note">{finite(fair) ? 'The model value comes from the discounted cash flow above. ' : ''}The analyst target is the mean of published price targets.</p>
        </div>
      </header>
      <div className="an-compare" role="img" aria-label={summary}>
        {rows.map((r) => (
          <div key={r.key} className="an-compare-row">
            <span className="an-compare-label">{r.label}</span>
            <span className="an-compare-track">
              <span className={`an-compare-bar is-${r.key}`} style={{ width: at(r.value) }} />
              {r.key === 'target' && hasRange && <span className="an-compare-whisker" style={{ left: at(low), width: `calc(${at(high)} - ${at(low)})` }} />}
            </span>
            <span className="mono an-compare-value">
              {money(r.value)}
              {r.key !== 'price' && <span className="muted an-compare-vs">{vs(r.value).trim().replace(/[()]/g, '')}</span>}
            </span>
          </div>
        ))}
      </div>
      {hasRange && (
        <p className="panel-note an-compare-note">
          The line over the analyst bar spans the lowest to the highest target, {money(low)} to {money(high)}.
        </p>
      )}
    </section>
  );
};

export default TargetCompare;
