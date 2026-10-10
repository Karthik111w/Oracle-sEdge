import React, { useState } from 'react';
import PortfolioForm from '../components/PortfolioForm';
import PortfolioCharts from '../components/PortfolioCharts';
import LoadingSpinner from '../components/LoadingSpinner';
import SegmentedControl from '../components/SegmentedControl';
import { optimizePortfolio } from '../api/client';
import { LENSES } from '../components/home/lenses';

const INVESTOR_OPTIONS = LENSES.map((l) => ({ value: l.value, label: l.label }));

const HORIZON_OPTIONS = [
  { value: 'long', label: 'Long term' },
  { value: 'short', label: 'Short term' },
];

const PortfolioPage = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeStrategy, setActiveStrategy] = useState('balanced');
  const [selectedInvestor, setSelectedInvestor] = useState('buffett');
  const [selectedHorizon, setSelectedHorizon] = useState('long');
  const [error, setError] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);

  // investor/horizon are passed in explicitly so a lens change re-runs with the new value,
  // not the one captured before the state update.
  const runOptimize = async (req, investor, horizon) => {
    setLoading(true);
    setError(null);
    setLastRequest(req);
    try {
      const data = await optimizePortfolio(req.holdings, req.cashAvailable, req.useRecommendations, req.accountValue, investor, horizon);
      setResults(data);
      setActiveStrategy((cur) => (data.strategies?.[cur] ? cur : 'balanced'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (holdings, cashAvailable = 0, useRecommendations = false, accountValue = 0) =>
    runOptimize({ holdings, cashAvailable, useRecommendations, accountValue }, selectedInvestor, selectedHorizon);

  const handleInvestorSelect = (investor) => {
    setSelectedInvestor(investor);
    if (lastRequest) runOptimize(lastRequest, investor, selectedHorizon);
  };

  const handleHorizonSelect = (horizon) => {
    setSelectedHorizon(horizon);
    if (lastRequest) runOptimize(lastRequest, selectedInvestor, horizon);
  };

  const strategyOptions = Object.entries(results?.strategies || {}).map(([key, s]) => ({ value: key, label: s.label }));

  return (
    <div className="page">
      <header className="page-head">
        <h1>Portfolio optimizer</h1>
        <p className="page-sub">
          Rebalance your holdings for a better return per unit of risk (Sharpe ratio). Positions that score poorly under the chosen lens are held back.
        </p>
      </header>

      <div className="analysis-controls pf-controls">
        <SegmentedControl id="portfolio-investor" label="Investor lens" options={INVESTOR_OPTIONS} value={selectedInvestor} onChange={handleInvestorSelect} />
        <SegmentedControl id="portfolio-horizon" label="Horizon" options={HORIZON_OPTIONS} value={selectedHorizon} onChange={handleHorizonSelect} tone="teal" />
      </div>

      <PortfolioForm onSubmit={handleSubmit} loading={loading} selectedInvestor={selectedInvestor} selectedHorizon={selectedHorizon} />

      {error && (
        <p className="inline-error" role="alert">
          The optimization failed: {error}
        </p>
      )}

      {loading ? (
        <LoadingSpinner text="Optimizing: fetching two years of daily returns and building the covariance matrix" />
      ) : results ? (
        <div className="pf-output">
          <SegmentedControl id="portfolio-strategy" label="Strategy" options={strategyOptions} value={activeStrategy} onChange={setActiveStrategy} />
          <PortfolioCharts results={results} activeStrategy={activeStrategy} />
        </div>
      ) : null}
    </div>
  );
};

export default PortfolioPage;
