import React from 'react';
import { useGameStore } from '../store/gameStore';

export function StatusBoard() {
  const day = useGameStore((state) => state.day);
  const tick = useGameStore((state) => state.tick);
  const cash = useGameStore((state) => state.cash);
  const ceoPersona = useGameStore((state) => state.ceoPersona);
  const workers = useGameStore((state) => state.workers);

  return (
    <div className="panel status-board reveal" style={{ '--reveal-delay': '0.05s' }}>
      <h2 className="panel-header">
        <span className="panel-header-dot" />
        Company Status
      </h2>
      <div className="status-row">
        <span className="stat-pill">
          <em>DAY</em>
          {day}
        </span>
        <span className="stat-pill">
          <em>TIME</em>0:{tick.toString().padStart(2, '0')}
        </span>
      </div>
      <div className={`cash-display ${cash >= 0 ? 'cash-positive' : 'cash-negative'}`}>
        <span className="cash-label">Treasury</span>
        <strong>{cash.toLocaleString(undefined, { maximumFractionDigits: 0 })} €</strong>
      </div>
      <div className="status-footer">
        <span>
          CEO: <strong className="ceo-name">{ceoPersona}</strong>
        </span>
        <span>Workers: {workers}</span>
      </div>
    </div>
  );
}
