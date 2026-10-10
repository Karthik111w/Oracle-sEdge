import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { getAIReport } from '../api/client';

const AIReport = ({ ticker, investor = 'buffett', horizon = 'long', investorLabel = 'Investor' }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAIReport(ticker, investor, horizon);
      if (data.error) setError(data.error);
      else setReport(data.report);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [ticker, investor, horizon]);

  const needsKey = error && /API key/i.test(error);

  return (
    <section className="panel" aria-labelledby="memo-title" aria-busy={loading}>
      <header className="panel-head">
        <div>
          <h2 id="memo-title">Memo in {investorLabel}'s voice</h2>
          <p className="panel-note">Written by Gemini from the figures on this page. {horizon === 'short' ? 'Short-term' : 'Long-term'} horizon.</p>
        </div>
        <button type="button" className="btn-quiet" onClick={fetchReport} disabled={loading}>
          <RefreshCw size={14} aria-hidden="true" /> Regenerate
        </button>
      </header>

      {loading ? (
        <div className="memo-skel" aria-hidden="true">
          <span className="skel" />
          <span className="skel" />
          <span className="skel" />
        </div>
      ) : needsKey ? (
        <p className="panel-text">
          Add a Gemini API key in <Link to="/settings">Settings</Link> to get this memo.
        </p>
      ) : error ? (
        <p className="panel-text tone-neg">{error}</p>
      ) : report ? (
        <div className="memo">{report}</div>
      ) : null}
    </section>
  );
};

export default AIReport;
