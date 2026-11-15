import React, { useMemo } from 'react';
import { finite, money, pct } from './format';

const SensitivityTable = ({ sensitivity, price, baseGrowth, baseDiscount }) => {
  const grid = useMemo(() => {
    const s = sensitivity;
    if (!s || !Array.isArray(s.values) || !Array.isArray(s.growth_rates) || !Array.isArray(s.discount_rates)) return null;
    const cols = s.growth_rates.map((value, index) => ({ value, index }));
    const rows = s.discount_rates.map((value, index) => ({ value, index }));
    if (cols.length < 2 && rows.length < 2) return null;
    const nearest = (list, target) => {
      if (!finite(target)) return -1;
      let best = -1;
      list.forEach((item, i) => {
        if (best < 0 || Math.abs(item.value - target) < Math.abs(list[best].value - target)) best = i;
      });
      return best;
    };
    const baseRow = Number.isInteger(s.base_row) ? s.base_row : nearest(rows, baseDiscount);
    const baseCol = Number.isInteger(s.base_col) ? s.base_col : nearest(cols, baseGrowth);
    return {
      cols,
      rows,
      cell: (r, c) => s.values[r.index]?.[c.index],
      isBase: (r, c) => r.index === baseRow && c.index === baseCol,
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
                <th key={c.index} scope="col" className="mono num">{pct(c.value)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((r) => (
              <tr key={r.index}>
                <th scope="row" className="mono">{pct(r.value)}</th>
                {grid.cols.map((c) => {
                  const v = grid.cell(r, c);
                  const above = finite(v) && finite(price) ? v >= price : null;
                  const base = grid.isBase(r, c);
                  return (
                    <td
                      key={c.index}
                      className={`mono num an-sens-cell${above === null ? '' : above ? ' is-above' : ' is-below'}${base ? ' is-base' : ''}`}
                      title={above === null ? undefined : `${above ? 'Above' : 'Below'} the current price${base ? ', base case' : ''}`}
                    >
                      {money(v)}
                      {above !== null && <span className="sr-only">{above ? ', above price' : ', below price'}</span>}
                      {base && <span className="sr-only">, base case</span>}
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
