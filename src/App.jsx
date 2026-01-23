import React from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useAiDirector } from './hooks/useAiDirector';
import { GameCanvas } from './components/GameCanvas';
import { ApiKeyModal } from './components/ApiKeyModal';
import { RetroTerminal } from './components/RetroTerminal';

function App() {
  // 1. Den Loop starten
  useGameLoop();

  // 2. Den AI Director starten
  useAiDirector();

  // 3. Daten aus dem Store holen
  const {
    cash,
    day,
    tick,
    workers,
    gamePhase,
    isPlaying,
    togglePause,
    hireWorker,
    fireWorker,
    isMuted,
    toggleMute
  } = useGameStore();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#222', minHeight: '100vh', color: '#fff' }}>
      <h1>🤖 AI Startup Simulator (Core Mechanics)</h1>

      <button
        onClick={toggleMute}
        style={{ position: 'absolute', top: 20, left: 20, padding: '5px 10px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}
      >
        {isMuted ? '🔇 Unmute' : '🔊 Mute'}
      </button>

      {/* MODALS */}
      <ApiKeyModal />

      {/* DASHBOARD */}
      <div style={{ display: 'flex', gap: '20px', width: '800px', marginBottom: '20px' }}>

        {/* STATUS BOARD */}
        <div style={{ flex: 1, border: '2px solid #555', padding: '15px', background: '#333' }}>
          <h2 style={{ marginTop: 0 }}>Status</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <span>Day: {day}</span>
             <span>Time: 0:{tick.toString().padStart(2, '0')}</span>
          </div>
          <p style={{ color: cash >= 0 ? '#4caf50' : '#f44336', fontSize: '1.5em', margin: '10px 0' }}>
            <strong>{cash.toFixed(0)} €</strong>
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#aaa' }}>
             <span>Workers: {workers}</span>
             <span>Phase: {gamePhase}</span>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={togglePause}
            disabled={gamePhase === 'CRUNCH'}
            style={{
                padding: '10px',
                background: isPlaying ? '#ff5555' : '#55ff55',
                color: '#000',
                fontWeight: 'bold',
                cursor: gamePhase === 'CRUNCH' ? 'not-allowed' : 'pointer',
                opacity: gamePhase === 'CRUNCH' ? 0.3 : 1
            }}
          >
            {isPlaying ? 'PAUSE' : 'START'}
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
                onClick={hireWorker}
                disabled={gamePhase === 'CRUNCH'}
                style={{ flex: 1, padding: '10px', background: '#444', color: '#fff', border: '1px solid #666', cursor: 'pointer' }}
            >
                Hire (+Profit)
            </button>
            <button
                onClick={fireWorker}
                disabled={gamePhase === 'CRUNCH'}
                style={{ flex: 1, padding: '10px', background: '#444', color: '#fff', border: '1px solid #666', cursor: 'pointer' }}
            >
                Fire (-Burn)
            </button>
          </div>
        </div>
      </div>

      {/* PHASER GAME CANVAS */}
      <div style={{ border: '4px solid #555' }}>
         <GameCanvas />
      </div>

      {/* TERMINAL (Bottom) */}
      <RetroTerminal />

    </div>
  );
}

export default App;
