import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useLenis } from 'lenis/react';
import { Sparkles } from 'lucide-react';
import { getMetricExplanations } from '../api/client';
import { cached } from '../api/cache';
import { formatMoney } from './home/LensVerdictCard';
import { isScored } from './home/lenses';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const navHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 64;

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
  if (!isScored(m)) {
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

function AiLine({ status, text }) {
  if (status === 'loading') return <span className="skel deck-skel" aria-hidden="true" />;
  if (status === 'ok' && text) return <p>{text}</p>;
  return null;
}

// The analysis as a stack of sticky cards, like the lens stack on the home page:
// the overall reading first, then one card per metric. Scrolling slides each card over
// the last, which recedes. Under reduced motion the cards simply sit one after another.
const MetricDeck = ({ data, ticker, investor, horizon }) => {
  const metrics = data.scorecard?.metrics || [];
  const lensLabel = data.scorecard?.investor_label || 'Warren Buffett';
  const slides = ['overview', ...metrics.map((m) => m.name)];
  const [index, setIndex] = useState(0);
  const [ai, setAi] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const root = useRef(null);
  const stack = useRef(null);
  const bar = useRef(null);
  const lenis = useLenis();

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

  // Where card i sits in normal flow. Sticky cards report their stuck position, so this is
  // summed from the (non-sticky) stack container instead.
  const naturalTop = (i) => {
    const el = stack.current;
    const cards = el.children;
    const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
    let y = window.scrollY + el.getBoundingClientRect().top;
    for (let k = 0; k < i; k++) y += cards[k].offsetHeight + gap;
    return y;
  };

  // Each card sticks just under the progress bar, stepped down a little per card. A card
  // taller than the space left sticks higher (negative top), so its bottom edge is read
  // before the next card covers it.
  const stickyTop = (i) => {
    const card = stack.current.children[i];
    const base = navHeight() + (bar.current?.offsetHeight || 0) + 12 + i * 10;
    return Math.min(base, window.innerHeight - card.offsetHeight - 16);
  };

  useGSAP(
    () => {
      const cards = gsap.utils.toArray(stack.current.children);
      const placeCards = () => cards.forEach((c, i) => (c.style.top = `${stickyTop(i)}px`));
      placeCards();
      ScrollTrigger.addEventListener('refreshInit', placeCards);

      // Which card is in front, for the progress bar.
      cards.forEach((_, i) =>
        ScrollTrigger.create({
          start: () => naturalTop(i) - window.innerHeight * 0.55,
          end: () => (i + 1 < cards.length ? naturalTop(i + 1) - window.innerHeight * 0.55 : naturalTop(i) + cards[i].offsetHeight),
          onToggle: (self) => self.isActive && setIndex(i),
        })
      );

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        cards.forEach((card, i) => {
          if (!cards[i + 1]) return;
          gsap.fromTo(
            card,
            { scale: 1, filter: 'brightness(1)' },
            {
              scale: 0.94,
              filter: 'brightness(0.55)',
              ease: 'none',
              scrollTrigger: {
                start: () => naturalTop(i + 1) - window.innerHeight,
                end: () => naturalTop(i + 1) - stickyTop(i + 1),
                scrub: true,
              },
            }
          );
        });
      });

      // Gemini text arriving changes card heights; re-measure everything.
      const ro = new ResizeObserver(() => ScrollTrigger.refresh());
      cards.forEach((c) => ro.observe(c));

      return () => {
        ro.disconnect();
        ScrollTrigger.removeEventListener('refreshInit', placeCards);
        mm.revert();
      };
    },
    { scope: root, dependencies: [ticker, investor, horizon, slides.length], revertOnUpdate: true }
  );

  const go = (i) => {
    const y = naturalTop(i) - stickyTop(i);
    if (lenis) lenis.scrollTo(y, { duration: 1 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const aiFor = (name) => ai.metrics?.find((m) => m.name === name);
  const verdict = data.classification_label || data.classification;
  const margin = data.margin;

  const renderCard = (i) => {
    if (i === 0) {
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
          <p className="deck-hint">Scroll to go through each of the {metrics.length} metrics behind this score.</p>
          <AiStatus ai={ai} onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      );
    }

    const m = metrics[i - 1];
    const explained = aiFor(m.name);
    const scored = isScored(m);
    return (
      <div className="deck-slide">
        <p className="deck-kicker">
          Metric {i} of {metrics.length}
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
                  : m.max > 0
                    ? 'With no data to score, it is left out and the remaining metrics carry the score.'
                    : 'This lens gives it no weight for this company.'}
              </p>
            )}
          </section>
        </div>
      </div>
    );
  };

  return (
    <section ref={root} className="deck" aria-label={`${ticker} analysis, explained`}>
      <nav ref={bar} className="deck-bar" aria-label="Jump to a card">
        <div className="deck-progress">
          {slides.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-current={i === index ? 'step' : undefined}
              aria-label={i === 0 ? 'Overall reading' : s}
              title={i === 0 ? 'Overall reading' : s}
              className={`deck-step${i <= index ? ' is-done' : ''}${i === index ? ' is-current' : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <span className="deck-bar-label">
          <span className="deck-bar-name">{index === 0 ? 'Overall reading' : slides[index]}</span>
          <span className="mono deck-count">
            {index + 1}/{slides.length}
          </span>
        </span>
      </nav>

      <div ref={stack} className="deck-cards">
        {slides.map((s, i) => (
          <article key={s} className="deck-card">
            {renderCard(i)}
          </article>
        ))}
      </div>
    </section>
  );
};

function AiStatus({ ai, onRetry }) {
  if (ai.status === 'ok') {
    return (
      <p className="deck-ai-status muted">
        <Sparkles size={14} aria-hidden="true" /> Explanations written by Gemini from the figures shown.
      </p>
    );
  }
  if (ai.status !== 'error') return null;
  return (
    <p className="deck-ai-status">
      {ai.noKey ? (
        <>
          <Sparkles size={14} aria-hidden="true" /> Add a Gemini API key in <Link to="/settings">Settings</Link> for a written explanation of each metric.
        </>
      ) : (
        <>
          {ai.message}{' '}
          <button type="button" className="btn-quiet" onClick={onRetry}>
            Try again
          </button>
        </>
      )}
    </p>
  );
}

export default MetricDeck;
