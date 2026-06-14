import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const ScoreCard = ({ scorecard }) => {
  if (!scorecard || !scorecard.metrics) return null;

  // Normalize each metric to 0-100 for radar (max varies by metric/sector)
  const chartData = scorecard.metrics
    .filter(m => m.max > 0)
    .map(m => ({
      metric: m.name
        .replace('Growth', 'Grwth')
        .replace('Consistency', 'Consist.')
        .replace('Interest Coverage', 'Int. Cov.')
        .replace('Debt-to-Equity', 'D/E'),
      normalized: (m.score / m.max) * 100,
      fullMark: 100,
    }));

  const getScoreColor = (score, max) => {
    if (!max) return 'var(--color-text-muted)';
    const pct = score / max;
    if (pct >= 0.8) return 'var(--color-success)';
    if (pct >= 0.4) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const getGradeColor = (grade) => {
    if (grade === 'A') return 'var(--color-success)';
    if (grade === 'B') return 'var(--color-primary)';
    if (grade === 'C') return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Buffett Scorecard</h3>
          {scorecard.sector_label && scorecard.sector_label !== 'Default' && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              Weighted for {scorecard.sector_label} sector
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{scorecard.total_score}</span>
          <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>/ 100</span>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--color-surface)',
            border: `2px solid ${getGradeColor(scorecard.grade)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700, color: getGradeColor(scorecard.grade),
            marginLeft: '0.5rem',
          }}>
            {scorecard.grade}
          </div>
        </div>
      </div>

      <div style={{ height: '250px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Score" dataKey="normalized" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {scorecard.metrics.map((metric, i) => {
          const isExcluded = metric.max === 0;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', opacity: isExcluded ? 0.4 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }} title={metric.details}>
                  {metric.name}
                  {isExcluded && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '0.4rem' }}>
                      (not applicable)
                    </span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{metric.value}</span>
                  <span style={{ color: getScoreColor(metric.score, metric.max), fontWeight: 600 }}>{metric.score}/{metric.max}</span>
                </div>
              </div>
              <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${metric.max > 0 ? (metric.score / metric.max) * 100 : 0}%`,
                  background: getScoreColor(metric.score, metric.max),
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreCard;