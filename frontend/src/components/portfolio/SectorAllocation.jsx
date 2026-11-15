import React from 'react';
import { formatMoney } from '../home/LensVerdictCard';
import { pctFromFraction } from './format';

// Gold steps, largest first. The legend names every sector with its percentage, so the
// shade is never the only way to tell them apart.
const SHADES = [1, 0.78, 0.6, 0.46, 0.35, 0.27, 0.2, 0.15];

const SectorAllocation = ({ sectors }) => {
  const rows = [...sectors].filter((s) => Number.isFinite(s.weight) && s.weight > 0).sort((a, b) => b.weight - a.weight);
  if (rows.length === 0) return <p className="panel-note">No sector data for these holdings.</p>;
  const summary = rows.map((r) => `${r.sector} ${pctFromFraction(r.weight, 0)}`).join(', ');
  return (
    <div>
      <div className="pf2-stack" role="img" aria-label={`Sector allocation: ${summary}`}>
        {rows.map((r, i) => (
          <span key={r.sector} className="pf2-stack-seg" style={{ flexGrow: r.weight, '--shade': SHADES[i % SHADES.length] }} title={`${r.sector} ${pctFromFraction(r.weight)}`}>
            {r.weight >= 0.09 && <span className="mono">{pctFromFraction(r.weight, 0)}</span>}
          </span>
        ))}
      </div>
      <ul className="pf2-legend">
        {rows.map((r, i) => (
          <li key={r.sector}>
            <span className="pf2-swatch" style={{ '--shade': SHADES[i % SHADES.length] }} aria-hidden="true" />
            <span className="pf2-legend-name">{r.sector || 'Unknown'}</span>
            <span className="mono pf2-legend-val">{pctFromFraction(r.weight)}</span>
            <span className="mono muted pf2-legend-money hide-sm">{formatMoney(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SectorAllocation;
