import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, ShieldCheck, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

const COLORS = ['#06b6d4', '#d4a853', '#8b5cf6', '#3b82f6', '#10b981', '#f97316', '#ec4899'];

const PortfolioCharts = ({ results, activeStrategy = 'balanced' }) => {
  if (!results || !results.holdings || !results.strategies) return null;
  const strategy = results.strategies[activeStrategy] || results.strategies.balanced;
  if (!strategy) return null;

  const currentData = results.holdings.map(h => ({
    name: h.ticker,
    value: h.current_weight * 100
  })).filter(h => h.value > 0);

  const optimizedData = strategy.holdings.map(h => ({
    name: h.ticker,
    value: h.optimized_weight * 100
  })).filter(h => h.value > 0.1);

  // Growth trajectory backtest dummy line data for Current vs Optimized portfolio growth
  const backtestData = [
    { date: 'May \'23', current: 20000, optimized: 20000 },
    { date: 'Jul \'23', current: 22000, optimized: 24500 },
    { date: 'Sep \'23', current: 21500, optimized: 26000 },
    { date: 'Nov \'23', current: 24000, optimized: 30000 },
    { date: 'Jan \'24', current: 23500, optimized: 32500 },
    { date: 'Mar \'24', current: 26000, optimized: 36000 },
    { date: 'May \'24', current: 27500, optimized: 41000 },
  ];

  const sharpeDiff = strategy.optimized_sharpe - results.current_sharpe;
  const sharpePct = (sharpeDiff / Math.abs(results.current_sharpe || 1)) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Holdings Table matching Image 3 */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
              <th style={{ padding: '1rem 1.5rem' }}>Ticker</th>
              <th style={{ padding: '1rem' }}>Shares</th>
              <th style={{ padding: '1rem' }}>Price</th>
              <th style={{ padding: '1rem' }}>Value</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {results.holdings.map((h, i) => {
              const val = (h.shares * h.price) || 0;
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
                    {h.ticker}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{h.shares.toFixed(2)}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>${h.price.toFixed(2)}</td>
                  <td style={{ padding: '1rem', fontWeight: 700 }}>${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                    +2.34%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Account Value</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              ${results.account_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 700 }}>
              +1.8% ↑
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(212, 168, 83, 0.3)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Available Cash</span>
          <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-gold)', letterSpacing: '-0.02em' }}>
            ${results.cash_available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Allocation Donut Chart & Backtest Optimization Line Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        
        {/* Allocation Donut Chart */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Allocation</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', height: '260px' }}>
            <div style={{ width: '60%', height: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={optimizedData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {optimizedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Weight']} contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>By Ticker</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>100%</span>
              </div>
            </div>

            {/* Legend List */}
            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              {optimizedData.map((entry, i) => (
                <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }}></div>
                    <span style={{ fontWeight: 600 }}>{entry.name}</span>
                  </div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{entry.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Optimization Line Chart */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Portfolio Optimization</h3>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-teal)' }}>
                <div style={{ width: '12px', height: '2px', background: '#06b6d4' }}></div> Current Portfolio
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-gold)' }}>
                <div style={{ width: '12px', height: '2px', background: '#d4a853' }}></div> Optimized Portfolio
              </span>
            </div>
          </div>

          <div style={{ height: '230px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={backtestData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="current" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="optimized" stroke="#d4a853" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default PortfolioCharts;
