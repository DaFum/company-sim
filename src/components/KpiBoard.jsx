import React from 'react';
import { useGameStore } from '../store/gameStore';

export function KpiBoard() {
  const mood = useGameStore((state) => state.mood);
  const technicalDebt = useGameStore((state) => state.technicalDebt);
  const productivity = useGameStore((state) => state.productivity);
  const productLevel = useGameStore((state) => state.productLevel);
  const serverHealth = useGameStore((state) => state.serverHealth);
  const marketingMultiplier = useGameStore((state) => state.marketingMultiplier);
  const marketingLeft = useGameStore((state) => state.marketingLeft);
  const inventory = useGameStore((state) => state.inventory);
  const activeEvents = useGameStore((state) => state.activeEvents);

  const roster = useGameStore((state) => state.roster);
  const dailyBurn = React.useMemo(() => useGameStore.getState().getStats().totalBurn, [roster]);
  const burnPerTick = dailyBurn / 60;

  const activeEventLabel = React.useMemo(() => {
    return activeEvents?.length ? activeEvents.map((event) => event.type).join(', ') : 'None';
  }, [activeEvents]);

  const inventoryLabel = React.useMemo(() => {
    return inventory?.length ? inventory.join(', ') : 'Empty';
  }, [inventory]);

  return (
    <div className="panel kpi-board reveal" style={{ '--reveal-delay': '0.10s' }}>
      <h2 className="panel-header">
        <span className="panel-header-dot" />
        Company KPIs
      </h2>
      <div className="kpi-grid">
        <div className="kpi-item">
          <span className="kpi-label">Burn / Day</span>
          <span className="kpi-value">{dailyBurn} €</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Burn / Tick</span>
          <span className="kpi-value">{burnPerTick.toFixed(1)} €</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Mood</span>
          <span className="kpi-value">{Math.round(mood)}%</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Productivity</span>
          <span className="kpi-value">{Math.round(productivity)}</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Tech Debt</span>
          <span className="kpi-value">{Math.round(technicalDebt)}</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Product Lvl</span>
          <span className="kpi-value">{productLevel}</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Server</span>
          <span className="kpi-value">{Math.round(serverHealth)}%</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Marketing</span>
          <span className="kpi-value">
            {marketingMultiplier}x{marketingLeft > 0 ? ` · ${marketingLeft}t` : ''}
          </span>
        </div>
        <div className="kpi-item kpi-wide">
          <span className="kpi-label">Active Events</span>
          <span className="kpi-value kpi-small-value">{activeEventLabel}</span>
        </div>
        <div className="kpi-item kpi-wide">
          <span className="kpi-label">Inventory</span>
          <span className="kpi-value kpi-small-value">{inventoryLabel}</span>
        </div>
      </div>
    </div>
  );
}
