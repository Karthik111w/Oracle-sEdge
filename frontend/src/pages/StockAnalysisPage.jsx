import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, GitCompareArrows, Link2, Star } from 'lucide-react';
import { getStockAnalysis } from '../api/client';
import { cached } from '../api/cache';
import { cleanTicker, usePrefs, useWatchlist } from '../lib/storage';
import ScoreCard from '../components/ScoreCard';
import ScorecardTrend from '../components/ScorecardTrend';
import DCFChart from '../components/DCFChart';
import ValuationPanel from '../components/ValuationPanel';
import ETFProfileCard from '../components/ETFProfileCard';
import RiskFlags from '../components/RiskFlags';
import AIReport from '../components/AIReport';
import MetricDeck from '../components/MetricDeck';
import SearchBar from '../components/SearchBar';
import SegmentedControl from '../components/SegmentedControl';
import SectionNav from '../components/analysis/SectionNav';
import PriceChart from '../components/analysis/PriceChart';
import { AboutBlock, KeyStats, VerdictBlock } from '../components/analysis/Overview';
import LensGrid from '../components/analysis/LensGrid';
import DcfCalculator from '../components/analysis/DcfCalculator';
import SensitivityTable from '../components/analysis/SensitivityTable';
import TargetCompare from '../components/analysis/TargetCompare';
import Financials from '../components/analysis/Financials';
import { finite } from '../components/analysis/format';
import { displayName, formatMoney } from '../components/home/LensVerdictCard';
import { LENSES } from '../components/home/lenses';
import '../styles/analysis.css';

const INVESTOR_OPTIONS = LENSES.map((l) => ({ value: l.value, label: l.label }));
const INVESTOR_KEYS = LENSES.map((l) => l.value);

const HORIZON_OPTIONS = [
  { value: 'long', label: 'Long term' },
  { value: 'short', label: 'Short term' },
];

const FUND_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'memo', label: 'Memo' },
];

const STOCK_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'lenses', label: 'Lenses' },
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'financials', label: 'Financials' },
  { id: 'risks', label: 'Risks' },
  { id: 'memo', label: 'Memo' },
];

function Section({ id, title, lead, children }) {
  return (
    <section id={id} className="an-section" aria-labelledby={`${id}-heading`}>
      <header className="an-section-head">
        <h2 id={`${id}-heading`}>{title}</h2>
        {lead && <p className="an-section-lead">{lead}</p>}
      </header>
      {children}
    </section>
  );
}

function PageSkeleton() {
  return (
    <div className="an-skeleton" aria-hidden="true">
      <span className="skel an-skel-title" />
      <span className="skel an-skel-sub" />
      <div className="an-skel-grid">
        <span className="skel an-skel-card" />
        <span className="skel an-skel-card an-skel-card--wide" />
      </div>
      <span className="skel an-skel-bar" />
    </div>
  );
}

