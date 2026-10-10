import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const pct = (val) => (Number.isFinite(val) ? `${(val * 100).toFixed(1)}%` : 'n/a');

const DCFChart = ({ dcf }) => {
  if (!dcf || !dcf.projected_fcf) return null;
  if (dcf.error) {
    return (
      <section className="panel">
        <h2>Projected cash flow</h2>
        <p className="panel-text">{dcf.error}</p>
      </section>
    );
  }

  const data = dcf.projected_fcf.map((item) => ({
    year: `Y${item.year}`,
    fcf: Math.round(item.fcf / 1e6),
    discounted: Math.round(item.discounted_fcf / 1e6),
  }));

  return (
    <section className="panel" aria-labelledby="fcf-title">
      <header className="panel-head">
        <div>
          <h2 id="fcf-title">Projected cash flow</h2>
          <p className="panel-note">Ten years of free cash flow, and what each year is worth today after discounting.</p>
        </div>
      </header>

      <dl className="deck-facts deck-facts--four">
        <div>
          <dt>Discount rate</dt>
          <dd className="mono">{pct(dcf.discount_rate ?? dcf.wacc)}</dd>
        </div>
        <div>
          <dt>Growth rate</dt>
          <dd className="mono">{pct(dcf.growth_rate)}</dd>
        </div>
        <div>
          <dt>Terminal growth</dt>
          <dd className="mono">{pct(dcf.terminal_rate)}</dd>
        </div>
        <div>
          <dt>Terminal value today</dt>
          <dd className="mono">${Math.round((dcf.terminal_value_discounted || 0) / 1e9)}B</dd>
        </div>
      </dl>

      <div className="fcf-chart">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => (Math.abs(val) >= 1000 ? `$${(val / 1000).toFixed(1).replace(/\.0$/, '')}B` : `$${val}M`)}
            />
            <Tooltip
              cursor={{ fill: 'var(--bg-hover)' }}
              contentStyle={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
              formatter={(value) => [`$${value.toLocaleString()}M`, undefined]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: 12 }} />
            <Bar dataKey="fcf" name="Projected" fill="var(--text-muted)" fillOpacity={0.35} radius={[3, 3, 0, 0]} />
            <Bar dataKey="discounted" name="Worth today" fill="var(--color-gold)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default DCFChart;
