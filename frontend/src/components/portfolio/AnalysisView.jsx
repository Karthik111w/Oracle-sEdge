import React from 'react';
import { AlertTriangle } from 'lucide-react';
import AnalysisSummary from './AnalysisSummary';
import PositionsTable from './PositionsTable';
import SectorAllocation from './SectorAllocation';
import PerformanceChart from './PerformanceChart';
import CorrelationHeatmap from './CorrelationHeatmap';

export const AnalysisSkeleton = () => (
  <div className="pf2-stack-gap" aria-busy="true">
    <div className="pf2-tiles">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="pf2-tile">
          <span className="skel skel-cell" />
          <span className="skel skel-lg pf2-skel-value" />
        </div>
      ))}
    </div>
    <div className="panel">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skel skel-row pf2-skel-row" />
      ))}
    </div>
    <div className="panel">
      <div className="skel skel-md" />
    </div>
  </div>
);

const AnalysisView = ({ data, investorLabel, investor, horizon }) => {
  const positions = data.positions || [];
  const warnings = data.warnings || [];
  return (
    <div className="pf2-stack-gap">
      <AnalysisSummary data={data} />

      {warnings.length > 0 && (
        <section className="pf2-warnings" aria-label="Warnings">
          <ul>
            {warnings.map((w) => (
              <li key={w}>
                <AlertTriangle size={15} aria-hidden="true" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel" aria-labelledby="pf2-positions-title">
        <header className="panel-head">
          <div>
            <h3 id="pf2-positions-title">Positions</h3>
            <p className="panel-note">Scores, verdicts and margin of safety use the {investorLabel} lens. Select a column heading to sort.</p>
          </div>
        </header>
        <PositionsTable positions={positions} totalValue={data.total_value} investor={investor} horizon={horizon} />
      </section>

      <div className="pf2-pair">
        <section className="panel" aria-labelledby="pf2-sector-title">
          <header className="panel-head">
            <h3 id="pf2-sector-title">Sector allocation</h3>
          </header>
          <SectorAllocation sectors={data.sector_allocation || []} />
        </section>
        <section className="panel" aria-labelledby="pf2-corr-title">
          <header className="panel-head">
            <div>
              <h3 id="pf2-corr-title">Correlation</h3>
              <p className="panel-note">Weekly returns over the last year. Closer to 1 means the two move together.</p>
            </div>
          </header>
          <CorrelationHeatmap correlation={data.correlation} />
        </section>
      </div>

      <section className="panel" aria-labelledby="pf2-perf-title">
        <header className="panel-head">
          <div>
            <h3 id="pf2-perf-title">Performance against SPY</h3>
            <p className="panel-note">Both rebased to 100 a year ago, using current holdings. Weekly closes.</p>
          </div>
        </header>
        <PerformanceChart performance={data.performance} />
      </section>
    </div>
  );
};

export default AnalysisView;
