import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getStockAnalysis } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import ScoreCard from '../components/ScoreCard';
import DCFChart from '../components/DCFChart';
import MarginGauge from '../components/MarginGauge';
import ETFProfileCard from '../components/ETFProfileCard';
import RiskFlags from '../components/RiskFlags';
import AIReport from '../components/AIReport';
import ClassificationBadge from '../components/ClassificationBadge';
import SearchBar from '../components/SearchBar';
import { ArrowLeft, AlertCircle, Info, DollarSign, ShieldAlert, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const INVESTOR_OPTIONS = [
  { value: 'buffett', label: 'Warren Buffett' },
  { value: 'lynch', label: 'Peter Lynch' },
  { value: 'graham', label: 'Benjamin Graham' },
  { value: 'munger', label: 'Charlie Munger' },
  { value: 'oneil', label: "William O'Neil" },
  { value: 'soros', label: 'George Soros' },
];

const HORIZON_OPTIONS = [
  { value: 'long', label: 'Long-term' },
  { value: 'short', label: 'Short-term' },
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
      const result = await getStockAnalysis(ticker, investor, horizon);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestorSelect = (investorKey) => {
    setSelectedInvestor(investorKey);
    setSearchParams({ investor: investorKey, horizon: selectedHorizon });
    fetchData(investorKey, selectedHorizon);
  };

  const handleHorizonSelect = (horizonKey) => {
    setSelectedHorizon(horizonKey);
    setSearchParams({ investor: selectedInvestor, horizon: horizonKey });
    fetchData(selectedInvestor, horizonKey);
  };

  useEffect(() => {
    setSelectedInvestor(investorParam);
    setSelectedHorizon(horizonParam);
    fetchData(investorParam, horizonParam);
  }, [ticker, investorParam, horizonParam]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text={`Analyzing ${ticker}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <SearchBar initialValue={ticker} />
        </div>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', borderTop: '4px solid var(--color-danger)' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0' }}>Ticker Not Found</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
            We could not analyze <strong>{ticker.toUpperCase()}</strong>. Please check the ticker symbol and try again.
          </p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>{error}</p>
          <Link to="/" className="btn">Return Home</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentPrice = data.stock_data?.current_price || 0;
  const intrinsicValue = data.dcf?.intrinsic_value || 0;
  const marginPct = data.margin?.margin_pct ?? 0;

  // Data for the side-by-side DCF vertical bar chart
  const dcfBarData = [
    { name: 'Market Price', value: currentPrice, color: '#06b6d4' },
    { name: 'Intrinsic Value', value: intrinsicValue, color: '#d4a853' },
  ];

  return (
    <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '1.5rem 2rem' }}>
      
      {/* Search & Back Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Search
        </Link>
        <div style={{ width: '320px' }}>
          <SearchBar />
        </div>
      </div>

      {/* Top Banner: Ticker + Price on Left, Pill Selectors on Right */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem',
        padding: '1.5rem 2rem',
        background: 'var(--glass-bg)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Left Side: Stock Identity */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em' }}>{data.stock_data.ticker}</h1>
            <span style={{ fontSize: '1.4rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              {data.stock_data.company_name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-teal)' }}>
              ${currentPrice.toFixed(2)}
            </span>
            <span style={{ 
              padding: '0.2rem 0.6rem', 
              borderRadius: '6px', 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: 'var(--color-success)', 
              fontWeight: 700, 
              fontSize: '0.95rem' 
            }}>
              +2.34%
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Market closed • {data.stock_data.sector} • {data.stock_data.industry}
            </span>
          </div>
        </div>

        {/* Right Side: Dual Pill Group Selectors */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Investor Lens Selector Pill Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
              Investor Lens
            </span>
            <div style={{ 
              display: 'flex', 
              background: 'rgba(15, 23, 42, 0.9)', 
              padding: '4px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)' 
            }}>
              {INVESTOR_OPTIONS.map((opt) => {
                const isActive = selectedInvestor === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleInvestorSelect(opt.value)}
                    style={{
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? 'linear-gradient(135deg, var(--color-gold), #b8922f)' : 'transparent',
                      color: isActive ? '#0f172a' : 'var(--color-text-secondary)',
                      boxShadow: isActive ? '0 0 16px rgba(212, 168, 83, 0.35)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Horizon Selector Pill Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
              Time Horizon
            </span>
            <div style={{ 
              display: 'flex', 
              background: 'rgba(15, 23, 42, 0.9)', 
              padding: '4px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)' 
            }}>
              {HORIZON_OPTIONS.map((opt) => {
                const isActive = selectedHorizon === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleHorizonSelect(opt.value)}
                    style={{
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                      boxShadow: isActive ? '0 0 16px rgba(6, 182, 212, 0.35)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Main 3-Column Desktop Grid Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
        gap: '1.5rem',
        alignItems: 'stretch'
      }}>

        {/* COLUMN 1: Scorecard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ScoreCard scorecard={data.scorecard} />
        </div>

        {/* COLUMN 2: DCF Intrinsic Value & Margin of Safety */}
        {data.stock_data.quote_type === "ETF" ? (
          <ETFProfileCard stockData={data.stock_data} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* DCF Intrinsic Value Card with Side-by-Side Vertical Bars */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <DollarSign size={18} color="var(--color-gold)" /> DCF Intrinsic Value
                </h3>
                <Info size={16} color="var(--color-text-muted)" title="2-stage DCF intrinsic value calculation" />
              </div>

              {/* Dual Vertical Bar Chart */}
              <div style={{ height: '180px', width: '100%', marginTop: '0.5rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dcfBarData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip 
                      formatter={(val) => [`$${val.toFixed(2)}`, 'Value']} 
                      contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={45}>
                      {dcfBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Market Price</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-teal)' }}>${currentPrice.toFixed(2)}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--color-border)' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Intrinsic Value</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gold)' }}>${intrinsicValue.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Margin of Safety Gauge */}
            <MarginGauge margin={data.margin} />
          </div>
        )}

        {/* COLUMN 3: Classification Badge, Risk Flags & AI Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Classification & Risk Card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Classification</span>
              <ClassificationBadge classification={data.classification} classificationLabel={data.classification_label} />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 0 }} />

            {/* Risk Flags Section */}
            <RiskFlags riskData={data.risk} />
          </div>

          {/* AI Written Memo Card */}
          <AIReport 
            ticker={ticker} 
            investor={selectedInvestor} 
            horizon={selectedHorizon} 
            investorLabel={data.scorecard?.investor_label} 
          />

        </div>

      </div>

      {/* Full Projected FCF Bar Chart for deeper analysis */}
      {data.dcf && data.dcf.projected_fcf && (
        <div style={{ marginTop: '2rem' }}>
          <DCFChart dcf={data.dcf} />
        </div>
      )}

      {/* Footer Disclaimer */}
      <div style={{ 
        marginTop: '3rem', 
        paddingTop: '1.5rem', 
        borderTop: '1px solid var(--color-border)', 
        color: 'var(--color-text-muted)', 
        fontSize: '0.8rem',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>🛡️ Not financial advice. Past performance does not guarantee future results. All data is provided for informational purposes only.</div>
        <div>Data powered by Yahoo! Finance • SEC Filings</div>
      </div>

    </div>
  );
};

export default StockAnalysisPage;
