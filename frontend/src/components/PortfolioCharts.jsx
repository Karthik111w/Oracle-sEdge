import React from 'react';
import { formatMoney } from './home/LensVerdictCard';

// Gold steps for allocation segments, largest first; one accent only.
const SHADES = [1, 0.75, 0.55, 0.42, 0.32, 0.25, 0.2, 0.16];

const pct = (v, digits = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : 'n/a');
const signed = (v, digits = 2) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;

function AllocationBar({ label, rows, field: weightKey }) {
  return (
    <div className="alloc">
      <span className="alloc-label">{label}</span>
      <div className="alloc-bar">
        {rows.map((r, i) =>
          r[weightKey] > 0.001 ? (
            <span
              key={r.ticker}
              className="alloc-seg"
              style={{ flexGrow: r[weightKey], '--shade': SHADES[i % SHADES.length] }}
              title={`${r.ticker} ${pct(r[weightKey])}`}
            >
              {r[weightKey] > 0.08 && <span className="mono">{r.ticker}</span>}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}

function Compare({ label, now, next, format, betterHigh = true }) {
  const diff = next - now;
  const better = betterHigh ? diff > 0 : diff < 0;
  const same = format(now) === format(next);
  return (
    <div>
      <dt>{label}</dt>
      <dd className="mono">
        {format(now)} <span className="muted">to</span>{' '}
        <span className={same ? '' : better ? 'tone-pos' : 'tone-neg'}>{format(next)}</span>
      </dd>
    </div>
  );
}

// Results of the optimizer for one strategy: risk/return before and after, the target mix,
// and the trades that get there. Every figure comes from /api/portfolio/optimize.
const PortfolioCharts = ({ results, activeStrategy = 'balanced' }) => {
  if (!results?.holdings || !results.strategies) return null;
  const strategy = results.strategies[activeStrategy] || results.strategies.balanced;
  if (!strategy) return null;

  const rows = [...strategy.holdings].sort((a, b) => b.optimized_weight - a.optimized_weight);

  return (
    <div className="pf-results">
      <section className="panel" aria-labelledby="pf-summary-title">
        <header className="panel-head">
          <div>
            <h2 id="pf-summary-title">{strategy.label}</h2>
            <p className="panel-note">{strategy.description} Expected figures are annualized from two years of daily returns.</p>
          </div>
        </header>
        <dl className="deck-facts deck-facts--four">
          <div>
            <dt>Account value</dt>
            <dd className="mono">{formatMoney(results.account_value)}</dd>
          </div>
          <Compare label="Expected return" now={results.current_return} next={strategy.optimized_return} format={(v) => pct(v)} />
          <Compare label="Volatility" now={results.current_volatility} next={strategy.optimized_volatility} format={(v) => pct(v)} betterHigh={false} />
          <Compare label="Sharpe ratio" now={results.current_sharpe} next={strategy.optimized_sharpe} format={(v) => v.toFixed(2)} />
        </dl>
        {results.cash_available > 0 && (
          <p className="panel-text">
            Includes <span className="mono">{formatMoney(results.cash_available)}</span> of cash to deploy.
          </p>
        )}

        <div className="alloc-group">
          <AllocationBar label="Now" rows={rows} field="current_weight" />
          <AllocationBar label="Target" rows={rows} field="optimized_weight" />
        </div>
      </section>

      <section className="panel" aria-labelledby="pf-trades-title">
        <header className="panel-head">
          <h2 id="pf-trades-title">Rebalancing</h2>
        </header>
        <div className="table-scroll">
          <table className="score-table pf-table">
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col" className="num">Score</th>
                <th scope="col" className="num">Price</th>
                <th scope="col" className="num">Today</th>
                <th scope="col" className="num">Weight now</th>
                <th scope="col" className="num">Target</th>
                <th scope="col" className="num">Shares now</th>
                <th scope="col" className="num">Trade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => {
                const trade = h.optimized_shares - h.shares;
                const change = h.daily_change_pct ?? 0;
                return (
                  <tr key={h.ticker}>
                    <th scope="row" className="mono pf-ticker">{h.ticker}</th>
                    <td className="mono num">{h.scorecard_score != null ? Math.round(h.scorecard_score) : 'n/a'}</td>
                    <td className="mono num">{formatMoney(h.price)}</td>
                    <td className={`mono num tone-${change >= 0 ? 'pos' : 'neg'}`}>{signed(change)}%</td>
                    <td className="mono num">{pct(h.current_weight)}</td>
                    <td className="mono num">{pct(h.optimized_weight)}</td>
                    <td className="mono num">{h.shares.toFixed(2)}</td>
                    <td className={`mono num${Math.abs(trade) < 0.005 ? ' muted' : trade > 0 ? ' tone-pos' : ' tone-neg'}`}>
                      {Math.abs(trade) < 0.005 ? 'Hold' : `${trade > 0 ? 'Buy' : 'Sell'} ${Math.abs(trade).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PortfolioCharts;
