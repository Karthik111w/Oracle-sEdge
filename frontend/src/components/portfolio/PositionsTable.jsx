import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { displayName, formatMoney } from '../home/LensVerdictCard';
import { pctFromFraction, signedPoints, tone } from './format';
import { marginText, verdictLabel, verdictTone } from '../../lib/verdict';
import { ariaSort, makeComparator, nextSort } from '../../lib/table';

const COLUMNS = [
  { key: 'ticker', label: 'Holding', text: true },
  { key: 'shares', label: 'Shares' },
  { key: 'price', label: 'Price' },
  { key: 'value', label: 'Value' },
  { key: 'weight', label: 'Weight' },
  { key: 'change_pct', label: 'Day' },
  { key: 'score', label: 'Score' },
  { key: 'classification_label', label: 'Verdict', text: true },
  { key: 'margin_pct', label: 'Margin of safety' },
];

const PositionsTable = ({ positions, totalValue, investor = 'buffett', horizon = 'long' }) => {
  const [sort, setSort] = useState({ key: 'value', dir: -1 });

  const rows = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key);
    return [...positions].sort(makeComparator((p) => p[sort.key], { text: col?.text, dir: sort.dir, tiebreak: (a, b) => a.ticker.localeCompare(b.ticker) }));
  }, [positions, sort]);

  const toggle = (col) => setSort((cur) => nextSort(cur, col));

  const totalDay = positions.reduce((sum, p) => (Number.isFinite(p.change_pct) && Number.isFinite(p.value) ? sum + (p.value * p.change_pct) / (100 + p.change_pct) : sum), 0);
  const prevTotal = Number.isFinite(totalValue) ? totalValue - totalDay : NaN;
  const totalChange = prevTotal > 0 ? (totalDay / prevTotal) * 100 : NaN;
  const sumWeight = positions.reduce((s, p) => s + (Number.isFinite(p.weight) ? p.weight : 0), 0);

  return (
    <div className="pf2-scroll" tabIndex={0} role="region" aria-label="Positions table, scrolls horizontally">
      <table className="score-table pf2-table">
        <thead>
          <tr>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key;
              return (
                <th key={c.key} scope="col" className={c.text ? '' : 'num'} aria-sort={ariaSort(sort, c.key)}>
                  <button type="button" className={`pf2-sort${active ? ' is-active' : ''}`} onClick={() => toggle(c)}>
                    {c.label}
                    {active && (sort.dir === 1 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.ticker}>
              <th scope="row" className="pf2-holding">
                <Link to={`/stock/${encodeURIComponent(p.ticker)}?investor=${investor}&horizon=${horizon}`} className="pf2-ticker mono">{p.ticker}</Link>
                {p.name && <span className="pf2-name">{displayName(p.name)}</span>}
              </th>
              <td className="mono num">{Number.isFinite(p.shares) ? +p.shares.toFixed(4) : 'n/a'}</td>
              <td className="mono num">{formatMoney(p.price)}</td>
              <td className="mono num">{formatMoney(p.value)}</td>
              <td className="num">
                <span className="pf2-weight">
                  <span className="pf2-weight-bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, Math.max(0, (p.weight || 0) * 100))}%` }} />
                  </span>
                  <span className="mono">{pctFromFraction(p.weight)}</span>
                </span>
              </td>
              <td className={`mono num ${tone(p.change_pct)}`}>{signedPoints(p.change_pct)}</td>
              <td className="mono num">
                {Number.isFinite(p.score) ? Math.round(p.score) : 'n/a'}
                {p.grade && <span className={`pf2-grade grade-${p.grade}`}> {p.grade}</span>}
              </td>
              <td className={`tone-${verdictTone(p.classification)}`}>{verdictLabel(p)}</td>
              <td className={`mono num ${tone(p.margin_pct)}`}>{marginText(p.margin_pct)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td />
            <td />
            <td className="mono num">{formatMoney(totalValue)}</td>
            <td className="mono num">{pctFromFraction(sumWeight)}</td>
            <td className={`mono num ${tone(totalChange)}`}>{signedPoints(totalChange)}</td>
            <td />
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default PositionsTable;
