import React, { useRef, useState } from 'react';
import PortfolioForm from '../components/PortfolioForm';
import PortfolioCharts from '../components/PortfolioCharts';
import AnalysisView, { AnalysisSkeleton } from '../components/portfolio/AnalysisView';
import { Reveal } from '../components/fx';
import SegmentedControl from '../components/SegmentedControl';
import { analyzePortfolio, optimizePortfolio } from '../api/client';
import { HORIZON_OPTIONS, LENS_OPTIONS, lensLabel } from '../lib/verdict';
import { usePrefs } from '../lib/storage';
import '../styles/portfolio.css';

const idle = { status: 'idle', data: null, error: null };

const PortfolioPage = () => {
  const [prefs] = usePrefs();
  const [investor, setInvestor] = useState(prefs.investor);
  const [horizon, setHorizon] = useState(prefs.horizon);
  const [analysis, setAnalysis] = useState(idle);
  const [optimizer, setOptimizer] = useState(idle);
  const [activeStrategy, setActiveStrategy] = useState('balanced');
  const lastRequest = useRef(null);
  const seq = useRef({ analysis: 0, optimizer: 0 });

  // investor/horizon are passed in explicitly so a lens change re-runs with the new value,
  // not the one captured before the state update. Late responses from older runs are dropped.
  const runAnalysis = async (req, inv, hor) => {
    const id = ++seq.current.analysis;
    setAnalysis((a) => ({ ...a, status: 'loading', error: null }));
    try {
      const data = await analyzePortfolio(req.holdings, inv, hor);
      if (id === seq.current.analysis) setAnalysis({ status: 'ok', data, error: null });
    } catch (err) {
      if (id === seq.current.analysis) setAnalysis({ status: 'error', data: null, error: err.message });
    }
  };

  const runOptimize = async (req, inv, hor) => {
    const id = ++seq.current.optimizer;
    setOptimizer((o) => ({ ...o, status: 'loading', error: null }));
    try {
      const data = await optimizePortfolio(req.holdings, req.cashAvailable, req.useRecommendations, req.accountValue, inv, hor);
      if (id !== seq.current.optimizer) return;
      setOptimizer({ status: 'ok', data, error: null });
      setActiveStrategy((cur) => (data.strategies?.[cur] ? cur : 'balanced'));
    } catch (err) {
      if (id === seq.current.optimizer) setOptimizer({ status: 'error', data: null, error: err.message });
    }
  };

  const handleAnalyze = (req) => {
    lastRequest.current = { ...lastRequest.current, analyze: req };
    runAnalysis(req, investor, horizon);
  };

  const handleOptimize = (req) => {
    lastRequest.current = { ...lastRequest.current, optimize: req };
    runOptimize(req, investor, horizon);
  };

  // Re-run whichever views are showing.
  const rerun = (inv, hor) => {
    const last = lastRequest.current || {};
    if (last.analyze && analysis.status !== 'idle') runAnalysis(last.analyze, inv, hor);
    if (last.optimize && optimizer.status !== 'idle') runOptimize(last.optimize, inv, hor);
  };

  const handleInvestor = (value) => {
    setInvestor(value);
    rerun(value, horizon);
  };

  const handleHorizon = (value) => {
    setHorizon(value);
    rerun(investor, value);
  };

  const investorLabel = lensLabel(investor);
  const strategyOptions = Object.entries(optimizer.data?.strategies || {}).map(([key, s]) => ({ value: key, label: s.label }));
  const busy = analysis.status === 'loading' || optimizer.status === 'loading';
  const nothingYet = analysis.status === 'idle' && optimizer.status === 'idle';

  return (
    <div className="page page--wide">
      <header className="page-head pfx-head">
        <span className="eyebrow">Portfolio workspace</span>
        <h1>Your <em>portfolio</em>, read closely</h1>
        <p className="page-sub">
          Check how your holdings fit together, then see how the weights could change for a better return per unit of risk. Positions that score poorly under the chosen lens are held back.
        </p>
      </header>

      <div className="analysis-controls pf2-controls">
        <SegmentedControl id="portfolio-investor" label="Investor lens" options={LENS_OPTIONS} value={investor} onChange={handleInvestor} />
        <SegmentedControl id="portfolio-horizon" label="Horizon" options={HORIZON_OPTIONS} value={horizon} onChange={handleHorizon} tone="teal" />
      </div>

      <Reveal y={20}>
        <PortfolioForm onAnalyze={handleAnalyze} onOptimize={handleOptimize} busy={busy} selectedInvestor={investor} selectedHorizon={horizon} />
      </Reveal>

      {nothingYet && (
        <section className="pf2-empty" aria-label="Before the first run">
          <div className="pfx-empty-rings" aria-hidden="true"><i /><i /><i /></div>
          <h2>Nothing analyzed yet</h2>
          <p>
            Add your holdings above and choose Analyze portfolio for value, risk, sector mix, correlation and a one-year comparison with SPY. Optimize weights suggests a target mix and the trades to reach it.
          </p>
        </section>
      )}

      {analysis.status !== 'idle' && (
        <section className="pf2-section" aria-labelledby="pf2-analysis-title" aria-live="polite">
          <div className="section-head pfx-section-head">
            <span className="eyebrow">02 Analysis</span>
            <h2 id="pf2-analysis-title">How it <em>holds up</em></h2>
          </div>
          {analysis.status === 'loading' && <AnalysisSkeleton />}
          {analysis.status === 'error' && (
            <p className="inline-error" role="alert">
              {analysis.error}
            </p>
          )}
          {analysis.status === 'ok' && <AnalysisView data={analysis.data} investorLabel={investorLabel} investor={investor} horizon={horizon} />}
        </section>
      )}

      {optimizer.status !== 'idle' && (
        <section className="pf2-section" aria-labelledby="pf2-opt-title" aria-live="polite">
          <div className="section-head pfx-section-head">
            <span className="eyebrow">03 Optimizer</span>
            <h2 id="pf2-opt-title">A better <em>mix</em></h2>
          </div>
          {optimizer.status === 'loading' && (
            <div className="pf2-stack-gap" aria-busy="true">
              <p className="panel-note">Fetching two years of daily returns and building the covariance matrix. This can take up to 20 seconds.</p>
              <div className="panel">
                <div className="skel skel-md" />
                <div className="skel skel-row pf2-skel-row" />
                <div className="skel skel-row pf2-skel-row" />
              </div>
            </div>
          )}
          {optimizer.status === 'error' && (
            <p className="inline-error" role="alert">
              {optimizer.error}
            </p>
          )}
          {optimizer.status === 'ok' && (
            <div className="pf2-stack-gap">
              <SegmentedControl id="portfolio-strategy" label="Strategy" options={strategyOptions} value={activeStrategy} onChange={setActiveStrategy} />
              <PortfolioCharts results={optimizer.data} activeStrategy={activeStrategy} />
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default PortfolioPage;
