import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ArrowUpRight, Check, Minus, X } from 'lucide-react';
import { getStockAnalysis } from '../../api/client';
import { cached } from '../../api/cache';
import { LENSES, isScored } from './lenses';

export const TICKER = 'KO';
const ease = [0.22, 1, 0.36, 1];

export const analysisKey = (ticker, lens) => `analysis:${ticker}:${lens}:long`;

// Yahoo lists some names as "Coca-Cola Company (The)".
export const displayName = (name = '') => name.replace(/^(.*) \(The\)$/, 'The $1');

const VERDICT_TONE = { Buy: 'pos', Avoid: 'neg' };

export const formatMoney = (v) =>
  Number.isFinite(v) ? v.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'n/a';

// Two strongest scored metrics and the weakest one, as one-line reasons.
function pickReasons(metrics = []) {
  const scored = metrics
    .filter(isScored)
    .map((m) => ({ ...m, ratio: m.score / m.max }))
    .sort((a, b) => b.ratio - a.ratio);
  if (scored.length < 3) return scored;
  return [scored[0], scored[1], scored[scored.length - 1]];
}

function reasonTone(ratio) {
  if (ratio >= 0.7) return 'pos';
  if (ratio < 0.4) return 'neg';
  return 'mid';
}

const REASON_ICON = { pos: Check, neg: X, mid: Minus };

function CountUp({ value }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration: reduce ? 0 : 0.7, ease });
    return () => controls.stop();
  }, [mv, value, reduce]);
  return <motion.span>{rounded}</motion.span>;
}

function Skeleton() {
  return (
    <div className="verdict-body" aria-hidden="true">
      <div className="skel skel-lg" />
      <div className="skel skel-md" />
      <div className="skel skel-row" />
      <div className="skel skel-row" />
      <div className="skel skel-row" />
    </div>
  );
}

// Controlled by the home page so the hero headline can follow the selected lens.
const LensVerdictCard = ({ lens, onSelect, onPause, onResume }) => {
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (results[lens]) return;
    let alive = true;
    setError(null);
    cached(analysisKey(TICKER, lens), () => getStockAnalysis(TICKER, lens, 'long'))
      .then((data) => alive && setResults((r) => ({ ...r, [lens]: data })))
      .catch((err) => alive && setError(err.message || 'Request failed'));
    return () => {
      alive = false;
    };
  }, [lens, attempt, results]);

  // While a new lens loads, keep showing the last result (dimmed) instead of flashing a skeleton.
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (results[lens]) setShown({ lens, data: results[lens] });
  }, [lens, results]);

  const loading = !results[lens] && !error;
  const data = shown?.data;
  const stock = data?.stock_data;
  const price = data?.margin?.current_price ?? stock?.current_price;
  const fair = data?.margin?.intrinsic_value ?? data?.dcf?.intrinsic_value;
  const marginPct = data?.margin?.margin_pct;
  const verdict = data?.classification_label || data?.classification;
  const reasons = pickReasons(data?.scorecard?.metrics);

  // Price and fair value on one axis from 0, with the gap between them shaded.
  const axisMax = (Math.max(price || 0, fair || 0) || 1) * 1.12;
  const fairPos = ((fair || 0) / axisMax) * 100;
  const pricePos = ((price || 0) / axisMax) * 100;
  const gapStart = Math.min(fairPos, pricePos);
  const gapWidth = Math.abs(fairPos - pricePos) / 100;

  return (
    <section
      className="verdict"
      aria-label={`${TICKER} verdict by investor lens`}
      onPointerEnter={onPause}
      onPointerLeave={onResume}
      onFocus={onPause}
    >
      <header className="verdict-head">
        <div>
          <div className="verdict-ticker">
            <span className="mono">{TICKER}</span>
            <span className="verdict-company">{displayName(stock?.company_name) || 'The Coca-Cola Company'}</span>
          </div>
          <div className="verdict-live">
            <span className="live-dot" /> Live data · long-term horizon
          </div>
        </div>
        <div className="verdict-price mono">{price ? formatMoney(price) : ''}</div>
      </header>

      <div className="lens-tabs" role="tablist" aria-label="Investor lens">
        {LENSES.map((l) => {
          const active = l.value === lens;
          return (
            <button
              key={l.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`lens-tab${active ? ' is-active' : ''}`}
              onClick={() => onSelect(l.value)}
            >
              {active && <motion.span layoutId="lens-tab-thumb" className="lens-tab-thumb" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <span className="lens-tab-text">{l.short}</span>
            </button>
          );
        })}
      </div>

      {error && !data ? (
        <div className="verdict-error">
          <p>Live data is unavailable right now. The server may be waking up.</p>
          <button type="button" className="btn-quiet" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <Skeleton />
      ) : (
        <div className={`verdict-body${loading || error ? ' is-stale' : ''}`} aria-busy={loading}>
          {error && (
            <p className="verdict-inline-error">
              Couldn't load this lens.{' '}
              <button type="button" className="btn-quiet" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
            </p>
          )}
          <div className="verdict-top">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={shown.lens + verdict}
                className="verdict-word-wrap"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease }}
              >
                <div className={`verdict-word tone-${VERDICT_TONE[verdict] || 'mid'}`}>{verdict}</div>
                <div className="verdict-why">{data.classification_explanation}</div>
              </motion.div>
            </AnimatePresence>
            <div className="verdict-score">
              <div className="verdict-score-num mono">
                <CountUp value={Math.round(data.scorecard?.total_score ?? 0)} />
                <span className="verdict-score-of">/100</span>
              </div>
              <div className="verdict-grade">Grade {data.scorecard?.grade}</div>
            </div>
          </div>

          <dl className="verdict-values">
            <div>
              <dt>Fair value</dt>
              <dd className="mono">{formatMoney(fair)}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd className="mono">{formatMoney(price)}</dd>
            </div>
            <div>
              <dt>Margin of safety</dt>
              <dd className={`mono tone-${marginPct >= 0 ? 'pos' : 'neg'}`}>
                {Number.isFinite(marginPct) ? `${marginPct > 0 ? '+' : ''}${marginPct.toFixed(1)}%` : 'n/a'}
              </dd>
            </div>
          </dl>

          <div className="value-line" aria-hidden="true">
            <span
              className={`value-line-gap tone-bg-${marginPct >= 0 ? 'pos' : 'neg'}`}
              style={{ transform: `translateX(${gapStart}%) scaleX(${gapWidth})` }}
            />
            <span className="value-line-mark is-fair" style={{ transform: `translateX(${fairPos}%)` }}>
              <span className="value-line-label">Fair</span>
            </span>
            <span className="value-line-mark is-price" style={{ transform: `translateX(${pricePos}%)` }}>
              <span className="value-line-label">Price</span>
            </span>
          </div>

          <ul className="verdict-reasons">
            {reasons.map((m) => {
              const tone = reasonTone(m.ratio);
              const Icon = REASON_ICON[tone];
              return (
                <li key={m.name}>
                  <Icon size={14} className={`tone-${tone}`} aria-hidden="true" />
                  <span>{m.name}</span>
                  <span className="mono verdict-reason-val">{m.value}</span>
                </li>
              );
            })}
          </ul>

          <Link to={`/stock/${TICKER}?investor=${shown.lens}&horizon=long`} className="verdict-link">
            Full {LENSES.find((l) => l.value === shown.lens)?.short} analysis <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </section>
  );
};

export default LensVerdictCard;
