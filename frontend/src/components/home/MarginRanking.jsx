import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { displayName, formatMoney } from './LensVerdictCard';
import { TRACKED, useTrackedRanking } from './useTracked';

const ease = [0.16, 1, 0.3, 1];
// Bars run from a zero line; margins beyond ±100% are drawn at full length.
const CLAMP = 100;

function CountUpPct({ value, start, delay }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);
  useEffect(() => {
    if (!start) return;
    const c = animate(mv, value, { duration: reduce ? 0 : 1.1, delay, ease });
    return () => c.stop();
  }, [start, value, delay, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}

function MarginBar({ value, start, delay }) {
  const reduce = useReducedMotion();
  const frac = Math.min(Math.abs(value), CLAMP) / CLAMP;
  const pos = value >= 0;
  const shown = start || reduce;
  return (
    <span className={`mbar${Math.abs(value) > CLAMP ? ' is-clamped' : ''}`} aria-hidden="true">
      <motion.span
        className={`mbar-fill ${pos ? 'is-pos' : 'is-neg'}`}
        style={{ width: `${frac * 50}%`, [pos ? 'left' : 'right']: '50%', originX: pos ? 0 : 1 }}
        initial={{ scaleX: reduce ? 1 : 0 }}
        animate={{ scaleX: shown ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.9, delay, ease }}
      />
    </span>
  );
}

const MarginRanking = () => {
  const rows = useTrackedRanking();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const failed = rows && rows.length === 0;

  return (
    <section className="home-section" aria-labelledby="ranking-title">
      <div className="section-head">
        <h2 id="ranking-title">Ranked by margin of safety</h2>
        <p className="section-sub">
          Six large caps through the Buffett lens, live. Bars left of the line mean the price is above our fair value estimate.
        </p>
      </div>

      <div className="ranking" ref={ref}>
        <div className="ranking-row ranking-header" aria-hidden="true">
          <span>#</span>
          <span>Company</span>
          <span className="num">Price</span>
          <span className="num hide-sm">Fair value</span>
          <span className="hide-sm mbar-head">
            <span>Overpriced</span>
            <span>Discount</span>
          </span>
          <span className="num">Margin</span>
          <span className="hide-sm">Verdict</span>
          <span />
        </div>

        {rows === null &&
          TRACKED.map((t) => (
            <div key={t} className="ranking-row is-loading" aria-hidden="true">
              <span className="skel skel-cell" />
              <span className="skel skel-cell wide" />
              <span className="skel skel-cell" />
              <span className="skel skel-cell hide-sm" />
              <span className="skel skel-cell hide-sm" />
              <span className="skel skel-cell" />
              <span className="skel skel-cell hide-sm" />
              <span />
            </div>
          ))}

        {failed && <p className="ranking-empty">Live data is unavailable right now. Try again in a minute.</p>}

        {rows?.map((d, i) => {
          const m = d.margin.margin_pct;
          const delay = i * 0.07;
          const name = displayName(d.stock_data.company_name);
          const verdict = d.classification_label || d.classification;
          return (
            <Link
              key={d.stock_data.ticker}
              to={`/stock/${d.stock_data.ticker}`}
              className="ranking-row"
              aria-label={`${i + 1}. ${name}, margin of safety ${m.toFixed(1)} percent, ${verdict}`}
            >
              <span className="mono muted">{i + 1}</span>
              <span className="ranking-company">
                <span className="mono ranking-ticker">{d.stock_data.ticker}</span>
                <span className="ranking-name">{name}</span>
              </span>
              <span className="mono num">{formatMoney(d.margin.current_price)}</span>
              <span className="mono num hide-sm">{formatMoney(d.margin.intrinsic_value)}</span>
              <span className="hide-sm">
                <MarginBar value={m} start={inView} delay={delay} />
              </span>
              <span className={`mono num tone-${m >= 0 ? 'pos' : 'neg'}`}>
                <CountUpPct value={m} start={inView} delay={delay} />
              </span>
              <span className="hide-sm ranking-verdict">{verdict}</span>
              <ChevronRight size={16} className="muted" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default MarginRanking;
