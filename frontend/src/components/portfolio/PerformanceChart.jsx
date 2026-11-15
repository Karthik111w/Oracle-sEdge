import React, { useState } from 'react';
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

// Both series are rebased to 100 by the API.
const PerformanceChart = ({ performance }) => {
  const [idx, setIdx] = useState(null);
  const dates = performance?.dates || [];
  const data = dates.map((date, i) => ({ date, portfolio: performance.portfolio?.[i], benchmark: performance.benchmark?.[i] }));
  if (data.length < 2) return <p className="panel-note">Not enough price history to draw a chart.</p>;
  const last = data[data.length - 1];
  const summary = `Portfolio ${num(last.portfolio)} against SPY ${num(last.benchmark)}, both starting at 100 on ${fmtFull(data[0].date)}.`;
  const at = idx != null && data[idx] ? data[idx] : last;
  const gap = Number.isFinite(at.portfolio) && Number.isFinite(at.benchmark) ? at.portfolio - at.benchmark : NaN;
  const gapCls = !Number.isFinite(gap) || gap === 0 ? '' : gap > 0 ? 'tone-pos' : 'tone-neg';
  return (
    <div className="pf2-perf" role="img" aria-label={summary}>
      <div className="pfx-readout" aria-hidden="true">
        <span className="pfx-readout-date mono">{idx != null ? fmtFull(at.date) : 'Latest'}</span>
        <span className="pfx-readout-item"><i className="pf2-tip-key" />Portfolio <b className="mono">{num(at.portfolio)}</b></span>
        <span className="pfx-readout-item"><i className="pf2-tip-key pf2-tip-key--benchmark" />SPY <b className="mono">{num(at.benchmark)}</b></span>
        <span className="pfx-readout-item">Gap <b className={`mono ${gapCls}`}>{Number.isFinite(gap) ? `${gap > 0 ? '+' : ''}${gap.toFixed(1)}` : 'n/a'}</b></span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} onMouseMove={(e) => setIdx(Number.isInteger(e?.activeTooltipIndex) ? e.activeTooltipIndex : null)} onMouseLeave={() => setIdx(null)} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={48} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => Math.round(v)} />
          <Tooltip content={() => null} cursor={{ stroke: 'var(--color-gold)', strokeWidth: 1, strokeDasharray: '2 3' }} />
          <Legend wrapperStyle={{ paddingTop: '8px', fontSize: 12 }} />
          <Line type="monotone" dataKey="benchmark" name="SPY" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, fill: 'var(--bg-surface-solid)', stroke: 'var(--text-secondary)', strokeWidth: 2 }} isAnimationActive animationDuration={900} animationEasing="ease-out" />
          <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke="var(--color-gold)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--color-gold)', stroke: 'var(--bg-surface-solid)', strokeWidth: 2 }} isAnimationActive animationDuration={1100} animationEasing="ease-out" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
