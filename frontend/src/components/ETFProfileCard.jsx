import React from 'react';
import { Zap, DollarSign, TrendingUp, Percent } from 'lucide-react';

const ETFProfileCard = ({ stockData }) => {
  if (!stockData || stockData.quote_type !== "ETF") return null;

  const etf_data = stockData.etf_data || {};

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A";
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return "N/A";
    return `${(value * 100).toFixed(2)}%`;
  };

  const metrics = [
    {
      icon: Percent,
      label: "Expense Ratio",
      value: formatPercent(etf_data.expense_ratio),
      detail: "Annual fee"
    },
    {
      icon: DollarSign,
      label: "AUM (Total Assets)",
      value: formatCurrency(etf_data.total_assets),
      detail: "Fund size"
    },
    {
      icon: TrendingUp,
      label: "5-Year Return",
      value: formatPercent(etf_data.five_year_return),
      detail: "Average annual"
    },
    {
      icon: Zap,
      label: "Dividend Yield",
      value: formatPercent(etf_data.yield),
      detail: "Income"
    }
  ];

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>ETF Profile</h3>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          {etf_data.category || "Exchange-Traded Fund"}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem' }}>
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Icon size={18} color="var(--color-primary)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                  {metric.label}
                </span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {metric.value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {metric.detail}
              </div>
            </div>
          );
        })}
      </div>

      {etf_data.nav_price && (
        <div style={{ 
          marginTop: '1.5rem', 
          paddingTop: '1.5rem', 
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.9rem',
          color: 'var(--color-text-muted)'
        }}>
          <span style={{ fontWeight: 500 }}>NAV:</span> ${etf_data.nav_price.toFixed(2)}
        </div>
      )}

      {etf_data.ytd_return !== null && etf_data.ytd_return !== undefined && (
        <div style={{ 
          marginTop: '1rem', 
          fontSize: '0.9rem',
          color: etf_data.ytd_return >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
          fontWeight: 500
        }}>
          YTD Return: {formatPercent(etf_data.ytd_return)}
        </div>
      )}
    </div>
  );
};

export default ETFProfileCard;
