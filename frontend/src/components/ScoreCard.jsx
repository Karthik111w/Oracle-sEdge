import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import OnView from './analysis/OnView';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { isScored } from './home/lenses';

const tone = (score, max) => {
  if (!max) return 'muted';
  const pct = score / max;
  if (pct >= 0.8) return 'pos';
  if (pct >= 0.4) return 'mid';
  return 'neg';
};

// A vertex marker. Recharts animates the radar and keeps these elements from its first paint,
// so the highlight is toggled on the DOM node (see the effect below) rather than through props.
function RadarDot({ cx, cy, payload, onHover }) {
  // Recharts hands over the radar point; the metric row it came from is one level down.
  const name = payload?.payload?.full;
  if (!name) return null;
  return (
    <g onMouseEnter={() => onHover(name)} onMouseLeave={() => onHover(null)}>
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      <circle cx={cx} cy={cy} r={3.5} className="an-radar-dot" data-metric={name} />
    </g>
  );
}

const ScoreCard = ({ scorecard }) => {
  const [hi, setHi] = useState(null);
  const radarBox = useRef(null);
  useEffect(() => {
    radarBox.current?.querySelectorAll('.an-radar-dot').forEach((el) => el.classList.toggle('is-on', el.getAttribute('data-metric') === hi));
  }, [hi]);
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
      full: m.name,
      normalized: (m.score / m.max) * 100,
    }));

  return (
    <section className="panel" aria-labelledby="scorecard-title">
      <header className="panel-head">
        <div>
          <h3 id="scorecard-title" className="an-h3">{scorecard.investor_label || 'Investor'} scorecard</h3>
          {scorecard.investor_sector_note && <p className="panel-note">{scorecard.investor_sector_note}.</p>}
        </div>
        <div className="panel-figure">
          <span className="mono">{Number.isFinite(scorecard.total_score) ? Math.round(scorecard.total_score) : 'n/a'}</span>
          <span className="panel-figure-unit">/100, grade {scorecard.grade}</span>
        </div>
      </header>

      {chartData.length >= 3 && (
        <OnView className="radar" fallback={<span className="skel an-mini-skel" aria-hidden="true" />}>
          <div
            ref={radarBox}
            className="an-mini-fill"
            role="img"
            aria-label={`Radar chart of ${chartData.length} scored metrics as a share of their points: ${chartData.map((d) => `${d.metric} ${Math.round(d.normalized)} percent`).join(', ')}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
                <PolarGrid stroke="var(--border-color-hover)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={({ x, y, payload, textAnchor }) => {
                    const on = chartData[payload.index]?.full === hi;
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor={textAnchor}
                        className={`an-radar-tick${on ? ' is-on' : ''}`}
                        onMouseEnter={() => setHi(chartData[payload.index]?.full ?? null)}
                        onMouseLeave={() => setHi(null)}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="normalized"
                  stroke="var(--color-gold)"
                  strokeWidth={2}
                  fill="var(--color-gold)"
                  fillOpacity={0.26}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                  dot={<RadarDot onHover={setHi} />}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </OnView>
      )}

      <div className="an-table-wrap">
      <table className="score-table">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col" className="num">Value</th>
            <th scope="col" className="num">Points</th>
          </tr>
        </thead>
        <tbody>
          {scorecard.metrics.map((m, i) => {
            const excluded = !isScored(m);
            return (
              <tr key={m.name} className={`an-metric-row${excluded ? ' is-excluded' : ''}${hi === m.name ? ' is-hi' : ''}`} onMouseEnter={() => !excluded && setHi(m.name)} onMouseLeave={() => setHi(null)}>
                <th scope="row" title={m.details}>
                  {m.name}
                  {excluded && <span className="muted"> (not scored)</span>}
                </th>
                <td className="mono num">{m.value ?? 'n/a'}</td>
                <td className={`mono num tone-${tone(m.score, m.max)}`}>
                  {excluded ? (
                    'n/a'
                  ) : (
                    <span className="an-pts">
                      <span className="an-pts-track" aria-hidden="true">
                        <motion.span
                          className={`an-pts-bar is-${tone(m.score, m.max)}`}
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: Math.min(1, Math.max(0, m.score / m.max)) }}
                          viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                        />
                      </span>
                      <span className="an-pts-text">{`${m.score.toFixed(1)} / ${m.max.toFixed(1)}`}</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
};

export default ScoreCard;
