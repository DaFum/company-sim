import React from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useAiDirector } from './hooks/useAiDirector';
import { GameCanvas } from './components/GameCanvas';
import { ApiKeyModal } from './components/ApiKeyModal';
import { DecisionPopup } from './components/DecisionPopup';

function App() {
  // 1. Den Loop starten
  useGameLoop();

  // 2. Den AI Director starten (hört auf Signale vom Loop/Store)
  const { lastDecision, confirmDecision } = useAiDirector();

  // 3. Daten aus dem Store holen
  const {
    cash,
    day,
    tick,
    workers,
    isPlaying,
    isAiThinking,
    togglePause,
    hireWorker,
    fireWorker,
    isMuted,
    toggleMute
  } = useGameStore();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1>🤖 AI Startup Simulator (Phase 4: Polish)</h1>

      <button
        onClick={toggleMute}
        style={{ position: 'absolute', top: 20, left: 20, padding: '5px 10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        {isMuted ? '🔇 Unmute' : '🔊 Mute'}
      </button>

      {/* MODALS & OVERLAYS */}
      <ApiKeyModal />
      <DecisionPopup decision={lastDecision} onConfirm={confirmDecision} />

      {/* THINKING OVERLAY */}
      {isAiThinking && !lastDecision && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          background: '#ffcc00', color: '#000', padding: '10px 20px',
          borderRadius: '5px', fontWeight: 'bold', zIndex: 1000,
          animation: 'pulse 1s infinite'
        }}>
          🤔 CEO denkt nach...
        </div>
      )}

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
            disabled={isAiThinking}
            style={{ padding: '10px', background: isPlaying ? '#ffcccc' : '#ccffcc', cursor: isAiThinking ? 'not-allowed' : 'pointer', opacity: isAiThinking ? 0.5 : 1 }}
          >
            {isPlaying ? 'PAUSE' : 'START'}
          </button>

          <button onClick={hireWorker} disabled={isAiThinking} style={{ padding: '10px', cursor: 'pointer' }}>
            Hire Worker (-500€ fix)
          </button>

          <button onClick={fireWorker} disabled={isAiThinking} style={{ padding: '10px', cursor: 'pointer' }}>
            Fire Worker
          </button>
        </div>
      </div>

      {/* PHASER GAME CANVAS */}
      <GameCanvas />

      <div style={{ color: '#666' }}>
        <small>Rendering via Phaser 3 | Logic via Zustand Store | Brain via OpenAI</small>
      </div>
    </div>
  );
}

export default App;
