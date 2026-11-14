import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Sparkles } from 'lucide-react';
import { getMetricExplanations } from '../api/client';
import { cached } from '../api/cache';
import { isScored } from './home/lenses';

// What each metric measures, written from the formulas in backend/services/scorecard.py.
const MEASURES = {
  'Earnings Consistency': () => 'The share of years in which earnings per share grew over the year before.',
  ROIC: () =>
    'Return on invested capital: after-tax operating profit divided by the money tied up in the business (debt plus equity, minus cash). It shows how much profit each invested dollar earns.',
  'FCF Growth': (h) =>
    h === 'short'
      ? 'How much free cash flow (operating cash flow minus capital spending) changed in the latest year.'
      : 'The yearly growth rate of free cash flow (operating cash flow minus capital spending) over five years.',
  'Profit Margin': () => 'Net income as a share of revenue: how much of each sales dollar ends up as profit.',
  ROE: () => "Return on equity: net income divided by shareholders' equity, the return earned on the owners' money.",
  'Debt-to-Equity': () =>
    "Total debt divided by shareholders' equity. Higher means the business relies more on borrowed money than on its owners' capital.",
  'Interest Coverage': () =>
    'Operating profit (EBIT) divided by interest expense: how many times over the company could pay its interest bill.',
  'Revenue Growth': (h) =>
    h === 'short' ? 'How much revenue changed in the latest year.' : 'The yearly growth rate of revenue over five years.',
};

// Without Gemini, describe the score from the numbers alone.
function plainReading(ticker, m) {
  if (!(m.max > 0) && m.value !== 'N/A') {
    return `${ticker} comes in at ${m.value}. This lens doesn't count it for companies in this sector, so it doesn't move the score.`;
  }
  if (!isScored(m)) {
    return `Yahoo Finance doesn't report the inputs for this metric for ${ticker}, so it isn't scored here.`;
  }
  const ratio = m.score / m.max;
  // Scores come in tiers of 100, 80, 60, 40 and 0 percent of the metric's points.
  const band = ratio >= 0.99 ? 'the top tier' : ratio >= 0.79 ? 'a good result, one tier below the top' : ratio >= 0.59 ? 'a middling result' : 'a weak result';
  return `${ticker} comes in at ${m.value}, earning ${m.score.toFixed(1)} of ${m.max.toFixed(1)} possible points (${Math.round(ratio * 100)}%), ${band}.`;
}

function weightShare(metrics, m) {
  const total = metrics.reduce((s, x) => s + (x.max || 0), 0) || 1;
  return Math.round(((m.max || 0) / total) * 100);
}

function AiLine({ status, text }) {
  if (status === 'loading') return <span className="skel an-walk-skel" aria-hidden="true" />;
  if (status === 'ok' && text) return <p>{text}</p>;
  return null;
}

// Plain-language walk through each scored metric, collapsed until asked for. The Gemini
// readings are fetched on first open; without them each row falls back to text built from the numbers.
const MetricDeck = ({ data, ticker, investor, horizon }) => {
  const metrics = data.scorecard?.metrics || [];
  const lensLabel = data.scorecard?.investor_label || 'the investor';
  const [open, setOpen] = useState(false);
  const [ai, setAi] = useState({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    let hasKey = false;
    try {
      hasKey = !!localStorage.getItem('gemini_api_key');
    } catch {
      // storage unavailable: let the server decide (it may have its own key)
    }
    setAi({ status: 'loading' });
    cached(`explain:${ticker}:${investor}:${horizon}`, () =>
      getMetricExplanations(ticker, investor, horizon).then((r) => {
        if (r.error) throw new Error(r.error);
        return r;
      })
    )
      .then((r) => alive && setAi({ status: 'ok', ...r }))
      .catch((e) => alive && setAi({ status: 'error', message: e.message, noKey: !hasKey && /No Gemini API key/i.test(e.message) }));
    return () => {
      alive = false;
    };
  }, [open, ticker, investor, horizon, attempt]);

  if (metrics.length === 0) return null;
  const aiFor = (name) => ai.metrics?.find((m) => m.name === name);

  return (
    <section className="panel an-walk" aria-labelledby="an-walk-title">
      <h3 id="an-walk-title" className="an-walk-title">
        <button type="button" className="an-walk-toggle" aria-expanded={open} aria-controls="an-walk-body" onClick={() => setOpen((v) => !v)}>
          <span>Walk through each metric</span>
          <span className="muted an-walk-count">{metrics.length} metrics</span>
          <ChevronDown size={18} className="an-walk-chevron" aria-hidden="true" />
        </button>
      </h3>
      {open && (
        <div id="an-walk-body" className="an-walk-body">
          {ai.status === 'ok' && ai.overview && <p className="panel-text an-walk-overview">{ai.overview}</p>}
          {ai.status === 'loading' && <span className="skel an-walk-skel" aria-hidden="true" />}
          <AiStatus ai={ai} onRetry={() => setAttempt((n) => n + 1)} />
          <ul className="an-walk-list">
            {metrics.map((m) => {
              const explained = aiFor(m.name);
              const scored = isScored(m);
              return (
                <li key={m.name}>
                  <details className="an-walk-item">
                    <summary>
                      <span className="an-walk-name">{m.name}</span>
                      <span className="mono an-walk-value">{m.value ?? 'n/a'}</span>
                      <span className="muted mono an-walk-points">
                        {scored ? `${m.score.toFixed(1)} / ${m.max.toFixed(1)}` : m.max > 0 ? 'No data' : 'Not counted'}
                      </span>
                    </summary>
                    <div className="an-walk-text">
                      <section>
                        <h4>What it measures</h4>
                        <p>{(MEASURES[m.name] || (() => m.details))(horizon)}</p>
                      </section>
                      <section>
                        <h4>What {ticker}&apos;s number says</h4>
                        {ai.status === 'ok' && explained?.reading ? <p>{explained.reading}</p> : ai.status === 'loading' ? <AiLine status="loading" /> : <p>{plainReading(ticker, m)}</p>}
                      </section>
                      <section>
                        <h4>Why it matters to {lensLabel}</h4>
                        {ai.status === 'ok' && explained?.why_it_matters ? (
                          <p>{explained.why_it_matters}</p>
                        ) : ai.status === 'loading' ? (
                          <AiLine status="loading" />
                        ) : (
                          <p>
                            {scored
                              ? `It carries ${weightShare(metrics, m)}% of the weight in this lens, after adjusting for the ${data.scorecard?.sector_label || 'company'} sector.`
                              : m.max > 0
                                ? 'With no data to score, it is left out and the remaining metrics carry the score.'
                                : `This lens gives it no weight for ${data.scorecard?.sector_label || 'this'} companies.`}
                          </p>
                        )}
                      </section>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

function AiStatus({ ai, onRetry }) {
  if (ai.status === 'ok') {
    return (
      <p className="an-walk-status muted">
        <Sparkles size={14} aria-hidden="true" /> Explanations written by Gemini from the figures shown.
      </p>
    );
  }
  if (ai.status !== 'error') return null;
  return (
    <p className="an-walk-status">
      {ai.noKey ? (
        <>
          <Sparkles size={14} aria-hidden="true" /> Add a Gemini API key in <Link to="/settings">Settings</Link> for a written explanation of each metric. The plain readings below come from the numbers.
        </>
      ) : (
        <>
          {ai.message}{' '}
          <button type="button" className="btn-quiet" onClick={onRetry}>
            Try again
          </button>
        </>
      )}
    </p>
  );
}

export default MetricDeck;
