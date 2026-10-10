import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { getMetricExplanations } from '../api/client';
import { cached } from '../api/cache';
import { formatMoney } from './home/LensVerdictCard';

// What each metric measures, written from the formulas in backend/services/scorecard.py.
const MEASURES = {
  'Earnings Consistency': () => 'The share of years in which earnings per share grew over the year before.',
  ROIC: () =>
    'Return on invested capital: after-tax operating profit divided by the money tied up in the business (debt plus equity, minus cash). It shows how much profit each invested dollar earns.',
  'FCF Growth': (h) =>
    h === 'short'
      ? 'How much free cash flow (operating cash flow minus capital spending) changed in the latest year.'
      : 'The yearly growth rate of free cash flow (operating cash flow minus capital spending) over five years.',
  'Profit Margin': () => 'Net income as a share of revenue: how much of each sales dollar ends up as profit.',
  ROE: () => "Return on equity: net income divided by shareholders' equity, the return earned on the owners' money.",
  'Debt-to-Equity': () =>
    "Total debt divided by shareholders' equity. Higher means the business relies more on borrowed money than on its owners' capital.",
  'Interest Coverage': () =>
    'Operating profit (EBIT) divided by interest expense: how many times over the company could pay its interest bill.',
  'Revenue Growth': (h) =>
    h === 'short' ? 'How much revenue changed in the latest year.' : 'The yearly growth rate of revenue over five years.',
};

const VERDICT_TONE = { Buy: 'pos', Avoid: 'neg' };

// Without Gemini, describe the score from the numbers alone.
function plainReading(ticker, m) {
  if (!(m.max > 0) || m.value === 'N/A' || m.value == null) {
    return `Yahoo Finance doesn't report the inputs for this metric for ${ticker}, so it isn't scored here.`;
  }
  const ratio = m.score / m.max;
  const band = ratio >= 0.8 ? 'a strong result' : ratio >= 0.5 ? 'a middling result' : 'a weak result';
  return `${ticker} comes in at ${m.value}, earning ${m.score.toFixed(1)} of ${m.max.toFixed(1)} possible points (${Math.round(ratio * 100)}%), ${band}.`;
}

function weightShare(metrics, m) {
  const total = metrics.reduce((s, x) => s + (x.max || 0), 0) || 1;
  return Math.round(((m.max || 0) / total) * 100);
}

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

function AiLine({ status, text }) {
  if (status === 'loading') return <span className="skel deck-skel" aria-hidden="true" />;
  if (status === 'ok' && text) return <p>{text}</p>;
  return null;
}

