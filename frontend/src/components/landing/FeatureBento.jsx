import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, Briefcase, GitCompareArrows, ListFilter, Star } from 'lucide-react';
import { Reveal, SplitHeading, TiltCard } from '../fx';
import { useScreener } from '../home/useTracked';
import { usePrefs, useWatchlist } from '../../lib/storage';
import { verdictLabel, verdictTone } from '../../lib/verdict';

const MotionLink = motion.create(Link);

function ScreenerPreview() {
  const [prefs] = usePrefs();
  const { rows } = useScreener(prefs.investor, prefs.horizon);
  const top = [...(rows || [])]
    .filter((r) => Number.isFinite(r.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  if (!top.length) {
    return (
      <div className="ld-mini" aria-hidden="true">
        <span className="skel" />
        <span className="skel" />
        <span className="skel" />
      </div>
    );
  }
  return (
    <ul className="ld-mini">
      {top.map((r) => (
        <li key={r.ticker}>
          <span className="mono ld-mini-ticker">{r.ticker}</span>
          <span className="ld-mini-bar">
            <span style={{ width: `${r.score}%` }} />
          </span>
          <span className="mono">{Math.round(r.score)}</span>
          <span className={`tone-${verdictTone(r.classification)}`}>{verdictLabel(r)}</span>
        </li>
      ))}
    </ul>
  );
}

// Entry points to the rest of the product, as cards that tilt toward the pointer.
export default function FeatureBento() {
  const { tickers } = useWatchlist();

  return (
    <section className="ld-bento-section" aria-labelledby="bento-title">
      <p className="eyebrow">The workbench</p>
      <SplitHeading id="bento-title" text="Everything else you can point a lens at." accent={['lens']} className="display ld-section-title" />

      <div className="ld-bento">
        <Reveal className="ld-bento-cell is-wide">
          <TiltCard as={MotionLink} to="/screener" className="ld-card fx-spot">
            <span className="ld-card-icon">
              <ListFilter size={20} aria-hidden="true" />
            </span>
            <h3>Screener</h3>
            <p>Sixty-nine large caps, ranked by any lens. Filter by sector, verdict, margin of safety and risk flags.</p>
            <ScreenerPreview />
            <span className="ld-card-go">
              Open the screener <ArrowUpRight size={15} aria-hidden="true" />
            </span>
          </TiltCard>
        </Reveal>

        <Reveal className="ld-bento-cell" delay={0.08}>
          <TiltCard as={MotionLink} to="/compare" className="ld-card fx-spot">
            <span className="ld-card-icon">
              <GitCompareArrows size={20} aria-hidden="true" />
            </span>
            <h3>Compare</h3>
            <p>Up to four companies side by side: scorecards, valuation and a rebased price race.</p>
            <span className="ld-card-go">
              Start a comparison <ArrowUpRight size={15} aria-hidden="true" />
            </span>
          </TiltCard>
        </Reveal>

        <Reveal className="ld-bento-cell" delay={0.12}>
          <TiltCard as={MotionLink} to="/portfolio" className="ld-card fx-spot">
            <span className="ld-card-icon">
              <Briefcase size={20} aria-hidden="true" />
            </span>
            <h3>Portfolio</h3>
            <p>Allocation, correlation and a year against the S&amp;P 500, then weights tuned for return per unit of risk.</p>
            <span className="ld-card-go">
              Analyze holdings <ArrowUpRight size={15} aria-hidden="true" />
            </span>
          </TiltCard>
        </Reveal>

        <Reveal className="ld-bento-cell is-wide" delay={0.16}>
          <TiltCard as={MotionLink} to="/watchlist" className="ld-card fx-spot">
            <span className="ld-card-icon">
              <Star size={20} aria-hidden="true" />
            </span>
            <h3>Watchlist</h3>
            <p>
              {tickers.length
                ? `You are watching ${tickers.length} ${tickers.length === 1 ? 'company' : 'companies'}. Re-score them through any lens in one view.`
                : 'Keep the companies you care about in one place and re-score them through any lens.'}
            </p>
            {tickers.length > 0 && (
              <ul className="ld-chips" aria-label="Watched tickers">
                {tickers.slice(0, 8).map((t) => (
                  <li key={t} className="mono">
                    {t}
                  </li>
                ))}
              </ul>
            )}
            <span className="ld-card-go">
              Open the watchlist <ArrowUpRight size={15} aria-hidden="true" />
            </span>
          </TiltCard>
        </Reveal>
      </div>

      <Reveal className="ld-kbd-hint">
        Press <kbd>Ctrl</kbd> <kbd>K</kbd> anywhere to search every ticker.
      </Reveal>
    </section>
  );
}
