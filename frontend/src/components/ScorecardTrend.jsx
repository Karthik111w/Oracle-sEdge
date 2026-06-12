import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const ScorecardTrend = ({ trend }) => {
  if (!trend || trend.length === 0) return null;

  const chartData = trend.map(item => ({ year: item.year, score: item.score }));

  return (
    <div className="card" style={{ padding: '1.5rem', height: '320px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Scorecard Trend</h3>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Historical Buffett score over the last {chartData.length} years.
          </p>
        </div>
      </div>
      <div style={{ width: '100%', height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value.toFixed(1)}`, 'Score']} contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScorecardTrend;
