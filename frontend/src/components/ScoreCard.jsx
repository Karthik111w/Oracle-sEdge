import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const ScoreCard = ({ scorecard }) => {
  if (!scorecard || !scorecard.metrics) return null;

  const chartData = scorecard.metrics.map(m => ({
    metric: m.name.replace('Growth', 'Grwth').replace('Consistency', 'Consist.'),
    score: m.score,
    fullMark: m.max
  }));

  const getScoreColor = (score, max) => {
    const pct = score / max;
    if (pct >= 0.8) return 'var(--color-success)';
    if (pct >= 0.4) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Buffett Scorecard</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{scorecard.total_score}</span>
          <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>/ 100</span>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'var(--color-surface)',
            border: '2px solid var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            marginLeft: '0.5rem'
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
            <PolarRadiusAxis angle={30} domain={[0, 12.5]} tick={false} axisLine={false} />
            <Radar name="Score" dataKey="score" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {scorecard.metrics.map((metric, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--color-text)', fontWeight: 500 }} title={metric.details}>{metric.name}</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{metric.value}</span>
                <span style={{ color: getScoreColor(metric.score, metric.max), fontWeight: 600 }}>{metric.score}/{metric.max}</span>
              </div>
            </div>
            <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${(metric.score / metric.max) * 100}%`,
                background: getScoreColor(metric.score, metric.max),
                borderRadius: '3px'
              }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreCard;