// Swipeable walkthrough of an analysis: the overall reading first, then one slide per metric.
const MetricDeck = ({ data, ticker, investor, horizon }) => {
  const reduce = useReducedMotion();
  const metrics = data.scorecard?.metrics || [];
  const lensLabel = data.scorecard?.investor_label || 'Warren Buffett';
  const slides = ['overview', ...metrics.map((m) => m.name)];
  const [[index, dir], setPage] = useState([0, 0]);
  const [ai, setAi] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setPage([0, 0]), [ticker, investor, horizon]);

  useEffect(() => {
    let alive = true;
    let hasKey = false;
    try {
      hasKey = !!localStorage.getItem('gemini_api_key');
    } catch {
      // storage unavailable: let the server decide (it may have its own key)
    }
    setAi({ status: 'loading' });
    cached(`explain:${ticker}:${investor}:${horizon}`, () =>
      getMetricExplanations(ticker, investor, horizon).then((r) => {
        if (r.error) throw new Error(r.error);
        return r;
      })
    )
      .then((r) => alive && setAi({ status: 'ok', ...r }))
      .catch((e) => alive && setAi({ status: 'error', message: e.message, noKey: !hasKey && /No Gemini API key/i.test(e.message) }));
    return () => {
      alive = false;
    };
  }, [ticker, investor, horizon, attempt]);

  const go = (to) => {
    const next = Math.max(0, Math.min(slides.length - 1, to));
    if (next !== index) setPage([next, next > index ? 1 : -1]);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(index - 1);
    }
  };

  const onDragEnd = (_, info) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -60) go(index + 1);
    else if (swipe > 60) go(index - 1);
  };

  const aiFor = (name) => ai.metrics?.find((m) => m.name === name);
  const verdict = data.classification_label || data.classification;
  const margin = data.margin;

  const renderSlide = () => {
    if (index === 0) {
      return (
        <div className="deck-slide">
          <p className="deck-kicker">The reading, through the {lensLabel} lens</p>
          <div className="deck-overview">
            <div>
              <div className={`deck-verdict tone-${VERDICT_TONE[verdict] || 'mid'}`}>{verdict}</div>
              <p className="deck-sub">{data.classification_explanation}</p>
            </div>
            <div className="deck-score">
              <span className="mono deck-score-num">{Math.round(data.scorecard?.total_score ?? 0)}</span>
              <span className="deck-score-of">/100, grade {data.scorecard?.grade}</span>
            </div>
          </div>
          {margin && (
            <dl className="deck-facts">
              <div>
                <dt>Fair value</dt>
                <dd className="mono">{formatMoney(margin.intrinsic_value)}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd className="mono">{formatMoney(margin.current_price)}</dd>
              </div>
              <div>
                <dt>Margin of safety</dt>
                <dd className={`mono tone-${margin.margin_pct >= 0 ? 'pos' : 'neg'}`}>
                  {margin.margin_pct > 0 ? '+' : ''}
                  {margin.margin_pct.toFixed(1)}%
                </dd>
              </div>
            </dl>
          )}
          <div className="deck-ai">
            <AiLine status={ai.status} text={ai.overview} />
          </div>
          <p className="deck-hint">Swipe or use the arrows to go through each of the {metrics.length} metrics behind this score.</p>
        </div>
      );
    }

    const m = metrics[index - 1];
    const explained = aiFor(m.name);
    const scored = m.max > 0;
    return (
      <div className="deck-slide">
        <p className="deck-kicker">
          Metric {index} of {metrics.length}
        </p>
        <h3 className="deck-title">{m.name}</h3>
        <div className="deck-metric-head">
          <span className="mono deck-value">{m.value ?? 'N/A'}</span>
          <span className="deck-points">
            {scored ? (
              <>
                <span className="mono">{m.score.toFixed(1)}</span> of <span className="mono">{m.max.toFixed(1)}</span> points
                <span className="muted"> ({weightShare(metrics, m)}% of the {lensLabel} score)</span>
              </>
            ) : (
              'Not scored'
            )}
          </span>
        </div>

        <div className="deck-sections">
          <section>
            <h4>What it measures</h4>
            <p>{(MEASURES[m.name] || (() => m.details))(horizon)}</p>
          </section>
          <section>
            <h4>What {ticker}'s number says</h4>
            {ai.status === 'ok' && explained?.reading ? <p>{explained.reading}</p> : ai.status === 'loading' ? <AiLine status="loading" /> : <p>{plainReading(ticker, m)}</p>}
          </section>
          <section>
            <h4>Why it matters to {lensLabel}</h4>
            {ai.status === 'ok' && explained?.why_it_matters ? (
              <p>{explained.why_it_matters}</p>
            ) : ai.status === 'loading' ? (
              <AiLine status="loading" />
            ) : (
              <p>
                {scored
                  ? `It carries ${weightShare(metrics, m)}% of the weight in this lens, after adjusting for the ${data.scorecard?.sector_label || 'company'} sector.`
                  : 'This lens gives it no weight for this company.'}
              </p>
            )}
          </section>
        </div>
      </div>
    );
  };

  return (
    <section className="deck" aria-roledescription="carousel" aria-label={`${ticker} analysis, explained`}>
      <div className="deck-progress" role="tablist" aria-label="Slides">
        {slides.map((s, i) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={i === 0 ? 'Overall reading' : s}
            title={i === 0 ? 'Overall reading' : s}
            className={`deck-step${i <= index ? ' is-done' : ''}${i === index ? ' is-current' : ''}`}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div className="deck-viewport" tabIndex={0} onKeyDown={onKeyDown} aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduce ? { duration: 0 } : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            drag={reduce ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
            className="deck-drag"
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="deck-footer">
        <div className="deck-ai-status">
          {ai.status === 'error' &&
            (ai.noKey ? (
              <span>
                <Sparkles size={14} aria-hidden="true" /> Add a Gemini API key in <Link to="/settings">Settings</Link> for a written explanation of each metric.
              </span>
            ) : (
              <span>
                {ai.message}{' '}
                <button type="button" className="btn-quiet" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </button>
              </span>
            ))}
          {ai.status === 'ok' && (
            <span className="muted">
              <Sparkles size={14} aria-hidden="true" /> Explanations written by Gemini from the figures shown.
            </span>
          )}
        </div>
        <div className="deck-nav">
          <button type="button" className="deck-arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
            <ArrowLeft size={18} />
          </button>
          <span className="mono deck-count">
            {index + 1}/{slides.length}
          </span>
          <button
            type="button"
            className="deck-arrow"
            onClick={() => go(index + 1)}
            disabled={index === slides.length - 1}
            aria-label="Next slide"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </footer>
    </section>
  );
};

export default MetricDeck;
