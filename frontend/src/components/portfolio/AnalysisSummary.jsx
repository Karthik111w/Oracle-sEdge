import React from 'react';
import { formatMoney } from '../home/LensVerdictCard';
import { num, pctFromFraction, signedPctFromFraction, tone } from './format';

// Headline figures for the analysed portfolio. Every figure can be null.
const AnalysisSummary = ({ data }) => {
  const s = data.stats || {};
  const tiles = [
    { label: 'Total value', value: formatMoney(data.total_value) },
    {
      label: '1-year return',
      value: signedPctFromFraction(s.return_1y),
      cls: tone(s.return_1y),
      sub: Number.isFinite(s.benchmark_return_1y) ? `SPY ${signedPctFromFraction(s.benchmark_return_1y)}` : 'SPY n/a',
    },
    { label: 'Volatility', value: pctFromFraction(s.volatility), sub: 'Annualized' },
    { label: 'Sharpe ratio', value: num(s.sharpe) },
    { label: 'Max drawdown', value: signedPctFromFraction(s.max_drawdown), cls: tone(s.max_drawdown), sub: 'Over the last year' },
    {
      label: 'Beta',
      value: num(data.weighted_beta),
      sub: Number.isFinite(s.beta_vs_benchmark) ? `${num(s.beta_vs_benchmark)} vs SPY, measured` : 'Weighted from holdings',
    },
    { label: 'Lens score', value: Number.isFinite(data.weighted_score) ? `${Math.round(data.weighted_score)}/100` : 'n/a', sub: 'Weighted by value' },
  ];
  return (
    <div className="pf2-tiles" role="list">
      {tiles.map((t) => (
        <div key={t.label} className="pf2-tile" role="listitem">
          <span className="pf2-tile-label">{t.label}</span>
          <span className={`pf2-tile-value mono ${t.cls || ''}`}>{t.value}</span>
          {t.sub && <span className="pf2-tile-sub">{t.sub}</span>}
        </div>
      ))}
    </div>
  );
};

export default AnalysisSummary;
