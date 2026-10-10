import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { getStockAnalysis } from '../../api/client';
import { cached } from '../../api/cache';
import { TICKER, analysisKey, formatMoney } from './LensVerdictCard';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Keep in sync with the `.walk` media query in index.css.
const PINNED_QUERY = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';

const pct = (v, digits = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : 'n/a');

// Formatters for figures that count up while scrubbing; keyed by data-format.
const FORMATS = {
  int: (v) => String(Math.round(v)),
  money: (v) => formatMoney(v),
  pct1: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
};

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
        const progress = root.current.querySelector('.walk-progress-fill');
        gsap.set(frames.slice(1), { autoAlpha: 0, clipPath: 'inset(0% 0% 100% 0%)', y: 24 });
        gsap.set(marks.slice(1), { opacity: 0.35 });
        gsap.set(progress, { scaleY: 1 / frames.length, transformOrigin: 'top center' });

        // Count a frame's figures up from zero as it arrives, tied to scroll position.
        const countIn = (tl, frame, at) => {
          frame.querySelectorAll('[data-count]').forEach((el) => {
            const target = parseFloat(el.dataset.count);
            const fmt = FORMATS[el.dataset.format] || FORMATS.int;
            const counter = { v: 0 };
            tl.to(counter, { v: target, duration: 1, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(counter.v)) }, at);
          });
          const bars = frame.querySelectorAll('.fcf-bar');
          if (bars.length) tl.from(bars, { scaleY: 0, transformOrigin: 'bottom center', duration: 0.8, stagger: 0.06, ease: 'power2.out' }, at);
        };

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'center center',
            end: () => `+=${window.innerHeight * (frames.length - 1) * 0.9}`,
            pin: true,
            scrub: 0.6,
            snap: { snapTo: 'labels', duration: { min: 0.2, max: 0.5 }, ease: 'power1.inOut' },
            invalidateOnRefresh: true,
          },
        });

        tl.addLabel('frame0');
        frames.forEach((frame, i) => {
          if (i === 0) return;
          tl.to({}, { duration: 0.5 }) // hold the current frame before moving on
            .to(frames[i - 1], { autoAlpha: 0, y: -24, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8 })
            .to(frames[i], { autoAlpha: 1, y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power3.out' }, '<0.25')
            .to(marks[i - 1], { opacity: 0.35, duration: 0.6 }, '<')
            .to(marks[i], { opacity: 1, duration: 0.6 }, '<')
            .to(progress, { scaleY: (i + 1) / frames.length, duration: 1 }, '<');
          countIn(tl, frames[i], '<0.2');
          tl.addLabel(`frame${i}`);
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
  const fcf = dcf?.projected_fcf || [];
  const fcfMax = Math.max(...fcf.map((p) => Math.abs(p.fcf)), 1);
  const bil = (v) => `$${(v / 1e9).toFixed(1)}B`;

  return (
    <section ref={root} className="walk home-section" aria-labelledby="walk-title">
      <div className="walk-intro">
        <h2 id="walk-title">How {TICKER} gets its verdict</h2>
        <p className="section-sub">The live Buffett-lens numbers behind the {TICKER} card above.</p>
        <div className="walk-index-wrap" aria-hidden="true">
          <span className="walk-progress">
            <span className="walk-progress-fill" />
          </span>
          <ol className="walk-index">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
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
              <span data-count={Math.round(sc.total_score)} data-format="int">{Math.round(sc.total_score)}</span>
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
              <span data-count={dcf.intrinsic_value} data-format="money">{formatMoney(dcf.intrinsic_value)}</span>
              <span className="walk-figure-unit">per share</span>
            </p>
            <p className="walk-note">
              Ten years of projected free cash flow, each discounted back to today, plus a terminal value.
            </p>
            {fcf.length > 0 && (
              <>
                <div
                  className="fcf"
                  role="img"
                  aria-label={`Projected free cash flow grows from ${bil(fcf[0].fcf)} to ${bil(fcf[fcf.length - 1].fcf)}; discounted to today it is worth ${bil(fcf[0].discounted_fcf)} to ${bil(fcf[fcf.length - 1].discounted_fcf)}`}
                >
                  {fcf.map((p) => (
                    <span key={p.year} className="fcf-col">
                      <span className="fcf-pair">
                        <span className="fcf-bar is-projected" style={{ height: `${(Math.abs(p.fcf) / fcfMax) * 100}%` }} />
                        <span className="fcf-bar" style={{ height: `${(Math.abs(p.discounted_fcf) / fcfMax) * 100}%` }} />
                      </span>
                      <span className="fcf-year mono">Y{p.year}</span>
                    </span>
                  ))}
                </div>
                <p className="fcf-legend">
                  <span className="fcf-key is-projected" /> Projected cash flow
                  <span className="fcf-key" /> Worth today
                </p>
              </>
            )}
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
                <dd className="mono" data-count={margin.current_price} data-format="money">{formatMoney(margin.current_price)}</dd>
              </div>
              <div>
                <dt>Fair value</dt>
                <dd className="mono" data-count={margin.intrinsic_value} data-format="money">{formatMoney(margin.intrinsic_value)}</dd>
              </div>
              <div>
                <dt>Margin of safety</dt>
                <dd className={`mono tone-${margin.margin_pct >= 0 ? 'pos' : 'neg'}`} data-count={margin.margin_pct} data-format="pct1">
                  {FORMATS.pct1(margin.margin_pct)}
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
