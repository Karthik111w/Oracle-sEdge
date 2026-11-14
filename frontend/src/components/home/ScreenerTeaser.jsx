import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { usePrefs } from '../../lib/storage';
import { displayName } from './LensVerdictCard';
import { LENSES } from './lenses';
import { useScreener } from './useTracked';
import '../../styles/shell.css';

const num = (v) => (Number.isFinite(v) ? v : -Infinity);

const ScreenerTeaser = () => {
  const [prefs] = usePrefs();
  const lens = LENSES.find((l) => l.value === prefs.investor) || LENSES[0];
  const { status, rows, progress } = useScreener(lens.value, prefs.horizon);

  const top = [...rows]
    .sort((a, b) => num(b.score) - num(a.score) || num(b.margin_pct) - num(a.margin_pct))
    .slice(0, 5);
  const waiting = status === 'warming' && top.length === 0;

  return (
    <section className="home-section" aria-labelledby="teaser-title">
      <div className="section-head sh-teaser-head">
        <div>
          <h2 id="teaser-title">Top ideas through the {lens.short} lens</h2>
          <p className="section-sub">Highest scores first, then margin of safety. Change the default lens in Settings.</p>
        </div>
        <Link to="/screener" className="sh-more">
          Open the screener <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      <p className="sh-teaser-status" role="status" aria-live="polite">
        {status === 'warming' && `Scoring ${progress?.done ?? 0} of ${progress?.total ?? '?'} companies${top.length ? ', showing results so far' : ''}`}
      </p>

      <div className="ranking sh-teaser">
        <div className="sh-teaser-row sh-teaser-header" aria-hidden="true">
          <span>Company</span>
          <span className="num">Score</span>
          <span className="num">Margin</span>
          <span className="hide-sm">Verdict</span>
          <span />
        </div>
        {(status === 'loading' || waiting) &&
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="sh-teaser-row is-loading" aria-hidden="true">
              <span className="skel skel-cell" />
              <span className="skel skel-cell wide" />
              <span className="skel skel-cell" />
              <span className="skel skel-cell hide-sm" />
              <span />
            </div>
          ))}

        {status === 'error' && <p className="ranking-empty">The screener is unavailable right now. Try again in a minute.</p>}
        {status === 'ready' && top.length === 0 && <p className="ranking-empty">No scored companies yet.</p>}

        {top.map((r) => {
          const m = r.margin_pct;
          const verdict = r.classification_label || r.classification;
          return (
            <Link key={r.ticker} to={`/stock/${encodeURIComponent(r.ticker)}`} className="sh-teaser-row">
              <span className="ranking-company">
                <span className="mono ranking-ticker">{r.ticker}</span>
                <span className="ranking-name">{displayName(r.name || '')}</span>
              </span>
              <span className="mono num">{Number.isFinite(r.score) ? r.score.toFixed(0) : 'n/a'}<span className="muted sh-of"> /100</span></span>
              <span className={`mono num tone-${Number.isFinite(m) ? (m >= 0 ? 'pos' : 'neg') : 'mid'}`}>
                {Number.isFinite(m) ? `${m > 0 ? '+' : ''}${m.toFixed(1)}%` : 'n/a'}
              </span>
              <span className="hide-sm ranking-verdict">{verdict || ''}</span>
              <ChevronRight size={16} className="muted" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default ScreenerTeaser;
