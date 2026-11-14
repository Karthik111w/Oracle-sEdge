import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const fmtDate = (d) => {
  const t = new Date(`${d}T00:00:00`);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const fmtFull = (d) => {
  const t = new Date(`${d}T00:00:00`);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const num = (v) => (Number.isFinite(v) ? v.toFixed(1) : 'n/a');

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="pf2-tip">
      <div className="pf2-tip-date">{fmtFull(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="pf2-tip-row">
          <span className={`pf2-tip-key pf2-tip-key--${p.dataKey}`} aria-hidden="true" />
          <span>{p.name}</span>
          <span className="mono">{num(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Both series are rebased to 100 by the API.
const PerformanceChart = ({ performance }) => {
  const dates = performance?.dates || [];
  const data = dates.map((date, i) => ({ date, portfolio: performance.portfolio?.[i], benchmark: performance.benchmark?.[i] }));
  if (data.length < 2) return <p className="panel-note">Not enough price history to draw a chart.</p>;
  const last = data[data.length - 1];
  const summary = `Portfolio ${num(last.portfolio)} against SPY ${num(last.benchmark)}, both starting at 100 on ${fmtFull(data[0].date)}.`;
  return (
    <div className="pf2-perf" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={48} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => Math.round(v)} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-color-hover)' }} />
          <Legend wrapperStyle={{ paddingTop: '8px', fontSize: 12 }} />
          <Line type="monotone" dataKey="benchmark" name="SPY" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
          <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke="var(--color-gold)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
