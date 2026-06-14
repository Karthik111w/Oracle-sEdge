import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DCFChart = ({ dcf }) => {
  if (!dcf || !dcf.projected_fcf) return null;
  if (dcf.error) {
    return (
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Valuation</h3>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem' }}>{dcf.error}</p>
      </div>
    );
  }

  const data = dcf.projected_fcf.map(item => ({
    year: `Year ${item.year}`,
    fcf: Math.round(item.fcf / 1000000),
    discounted: Math.round(item.discounted_fcf / 1000000),
  }));

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatPercent = (val) => (val * 100).toFixed(2) + '%';

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{dcf.model_label || 'Discounted Cash Flow (DCF)'}</h3>
        {dcf.model_explanation && (
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--color-text-muted)',
            background: 'rgba(255,255,255,0.04)',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            borderLeft: '3px solid var(--color-primary)',
          }}>
            💡 {dcf.model_explanation}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Intrinsic Value / Share</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(dcf.intrinsic_value)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Discount Rate</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>{formatPercent(dcf.wacc)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Est. Growth Rate</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>{formatPercent(dcf.growth_rate)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Terminal Value (Discounted)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>${Math.round(dcf.terminal_value_discounted / 1e9)}B</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '300px', width: '100%', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}M`} />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
              itemStyle={{ color: 'var(--color-text)' }}
              formatter={(value) => [`$${value.toLocaleString()}M`, undefined]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Bar dataKey="fcf" name="Projected" fill="rgba(212, 168, 83, 0.4)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="discounted" name="Discounted" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DCFChart;