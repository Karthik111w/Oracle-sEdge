import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ShieldCheck, ShieldAlert, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLORS = ['#d4a853', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#f43f5e', '#84cc16', '#0ea5e9'];

const PortfolioCharts = ({ results }) => {
  if (!results || !results.holdings) return null;

  const currentData = results.holdings.map(h => ({
    name: h.ticker,
    value: h.current_weight * 100
  })).filter(h => h.value > 0);

  const optimizedData = results.holdings.map(h => ({
    name: h.ticker,
    value: h.optimized_weight * 100
  })).filter(h => h.value > 0.1); // Filter out tiny weights

  const formatPercent = (val) => `${val.toFixed(1)}%`;

  const sharpeDiff = results.optimized_sharpe - results.current_sharpe;
  const sharpePct = (sharpeDiff / Math.abs(results.current_sharpe)) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Current Portfolio Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>${results.current_portfolio_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Available Cash</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>${results.cash_available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Account Value</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>${results.account_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Optimized Sharpe Ratio</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{results.optimized_sharpe.toFixed(2)}</div>
            {sharpeDiff > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-success)', fontSize: '0.9rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                <ArrowUpRight size={16} /> +{sharpePct.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pie Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '400px' }}>
          <h3 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Current Allocation</h3>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={currentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({name, value}) => `${name} ${value.toFixed(1)}%`}>
                  {currentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Weight']} contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '400px', border: '1px solid var(--color-primary)' }}>
          <h3 style={{ margin: '0 0 1rem 0', textAlign: 'center', color: 'var(--color-primary)' }}>Optimized Allocation</h3>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={optimizedData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({name, value}) => `${name} ${value.toFixed(1)}%`}>
                  {optimizedData.map((entry, index) => {
                    const colorIndex = currentData.findIndex(d => d.name === entry.name);
                    return <Cell key={`cell-${index}`} fill={COLORS[colorIndex >= 0 ? colorIndex : index % COLORS.length]} />;
                  })}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Weight']} contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Ticker</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Current Shares</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Optimized Shares</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Current Wgt</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Optimized Wgt</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Change</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Buffett Score</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.holdings.map((h, i) => {
              const currentWgt = h.current_weight * 100;
              const optWgt = h.optimized_weight * 100;
              const diff = optWgt - currentWgt;
              
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>{h.ticker}</td>
                  <td style={{ padding: '1rem' }}>{h.shares.toFixed(4)}</td>
                  <td style={{ padding: '1rem' }}>{(h.optimized_shares ?? 0).toFixed(4)}</td>
                  <td style={{ padding: '1rem' }}>{currentWgt.toFixed(1)}%</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{optWgt.toFixed(1)}%</td>
                  <td style={{ padding: '1rem' }}>
                    {Math.abs(diff) < 0.1 ? (
                      <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                    ) : diff > 0 ? (
                      <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ArrowUpRight size={16} /> +{diff.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ArrowDownRight size={16} /> {diff.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      color: h.scorecard_score >= 70 ? 'var(--color-success)' : h.scorecard_score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                      fontWeight: 600
                    }}>
                      {h.scorecard_score.toFixed(0)}/100
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {h.buffett_approved ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <ShieldCheck size={14} /> Approved
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-danger)', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        <ShieldAlert size={14} /> Capped
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PortfolioCharts;
