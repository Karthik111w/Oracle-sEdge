import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getStockAnalysis } from '../../api/client';
import { cached } from '../../api/cache';
import { analysisKey, displayName, formatMoney } from './LensVerdictCard';

// A fixed set of large caps, scored live through the Buffett lens.
const TRACKED = ['KO', 'PG', 'JNJ', 'AAPL', 'MSFT', 'V'];


const MarginRanking = () => {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.allSettled(
      TRACKED.map((t) => cached(analysisKey(t, 'buffett'), () => getStockAnalysis(t, 'buffett', 'long')))
    ).then((settled) => {
      if (!alive) return;
      const ok = settled
        .filter((s) => s.status === 'fulfilled' && Number.isFinite(s.value?.margin?.margin_pct))
        .map((s) => s.value)
        .sort((a, b) => b.margin.margin_pct - a.margin.margin_pct);
      setRows(ok);
      setFailed(ok.length === 0);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="home-section" aria-labelledby="ranking-title">
      <div className="section-head">
        <div>
          <h2 id="ranking-title">Ranked by margin of safety</h2>
          <p className="section-sub">
            Six large caps through the Buffett lens, live. Negative means the price is above our fair value estimate.
          </p>
        </div>
      </div>

      <div className="ranking">
        <div className="ranking-row ranking-header" aria-hidden="true">
          <span>#</span>
          <span>Company</span>
          <span className="num">Price</span>
          <span className="num hide-sm">Fair value</span>
          <span className="num">Margin</span>
          <span className="hide-sm">Verdict</span>
          <span aria-hidden="true" />
        </div>

        {rows === null &&
          TRACKED.map((t) => (
            <div key={t} className="ranking-row is-loading" aria-hidden="true">
              <span className="skel skel-cell" />
              <span className="skel skel-cell wide" />
              <span className="skel skel-cell" />
              <span className="skel skel-cell hide-sm" />
              <span className="skel skel-cell" />
              <span className="skel skel-cell hide-sm" />
              <span />
            </div>
          ))}

        {failed && <p className="ranking-empty">Live data is unavailable right now. Try again in a minute.</p>}

        {rows?.map((d, i) => {
          const m = d.margin.margin_pct;
          return (
            <Link
              key={d.stock_data.ticker}
              to={`/stock/${d.stock_data.ticker}`}
              className="ranking-row"
              aria-label={`${i + 1}. ${displayName(d.stock_data.company_name)}, margin of safety ${m.toFixed(1)} percent, ${d.classification_label || d.classification}`}
            >
              <span className="mono muted">{i + 1}</span>
              <span className="ranking-company">
                <span className="mono ranking-ticker">{d.stock_data.ticker}</span>
                <span className="ranking-name">{displayName(d.stock_data.company_name)}</span>
              </span>
              <span className="mono num">{formatMoney(d.margin.current_price)}</span>
              <span className="mono num hide-sm">{formatMoney(d.margin.intrinsic_value)}</span>
              <span className={`mono num tone-${m >= 0 ? 'pos' : 'neg'}`}>
                {m > 0 ? '+' : ''}
                {m.toFixed(1)}%
              </span>
              <span className="hide-sm ranking-verdict">{d.classification_label || d.classification}</span>
              <ChevronRight size={16} className="muted" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default MarginRanking;
