import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { getStockAnalysis } from '../../api/client';
import { cached } from '../../api/cache';
import { analysisKey, formatMoney } from './LensVerdictCard';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TICKER = 'KO';
// Keep in sync with the `.walk` media query in index.css.
const PINNED_QUERY = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

const pct = (v, digits = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : 'n/a');

// Scroll-scrubbed walkthrough of how the KO verdict is produced, using the live Buffett-lens analysis.
// GSAP only (no Motion in this tree). Pinned on wide screens; a plain stacked layout otherwise.
const VerdictWalkthrough = () => {
  const root = useRef(null);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    cached(analysisKey(TICKER, 'buffett'), () => getStockAnalysis(TICKER, 'buffett', 'long'))
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // Content above this section loads asynchronously; re-measure trigger positions when it settles.
  useEffect(() => {
    if (!data || !root.current) return;
    const above = [];
    for (let el = root.current.previousElementSibling; el; el = el.previousElementSibling) above.push(el);
    let timer;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    above.forEach((el) => ro.observe(el));
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [data]);

  useGSAP(
    () => {
      if (!data) return;
      const mm = gsap.matchMedia();
      mm.add(PINNED_QUERY, () => {
        const frames = gsap.utils.toArray('.walk-frame');
        const marks = gsap.utils.toArray('.walk-index li');
        gsap.set(frames.slice(1), { autoAlpha: 0, y: 32 });
        gsap.set(marks.slice(1), { opacity: 0.35 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: () => `+=${window.innerHeight * (frames.length - 1) * 0.85}`,
            pin: true,
            scrub: 0.5,
            snap: { snapTo: 'labels', duration: { min: 0.2, max: 0.5 }, ease: 'power1.inOut' },
            invalidateOnRefresh: true,
          },
        });

        tl.addLabel('frame0');
        frames.forEach((frame, i) => {
          if (i === 0) return;
          tl.to({}, { duration: 0.5 }) // hold the current frame before moving on
            .to(frames[i - 1], { autoAlpha: 0, y: -32, duration: 1 })
            .to(frames[i], { autoAlpha: 1, y: 0, duration: 1 }, '<0.35')
            .to(marks[i - 1], { opacity: 0.35, duration: 0.6 }, '<')
            .to(marks[i], { opacity: 1, duration: 0.6 }, '<')
            .addLabel(`frame${i}`);
        });
        tl.to({}, { duration: 0.5 });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [data] }
  );

  if (failed) return null;

  const sc = data?.scorecard;
  const dcf = data?.dcf;
  const margin = data?.margin;
  const metrics = sc?.metrics || [];
  const years = data?.stock_data?.financials?.years || [];
  const verdict = data?.classification_label || data?.classification;
  const steps = ['Read the fundamentals', 'Weight them', 'Estimate fair value', 'Compare with price'];

  return (
    <section ref={root} className="walk home-section" aria-labelledby="walk-title">
      <div className="walk-intro">
        <h2 id="walk-title">How {TICKER} gets its verdict</h2>
        <p className="section-sub">
          The live Buffett-lens numbers behind the {TICKER} card above.
        </p>
        <ol className="walk-index" aria-hidden="true">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>

      {!data ? (
        <div className="walk-frames" aria-hidden="true">
          <div className="walk-frame">
            <span className="skel skel-lg" />
            <span className="skel skel-md" />
          </div>
        </div>
      ) : (
        <div className="walk-frames">
          <article className="walk-frame">
            <h3>{steps[0]}</h3>
            <p className="walk-figure mono">
              {metrics.length}
              <span className="walk-figure-unit">fundamentals</span>
            </p>
            <p className="walk-note">
              From {TICKER}'s {years.length ? `${years[0]}-${years[years.length - 1]}` : 'recent'} annual figures, via Yahoo Finance.
            </p>
            <dl className="walk-grid">
              {metrics.map((m) => (
                <div key={m.name}>
                  <dt>{m.name}</dt>
                  <dd className="mono">{m.value ?? 'n/a'}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="walk-frame">
            <h3>{steps[1]}</h3>
            <p className="walk-figure mono">
              {Math.round(sc.total_score)}
              <span className="walk-figure-unit">/100, grade {sc.grade}</span>
            </p>
            <p className="walk-note">Points earned out of each metric's weight for the {sc.sector_label} sector.</p>
            <dl className="walk-grid">
              {metrics.map((m) => (
                <div key={m.name}>
                  <dt>{m.name}</dt>
                  <dd className="mono">{m.max > 0 ? `${m.score.toFixed(1)} of ${m.max.toFixed(1)}` : 'not scored'}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="walk-frame">
            <h3>{steps[2]}</h3>
            <p className="walk-figure mono">
              {formatMoney(dcf.intrinsic_value)}
              <span className="walk-figure-unit">per share</span>
            </p>
            <p className="walk-note">
              Ten years of projected free cash flow plus a terminal value, discounted back to today.
            </p>
            <dl className="walk-grid walk-grid--three">
              <div>
                <dt>Discount rate</dt>
                <dd className="mono">{pct(dcf.discount_rate)}</dd>
              </div>
              <div>
                <dt>Growth rate</dt>
                <dd className="mono">{pct(dcf.growth_rate)}</dd>
              </div>
              <div>
                <dt>Terminal growth</dt>
                <dd className="mono">{pct(dcf.terminal_rate)}</dd>
              </div>
            </dl>
          </article>

          <article className="walk-frame">
            <h3>{steps[3]}</h3>
            <p className={`walk-figure walk-verdict tone-${verdict === 'Buy' ? 'pos' : verdict === 'Avoid' ? 'neg' : 'mid'}`}>
              {verdict}
            </p>
            <p className="walk-note">{data.classification_explanation}</p>
            <dl className="walk-grid walk-grid--three">
              <div>
                <dt>Price</dt>
                <dd className="mono">{formatMoney(margin.current_price)}</dd>
              </div>
              <div>
                <dt>Fair value</dt>
                <dd className="mono">{formatMoney(margin.intrinsic_value)}</dd>
              </div>
              <div>
                <dt>Margin of safety</dt>
                <dd className={`mono tone-${margin.margin_pct >= 0 ? 'pos' : 'neg'}`}>
                  {margin.margin_pct > 0 ? '+' : ''}
                  {margin.margin_pct.toFixed(1)}%
                </dd>
              </div>
            </dl>
          </article>
        </div>
      )}
    </section>
  );
};

export default VerdictWalkthrough;
