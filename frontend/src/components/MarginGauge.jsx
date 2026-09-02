import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

const MarginGauge = ({ margin }) => {
  const [fillValue, setFillValue] = useState(0);

  const rawPct = margin && typeof margin.margin_pct === 'number' ? margin.margin_pct : 0;
  const pctSafe = margin && typeof margin.margin_pct === 'number' ? margin.margin_pct : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      let pct = rawPct;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      setFillValue(pct);
    }, 100);
    return () => clearTimeout(timer);
  }, [rawPct]);

  // Determine gauge color
  let gaugeColor = '#10b981'; // Teal/Green by default
  if (pctSafe !== null) {
    if (pctSafe >= 30) gaugeColor = '#06b6d4'; // Cyan
    else if (pctSafe >= 15) gaugeColor = '#10b981'; // Green
    else if (pctSafe >= 0) gaugeColor = '#f59e0b'; // Amber
    else gaugeColor = '#ef4444'; // Red
  }

  // Ring gauge SVG calculations
  const size = 110;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fillValue / 100) * circumference;

  let descriptionText = "No valuation margin available for this security.";
  if (pctSafe !== null) {
    if (pctSafe >= 30) {
      descriptionText = "The stock appears to be trading significantly below our estimated intrinsic value, offering a strong margin of safety.";
    } else if (pctSafe >= 15) {
      descriptionText = "The stock appears to be trading below our estimated intrinsic value, offering a reasonable margin of safety.";
    } else if (pctSafe >= 0) {
      descriptionText = "The stock is trading near fair value. Exercise discipline when allocating capital.";
    } else {
      descriptionText = "The stock appears to be trading above our estimated intrinsic value, presenting premium valuation risk.";
    }
  }

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShieldCheck size={18} color="var(--color-teal)" /> Margin of Safety
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.5rem' }}>
        
        {/* Donut Circular Gauge */}
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
            />
            {/* Indicator Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
          </svg>

          {/* Centered Percentage */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: gaugeColor
          }}>
            {pctSafe !== null ? `${Math.round(pctSafe)}%` : 'N/A'}
          </div>
        </div>

        {/* Text Description on Right */}
        <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
          {descriptionText}
        </div>

      </div>
    </div>
  );
};

export default MarginGauge;
