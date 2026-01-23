import React from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { GameCanvas } from './components/GameCanvas';

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
    <div style={{ padding: '20px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1>🤖 AI Startup Simulator (Phase 2: Architecture)</h1>

      {/* DASHBOARD & CONTROLS CONTAINER */}
      <div style={{ display: 'flex', gap: '20px', width: '800px', marginBottom: '10px' }}>

        {/* STATUS BOARD */}
        <div style={{ flex: 1, border: '2px solid #333', padding: '10px' }}>
          <h2>Status</h2>
          <p><strong>Tag:</strong> {day} | <strong>Uhrzeit:</strong> {tick}:00</p>
          <p style={{ color: cash >= 0 ? 'green' : 'red', fontSize: '1.2em' }}>
            <strong>Cash:</strong> {cash.toFixed(2)} €
          </p>
          <p><strong>Mitarbeiter:</strong> {workers}</p>
          <p><strong>Status:</strong> {isPlaying ? '▶️ Läuft' : '⏸️ Pausiert'}</p>
        </div>

        {/* CONTROL PANEL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={togglePause}
            style={{ padding: '10px', background: isPlaying ? '#ffcccc' : '#ccffcc', cursor: 'pointer' }}
          >
            {isPlaying ? 'PAUSE' : 'START'}
          </button>

          <button onClick={hireWorker} style={{ padding: '10px', cursor: 'pointer' }}>
            Hire Worker (-500€ fix)
          </button>

          <button onClick={fireWorker} style={{ padding: '10px', cursor: 'pointer' }}>
            Fire Worker
          </button>
        </div>
      </div>

      {/* PHASER GAME CANVAS */}
      <GameCanvas />

      <div style={{ color: '#666' }}>
        <small>Rendering via Phaser 3 | Logic via Zustand Store</small>
      </div>
    </div>
  );
}

export default App;
