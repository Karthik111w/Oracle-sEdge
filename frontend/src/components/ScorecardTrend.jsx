import React from 'react';
import OnView from './analysis/OnView';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

// Business quality score for each past year the statements allow. Years that could not be
// scored are left out by the backend, so the line may have gaps in time.
const ScorecardTrend = ({ trend, lensLabel }) => {
  const rows = (trend || []).filter((t) => Number.isFinite(t.score));
  if (rows.length === 0) return null;
  const data = rows.map((t) => ({ year: String(t.year), score: t.score }));
  const first = data[0];
  const last = data[data.length - 1];
  const summary = `Score by year, ${data.map((d) => `${d.year}: ${Math.round(d.score)}`).join(', ')}.`;

  return (
    <section className="panel" aria-labelledby="trend-title">
      <header className="panel-head">
        <div>
          <h3 id="trend-title" className="an-h3">Score over time</h3>
          <p className="panel-note">
            {lensLabel ? `${lensLabel} scorecard` : 'Scorecard'} applied to each year of reported statements.
            {data.length > 1 ? ` From ${Math.round(first.score)} in ${first.year} to ${Math.round(last.score)} in ${last.year}.` : ' Only one year could be scored.'}
          </p>
        </div>
      </header>
      <OnView className="an-trend" fallback={<span className="skel an-mini-skel" aria-hidden="true" />}>
        <div className="an-mini-fill" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <ReferenceLine y={75} stroke="var(--border-color-hover)" strokeDasharray="2 4" />
            <Tooltip
              formatter={(value) => [`${value.toFixed(1)} / 100`, 'Score']}
              contentStyle={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 12 }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            <Line type="monotone" dataKey="score" stroke="var(--color-gold)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-gold)' }} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </OnView>
    </section>
  );
};

export default ScorecardTrend;
