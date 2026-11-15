import React from 'react';
import { CountUp, Reveal } from '../fx';
import { formatMoney } from '../home/LensVerdictCard';
import { num, pctFromFraction, signedPctFromFraction, tone } from './format';

// Headline figures for the analysed portfolio. Every figure can be null; CountUp prints n/a then.
const AnalysisSummary = ({ data }) => {
  const s = data.stats || {};
  const beat = Number.isFinite(s.return_1y) && Number.isFinite(s.benchmark_return_1y) ? s.return_1y - s.benchmark_return_1y : null;
  const tiles = [
    { label: 'Total value', value: data.total_value, format: formatMoney, hero: true },
    {
      label: '1-year return',
      value: s.return_1y,
      format: signedPctFromFraction,
      cls: tone(s.return_1y),
      sub: Number.isFinite(s.benchmark_return_1y) ? `SPY ${signedPctFromFraction(s.benchmark_return_1y)}` : 'SPY n/a',
      // tone of the gap to SPY, not of the return alone
      subCls: tone(beat),
      hero: true,
    },
    { label: 'Volatility', value: s.volatility, format: (v) => pctFromFraction(v), sub: 'Annualized' },
    { label: 'Sharpe ratio', value: s.sharpe, format: (v) => num(v) },
    { label: 'Max drawdown', value: s.max_drawdown, format: signedPctFromFraction, cls: tone(s.max_drawdown), sub: 'Over the last year' },
    {
      label: 'Beta',
      value: data.weighted_beta,
      format: (v) => num(v),
      sub: Number.isFinite(s.beta_vs_benchmark) ? `${num(s.beta_vs_benchmark)} vs SPY, measured` : 'Weighted from holdings',
    },
    { label: 'Lens score', value: data.weighted_score, format: (v) => `${Math.round(v)}/100`, sub: 'Weighted by value' },
  ];
  return (
    <div className="pf2-tiles" role="list">
      {tiles.map((t, i) => (
        <Reveal key={t.label} y={16} delay={i * 0.06} className={`pf2-tile fx-spot${t.hero ? ' pf2-tile--hero' : ''}`} role="listitem">
          <span className="pf2-tile-label">{t.label}</span>
          <CountUp className={`pf2-tile-value mono ${t.cls || ''}`} value={t.value} format={t.format} />
          {t.sub && <span className={`pf2-tile-sub ${t.subCls || ''}`}>{t.sub}</span>}
        </Reveal>
      ))}
    </div>
  );
};

export default AnalysisSummary;
