import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getStockAnalysis } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ScoreCard from '../components/ScoreCard';
import DCFChart from '../components/DCFChart';
import ValuationPanel from '../components/ValuationPanel';
import ETFProfileCard from '../components/ETFProfileCard';
import RiskFlags from '../components/RiskFlags';
import AIReport from '../components/AIReport';
import MetricDeck from '../components/MetricDeck';
import SearchBar from '../components/SearchBar';
import SegmentedControl from '../components/SegmentedControl';
import { displayName, formatMoney } from '../components/home/LensVerdictCard';
import { LENSES } from '../components/home/lenses';

const INVESTOR_OPTIONS = LENSES.map((l) => ({ value: l.value, label: l.label }));

const HORIZON_OPTIONS = [
  { value: 'long', label: 'Long term' },
  { value: 'short', label: 'Short term' },
];

const StockAnalysisPage = () => {
  const { ticker } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const investorParam = searchParams.get('investor') || 'buffett';
  const horizonParam = searchParams.get('horizon') || 'long';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvestor, setSelectedInvestor] = useState(investorParam);
  const [selectedHorizon, setSelectedHorizon] = useState(horizonParam);

  const fetchData = async (investor, horizon) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getStockAnalysis(ticker, investor, horizon));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Changing the lens or horizon updates the URL; the effect below refetches from it.
  const handleInvestorSelect = (investorKey) => {
    setSelectedInvestor(investorKey);
    setSearchParams({ investor: investorKey, horizon: selectedHorizon });
  };

  const handleHorizonSelect = (horizonKey) => {
    setSelectedHorizon(horizonKey);
    setSearchParams({ investor: selectedInvestor, horizon: horizonKey });
  };

  useEffect(() => {
    setSelectedInvestor(investorParam);
    setSelectedHorizon(horizonParam);
    fetchData(investorParam, horizonParam);
  }, [ticker, investorParam, horizonParam]);

  useEffect(() => {
    if (!data?.stock_data) return;
    const sd = data.stock_data;
    const changeVal = sd.daily_change_pct;
    const hasChange = changeVal !== null && changeVal !== undefined;
    const item = {
      ticker: sd.ticker,
      name: sd.company_name,
      price: sd.current_price ? `$${sd.current_price.toFixed(2)}` : 'N/A',
      change: hasChange ? `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%` : 'N/A',
      changeVal: changeVal ?? 0,
    };
    try {
      const saved = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
      const updated = [item, ...saved.filter((x) => x.ticker !== item.ticker)].slice(0, 6);
      localStorage.setItem('recently_viewed', JSON.stringify(updated));
    } catch {
      // Recently viewed is a convenience; ignore storage failures.
    }
  }, [data]);

  const topBar = (
    <div className="analysis-topbar">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> Home
      </Link>
      <div className="analysis-search">
        <SearchBar compact placeholder="Analyze another ticker" />
      </div>
    </div>
  );

  if (loading && !data) {
    return (
      <div className="page page--wide">
        {topBar}
        <LoadingSpinner text={`Analyzing ${ticker.toUpperCase()}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        {topBar}
        <div className="empty-state">
          <h1>We couldn't analyze {ticker.toUpperCase()}</h1>
          <p className="page-sub">Check the ticker symbol and try again. The server said: {error}</p>
          <Link to="/" className="btn-solid">Back to home</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sd = data.stock_data;
  const change = sd?.daily_change_pct;
  const hasChange = change !== null && change !== undefined;
  const isEtf = sd.quote_type === 'ETF';

  return (
    <div className={`page page--wide${loading ? ' is-refreshing' : ''}`} aria-busy={loading}>
      {topBar}

      <header className="analysis-head">
        <div className="analysis-id">
          <h1>
            <span className="mono">{sd.ticker}</span>
            <span className="analysis-name">{displayName(sd.company_name)}</span>
          </h1>
          <p className="analysis-meta">
            <span className="mono analysis-price">{formatMoney(sd.current_price)}</span>
            {hasChange && (
              <span className={`mono tone-${change >= 0 ? 'pos' : 'neg'}`}>
                {change >= 0 ? '+' : ''}
                {change.toFixed(2)}% today
              </span>
            )}
            <span className="muted">{[sd.sector, sd.industry].filter(Boolean).join(', ')}</span>
          </p>
        </div>
        <div className="analysis-controls">
          <SegmentedControl id="investor" label="Investor lens" options={INVESTOR_OPTIONS} value={selectedInvestor} onChange={handleInvestorSelect} />
          <SegmentedControl id="horizon" label="Horizon" options={HORIZON_OPTIONS} value={selectedHorizon} onChange={handleHorizonSelect} tone="teal" />
        </div>
      </header>

      <MetricDeck data={data} ticker={sd.ticker} investor={selectedInvestor} horizon={selectedHorizon} />

      <h2 className="analysis-section-title">Full breakdown</h2>
      <div className="analysis-grid">
        <ScoreCard scorecard={data.scorecard} />
        <div className="analysis-col">
          {isEtf ? <ETFProfileCard stockData={sd} /> : <ValuationPanel dcf={data.dcf} margin={data.margin} />}
          <RiskFlags riskData={data.risk} />
        </div>
      </div>

      {!isEtf && data.dcf?.projected_fcf && <DCFChart dcf={data.dcf} />}

      <AIReport ticker={ticker} investor={selectedInvestor} horizon={selectedHorizon} investorLabel={data.scorecard?.investor_label} />

      <footer className="analysis-foot">
        <p>Not financial advice. Past performance does not guarantee future results.</p>
        <p>Data from Yahoo Finance and company filings.</p>
      </footer>
    </div>
  );
};

export default StockAnalysisPage;
