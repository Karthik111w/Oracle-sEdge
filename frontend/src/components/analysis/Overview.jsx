import React, { useState } from 'react';
import { finite, money, num, compactMoney, pct, signedPct, toneOf } from './format';

export const verdictTone = (label = '') => (/avoid/i.test(label) ? 'neg' : /buy/i.test(label) ? 'pos' : 'mid');

const CONSENSUS = {
  strong_buy: 'Strong buy',
  buy: 'Buy',
  hold: 'Hold',
  underperform: 'Underperform',
  sell: 'Sell',
  strong_sell: 'Strong sell',
};

// A multiple that is negative or zero (loss-making) is not meaningful, so say so.
const multiple = (v) => (!finite(v) ? 'n/a' : v > 0 ? `${v.toFixed(1)}` : 'n/m');

const formatDate = (iso) => {
  if (!iso) return 'n/a';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? 'n/a' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Classification, score and the fair value comparison, beside the price chart.
export function VerdictBlock({ data, lensLabel }) {
  const label = data.classification_label || data.classification;
  const score = data.scorecard?.total_score;
  const margin = data.margin;
  const pctValue = finite(margin?.margin_pct) ? margin.margin_pct : null;
  return (
    <div className="panel an-verdict">
      <p className="an-kicker">Verdict, {lensLabel} lens</p>
      <div className={`an-verdict-word tone-${verdictTone(label)}`}>{label || 'n/a'}</div>
      <div className="an-verdict-score">
        <span className="mono an-verdict-num">{finite(score) ? Math.round(score) : 'n/a'}</span>
        <span className="muted">/100{data.scorecard?.grade ? `, grade ${data.scorecard.grade}` : ''}</span>
      </div>
      {data.classification_explanation && <p className="panel-text">{data.classification_explanation}</p>}
      <dl className="an-facts an-facts--stack">
        <div>
          <dt>Fair value</dt>
          <dd className="mono">{money(margin?.intrinsic_value)}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd className="mono">{money(margin?.current_price ?? data.stock_data?.current_price)}</dd>
        </div>
        <div>
          <dt>Margin of safety</dt>
          <dd className={`mono tone-${toneOf(pctValue)}`}>{signedPct(pctValue)}</dd>
        </div>
      </dl>
    </div>
  );
}

function RangeBar({ low, high, price }) {
  if (![low, high, price].every(finite) || high <= low) return <span className="mono">n/a</span>;
  const at = Math.min(100, Math.max(0, ((price - low) / (high - low)) * 100));
  return (
    <div className="an-range">
      <div className="an-range-bar" role="img" aria-label={`Price ${money(price)}, ${at.toFixed(0)} percent of the way from the 52-week low ${money(low)} to the high ${money(high)}`}>
        <span className="an-range-mark" style={{ left: `${at}%` }} />
      </div>
      <div className="an-range-ends mono">
        <span>{money(low)}</span>
        <span>{money(high)}</span>
      </div>
    </div>
  );
}

function Stat({ label, children, wide, tone }) {
  return (
    <div className={wide ? 'an-stat an-stat--wide' : 'an-stat'}>
      <dt>{label}</dt>
      <dd className={`mono${tone ? ` tone-${tone}` : ''}`}>{children}</dd>
    </div>
  );
}

export function KeyStats({ stockData, isEtf }) {
  const s = stockData.stats || {};
  const price = stockData.current_price;
  const target = s.analyst_target_mean;
  const upside = finite(target) && finite(price) && price > 0 ? ((target - price) / price) * 100 : null;
  const hasTarget = finite(target);
  const consensus = s.recommendation ? CONSENSUS[String(s.recommendation).toLowerCase()] || String(s.recommendation).replace(/_/g, ' ') : null;
  const has52 = finite(s.fifty_two_week_low) && finite(s.fifty_two_week_high);

  // For funds, drop tiles that have no data rather than show a wall of n/a.
  const tile = (label, value, present, extra = {}) => (!isEtf || present ? <Stat key={label} label={label} {...extra}>{value}</Stat> : null);

  return (
    <section className="panel" aria-labelledby="an-stats-title">
      <header className="panel-head">
        <h3 id="an-stats-title" className="an-h3">Key statistics</h3>
      </header>
      <dl className="an-stats">
        {tile('Market cap', compactMoney(stockData.market_cap), finite(stockData.market_cap))}
        {tile('P/E, trailing', multiple(s.pe_trailing), finite(s.pe_trailing))}
        {tile('P/E, forward', multiple(s.pe_forward), finite(s.pe_forward))}
        {tile('PEG', multiple(s.peg), finite(s.peg))}
        {tile('Price to book', multiple(s.price_to_book), finite(s.price_to_book))}
        {tile('EV / EBITDA', multiple(s.ev_to_ebitda), finite(s.ev_to_ebitda))}
        {tile('Dividend yield', finite(s.dividend_yield) && s.dividend_yield > 0 ? pct(s.dividend_yield, 2) : finite(s.dividend_yield) ? 'None' : 'n/a', finite(s.dividend_yield))}
        {tile('Payout ratio', pct(s.payout_ratio, 0), finite(s.payout_ratio))}
        {tile('Beta', num(stockData.beta, 2), finite(stockData.beta))}
        {tile('Next earnings', formatDate(s.next_earnings_date), !!s.next_earnings_date)}
        {(!isEtf || has52) && (
          <Stat label="52-week range" wide>
            <RangeBar low={s.fifty_two_week_low} high={s.fifty_two_week_high} price={price} />
          </Stat>
        )}
        {(!isEtf || hasTarget) && (
          <Stat label="Analyst target" wide>
            {hasTarget ? (
              <>
                <span className="an-target-main">
                  {money(target)}
                  {finite(upside) && <span className={`an-target-up tone-${toneOf(upside)}`}> {signedPct(upside)} vs price</span>}
                </span>
                <span className="an-target-sub muted">
                  {finite(s.analyst_target_low) && finite(s.analyst_target_high) ? `Range ${money(s.analyst_target_low)} to ${money(s.analyst_target_high)}` : ''}
                  {consensus ? `${finite(s.analyst_target_low) ? ', ' : ''}consensus ${consensus.toLowerCase()}` : ''}
                  {finite(s.analyst_count) ? ` (${Math.round(s.analyst_count)} analysts)` : ''}
                </span>
              </>
            ) : (
              'n/a'
            )}
          </Stat>
        )}
        {!isEtf && !hasTarget && consensus && <Stat label="Analyst consensus">{consensus}</Stat>}
      </dl>
    </section>
  );
}

export function AboutBlock({ stockData }) {
  const [open, setOpen] = useState(false);
  const text = stockData.business_summary || stockData.business_description;
  const hasMeta = stockData.website || finite(stockData.employees) || stockData.country;
  if (!text && !hasMeta) return null;
  const long = (text || '').length > 320;
  let host = null;
  try {
    host = stockData.website ? new URL(stockData.website).hostname.replace(/^www\./, '') : null;
  } catch {
    host = stockData.website;
  }
  return (
    <section className="panel" aria-labelledby="an-about-title">
      <header className="panel-head">
        <h3 id="an-about-title" className="an-h3">About</h3>
      </header>
      {text && (
        <>
          <p id="an-about-text" className={`panel-text an-about${long && !open ? ' is-clamped' : ''}`}>{text}</p>
          {long && (
            <button type="button" className="btn-quiet an-toggle" aria-expanded={open} aria-controls="an-about-text" onClick={() => setOpen((v) => !v)}>
              {open ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}
      {hasMeta && (
        <dl className="an-meta">
          {host && (
            <div>
              <dt>Website</dt>
              <dd>
                <a href={stockData.website} target="_blank" rel="noopener noreferrer">{host}</a>
              </dd>
            </div>
          )}
          {finite(stockData.employees) && (
            <div>
              <dt>Employees</dt>
              <dd className="mono">{stockData.employees.toLocaleString('en-US')}</dd>
            </div>
          )}
          {stockData.country && (
            <div>
              <dt>Country</dt>
              <dd>{stockData.country}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
