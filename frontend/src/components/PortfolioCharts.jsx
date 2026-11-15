import React from 'react';
import { motion } from 'motion/react';
import { Reveal } from './fx';
import { formatMoney } from './home/LensVerdictCard';
import { pctFromFraction } from './portfolio/format';
import '../styles/portfolio.css';

// Gold steps for allocation segments, largest first; one accent only.
const SHADES = [1, 0.75, 0.55, 0.42, 0.32, 0.25, 0.2, 0.16];

// Plain-language summary of the biggest weight changes, in percentage points.
function describeChanges(rows) {
  const moves = rows
    .map((h) => ({ ticker: h.ticker, delta: h.optimized_weight - h.current_weight, to: h.optimized_weight }))
    .filter((m) => Number.isFinite(m.delta) && Math.abs(m.delta) >= 0.005);
  const ups = moves.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const downs = moves.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  const fmt = (m) => `${m.ticker} (${m.delta > 0 ? '+' : '-'}${Math.abs(m.delta * 100).toFixed(1)} points, to ${(m.to * 100).toFixed(1)}%)`;
  return { ups: ups.map(fmt), downs: downs.map(fmt), none: moves.length === 0 };
}

const signed = (v, digits = 2) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;

const EASE = [0.16, 1, 0.3, 1];

// One pair of bars per holding. The target bar starts at the current weight on first draw and
// moves to the target, and moves again when the strategy changes. Widths come from scaleX only.
function PairedBars({ rows }) {
  const max = Math.max(0.01, ...rows.map((r) => Math.max(r.current_weight || 0, r.optimized_weight || 0)));
  const fill = (w) => Math.min(1, Math.max(0, (w || 0) / max));
  return (
    <ul className="pfx-pairs" aria-label="Current and target weight for each holding">
      {rows.map((r) => {
        const delta = (r.optimized_weight || 0) - (r.current_weight || 0);
        const dir = Math.abs(delta) < 0.005 ? 'flat' : delta > 0 ? 'up' : 'down';
        return (
          <motion.li key={r.ticker} layout="position" transition={{ duration: 0.6, ease: EASE }} className="pfx-pair">
            <span className="pfx-pair-ticker mono">{r.ticker}</span>
            <div className="pfx-pair-bars">
              <div className="pfx-bar pfx-bar--now">
                <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: fill(r.current_weight) }} transition={{ duration: 0.9, ease: EASE }} />
                <em className="mono">{pctFromFraction(r.current_weight)}</em>
              </div>
              <div className={`pfx-bar pfx-bar--next is-${dir}`}>
                <motion.span initial={{ scaleX: fill(r.current_weight) }} animate={{ scaleX: fill(r.optimized_weight) }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }} />
                <em className="mono">{pctFromFraction(r.optimized_weight)}</em>
              </div>
            </div>
            <span className={`pfx-pair-delta mono is-${dir}`}>{dir === 'flat' ? 'Hold' : `${delta > 0 ? '+' : '-'}${Math.abs(delta * 100).toFixed(1)} pts`}</span>
          </motion.li>
        );
      })}
    </ul>
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
  const changes = describeChanges(rows);

  return (
    <div className="pf-results">
      <Reveal as="section" y={24} className="panel pfx-glass" aria-labelledby="pf-summary-title">
        <header className="panel-head">
          <div>
            <h3 id="pf-summary-title">{strategy.label}</h3>
            <p className="panel-note">{strategy.description} Expected figures are annualized from two years of daily returns.</p>
          </div>
        </header>
        <dl className="deck-facts deck-facts--four">
          <div>
            <dt>Account value</dt>
            <dd className="mono">{formatMoney(results.account_value)}</dd>
          </div>
          <Compare label="Expected return" now={results.current_return} next={strategy.optimized_return} format={(v) => pctFromFraction(v)} />
          <Compare label="Volatility" now={results.current_volatility} next={strategy.optimized_volatility} format={(v) => pctFromFraction(v)} betterHigh={false} />
          <Compare label="Sharpe ratio" now={results.current_sharpe} next={strategy.optimized_sharpe} format={(v) => v.toFixed(2)} />
        </dl>
        {results.cash_available > 0 && (
          <p className="panel-text">
            Includes <span className="mono">{formatMoney(results.cash_available)}</span> of cash to deploy.
            {!(results.current_portfolio_value > 0) && ' You hold no shares yet, so the "now" figures are all cash.'}
          </p>
        )}
        {strategy.note && <p className="panel-text">{strategy.note}</p>}

        <div className="pf2-changes">
          <h4>What this changes</h4>
          {changes.none ? (
            <p className="panel-text">The target is within half a point of your current weights, so no trades are suggested.</p>
          ) : (
            <ul className="plain-list">
              {changes.ups.length > 0 && (
                <li>
                  Largest increases: <span className="mono">{changes.ups.join(', ')}</span>.
                </li>
              )}
              {changes.downs.length > 0 && (
                <li>
                  Largest decreases: <span className="mono">{changes.downs.join(', ')}</span>.
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="pfx-pairs-key" aria-hidden="true">
          <span><i className="pfx-key pfx-key--now" />Now</span>
          <span><i className="pfx-key pfx-key--next" />Target</span>
        </div>
        <PairedBars rows={rows} />
      </Reveal>

      <Reveal as="section" y={24} className="panel pfx-glass" aria-labelledby="pf-trades-title">
        <header className="panel-head">
          <div>
            <h3 id="pf-trades-title">Rebalancing trades</h3>
            <p className="panel-note">Share changes to reach the target weights at today's prices.</p>
          </div>
        </header>
        <div className="pf2-scroll" tabIndex={0} role="region" aria-label="Rebalancing trades, scrolls horizontally">
          <table className="score-table pf-table">
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col" className="num">Score</th>
                <th scope="col" className="num">Price</th>
                <th scope="col" className="num">Day</th>
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
                const side = Math.abs(trade) < 0.005 ? 'hold' : trade > 0 ? 'buy' : 'sell';
                return (
                  <tr key={h.ticker} className={`pfx-trade pfx-trade--${side}`}>
                    <th scope="row" className="mono pf-ticker">{h.ticker}</th>
                    <td className="mono num">{h.scorecard_score != null ? Math.round(h.scorecard_score) : 'n/a'}</td>
                    <td className="mono num">{formatMoney(h.price)}</td>
                    <td className={`mono num tone-${change >= 0 ? 'pos' : 'neg'}`}>{signed(change)}%</td>
                    <td className="mono num">{pctFromFraction(h.current_weight)}</td>
                    <td className="mono num">{pctFromFraction(h.optimized_weight)}</td>
                    <td className="mono num">{h.shares.toFixed(2)}</td>
                    <td className={`mono num${Math.abs(trade) < 0.005 ? ' muted' : trade > 0 ? ' tone-pos' : ' tone-neg'}`}>
                      {side === 'hold' ? 'Hold' : `${side === 'buy' ? 'Buy' : 'Sell'} ${Math.abs(trade).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
};

export default PortfolioCharts;
