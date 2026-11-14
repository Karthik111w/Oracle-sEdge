import React from 'react';

// Shade by strength: gold for positive, a neutral grey for negative. The value is printed in
// every cell, so the shade only reinforces it.
const cellStyle = (v, diagonal) => {
  if (diagonal || !Number.isFinite(v)) return undefined;
  const strength = Math.min(1, Math.abs(v)) * 55;
  const base = v >= 0 ? 'var(--color-gold)' : 'var(--text-muted)';
  return { background: `color-mix(in srgb, ${base} ${strength.toFixed(0)}%, transparent)` };
};

const CorrelationHeatmap = ({ correlation }) => {
  const tickers = correlation?.tickers || [];
  const matrix = correlation?.matrix || [];
  if (tickers.length < 2) return <p className="panel-note">Correlation needs at least two holdings with price history.</p>;

  let best = null;
  for (let i = 0; i < tickers.length; i++) {
    for (let j = i + 1; j < tickers.length; j++) {
      const v = matrix[i]?.[j];
      if (Number.isFinite(v) && (!best || v > best.v)) best = { a: tickers[i], b: tickers[j], v };
    }
  }

  return (
    <div>
      {best && (
        <p className="panel-text pf2-reading">
          Most correlated: <span className="mono">{best.a}</span> and <span className="mono">{best.b}</span>, <span className="mono">{best.v.toFixed(2)}</span>.
          {best.v < 0.3 && ' No pair moves closely together, which helps diversification.'}
        </p>
      )}
      <div className="pf2-scroll" tabIndex={0} role="region" aria-label="Correlation matrix, scrolls horizontally">
        <table className="pf2-heat">
          <caption className="sr-only">Pairwise correlation of weekly returns over the last year</caption>
          <thead>
            <tr>
              <td />
              {tickers.map((t) => (
                <th key={t} scope="col" className="mono">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickers.map((row, i) => (
              <tr key={row}>
                <th scope="row" className="mono">{row}</th>
                {tickers.map((col, j) => {
                  const v = matrix[i]?.[j];
                  return (
                    <td key={col} className={`mono${i === j ? ' is-diag' : ''}`} style={cellStyle(v, i === j)}>
                      {Number.isFinite(v) ? v.toFixed(2) : 'n/a'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
