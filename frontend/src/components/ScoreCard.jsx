import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { isScored } from './home/lenses';

const tone = (score, max) => {
  if (!max) return 'muted';
  const pct = score / max;
  if (pct >= 0.8) return 'pos';
  if (pct >= 0.4) return 'mid';
  return 'neg';
};

const ScoreCard = ({ scorecard }) => {
  if (!scorecard || !scorecard.metrics) return null;

  // Normalise each metric to 0-100 for the radar (max varies by metric and sector).
  const chartData = scorecard.metrics
    .filter(isScored)
    .map((m) => ({
      metric: m.name
        .replace('Growth', 'Grwth')
        .replace('Consistency', 'Consist.')
        .replace('Interest Coverage', 'Int. Cov.')
        .replace('Debt-to-Equity', 'D/E'),
      normalized: (m.score / m.max) * 100,
    }));

  return (
    <section className="panel" aria-labelledby="scorecard-title">
      <header className="panel-head">
        <div>
          <h2 id="scorecard-title">{scorecard.investor_label || 'Buffett'} scorecard</h2>
          {scorecard.investor_sector_note && <p className="panel-note">{scorecard.investor_sector_note}.</p>}
        </div>
        <div className="panel-figure">
          <span className="mono">{Math.round(scorecard.total_score)}</span>
          <span className="panel-figure-unit">/100, grade {scorecard.grade}</span>
        </div>
      </header>

      {chartData.length >= 3 && (
        <div className="radar">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Score" dataKey="normalized" stroke="var(--color-gold)" fill="var(--color-gold)" fillOpacity={0.28} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="score-table">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col" className="num">Value</th>
            <th scope="col" className="num">Points</th>
          </tr>
        </thead>
        <tbody>
          {scorecard.metrics.map((m) => {
            const excluded = !isScored(m);
            return (
              <tr key={m.name} className={excluded ? 'is-excluded' : ''}>
                <th scope="row" title={m.details}>
                  {m.name}
                  {excluded && <span className="muted"> (not scored)</span>}
                </th>
                <td className="mono num">{m.value}</td>
                <td className={`mono num tone-${tone(m.score, m.max)}`}>
                  {excluded ? 'n/a' : `${m.score.toFixed(1)} / ${m.max.toFixed(1)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};

export default ScoreCard;
