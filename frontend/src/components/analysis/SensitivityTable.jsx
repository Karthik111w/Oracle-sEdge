import React, { useMemo } from 'react';
import { finite, money, pct } from './format';

// The backend holds a rate at its floor, which repeats a column or row. Keep the first of each
// repeat and remember which one is the base case (the middle of the original five).
function dedupe(rates) {
  const keep = [];
  rates.forEach((r, i) => {
    if (!keep.some((k) => Math.abs(k.value - r) < 1e-9)) keep.push({ value: r, index: i });
  });
  return keep;
}

const SensitivityTable = ({ sensitivity, price, baseGrowth, baseDiscount }) => {
  const grid = useMemo(() => {
    const s = sensitivity;
    if (!s || !Array.isArray(s.values) || !Array.isArray(s.growth_rates) || !Array.isArray(s.discount_rates)) return null;
    const cols = dedupe(s.growth_rates);
    const rows = dedupe(s.discount_rates);
    if (cols.length < 2 && rows.length < 2) return null;
    const near = (a, b) => finite(a) && finite(b) && Math.abs(a - b) < 1e-9;
    return {
      cols,
      rows,
      cell: (r, c) => s.values[r.index]?.[c.index],
      isBase: (r, c) => near(r.value, baseDiscount) && near(c.value, baseGrowth),
    };
  }, [sensitivity, baseGrowth, baseDiscount]);

  if (!grid) return null;

  return (
    <section className="panel" aria-labelledby="an-sens-title">
      <header className="panel-head">
        <div>
          <h3 id="an-sens-title" className="an-h3">Sensitivity</h3>
          <p className="panel-note">
            Fair value per share for different discount rates (rows) and starting growth rates (columns). Green cells are above the current price of {money(price)}, red cells below. The outlined cell is the base case.
          </p>
        </div>
      </header>
      <div className="an-table-wrap">
        <table className="an-sens">
          <caption className="sr-only">Fair value per share by discount rate and starting growth</caption>
          <thead>
            <tr>
              <th scope="col" className="an-sens-corner">
                <span className="sr-only">Discount rate down, starting growth across</span>
                <span aria-hidden="true">Discount / growth</span>
              </th>
              {grid.cols.map((c) => (
                <th key={c.value} scope="col" className="mono num">{pct(c.value)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((r) => (
              <tr key={r.value}>
                <th scope="row" className="mono">{pct(r.value)}</th>
                {grid.cols.map((c) => {
                  const v = grid.cell(r, c);
                  const above = finite(v) && finite(price) ? v >= price : null;
                  const base = grid.isBase(r, c);
                  return (
                    <td
                      key={c.value}
                      className={`mono num an-sens-cell${above === null ? '' : above ? ' is-above' : ' is-below'}${base ? ' is-base' : ''}`}
                      title={above === null ? undefined : `${above ? 'Above' : 'Below'} the current price${base ? ', base case' : ''}`}
                    >
                      {money(v)}
                      {base && <span className="sr-only"> (base case)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SensitivityTable;
