import React, { useEffect, useId, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPriceHistory } from '../../api/client';
import { cached } from '../../api/cache';
import SegmentedControl from '../SegmentedControl';
import { finite, money, signedPct, toneOf } from './format';

const PERIODS = [
  { value: '1mo', label: '1M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
  { value: 'max', label: 'Max' },
];

const dateLabel = (iso, period) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (period === '1mo' || period === '6mo') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (period === '1y') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return String(d.getFullYear());
};

const fullDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// The floating readout that follows the pointer along the crosshair.
function ChartTooltip({ active, payload, first }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const since = finite(first) && first > 0 ? ((point.close - first) / first) * 100 : null;
  return (
    <div className="an-tooltip">
      <span className="an-tooltip-date">{fullDate(point.date)}</span>
      <span className="mono an-tooltip-value">{money(point.close)}</span>
      {since !== null && <span className={`mono an-tooltip-since tone-${toneOf(since)}`}>{signedPct(since)} over the period</span>}
    </div>
  );
}

// "Fair value $34" tag sitting on the dashed line at the right edge of the plot.
function FairTag({ viewBox, text }) {
  if (!viewBox) return null;
  const x = viewBox.x + viewBox.width;
  const w = text.length * 6.6 + 14;
  return (
    <g className="an-fair-tag" aria-hidden="true">
      <rect x={x - w} y={viewBox.y - 22} width={w} height={18} rx={9} />
      <text x={x - w / 2} y={viewBox.y - 9} textAnchor="middle">{text}</text>
    </g>
  );
}

// Price history with a period switch. Fair value (and the bear to bull band) is drawn only
// when it sits within the range of the chart; otherwise it would flatten the price line.
const PriceChart = ({ ticker, fairValue, bear, bull }) => {
  const [period, setPeriod] = useState('1y');
  const [state, setState] = useState({ status: 'loading', rows: [] });
  const [attempt, setAttempt] = useState(0);
  const [hover, setHover] = useState(null);
  const gradId = `an-price-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    let alive = true;
    setHover(null);
    setState((s) => ({ status: 'loading', rows: s.rows }));
    cached(`history:${ticker}:${period}`, () => getPriceHistory(ticker, period), 10 * 60 * 1000)
      .then((r) => {
        if (!alive) return;
        const rows = (r.history || []).filter((p) => finite(p.close));
        setState({ status: rows.length >= 2 ? 'ok' : 'empty', rows });
      })
      .catch((e) => alive && setState({ status: 'error', rows: [], message: e.message }));
    return () => {
      alive = false;
    };
  }, [ticker, period, attempt]);

  const { rows, status } = state;
  const stats = useMemo(() => {
    if (rows.length < 2) return null;
    const closes = rows.map((r) => r.close);
    const first = closes[0];
    const last = closes[closes.length - 1];
    return { first, last, low: Math.min(...closes), high: Math.max(...closes), change: ((last - first) / first) * 100 };
  }, [rows]);

  const showFair = stats && finite(fairValue) && fairValue > 0 && fairValue >= stats.low * 0.7 && fairValue <= stats.high * 1.4;
  const showBand = showFair && finite(bear) && finite(bull) && bear > 0 && bull > bear && bear >= stats.low * 0.7 && bull <= stats.high * 1.4;
  // Green while the price sits below the model's fair value, red above it.
  const tint = !showFair ? 'var(--text-heading)' : stats.last <= fairValue ? 'var(--color-success)' : 'var(--color-danger)';
  const fairOffChart = stats && finite(fairValue) && fairValue > 0 && !showFair;

  const domain = useMemo(() => {
    if (!stats) return ['auto', 'auto'];
    let lo = stats.low;
    let hi = stats.high;
    if (showFair) {
      lo = Math.min(lo, showBand ? bear : fairValue);
      hi = Math.max(hi, showBand ? bull : fairValue);
    }
    const pad = (hi - lo) * 0.06 || hi * 0.02;
    return [Math.max(0, lo - pad), hi + pad];
  }, [stats, showFair, showBand, fairValue, bear, bull]);

  const summary = stats
    ? `Price of ${ticker} over the selected period. From ${money(stats.first)} on ${fullDate(rows[0].date)} to ${money(stats.last)} on ${fullDate(rows[rows.length - 1].date)}, a change of ${signedPct(stats.change)}. Low ${money(stats.low)}, high ${money(stats.high)}.`
    : `Price chart for ${ticker}`;

  return (
    <div className="an-chart-block">
      <div className="an-chart-head">
        <div className="an-chart-change">
          {stats ? (
            <>
              <span className={`mono an-chart-pct tone-${toneOf(stats.change)}`}>{signedPct(stats.change)}</span>
              <span className="muted an-chart-range mono">
                {hover ? `${fullDate(hover.date)}, ${money(hover.close)}` : `${money(stats.first)} to ${money(stats.last)}`}
              </span>
            </>
          ) : (
            <span className="muted an-chart-range">Price history</span>
          )}
        </div>
        <SegmentedControl id="period" label="Price period" options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="an-chart" role="img" aria-label={summary} aria-busy={status === 'loading'}>
        {status === 'error' ? (
          <div className="an-chart-msg">
            <p className="inline-error">Could not load price history. {state.message}</p>
            <button type="button" className="btn-quiet" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </div>
        ) : status === 'empty' ? (
          <div className="an-chart-msg">
            <p className="muted">No price history is available for this period.</p>
          </div>
        ) : rows.length === 0 ? (
          <span className="skel an-chart-skel" aria-hidden="true" />
        ) : (
          <div className={`an-chart-fill${status === 'loading' ? ' is-stale' : ''}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rows}
                margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
                onMouseMove={(e) => setHover(e?.activePayload?.[0]?.payload || null)}
                onMouseLeave={() => setHover(null)}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tint} stopOpacity={0.34} />
                    <stop offset="100%" stopColor={tint} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => dateLabel(d, period)}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={48}
                  interval="preserveStartEnd"
                />
                <YAxis
                  orientation="right"
                  domain={domain}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => `$${v >= 100 ? Math.round(v) : v.toFixed(0)}`}
                  allowDataOverflow
                />
                <Tooltip content={<ChartTooltip first={stats?.first} />} cursor={{ stroke: 'var(--text-secondary)', strokeWidth: 1, strokeDasharray: '2 3' }} isAnimationActive={false} offset={16} />
                {showBand && <ReferenceArea y1={bear} y2={bull} fill="var(--color-gold)" fillOpacity={0.1} stroke="none" ifOverflow="hidden" />}
                {showFair && (
                  <ReferenceLine y={fairValue} stroke="var(--color-gold)" strokeDasharray="5 4" ifOverflow="hidden" label={<FairTag text={`Fair value ${money(fairValue)}`} />} />
                )}
                {hover && <ReferenceLine y={hover.close} stroke="var(--text-secondary)" strokeDasharray="2 3" strokeOpacity={0.7} ifOverflow="hidden" />}
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={tint}
                  strokeWidth={2}
                  fill={`url(#${gradId})`}
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--bg-surface-solid)', stroke: tint, strokeWidth: 2 }}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="an-chart-foot muted" aria-live="polite">
        {status === 'ok' && showFair && (
          <>
            Dashed line: model fair value{showBand ? ', shaded band: cautious to optimistic case' : ''}.
          </>
        )}
        {status === 'ok' && fairOffChart && <>Model fair value ({money(fairValue)}) is outside this price range, so it is not drawn.</>}
      </p>
    </div>
  );
};

export default PriceChart;
