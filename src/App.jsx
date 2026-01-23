import React from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';

function App() {
  // 1. Den Loop starten
  useGameLoop();

  // 2. Daten aus dem Store holen
  const {
    cash,
    day,
    tick,
    workers,
    isPlaying,
    togglePause,
    hireWorker,
    fireWorker
  } = useGameStore();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🤖 AI Startup Simulator (Motor-Test)</h1>

      {/* STATUS BOARD */}
      <div style={{ border: '2px solid #333', padding: '10px', marginBottom: '20px' }}>
        <h2>Status</h2>
        <p><strong>Tag:</strong> {day}</p>
        <p><strong>Uhrzeit:</strong> {tick}:00 (1 Tick = 1 Minute)</p>

        {/* Visueller Indikator für Cashflow */}
        <p style={{ color: cash >= 0 ? 'green' : 'red', fontSize: '1.5em' }}>
          <strong>Cash:</strong> {cash.toFixed(2)} €
        </p>

        <p><strong>Mitarbeiter:</strong> {workers}</p>
        <p><strong>Status:</strong> {isPlaying ? '▶️ Läuft' : '⏸️ Pausiert'}</p>
      </div>

      {/* CONTROL PANEL (Was später die KI macht) */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={togglePause}
          style={{ padding: '10px', background: isPlaying ? '#ffcccc' : '#ccffcc' }}
        >
          {isPlaying ? 'PAUSE' : 'START'}
        </button>

        <button onClick={hireWorker}>
          Hire Worker (-500€ fix, +Profit/Tick)
        </button>

        <button onClick={fireWorker}>
          Fire Worker
        </button>
      </div>

      {/* LOG VIEW (Für später) */}
      <div style={{ marginTop: '20px', color: '#666' }}>
        <small>System bereit für Phaser-Integration...</small>
      </div>
    </div>
  );
}

export default App;
