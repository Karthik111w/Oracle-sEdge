import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
import { Reveal, SplitHeading } from '../components/fx';
import AnalysisHeader from '../components/analysis/Header';
import SectionNav from '../components/analysis/SectionNav';
import PriceChart from '../components/analysis/PriceChart';
import { AboutBlock, KeyStats, VerdictBlock } from '../components/analysis/Overview';
import LensGrid from '../components/analysis/LensGrid';
import DcfCalculator from '../components/analysis/DcfCalculator';
import SensitivityTable from '../components/analysis/SensitivityTable';
import TargetCompare from '../components/analysis/TargetCompare';
import Financials from '../components/analysis/Financials';
import { finite } from '../components/analysis/format';
import { LENSES } from '../components/home/lenses';
import { HORIZON_OPTIONS, LENS_OPTIONS } from '../lib/verdict';
import '../styles/analysis.css';

const INVESTOR_KEYS = LENSES.map((l) => l.value);

const FUND_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'memo', label: 'Memo' },
];

const FUND_SECTIONS_WITH_RISKS = [
  { id: 'overview', label: 'Overview' },
  { id: 'risks', label: 'Risks' },
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

// Display heading for each section; the word in `accent` is set in brass italics.
const HEADINGS = {
  overview: { text: 'Price and standing', accent: ['standing'] },
  lenses: { text: 'Six investors, one company', accent: ['company'] },
  scorecard: { text: 'The scorecard', accent: ['scorecard'] },
  valuation: { text: 'What it is worth', accent: ['worth'] },
  financials: { text: 'Years of financials', accent: ['financials'] },
  risks: { text: 'What could go wrong', accent: ['wrong'] },
  memo: { text: 'The memo', accent: ['memo'] },
};

function Section({ id, index, lead, children }) {
  const h = HEADINGS[id];
  return (
    <section id={id} className="an-section" aria-labelledby={`${id}-heading`}>
      <header className="an-section-head">
        <Reveal as="p" y={12} className="eyebrow an-section-eyebrow">
          <span className="mono">{String(index + 1).padStart(2, '0')}</span> {id}
        </Reveal>
        <SplitHeading as="h2" id={`${id}-heading`} text={h.text} accent={h.accent} className="display an-section-title" />
        {lead && (
          <Reveal as="p" y={14} delay={0.15} className="an-section-lead">
            {lead}
          </Reveal>
        )}
      </header>
      <Reveal y={26} className="an-section-body">
        {children}
      </Reveal>
    </section>
  );
}

// Same silhouette as the loaded header: wordmark block on the left, ring on the right.
function PageSkeleton() {
  return (
    <div className="an-skeleton" aria-hidden="true">
      <div className="an-hero an-skel-hero">
        <div className="an-id">
          <span className="skel an-skel-eyebrow" />
          <span className="skel an-skel-word" />
          <span className="skel an-skel-sub" />
          <span className="skel an-skel-price" />
          <div className="an-actions">
            <span className="skel an-skel-pill" />
            <span className="skel an-skel-pill" />
            <span className="skel an-skel-pill" />
          </div>
        </div>
        <div className="an-stage an-skel-stage">
          <span className="skel an-skel-ring" />
          <span className="skel an-skel-verdict" />
          <span className="skel an-skel-figures" />
        </div>
      </div>
      <span className="skel an-skel-bar" />
      <div className="an-skel-grid">
        <span className="skel an-skel-card" />
        <span className="skel an-skel-card an-skel-card--wide" />
      </div>
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
    const url = window.location.href.split('#')[0];
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
      <div className="page an-page">
        {topBar}
        <div className="empty-state an-error" role="alert">
          <p className="eyebrow">No analysis</p>
          <h1 className="display an-error-title">
            We couldn&apos;t analyze <em>{symbol}</em>
          </h1>
          <p className="page-sub">Check the ticker symbol and try again. The server said: {error}</p>
          <div className="an-error-search">
            <SearchBar placeholder="Try another ticker" />
          </div>
          <Link to="/" className="btn-quiet">Back to home</Link>
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
  const etfFlags = isEtf && (data.risk?.flags?.length || 0) > 0;
  const sections = isEtf ? (etfFlags ? FUND_SECTIONS_WITH_RISKS : FUND_SECTIONS) : STOCK_SECTIONS;
  const fairValue = data.margin?.intrinsic_value ?? dcf?.intrinsic_value;
  const price = data.margin?.current_price ?? sd.current_price;
  const stats = sd.stats || {};
  const idx = (id) => sections.findIndex((x) => x.id === id);

  return (
    <div className={`page page--wide an-page${loading ? ' is-refreshing' : ''}`} aria-busy={loading}>
      {topBar}

      <AnalysisHeader
        data={data}
        isEtf={isEtf}
        hasDcf={hasDcf}
        watching={watching}
        onToggleWatch={() => watchlist.toggle(sd.ticker)}
        copied={copied}
        onCopy={copyLink}
        lensLabel={lensLabel}
      />

      {(
        <div className="an-controls">
          <SegmentedControl id="investor" label="Investor lens" options={LENS_OPTIONS} value={investor} onChange={handleInvestorSelect} />
          <SegmentedControl id="horizon" label="Horizon" options={HORIZON_OPTIONS} value={horizon} onChange={handleHorizonSelect} tone="teal" />
        </div>
      )}

      {sections.length > 1 && <SectionNav sections={sections} />}

      <div className="an-body">
        <Section id="overview" index={idx('overview')}>
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
            <Section id="lenses" index={idx('lenses')} lead="The same company scored six ways. Choose one to switch the scorecard, valuation notes and memo below.">
              <LensGrid ticker={sd.ticker} horizon={horizon} investor={investor} onSelect={handleInvestorSelect} />
            </Section>

            <Section id="scorecard" index={idx('scorecard')} lead={`How ${sd.ticker} scores on each metric the ${lensLabel} lens weighs.`}>
              <div className="analysis-grid">
                <ScoreCard scorecard={data.scorecard} />
                <div className="analysis-col">
                  <ScorecardTrend trend={data.scorecard_trend} lensLabel={data.scorecard?.investor_label} />
                </div>
              </div>
              <MetricDeck data={data} ticker={sd.ticker} investor={investor} horizon={horizon} />
            </Section>

            <Section id="valuation" index={idx('valuation')} lead="What the business is worth by the model, what the price assumes, and how sensitive the answer is.">
              {hasDcf ? (
                <>
                  <div className="analysis-grid an-val-grid">
                    <div className="analysis-col">
                      <ValuationPanel dcf={dcf} margin={data.margin} />
                      <TargetCompare valuationModel={dcf.valuation_model} price={price} fair={fairValue} target={stats.analyst_target_mean} low={stats.analyst_target_low} high={stats.analyst_target_high} />
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

            <Section id="financials" index={idx('financials')} lead="Reported yearly figures from the company's statements.">
              <section className="panel" aria-label="Financials">
                <Financials financials={sd.financials} />
              </section>
            </Section>

            <Section id="risks" index={idx('risks')}>
              <RiskFlags riskData={data.risk} />
            </Section>
          </>
        )}

        {etfFlags && (
          <Section id="risks" index={idx('risks')}>
            <RiskFlags riskData={data.risk} />
          </Section>
        )}

        <Section id="memo" index={idx('memo')}>
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
