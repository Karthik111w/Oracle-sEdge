import React, { useEffect, useState } from 'react';

const MarginGauge = ({ margin }) => {
  const [fillValue, setFillValue] = useState(0);
  
  useEffect(() => {
    // Animate on mount
    const timer = setTimeout(() => {
      // Clamp margin between -50% and 50% for the gauge display
      let pct = margin.margin_pct;
      if (pct < -50) pct = -50;
      if (pct > 50) pct = 50;
      
      // Normalize to 0-100 scale where 0 is -50% and 100 is +50%
      const normalized = ((pct + 50) / 100) * 100;
      setFillValue(normalized);
    }, 100);
    return () => clearTimeout(timer);
  }, [margin]);

  let gaugeColor = 'var(--color-text-muted)';
  if (margin.margin_pct >= 30) gaugeColor = 'var(--color-success)';
  else if (margin.margin_pct >= 15) gaugeColor = 'var(--color-success)';
  else if (margin.margin_pct >= 0) gaugeColor = 'var(--color-warning)';
  else gaugeColor = 'var(--color-danger)';

  // Calculate SVG arc parameters
  const radius = 80;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (fillValue / 100) * circumference;

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', height: '100%' }}>
      <h3 style={{ margin: 0, fontSize: '1.25rem', width: '100%', textAlign: 'left' }}>Margin of Safety</h3>
      
      <div style={{ position: 'relative', width: '200px', height: '110px', marginTop: '1rem' }}>
        <svg viewBox="0 0 200 110" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Background Arc */}
          <path 
            d="M 10,100 A 90,90 0 0,1 190,100" 
            fill="none" 
            stroke="var(--color-border)" 
            strokeWidth="16" 
            strokeLinecap="round" 
          />
          {/* Colored Fill Arc */}
          <path 
            d="M 10,100 A 90,90 0 0,1 190,100" 
            fill="none" 
            stroke={gaugeColor} 
            strokeWidth="16" 
            strokeLinecap="round" 
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
              transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s'
            }}
          />
        </svg>
        
        <div style={{ 
          position: 'absolute', 
          bottom: '0', 
          left: '0', 
          right: '0', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: gaugeColor, lineHeight: '1' }}>
            {margin.margin_pct > 0 ? '+' : ''}{margin.margin_pct.toFixed(1)}%
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>
            {margin.classification.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        width: '100%', 
        background: 'rgba(255,255,255,0.03)', 
        padding: '1rem', 
        borderRadius: '8px',
        marginTop: 'auto'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Current Price</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>${margin.current_price.toFixed(2)}</span>
        </div>
        <div style={{ width: '1px', background: 'var(--color-border)' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Intrinsic Value</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)' }}>${margin.intrinsic_value.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default MarginGauge;
