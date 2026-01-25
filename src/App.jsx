import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useAiDirector } from './hooks/useAiDirector';
import { GameCanvas } from './components/GameCanvas';
import { ApiKeyModal } from './components/ApiKeyModal';
import { RetroTerminal } from './components/RetroTerminal';
import { DecisionPopup } from './components/DecisionPopup';
import { AiStatus } from './components/AiStatus';
import './App.css';

// Simple Floating Number Component (Internal)
const FloatingNumber = ({ value, x, y, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500); // Match CSS animation
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="floating-number"
      style={{
        left: x,
        top: y,
        color: value >= 0 ? '#4caf50' : '#f44336',
      }}
    >
      {value >= 0 ? '+' : ''}
      {value} €
    </div>
  );
};

function App() {
  // 1. Den Loop starten
  useGameLoop();

  // 2. Den AI Director starten
  const { lastDecision, confirmDecision } = useAiDirector();

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

  // 4. Floating Numbers Logic
  const [floater, setFloater] = useState(null);
  // Use Ref for tracking previous value to avoid render loops/dependency issues
  const prevCashRef = useRef(cash);

  useEffect(() => {
    const delta = cash - prevCashRef.current;

    if (Math.abs(delta) >= 100) {
      const randomX = 300 + Math.random() * 200;
      const randomY = 100 + Math.random() * 50;
      const id = Date.now();
      setFloater({ id, value: delta, x: randomX, y: randomY });
    }

    // Update ref AFTER check
    prevCashRef.current = cash;
  }, [cash]);

  const handleFloaterComplete = () => {
    setFloater(null);
  };

  return (
    <div className="app-container">
      <h1>🤖 AI Startup Simulator (Visual Polish)</h1>

      <button onClick={toggleMute} className="mute-button">
        {isMuted ? '🔇 Unmute' : '🔊 Mute'}
      </button>

      {/* MODALS */}
      <ApiKeyModal />
      <DecisionPopup decision={lastDecision} onConfirm={confirmDecision} />

      {/* JUICE: Floating Number */}
      {floater && (
        <FloatingNumber
          key={floater.id}
          value={floater.value}
          x={floater.x}
          y={floater.y}
          onComplete={handleFloaterComplete}
        />
      )}

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
          {/* AI STATUS EYE */}
          <AiStatus />

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

      {/* CRT OVERLAY */}
      <div className="crt-overlay" />
    </div>
  );
}

export default App;
