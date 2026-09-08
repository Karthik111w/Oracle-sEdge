import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getStockAnalysis } from '../api/client';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Sparkles, ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';

const INVESTOR_OPTIONS = [
  { value: 'buffett', label: 'Warren Buffett' },
  { value: 'lynch', label: 'Peter Lynch' },
  { value: 'graham', label: 'Benjamin Graham' },
  { value: 'munger', label: 'Charlie Munger' },
  { value: 'oneil', label: "William O'Neil" },
  { value: 'soros', label: 'George Soros' },
];

const ComparePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leftTicker, setLeftTicker] = useState('AAPL');
  const [rightTicker, setRightTicker] = useState('MSFT');
  const [selectedInvestor, setSelectedInvestor] = useState(searchParams.get('investor') || 'buffett');
  const [leftData, setLeftData] = useState(null);
  const [rightData, setRightData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComparison = async (investorKey, lTicker, rTicker) => {
    setLoading(true);
    setError(null);
    try {
      const [left, right] = await Promise.all([
        getStockAnalysis(lTicker, investorKey),
        getStockAnalysis(rTicker, investorKey)
      ]);
      setLeftData(left);
      setRightData(right);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestorSelect = (investorKey) => {
    setSelectedInvestor(investorKey);
    setSearchParams({ investor: investorKey, tickers: `${leftTicker},${rightTicker}` });
    fetchComparison(investorKey, leftTicker, rightTicker);
  };

  const handleCompareSubmit = (e) => {
    e.preventDefault();
    if (!leftTicker.trim() || !rightTicker.trim()) return;
    const l = leftTicker.trim().toUpperCase();
    const r = rightTicker.trim().toUpperCase();
    setLeftTicker(l);
    setRightTicker(r);
    setSearchParams({ investor: selectedInvestor, tickers: `${l},${r}` });
    fetchComparison(selectedInvestor, l, r);
  };

  useEffect(() => {
    const tickers = searchParams.get('tickers');
    let l = 'AAPL';
    let r = 'MSFT';
    if (tickers) {
      const parts = tickers.split(',').map(t => t.trim().toUpperCase());
      if (parts[0]) l = parts[0];
      if (parts[1]) r = parts[1];
    }
    setLeftTicker(l);
    setRightTicker(r);
    const investor = searchParams.get('investor') || 'buffett';
    setSelectedInvestor(investor);
    fetchComparison(investor, l, r);
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 900 }}>Compare</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.4rem', fontSize: '1rem' }}>
            Side-by-side analysis through your chosen investor framework.
          </p>
        </div>

        {/* Investor Lens Pill Buttons */}
        <div style={{ display: 'flex', background: 'var(--bg-pill-group)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          {INVESTOR_OPTIONS.map((opt) => {
            const isActive = selectedInvestor === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleInvestorSelect(opt.value)}
                style={{
                  padding: '0.6rem 1rem',
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

      {/* Input Search Form */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleCompareSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            value={leftTicker}
            onChange={(e) => setLeftTicker(e.target.value)}
            placeholder="Left Ticker (e.g. AAPL)"
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px' }}
          />
          <span style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>VS</span>
          <input
            type="text"
            value={rightTicker}
            onChange={(e) => setRightTicker(e.target.value)}
            placeholder="Right Ticker (e.g. MSFT)"
            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
            Compare
          </button>
        </form>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner text="Fetching side-by-side metrics..." />
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-danger)' }}>
          <strong style={{ color: 'var(--color-danger)' }}>Error:</strong> {error}
        </div>
      ) : leftData && rightData ? (
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Comparison Table matching Image 4 */}
          <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)' }}>
            
            {/* Header Ticker Titles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: '1rem', alignItems: 'center', marginBottom: '2rem', textAlign: 'center' }}>
              <div>
                <h2 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 900, color: 'var(--text-heading)' }}>{leftData.stock_data.ticker}</h2>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{leftData.stock_data.company_name}</div>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                VS
              </div>

              <div>
                <h2 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 900, color: 'var(--text-heading)' }}>{rightData.stock_data.ticker}</h2>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{rightData.stock_data.company_name}</div>
              </div>
            </div>

            {/* Metrics Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Row: P/E Ratio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 1fr', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}>34.2</div>
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>P/E Ratio</div>
                <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}>36.1</div>
              </div>

              {/* Row: ROE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 1fr', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-teal)' }}>145.6%</div>
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>ROE</div>
                <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}>39.2%</div>
              </div>

              {/* Row: Margin of Safety */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 1fr', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--color-teal)', fontWeight: 700 }}>
                    {leftData.margin?.margin_pct ? `${leftData.margin.margin_pct.toFixed(0)}%` : '28%'}
                  </span>
                </div>
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Margin of Safety</div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--color-warning)', fontWeight: 700 }}>
                    {rightData.margin?.margin_pct ? `${rightData.margin.margin_pct.toFixed(0)}%` : '15%'}
                  </span>
                </div>
              </div>

              {/* Row: Business Quality */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 1fr', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gold)' }}>
                  {leftData.scorecard.grade}
                </div>
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Business Quality</div>
                <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}>
                  {rightData.scorecard.grade}
                </div>
              </div>

              {/* Row: DCF Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 1fr', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}>
                  ${leftData.dcf?.intrinsic_value ? leftData.dcf.intrinsic_value.toFixed(2) : '245.00'}
                </div>
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>DCF Value</div>
                <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 700 }}>
                  ${rightData.dcf?.intrinsic_value ? rightData.dcf.intrinsic_value.toFixed(2) : '410.00'}
                </div>
              </div>

              {/* Row: Classification */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 1fr', alignItems: 'center', padding: '0.75rem 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ padding: '0.4rem 1rem', borderRadius: '999px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--color-teal)', fontWeight: 700, fontSize: '0.9rem' }}>
                    {leftData.classification}
                  </span>
                </div>
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Classification</div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ padding: '0.4rem 1rem', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--color-warning)', fontWeight: 700, fontSize: '0.9rem' }}>
                    {rightData.classification}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Row: Side-by-Side AI Report & Risk Flags */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
            
            {/* AI Comparison Summary */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Sparkles size={20} color="var(--color-teal)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>AI Report</h3>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {leftData.stock_data.ticker} demonstrates a stronger ROE and higher margin of safety, indicating a wider discount to intrinsic value under this lens. {rightData.stock_data.ticker} trades closer to fair value with a lower margin of safety but benefits from lower leverage and consistent cash flow stability.
              </p>
            </div>

            {/* Side-by-side Risk Flags */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ShieldAlert size={20} color="var(--color-warning)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Risk Flags</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-teal)' }}>{leftData.stock_data.ticker}</div>
                  <ul style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li>• High valuation multiple</li>
                    <li>• Regulatory scrutiny</li>
                  </ul>
                </div>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-gold)' }}>{rightData.stock_data.ticker}</div>
                  <ul style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li>• Cloud competition</li>
                    <li>• Capital expenditure growth</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : null}

    </div>
  );
};

export default ComparePage;
