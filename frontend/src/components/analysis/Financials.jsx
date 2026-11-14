import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compactMoney, finite } from './format';

const axisTick = { fill: 'var(--text-muted)', fontSize: 11 };
const tooltipStyle = {
  contentStyle: { background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 12 },
  labelStyle: { color: 'var(--text-muted)' },
};

const SERIES = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'net_income', label: 'Net income' },
  { key: 'free_cash_flow', label: 'Free cash flow' },
];

const TABLE_ROWS = [
  ['revenue', 'Revenue', 'money'],
  ['gross_profit', 'Gross profit', 'money'],
  ['operating_income', 'Operating income', 'money'],
  ['net_income', 'Net income', 'money'],
  ['operating_cash_flow', 'Operating cash flow', 'money'],
  ['capital_expenditure', 'Capital spending', 'money'],
  ['free_cash_flow', 'Free cash flow', 'money'],
  ['dividends_paid', 'Dividends paid', 'money'],
  ['eps', 'EPS', 'eps'],
  ['total_debt', 'Total debt', 'money'],
  ['stockholders_equity', 'Equity', 'money'],
  ['cash', 'Cash', 'money'],
];

const MARGINS = [
  { key: 'gross', label: 'Gross', source: 'gross_profit', stroke: 'var(--color-gold)', dash: undefined },
  { key: 'operating', label: 'Operating', source: 'operating_income', stroke: 'var(--text-heading)', dash: undefined },
  { key: 'net', label: 'Net', source: 'net_income', stroke: 'var(--text-muted)', dash: '5 3' },
];

function SmallBars({ title, data, dataKey }) {
  const have = data.filter((d) => finite(d[dataKey]));
  if (have.length === 0) return null;
  const last = have[have.length - 1][dataKey];
  const summary = `${title} by year: ${have.map((d) => `${d.year} ${compactMoney(d[dataKey])}`).join(', ')}.`;
  return (
    <figure className="an-mini">
      <figcaption>
        <span>{title}</span>
        <span className="mono an-mini-latest">{compactMoney(last)}</span>
      </figcaption>
      <div className="an-mini-chart" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} tickFormatter={compactMoney} domain={[(min) => Math.min(0, min), (max) => Math.max(0, max)]} />
            <ReferenceLine y={0} stroke="var(--border-color-hover)" />
            <Tooltip cursor={{ fill: 'var(--bg-hover)' }} formatter={(v) => [compactMoney(v), title]} {...tooltipStyle} />
            <Bar dataKey={dataKey} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.year} fill={finite(d[dataKey]) && d[dataKey] < 0 ? 'var(--color-danger)' : 'var(--color-gold)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

const Financials = ({ financials }) => {
  const [showTable, setShowTable] = useState(false);

  const model = useMemo(() => {
    const years = financials?.years;
    if (!Array.isArray(years)) return null;
    const idx = years
      .map((_, i) => i)
      .filter((i) => ['revenue', 'net_income', 'free_cash_flow', 'gross_profit', 'operating_income'].some((k) => finite(financials[k]?.[i])));
    if (idx.length === 0) return null;
    const at = (key, i) => (finite(financials[key]?.[i]) ? financials[key][i] : null);
    const rows = idx.map((i) => {
      const row = { year: String(years[i]) };
      for (const { key } of SERIES) row[key] = at(key, i);
      for (const m of MARGINS) {
        const rev = at('revenue', i);
        const part = at(m.source, i);
        row[m.key] = finite(rev) && rev > 0 && finite(part) ? (part / rev) * 100 : null;
      }
      return row;
    });
    const marginSeries = MARGINS.filter((m) => rows.some((r) => finite(r[m.key])));
    return { idx, rows, marginSeries, at, years };
  }, [financials]);

  if (!model) return <p className="muted">No financial statements are available for this ticker.</p>;
  const { rows, marginSeries, idx, at, years } = model;
  const fmt = (kind, v) => (!finite(v) ? 'n/a' : kind === 'eps' ? `$${v.toFixed(2)}` : compactMoney(v));
  const marginSummary = `Margins as a share of revenue by year: ${rows.map((r) => `${r.year} ${marginSeries.map((m) => `${m.label.toLowerCase()} ${finite(r[m.key]) ? `${r[m.key].toFixed(1)} percent` : 'n/a'}`).join(', ')}`).join('; ')}.`;

  return (
    <div className="an-fin">
      <div className="an-minis">
        {SERIES.map((s) => (
          <SmallBars key={s.key} title={s.label} data={rows} dataKey={s.key} />
        ))}
        {marginSeries.length > 0 && (
          <figure className="an-mini">
            <figcaption>
              <span>Margins, % of revenue</span>
            </figcaption>
            <div className="an-mini-chart" role="img" aria-label={marginSummary}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${Math.round(v)}%`} />
                  <Tooltip formatter={(v, name) => [finite(v) ? `${v.toFixed(1)}%` : 'n/a', name]} {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="plainline" />
                  {marginSeries.map((m) => (
                    <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.stroke} strokeDasharray={m.dash} strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </figure>
        )}
      </div>

      <button type="button" className="btn-quiet an-toggle" aria-expanded={showTable} aria-controls="an-fin-table" onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'Hide table' : 'Show table'}
      </button>

      {showTable && (
        <div id="an-fin-table" className="an-table-wrap an-fin-table">
          <table className="score-table">
            <caption className="sr-only">Yearly financials</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                {idx.map((i) => (
                  <th key={years[i]} scope="col" className="num">{years[i]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.filter(([key]) => idx.some((i) => finite(at(key, i)))).map(([key, label, kind]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  {idx.map((i) => (
                    <td key={years[i]} className="mono num">{fmt(kind, at(key, i))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Financials;
