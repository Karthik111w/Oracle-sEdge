import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { displayName, formatMoney } from '../home/LensVerdictCard';
import { pct, signedPoints, tone } from './format';

const COLUMNS = [
  { key: 'ticker', label: 'Holding', text: true },
  { key: 'shares', label: 'Shares' },
  { key: 'price', label: 'Price' },
  { key: 'value', label: 'Value' },
  { key: 'weight', label: 'Weight' },
  { key: 'change_pct', label: 'Today' },
  { key: 'score', label: 'Score' },
  { key: 'classification_label', label: 'Verdict', text: true },
  { key: 'margin_pct', label: 'Margin of safety' },
];

const VERDICT_TONE = { Buy: 'pos', Avoid: 'neg' };

const PositionsTable = ({ positions, totalValue }) => {
  const [sort, setSort] = useState({ key: 'value', dir: 'desc' });

  const rows = useMemo(() => {
    const { key, dir } = sort;
    const sign = dir === 'asc' ? 1 : -1;
    return [...positions].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const aMissing = av == null || av === '';
      const bMissing = bv == null || bv === '';
      if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
      if (typeof av === 'string') return sign * av.localeCompare(bv);
      return sign * (av - bv);
    });
  }, [positions, sort]);

  const toggle = (key, text) =>
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: text ? 'asc' : 'desc' }));

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
                <th key={c.key} scope="col" className={c.text ? '' : 'num'} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className={`pf2-sort${active ? ' is-active' : ''}`} onClick={() => toggle(c.key, c.text)}>
                    {c.label}
                    {active && (sort.dir === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
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
                <Link to={`/stock/${encodeURIComponent(p.ticker)}`} className="pf2-ticker mono">{p.ticker}</Link>
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
                  <span className="mono">{pct(p.weight)}</span>
                </span>
              </td>
              <td className={`mono num ${tone(p.change_pct)}`}>{signedPoints(p.change_pct)}</td>
              <td className="mono num">
                {Number.isFinite(p.score) ? Math.round(p.score) : 'n/a'}
                {p.grade && <span className={`pf2-grade grade-${p.grade}`}> {p.grade}</span>}
              </td>
              <td className={`tone-${VERDICT_TONE[p.classification_label || p.classification] || 'mid'}`}>{p.classification_label || p.classification || 'n/a'}</td>
              <td className={`mono num ${tone(p.margin_pct)}`}>{signedPoints(p.margin_pct, 1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td />
            <td />
            <td className="mono num">{formatMoney(totalValue)}</td>
            <td className="mono num">{pct(sumWeight)}</td>
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
