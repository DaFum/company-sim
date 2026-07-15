import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useAiDirector } from './hooks/useAiDirector';
import { ApiKeyModal } from './components/ApiKeyModal';
import { RetroTerminal } from './components/RetroTerminal';
import { DecisionPopup } from './components/DecisionPopup';
import { AiStatus } from './components/AiStatus';
import './App.css';

// GameCanvas pulls in Phaser (~1.4 MB). Load it lazily so the HUD paints first
// and Phaser lands in its own async chunk instead of the main bundle.
const GameCanvas = lazy(() =>
  import('./components/GameCanvas').then((m) => ({ default: m.GameCanvas }))
);

// Simple Floating Number Component (Internal)
const FloatingNumber = ({ id, value, x, y, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(id), 1500); // Match CSS animation
    return () => clearTimeout(timer);
  }, [id, onComplete]);

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
  useAiDirector();
  const lastDecision = useGameStore((state) => state.pendingDecision);
  const confirmDecision = useGameStore((state) => state.applyPendingDecision);

  // Clear any pending store timers (e.g. the veto pizza-party timeout) when the
  // app unmounts, so stray setTimeout callbacks don't fire against a torn-down store.
  const clearTimers = useGameStore((state) => state.clearTimers);
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // 3. Daten aus dem Store holen.
  // Individual selectors so App only re-renders when a value it actually shows
  // changes — not on every unrelated store mutation (logs, mood, events, …).
  const cash = useGameStore((state) => state.cash);
  const day = useGameStore((state) => state.day);
  const tick = useGameStore((state) => state.tick);
  const workers = useGameStore((state) => state.workers);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const gameSpeed = useGameStore((state) => state.gameSpeed);
  const ceoPersona = useGameStore((state) => state.ceoPersona);
  const togglePause = useGameStore((state) => state.togglePause);
  const toggleSpeed = useGameStore((state) => state.toggleSpeed);
  const hireWorker = useGameStore((state) => state.hireWorker);
  const fireWorker = useGameStore((state) => state.fireWorker);
  const isMuted = useGameStore((state) => state.isMuted);
  const toggleMute = useGameStore((state) => state.toggleMute);

  // 4. Floating Numbers Logic
  // Track a list (not a single slot) so rapid cash swings each get their own
  // number instead of clobbering the previous one.
  const [floaters, setFloaters] = useState([]);
  // Use Ref for tracking previous value to avoid render loops/dependency issues
  const prevCashRef = useRef(cash);
  // Monotonic id so stacked floaters never collide (unlike Date.now()).
  const floaterIdRef = useRef(0);

  useEffect(() => {
    const delta = cash - prevCashRef.current;

    if (Math.abs(delta) >= 100) {
      const randomX = 300 + Math.random() * 200;
      const randomY = 100 + Math.random() * 50;
      floaterIdRef.current += 1;
      const id = floaterIdRef.current;
      setFloaters((list) => [...list, { id, value: Math.round(delta), x: randomX, y: randomY }]);
    }

    // Update ref AFTER check
    prevCashRef.current = cash;
  }, [cash]);

  // Stable callback so FloatingNumber's timer effect isn't reset on every tick.
  const handleFloaterComplete = useCallback((id) => {
    setFloaters((list) => list.filter((f) => f.id !== id));
  }, []);

  const phaseLabel = gamePhase === 'CRUNCH' ? 'CRUNCH' : isPlaying ? 'LIVE' : 'STANDBY';

  return (
    <div className="app-container">
      {/* AMBIENT BACKDROP LAYERS */}
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-vignette" aria-hidden="true" />

      {/* MASTHEAD */}
      <header className="app-header">
        <div className="brand">
          <span className="brand-glyph">▲</span>
          <div className="brand-text">
            <h1>
              AI Startup <span className="brand-accent">Simulator</span>
            </h1>
            <p className="brand-sub">AUTONOMOUS COMPANY DIRECTOR // v1.0</p>
          </div>
        </div>

        <div className="header-tools">
          <span className={`phase-chip phase-${phaseLabel.toLowerCase()}`}>
            <i className="phase-dot" />
            {phaseLabel}
          </span>
          <button
            type="button"
            onClick={toggleMute}
            className="mute-button"
            title="Toggle sound"
            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* MODALS */}
      <ApiKeyModal />
      <DecisionPopup decision={lastDecision} onConfirm={confirmDecision} />

      {/* JUICE: Floating Numbers */}
      {floaters.map((f) => (
        <FloatingNumber
          key={f.id}
          id={f.id}
          value={f.value}
          x={f.x}
          y={f.y}
          onComplete={handleFloaterComplete}
        />
      ))}

      {/* DASHBOARD */}
      <div className="dashboard">
        {/* STATUS BOARD */}
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

        {/* CONTROLS */}
        <div className="panel controls reveal" style={{ '--reveal-delay': '0.15s' }}>
          <h2 className="panel-header">
            <span className="panel-header-dot" />
            Command Deck
          </h2>

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
              className="action-button action-hire"
            >
              Hire <small>+Profit</small>
            </button>
            <button
              type="button"
              onClick={fireWorker}
              disabled={gamePhase === 'CRUNCH'}
              className="action-button action-fire"
            >
              Fire <small>-Burn</small>
            </button>
          </div>
        </div>
      </div>

      {/* PHASER GAME CANVAS */}
      <div className="game-canvas-container reveal" style={{ '--reveal-delay': '0.25s' }}>
        <span className="scan-badge">LIVE FEED · OFFICE CAM 01</span>
        <Suspense fallback={<div className="game-canvas-loading">BOOTING OFFICE FEED…</div>}>
          <GameCanvas />
        </Suspense>
      </div>

      {/* TERMINAL (Bottom) */}
      <RetroTerminal />

      {/* CRT OVERLAY */}
      <div className="crt-overlay" />
    </div>
  );
}

export default App;
