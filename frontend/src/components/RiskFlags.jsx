import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

// Shows every flag the backend raised, whether or not it was severe enough to force an Avoid.
const RiskFlags = ({ riskData }) => {
  if (!riskData) return null;
  const flags = riskData.flags || [];

  return (
    <section className="panel" aria-labelledby="risk-title">
      <header className="panel-head">
        <h3 id="risk-title" className="an-h3">Risk flags</h3>
        {riskData.is_avoid && <span className="tone-neg panel-tag">Forces an Avoid</span>}
      </header>
      {flags.length === 0 ? (
        <p className="panel-text an-clear"><Check size={16} aria-hidden="true" /> No red flags in the latest filings: debt, cash flow, earnings trend, interest coverage and margins all pass.</p>
      ) : (
        <ul className="flag-list">
          {flags.map((flag, i) => (
            <motion.li
              key={flag.flag}
              className="an-flag"
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: Math.min(i, 7) * 0.08 }}
            >
              <div className="flag-head">
                <span className="tone-neg">{flag.flag}</span>
                {flag.value && <span className="mono muted">{flag.value}</span>}
              </div>
              <p className="panel-text">{flag.description}</p>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RiskFlags;
