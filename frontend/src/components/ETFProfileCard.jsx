import React from 'react';
import { compactMoney, finite, money, signedPct } from './analysis/format';

const percent = (v, digits = 2) => (finite(v) ? `${(v * 100).toFixed(digits)}%` : 'n/a');

const ETFProfileCard = ({ stockData }) => {
  if (!stockData || stockData.quote_type !== 'ETF') return null;
  const etf = stockData.etf_data || {};

  const facts = [
    ['Expense ratio', percent(etf.expense_ratio), 'Annual fee'],
    ['Assets under management', compactMoney(etf.total_assets), 'Fund size'],
    ['5-year return', percent(etf.five_year_return), 'Average per year'],
    ['Dividend yield', percent(finite(etf.yield) ? etf.yield : stockData.stats?.dividend_yield), 'Income'],
    ['NAV', finite(etf.nav_price) ? money(etf.nav_price) : 'n/a', 'Net asset value per share'],
    // Yahoo reports YTD return already as a percentage number.
    ['Year to date', finite(etf.ytd_return) ? signedPct(etf.ytd_return) : 'n/a', 'Price return this year'],
  ];

  return (
    <section className="panel" aria-labelledby="an-etf-title">
      <header className="panel-head">
        <div>
          <h3 id="an-etf-title" className="an-h3">Fund profile</h3>
          <p className="panel-note">{etf.category || 'Exchange-traded fund'}. Funds are not scored or valued here because they hold baskets of companies rather than one stream of cash flows.</p>
        </div>
      </header>
      <dl className="an-stats">
        {facts.map(([label, value, detail]) => (
          <div key={label} className="an-stat">
            <dt>{label}</dt>
            <dd className={`mono${label === 'Year to date' && finite(etf.ytd_return) ? ` tone-${etf.ytd_return >= 0 ? 'pos' : 'neg'}` : ''}`}>{value}</dd>
            <dd className="muted an-stat-detail">{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default ETFProfileCard;
