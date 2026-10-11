import React from 'react';
import { formatMoney } from './home/LensVerdictCard';

const rate = (v) => `${(v * 100).toFixed(1)}%`;

function marginNote(pct) {
  if (pct === null) return 'No valuation is available for this security.';
  if (pct >= 30) return 'The price is well below the estimated fair value, a wide margin of safety.';
  if (pct >= 15) return 'The price is below the estimated fair value, a reasonable margin of safety.';
  if (pct >= 0) return 'The price is close to the estimated fair value, with little room for error.';
  return 'The price is above the estimated fair value, so there is no margin of safety at this price.';
}

// Price against fair value on one axis, with the margin of safety between them.
const ValuationPanel = ({ dcf, margin }) => {
  const fair = margin?.intrinsic_value ?? dcf?.intrinsic_value;
  const price = margin?.current_price;
  const pct = typeof margin?.margin_pct === 'number' ? margin.margin_pct : null;
  const bear = dcf?.scenarios?.bear?.intrinsic_value;
  const bull = dcf?.scenarios?.bull?.intrinsic_value;
  const hasRange = bear > 0 && bull > 0;
  const axisMax = (Math.max(price || 0, fair || 0, hasRange ? bull : 0) || 1) * 1.12;
  const pos = (v) => ((v || 0) / axisMax) * 100;
  const fairPos = pos(fair);
  const pricePos = pos(price);

  return (
    <section className="panel" aria-labelledby="valuation-title">
      <header className="panel-head">
        <div>
          <h2 id="valuation-title">Valuation</h2>
          <p className="panel-note">{dcf?.model_label || 'Discounted cash flow'}. {dcf?.model_explanation}</p>
        </div>
      </header>

      <dl className="deck-facts">
        <div>
          <dt>Fair value</dt>
          <dd className="mono">{formatMoney(fair)}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd className="mono">{formatMoney(price)}</dd>
        </div>
        <div>
          <dt>Margin of safety</dt>
          <dd className={`mono tone-${pct >= 0 ? 'pos' : 'neg'}`}>{pct === null ? 'n/a' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}</dd>
        </div>
      </dl>

      {fair > 0 && price > 0 && (
        <div className="value-line" aria-hidden="true">
          {hasRange && (
            <span className="value-line-range" style={{ left: `${pos(bear)}%`, width: `${pos(bull) - pos(bear)}%` }} />
          )}
          <span
            className={`value-line-gap tone-bg-${pct >= 0 ? 'pos' : 'neg'}`}
            style={{ transform: `translateX(${Math.min(fairPos, pricePos)}%) scaleX(${Math.abs(fairPos - pricePos) / 100})` }}
          />
          <span className="value-line-mark is-fair" style={{ transform: `translateX(${fairPos}%)` }}>
            <span className="value-line-label">Fair</span>
          </span>
          <span className="value-line-mark is-price" style={{ transform: `translateX(${pricePos}%)` }}>
            <span className="value-line-label">Price</span>
          </span>
        </div>
      )}

      <p className="panel-text">{marginNote(pct)}</p>
      {hasRange && (
        <p className="panel-text valuation-range">
          Fair value range <span className="mono">{formatMoney(bear)}</span> to <span className="mono">{formatMoney(bull)}</span>. The cautious case
          starts growth at {rate(dcf.scenarios.bear.growth_rate)} and discounts at {rate(dcf.scenarios.bear.discount_rate)}; the optimistic case starts at{' '}
          {rate(dcf.scenarios.bull.growth_rate)} and discounts at {rate(dcf.scenarios.bull.discount_rate)}.{price > bull ? ' The price is above even the optimistic case.' : price < bear ? ' The price is below even the cautious case.' : ''}
        </p>
      )}
    </section>
  );
};

export default ValuationPanel;
