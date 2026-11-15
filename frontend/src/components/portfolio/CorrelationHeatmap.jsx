import React, { useState } from 'react';

// Shade by strength: gold for positive, a neutral grey for negative. The value is printed in
// every cell, so the shade only reinforces it.
const cellStyle = (v, diagonal, i) => {
  if (diagonal || !Number.isFinite(v)) return { '--d': `${i * 12}ms` };
  const strength = Math.min(1, Math.abs(v)) * 55;
  const base = v >= 0 ? 'var(--color-gold)' : 'var(--text-muted)';
  return { background: `color-mix(in srgb, ${base} ${strength.toFixed(0)}%, transparent)`, '--d': `${i * 12}ms` };
};

const word = (v) => (v >= 0.7 ? 'move closely together' : v >= 0.3 ? 'move somewhat together' : v > -0.3 ? 'move mostly independently' : 'tend to move opposite');

const CorrelationHeatmap = ({ correlation }) => {
  const [hover, setHover] = useState(null);
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

  const hv = hover ? matrix[hover.i]?.[hover.j] : null;
  const clear = () => setHover(null);

  return (
    <div onPointerLeave={clear}>
      <p className="panel-text pf2-reading pfx-caption" aria-live="polite">
        {hover && hover.i !== hover.j && Number.isFinite(hv) ? (
          <>
            <span className="mono">{tickers[hover.i]}</span> and <span className="mono">{tickers[hover.j]}</span>: <span className="mono pfx-caption-val">{hv.toFixed(2)}</span>, {word(hv)}.
          </>
        ) : best ? (
          <>
            Most correlated: <span className="mono">{best.a}</span> and <span className="mono">{best.b}</span>, <span className="mono">{best.v.toFixed(2)}</span>.
            {best.v < 0.3 && ' No pair moves closely together, which helps diversification.'} Hover a cell to read a pair.
          </>
        ) : null}
      </p>
      <div className="pf2-scroll" tabIndex={0} role="region" aria-label="Correlation matrix, scrolls horizontally">
        <table className="pf2-heat">
          <caption className="sr-only">Pairwise correlation of weekly returns over the last year</caption>
          <thead>
            <tr>
              <td />
              {tickers.map((t, j) => (
                <th key={t} scope="col" className={`mono${hover?.j === j ? ' is-hl' : ''}`}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickers.map((row, i) => (
              <tr key={row}>
                <th scope="row" className={`mono${hover?.i === i ? ' is-hl' : ''}`}>{row}</th>
                {tickers.map((col, j) => {
                  const v = matrix[i]?.[j];
                  const inLine = hover && (hover.i === i || hover.j === j);
                  const cls = ['mono', i === j ? 'is-diag' : '', inLine ? 'is-line' : '', hover && hover.i === i && hover.j === j ? 'is-hot' : ''].filter(Boolean).join(' ');
                  return (
                    <td key={col} className={cls} style={cellStyle(v, i === j, i + j)} onPointerEnter={() => setHover({ i, j })} onFocus={() => setHover({ i, j })} tabIndex={-1}>
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
