import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowUpRight } from 'lucide-react';
import { LENSES, weightShares } from './lenses';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Shades for weight segments, largest first: one accent, stepping down in strength.
const SHADES = [1, 0.78, 0.6, 0.46, 0.36, 0.28, 0.22, 0.16];

// One sticky card per lens. As the next card slides over, the previous one recedes.
// GSAP only (no Motion in this tree). Under reduced motion the cards simply stack.
const LensStack = () => {
  const root = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray('.lens-card');
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) return;
          // fromTo: tweening from filter "none" would start at brightness(0) and flash dark.
          gsap.fromTo(
            card,
            { scale: 1, filter: 'brightness(1)' },
            {
              scale: 0.94,
              filter: 'brightness(0.55)',
              ease: 'none',
              scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true },
            }
          );
        });
        // Weight bars fill as each card arrives.
        cards.forEach((card) => {
          gsap.from(card.querySelectorAll('.wbar-seg'), {
            scaleX: 0,
            transformOrigin: 'left center',
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.05,
            scrollTrigger: { trigger: card, start: 'top 75%', once: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} className="home-section lens-stack" id="lenses" aria-labelledby="lenses-title">
      <div className="section-head">
        <h2 id="lenses-title">What each lens checks</h2>
        <p className="section-sub">
          Every lens scores the same eight fundamentals. What changes is how much each one counts. These are averages across sectors; each company is scored with its own sector's weights.
        </p>
      </div>

      <div className="lens-cards">
        {LENSES.map((lens, i) => {
          const shares = weightShares(lens);
          const equal = new Set(shares.map((s) => s.share.toFixed(2))).size === 1;
          return (
            <article key={lens.value} className="lens-card" style={{ '--i': i }}>
              <header className="lens-card-head">
                <h3>{lens.label}</h3>
                <span className="lens-card-horizon">{lens.horizon}</span>
              </header>
              <p className="lens-card-philosophy">{lens.philosophy}</p>

              <div className="wbar" role="img" aria-label={`${lens.label} weights: ${shares.map((s) => `${s.name} ${Math.round(s.share)}%`).join(', ')}`}>
                {shares.map((s, k) => (
                  <span
                    key={s.key}
                    className="wbar-seg"
                    style={{ flexGrow: s.share, '--shade': SHADES[equal ? 3 : k] }}
                    title={`${s.name} ${s.share.toFixed(1)}%`}
                  />
                ))}
              </div>

              <ul className="wbar-legend">
                {shares.slice(0, equal ? 8 : 4).map((s, k) => (
                  <li key={s.key}>
                    <span className="wbar-swatch" style={{ '--shade': SHADES[equal ? 3 : k] }} />
                    <span>{s.name}</span>
                    <span className="mono">{Math.round(s.share)}%</span>
                  </li>
                ))}
              </ul>

              <Link to={`/stock/KO?investor=${lens.value}&horizon=long`} className="verdict-link">
                KO through the {lens.short} lens <ArrowUpRight size={14} />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default LensStack;
