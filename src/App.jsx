import React from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useAiDirector } from './hooks/useAiDirector';
import { GameCanvas } from './components/GameCanvas';
import { ApiKeyModal } from './components/ApiKeyModal';
import { RetroTerminal } from './components/RetroTerminal';
import './App.css';

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
    gameSpeed,
    ceoPersona,
    togglePause,
    toggleSpeed,
    hireWorker,
    fireWorker,
    isMuted,
    toggleMute,
  } = useGameStore();

  return (
    <div className="app-container">
      <h1>🤖 AI Startup Simulator (Deep Sim)</h1>

      <button onClick={toggleMute} className="mute-button">
        {isMuted ? '🔇 Unmute' : '🔊 Mute'}
      </button>

      {/* MODALS */}
      <ApiKeyModal />

      {/* DASHBOARD */}
      <div className="dashboard">
        {/* STATUS BOARD */}
        <div className="status-board">
          <h2 className="status-header">Status</h2>
          <div className="status-row">
            <span>Day: {day}</span>
            <span>Time: 0:{tick.toString().padStart(2, '0')}</span>
          </div>
          <p className={`cash-display ${cash >= 0 ? 'cash-positive' : 'cash-negative'}`}>
            <strong>{cash.toFixed(0)} €</strong>
          </p>
          <div className="status-footer">
            <span>
              CEO: <strong className="ceo-name">{ceoPersona}</strong>
            </span>
            <span>Workers: {workers}</span>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="controls">
          <div className="control-group">
            <button
              onClick={togglePause}
              disabled={gamePhase === 'CRUNCH'}
              className={`pause-button ${isPlaying ? 'playing' : 'paused'}`}
            >
              {isPlaying ? 'PAUSE' : 'START'}
            </button>
            <button onClick={toggleSpeed} className="speed-button">
              {gameSpeed === 1000 ? '1x' : '2x'}
            </button>
          </div>

          <div className="control-group">
            <button
              onClick={hireWorker}
              disabled={gamePhase === 'CRUNCH'}
              className="action-button"
            >
              Hire (+Profit)
            </button>
            <button
              onClick={fireWorker}
              disabled={gamePhase === 'CRUNCH'}
              className="action-button"
            >
              Fire (-Burn)
            </button>
          </div>
        </div>
      </div>

      {/* PHASER GAME CANVAS */}
      <div className="game-canvas-container">
        <GameCanvas />
      </div>

      {/* TERMINAL (Bottom) */}
      <RetroTerminal />
    </div>
  );
}

export default App;
