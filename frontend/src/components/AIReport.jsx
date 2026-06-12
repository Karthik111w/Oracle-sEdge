import React, { useState, useEffect } from 'react';
import { getAIReport } from '../api/client';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const AIReport = ({ ticker }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAIReport(ticker);
      if (data.error) {
        setError(data.error);
      } else {
        setReport(data.report);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [ticker]);

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={24} color="var(--color-primary)" />
          <h2 style={{ margin: 0 }}>Buffett's Verdict</h2>
        </div>
        <button 
          onClick={fetchReport} 
          disabled={loading}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            padding: '0.5rem',
            color: 'var(--color-text-muted)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ 
              height: '4rem', 
              background: 'var(--color-border)', 
              borderRadius: '8px',
              animation: 'pulse 1.5s infinite ease-in-out',
              opacity: 0.5
            }}></div>
          ))}
        </div>
      ) : error ? (
        <div style={{
          padding: '1.5rem',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          <AlertCircle size={24} color="var(--color-danger)" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-danger)' }}>Could not generate AI report</h4>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--color-text)' }}>{error}</p>
            {error.includes('API key') && (
              <Link to="/settings" style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: 'var(--color-primary)',
                color: '#000',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 500
              }}>
                Configure API Key
              </Link>
            )}
          </div>
        </div>
      ) : report ? (
        <div style={{
          fontSize: '1.1rem',
          lineHeight: '1.8',
          color: 'var(--color-text)',
          whiteSpace: 'pre-wrap'
        }}>
          {report}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          Click refresh to generate the report.
        </div>
      )}
    </div>
  );
};

export default AIReport;
