import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPriceHistory } from '../../api/client';
import { cached } from '../../api/cache';
import SegmentedControl from '../SegmentedControl';
import { isScored } from '../home/lenses';
import { SERIES, SeriesSwatch } from './series.jsx';

const PERIODS = [
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];
const tooltipStyle = { background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 12 };
const tick = { fill: 'var(--text-muted)', fontSize: 12 };

const dimOf = (active, ticker) => (active && active !== ticker ? 0.12 : 1);

function ChartLegend({ tickers, active }) {
  return (
    <ul className="cmp2-legend" aria-label="Chart legend">
      {tickers.map((t) => (
        <li key={t.ticker} className={active && active !== t.ticker ? 'is-dim' : undefined}>
          <SeriesSwatch index={t.index} />
          <span className="mono">{t.ticker}</span>
        </li>
      ))}
    </ul>
  );
}

// Scorecard metrics as percent of each metric's maximum, one polygon per ticker.
export function CompareRadar({ items, active, index = '03' }) {
  const { data, summary } = useMemo(() => {
    const names = [];
    items.forEach(({ d }) =>
      (d.scorecard?.metrics || []).filter(isScored).forEach((m) => {
        if (!names.includes(m.name)) names.push(m.name);
      })
    );
    const rows = names.map((name) => {
      const row = { metric: name };
      items.forEach(({ ticker, d }) => {
        const m = (d.scorecard?.metrics || []).find((x) => x.name === name);
        row[ticker] = m && isScored(m) ? Math.round((m.score / m.max) * 100) : null;
      });
      return row;
    });
    const text = items
      .map(({ ticker }) => {
        const vals = rows.map((r) => r[ticker]).filter((v) => v !== null);
        return `${ticker} averages ${vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 'n/a'} percent of the maximum across ${vals.length} metrics`;
      })
      .join('. ');
    return { data: rows, summary: text };
  }, [items]);

  if (data.length < 3) return null;
  return (
    <section className="cmp2-panel" aria-labelledby="cmp-radar-title">
      <div className="section-head"><span className="eyebrow">{index}</span><h2 id="cmp-radar-title">Scorecard <em>shape</em></h2></div>
      <p className="panel-note">Each metric as a percent of its maximum points under this lens. Further from the centre is stronger.</p>
      <div className="cmp2-radar" role="img" aria-label={`Radar chart of scorecard metrics. ${summary}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="58%">
            <PolarGrid stroke="var(--border-color-hover)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {items.map(({ ticker, index }) => (
              <Radar key={ticker} name={ticker} dataKey={ticker} stroke={SERIES[index % 4].color} strokeWidth={active === ticker ? 3 : 2} strokeOpacity={dimOf(active, ticker)} strokeDasharray={SERIES[index % 4].dash} fill={SERIES[index % 4].color} fillOpacity={active === ticker ? 0.2 : active ? 0.01 : 0.06} isAnimationActive animationDuration={900} animationEasing="ease-out" />
            ))}
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [Number.isFinite(v) ? `${v}%` : 'n/a', n]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend tickers={items} active={active} />
    </section>
  );
}

const dateLabel = (iso, period) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return period === '6mo'
    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// Every ticker rebased to 100 at the first date they all have a price for.
export function ComparePerformance({ items, active, index = '04' }) {
  const [period, setPeriod] = useState('1y');
  const [state, setState] = useState({ status: 'loading', series: {} });
  const key = items.map((i) => i.ticker).join(',');

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, status: 'loading' }));
    Promise.all(
      key.split(',').map((t) =>
        cached(`history:${t}:${period}`, () => getPriceHistory(t, period), 10 * 60 * 1000)
          .then((res) => [t, (res.history || []).filter((p) => Number.isFinite(p.close) && p.date)])
          .catch(() => [t, null])
      )
    ).then((pairs) => alive && setState({ status: 'ok', series: Object.fromEntries(pairs) }));
    return () => {
      alive = false;
    };
  }, [key, period]);

  const { data, failed, final } = useMemo(() => {
    const ok = Object.entries(state.series).filter(([, pts]) => pts && pts.length > 1);
    const failedT = Object.entries(state.series).filter(([, pts]) => !pts || pts.length < 2).map(([t]) => t);
    if (ok.length === 0) return { data: [], failed: failedT, final: {} };
    const start = ok.map(([, pts]) => pts[0].date).sort().pop();
    const byDate = new Map();
    const finals = {};
    ok.forEach(([t, pts]) => {
      const inRange = pts.filter((p) => p.date >= start);
      if (inRange.length < 2) return;
      const base = inRange[0].close;
      inRange.forEach((p) => {
        if (!byDate.has(p.date)) byDate.set(p.date, { date: p.date });
        byDate.get(p.date)[t] = +((p.close / base) * 100).toFixed(2);
      });
      finals[t] = inRange[inRange.length - 1].close / base * 100 - 100;
    });
    return { data: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), failed: failedT, final: finals };
  }, [state.series]);

  const summary = Object.entries(final).map(([t, v]) => `${t} ${v >= 0 ? 'up' : 'down'} ${Math.abs(v).toFixed(1)} percent`).join(', ');

  return (
    <section className="cmp2-panel" aria-labelledby="cmp-perf-title">
      <div className="cmp2-panel-head">
        <div>
          <div className="section-head"><span className="eyebrow">{index}</span><h2 id="cmp-perf-title">Price <em>performance</em></h2></div>
          <p className="panel-note">Each price rebased to 100 at the start of the period, so the lines show relative change.</p>
        </div>
        <SegmentedControl id="cmp-period" label="Period" options={PERIODS} value={period} onChange={setPeriod} />
      </div>
      {state.status === 'loading' && data.length === 0 ? (
        <div className="skel cmp2-chart-skel" aria-hidden="true" />
      ) : data.length === 0 ? (
        <p className="muted">No price history is available for these tickers.</p>
      ) : (
        <div className="cmp2-perf" role="img" aria-label={`Price performance rebased to 100 over the selected period: ${summary}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={tick} tickFormatter={(v) => dateLabel(v, period)} axisLine={false} tickLine={false} minTickGap={48} />
              <YAxis tick={tick} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={44} tickFormatter={(v) => Math.round(v)} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) => new Date(`${v}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                itemSorter={(item) => -(item.value ?? 0)}
                formatter={(v, n) => [Number.isFinite(v) ? v.toFixed(1) : 'n/a', n]}
              />
              {items.map(({ ticker, index }) =>
                final[ticker] === undefined ? null : (
                  <Line key={ticker} type="monotone" dataKey={ticker} stroke={SERIES[index % 4].color} strokeWidth={active === ticker ? 3.2 : 2} strokeOpacity={dimOf(active, ticker)} strokeDasharray={SERIES[index % 4].dash} dot={false} connectNulls isAnimationActive animationDuration={900} animationEasing="ease-out" />
                )
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <ChartLegend tickers={items.filter((i) => final[i.ticker] !== undefined)} active={active} />
      {failed.length > 0 && state.status === 'ok' && <p className="muted cmp2-note">No price history for {failed.join(', ')}.</p>}
    </section>
  );
}
