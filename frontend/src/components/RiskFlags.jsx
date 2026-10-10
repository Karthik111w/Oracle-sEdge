import React from 'react';

// Shows every flag the backend raised, whether or not it was severe enough to force an Avoid.
const RiskFlags = ({ riskData }) => {
  if (!riskData) return null;
  const flags = riskData.flags || [];

  return (
    <section className="panel" aria-labelledby="risk-title">
      <header className="panel-head">
        <h2 id="risk-title">Risk flags</h2>
        {riskData.is_avoid && <span className="tone-neg panel-tag">Forces an Avoid</span>}
      </header>
      {flags.length === 0 ? (
        <p className="panel-text">No red flags in the latest filings: debt, cash flow, earnings trend, interest coverage and margins all pass.</p>
      ) : (
        <ul className="flag-list">
          {flags.map((flag) => (
            <li key={flag.flag}>
              <div className="flag-head">
                <span className="tone-neg">{flag.flag}</span>
                {flag.value && <span className="mono muted">{flag.value}</span>}
              </div>
              <p className="panel-text">{flag.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RiskFlags;
