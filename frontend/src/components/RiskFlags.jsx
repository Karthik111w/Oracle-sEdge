import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const RiskFlags = ({ riskData }) => {
  if (!riskData) return null;

  const { is_avoid, flags } = riskData;

  if (!is_avoid || !flags || flags.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-success)' }}>
        <CheckCircle size={32} color="var(--color-success)" />
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-success)' }}>All Clear</h3>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>No critical risk flags detected in the financial statements.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-danger)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <AlertTriangle size={28} color="var(--color-danger)" />
        <h3 style={{ margin: 0, color: 'var(--color-danger)' }}>Critical Risk Flags</h3>
      </div>
      
      <div style={{ display: 'grid', gap: '1rem' }}>
        {flags.map((flag, index) => (
          <div key={index} style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px'
          }}>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-text)' }}>{flag.flag}</h4>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              {flag.description}
            </p>
            {flag.value && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                Value: {flag.value}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskFlags;
