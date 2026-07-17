import React from 'react';
import { useGameStore } from '../store/gameStore';

export function PortfolioBoard() {
  const cash = useGameStore((state) => state.cash);
  const productLevel = useGameStore((state) => state.productLevel);
  const marketingMultiplier = useGameStore((state) => state.marketingMultiplier);
  const serverHealth = useGameStore((state) => state.serverHealth);
  const productivity = useGameStore((state) => state.productivity);
  const roster = useGameStore((state) => state.roster);
  const employees = useGameStore((state) => state.employees);

  const dailyBurn = useGameStore((state) => state.getStats().totalBurn);

  const traitCounts = (employees || []).reduce((counts, employee) => {
    counts[employee.trait] = (counts[employee.trait] || 0) + 1;
    return counts;
  }, {});
  const topTraits = Object.entries(traitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const runwayDays = dailyBurn > 0 ? Math.max(0, Math.floor(cash / dailyBurn)) : 999;
  const productHeat = Math.min(100, Math.round(productLevel * 14 + marketingMultiplier * 12));
  const opsReadiness = Math.min(
    100,
    Math.round(serverHealth * 0.55 + productivity * 2 + (roster?.support || 0) * 8)
  );

  return (
    <div className="panel portfolio-board reveal" style={{ '--reveal-delay': '0.14s' }}>
      <h2 className="panel-header">
        <span className="panel-header-dot" />
        Simulation Portfolio
      </h2>
      <div className="portfolio-grid">
        <div className="portfolio-card portfolio-card-hot">
          <span>Runway</span>
          <strong>{runwayDays}d</strong>
          <small>cash endurance</small>
        </div>
        <div className="portfolio-card portfolio-card-cyan">
          <span>Product Heat</span>
          <strong>{productHeat}%</strong>
          <small>market pull</small>
        </div>
        <div className="portfolio-card portfolio-card-green">
          <span>Ops Readiness</span>
          <strong>{opsReadiness}%</strong>
          <small>resilience index</small>
        </div>
      </div>
      <div className="roster-strip" aria-label="Team roles">
        <span>
          DEV <strong>{roster?.dev || 0}</strong>
        </span>
        <span>
          SALES <strong>{roster?.sales || 0}</strong>
        </span>
        <span>
          SUPPORT <strong>{roster?.support || 0}</strong>
        </span>
      </div>
      <div className="trait-cloud" aria-label="Employee traits">
        {topTraits.length ? (
          topTraits.map(([trait, count]) => (
            <span key={trait} className="trait-chip">
              {trait.replace(/_/g, ' ')} <strong>{count}</strong>
            </span>
          ))
        ) : (
          <span className="trait-chip">NO CREW</span>
        )}
      </div>
    </div>
  );
}