const StockAnalysisPage = () => {
  const { ticker } = useParams();
  const symbol = cleanTicker(ticker);
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefs] = usePrefs();
  const watchlist = useWatchlist();
  const urlInvestor = searchParams.get('investor');
  const urlHorizon = searchParams.get('horizon');
  const investor = INVESTOR_KEYS.includes(urlInvestor) ? urlInvestor : prefs.investor;
  const horizon = urlHorizon === 'short' || urlHorizon === 'long' ? urlHorizon : prefs.horizon;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    cached(`analysis:${symbol}:${investor}:${horizon}`, () => getStockAnalysis(symbol, investor, horizon), 5 * 60 * 1000)
      .then((result) => alive && setData(result))
      .catch((err) => alive && setError(err.message || 'Request failed'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol, investor, horizon]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // Changing the lens or horizon updates the URL; the effect above refetches from it.
  const handleInvestorSelect = (key) => setSearchParams({ investor: key, horizon }, { replace: false });
  const handleHorizonSelect = (key) => setSearchParams({ investor, horizon: key }, { replace: false });

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

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked outside secure contexts; fall back to a hidden textarea.
      try {
        const area = document.createElement('textarea');
        area.value = url;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      } catch {
        return;
      }
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

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

  // Data from the previous ticker must not show under a new heading.
  const stale = data && cleanTicker(data.stock_data?.ticker) !== symbol;

  if (error) {
    return (
      <div className="page">
        {topBar}
        <div className="empty-state" role="alert">
          <h1>We couldn't analyze {symbol}</h1>
          <p className="page-sub">Check the ticker symbol and try again. The server said: {error}</p>
          <Link to="/" className="btn-solid">Back to home</Link>
        </div>
      </div>
    );
  }

  if (!data || stale) {
    return (
      <div className="page page--wide an-page" aria-busy="true">
        {topBar}
        <p className="sr-only" role="status">Analyzing {symbol}</p>
        <PageSkeleton />
      </div>
    );
  }

  const sd = data.stock_data;
  const change = sd?.daily_change_pct;
  const hasChange = finite(change);
  const isEtf = sd.quote_type === 'ETF';
  const dcf = data.dcf;
  const hasDcf = !isEtf && dcf && !dcf.error && finite(dcf.intrinsic_value);
  const watching = watchlist.has(sd.ticker);
  const lensLabel = data.scorecard?.investor_label || LENSES.find((l) => l.value === investor)?.label || 'Investor';
  const sections = isEtf ? FUND_SECTIONS : STOCK_SECTIONS;
  const fairValue = data.margin?.intrinsic_value ?? dcf?.intrinsic_value;
  const price = data.margin?.current_price ?? sd.current_price;
  const stats = sd.stats || {};

  return (
    <div className={`page page--wide an-page${loading ? ' is-refreshing' : ''}`} aria-busy={loading}>
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
            <span className="muted">{[sd.sector, sd.industry].filter((x) => x && x !== "Unknown").join(', ')}</span>
          </p>
          <div className="an-actions">
            <button type="button" className={`btn-quiet an-action${watching ? ' is-on' : ''}`} aria-pressed={watching} onClick={() => watchlist.toggle(sd.ticker)}>
              <Star size={14} aria-hidden="true" fill={watching ? 'currentColor' : 'none'} /> {watching ? 'Watching' : 'Watch'}
            </button>
            <Link to={`/compare?tickers=${encodeURIComponent(sd.ticker)}`} className="btn-quiet an-action">
              <GitCompareArrows size={14} aria-hidden="true" /> Compare
            </Link>
            <button type="button" className="btn-quiet an-action" onClick={copyLink}>
              {copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />} {copied ? 'Copied' : 'Copy link'}
            </button>
            <span className="sr-only" role="status">{copied ? 'Link copied to the clipboard' : ''}</span>
          </div>
        </div>
        <div className="analysis-controls">
          <SegmentedControl id="investor" label="Investor lens" options={INVESTOR_OPTIONS} value={investor} onChange={handleInvestorSelect} />
          <SegmentedControl id="horizon" label="Horizon" options={HORIZON_OPTIONS} value={horizon} onChange={handleHorizonSelect} tone="teal" />
        </div>
      </header>

      {sections.length > 1 && <SectionNav sections={sections} />}

      <div className="an-body">
        <Section id="overview" title="Overview">
          <div className={isEtf ? 'an-overview an-overview--fund' : 'an-overview'}>
            {!isEtf && <VerdictBlock data={data} lensLabel={lensLabel} />}
            <section className="panel an-chart-panel" aria-label={`${sd.ticker} price`}>
              <PriceChart ticker={sd.ticker} fairValue={hasDcf ? fairValue : null} bear={dcf?.scenarios?.bear?.intrinsic_value} bull={dcf?.scenarios?.bull?.intrinsic_value} />
            </section>
          </div>
          <div className="an-stack">
            {isEtf && <ETFProfileCard stockData={sd} />}
            <KeyStats stockData={sd} isEtf={isEtf} />
            <AboutBlock stockData={sd} />
          </div>
        </Section>

        {!isEtf && (
          <>
            <Section id="lenses" title="Investor lenses" lead="The same company scored six ways. Choose one to switch the scorecard, valuation notes and memo below.">
              <LensGrid ticker={sd.ticker} horizon={horizon} investor={investor} onSelect={handleInvestorSelect} />
            </Section>

            <Section id="scorecard" title="Scorecard" lead={`How ${sd.ticker} scores on each metric the ${lensLabel} lens weighs.`}>
              <div className="analysis-grid">
                <ScoreCard scorecard={data.scorecard} />
                <div className="analysis-col">
                  <ScorecardTrend trend={data.scorecard_trend} lensLabel={data.scorecard?.investor_label} />
                </div>
              </div>
              <MetricDeck data={data} ticker={sd.ticker} investor={investor} horizon={horizon} />
            </Section>

            <Section id="valuation" title="Valuation" lead="What the business is worth on its cash flows, what the price assumes, and how sensitive the answer is.">
              {hasDcf ? (
                <>
                  <div className="analysis-grid an-val-grid">
                    <div className="analysis-col">
                      <ValuationPanel dcf={dcf} margin={data.margin} />
                      <TargetCompare price={price} fair={fairValue} target={stats.analyst_target_mean} low={stats.analyst_target_low} high={stats.analyst_target_high} />
                    </div>
                    {finite(dcf.base_value) && finite(dcf.shares) && finite(dcf.years) && <DcfCalculator dcf={dcf} price={price} />}
                  </div>
                  <div className="analysis-grid an-val-grid">
                    {dcf.projected_fcf && <DCFChart dcf={dcf} />}
                    <SensitivityTable sensitivity={dcf.sensitivity} price={price} baseGrowth={dcf.growth_rate} baseDiscount={dcf.discount_rate} />
                  </div>
                </>
              ) : (
                <div className="an-stack">
                  <section className="panel" aria-labelledby="an-noval-title">
                    <h3 id="an-noval-title" className="an-h3">No model valuation</h3>
                    <p className="panel-text an-noval">{dcf?.error || 'A fair value could not be estimated for this company.'}</p>
                  </section>
                  <TargetCompare price={price} fair={null} target={stats.analyst_target_mean} low={stats.analyst_target_low} high={stats.analyst_target_high} />
                </div>
              )}
            </Section>

            <Section id="financials" title="Financials" lead="Reported yearly figures from the company's statements.">
              <section className="panel" aria-label="Financials">
                <Financials financials={sd.financials} />
              </section>
            </Section>

            <Section id="risks" title="Risks">
              <RiskFlags riskData={data.risk} />
            </Section>
          </>
        )}

        <Section id="memo" title="Memo">
          <AIReport ticker={sd.ticker} investor={investor} horizon={horizon} investorLabel={data.scorecard?.investor_label || lensLabel} />
        </Section>
      </div>

      <footer className="analysis-foot">
        <p>Not financial advice. Past performance does not guarantee future results.</p>
        <p>Data from Yahoo Finance and company filings.</p>
      </footer>
    </div>
  );
};

export default StockAnalysisPage;
