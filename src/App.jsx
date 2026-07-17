import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useAiDirector } from './hooks/useAiDirector';
import { ApiKeyModal } from './components/ApiKeyModal';
import { RetroTerminal } from './components/RetroTerminal';
import { DecisionPopup } from './components/DecisionPopup';
import { DecisionHistory } from './components/DecisionHistory';
import { AppHeader } from './components/AppHeader';
import { StatusBoard } from './components/StatusBoard';
import { KpiBoard } from './components/KpiBoard';
import { PortfolioBoard } from './components/PortfolioBoard';
import { Controls } from './components/Controls';
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
  useGameLoop();
  useAiDirector();
  const lastDecision = useGameStore((state) => state.pendingDecision);
  const confirmDecision = useGameStore((state) => state.applyPendingDecision);
  const vetoDecision = useGameStore((state) => state.vetoDecision);

  // Clear any pending store timers when the app unmounts, so stray setTimeout
  // callbacks do not fire against a torn-down store.
  const clearTimers = useGameStore((state) => state.clearTimers);
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Keep these selectors as they are needed at the App level
  const cash = useGameStore((state) => state.cash);
  const gameState = useGameStore((state) => state.gameState);

  // Track a list (not a single slot) so rapid cash swings each get their own
  // number instead of clobbering the previous one.
  const [floaters, setFloaters] = useState([]);
  // Track the previous cash value without triggering render loops.
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

    prevCashRef.current = cash;
  }, [cash]);

  // Stable callback so FloatingNumber's timer effect isn't reset on every tick.
  const handleFloaterComplete = useCallback((id) => {
    setFloaters((list) => list.filter((f) => f.id !== id));
  }, []);

  return (
    <div className="app-container">
      {/* AMBIENT BACKDROP LAYERS */}
      <div className="bg-mesh" aria-hidden="true" />
      <div className="bg-vignette" aria-hidden="true" />

      {gameState !== 'PLAYING' && (
        <div className={`terminal-state-overlay terminal-state-${gameState.toLowerCase()}`}>
          <div className="terminal-state-card">
            <span className="terminal-state-kicker">Final board memo</span>
            <h1 className="terminal-state-title">
              {gameState === 'WIN' ? 'IPO SUCCESS' : 'BANKRUPT'}
            </h1>
            <p className="terminal-state-copy">
              {gameState === 'WIN'
                ? 'Your startup achieved unicorn status!'
                : 'The board has seized your assets. Game Over.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="terminal-state-button"
            >
              RESTART SIMULATION
            </button>
          </div>
        </div>
      )}

      {/* MASTHEAD */}
      <AppHeader />

      {/* MODALS */}
      <ApiKeyModal />
      <DecisionPopup decision={lastDecision} onConfirm={confirmDecision} onVeto={vetoDecision} />

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
        <StatusBoard />

        {/* EXTENDED KPI BOARD */}
        <KpiBoard />

        {/* PORTFOLIO BOARD */}
        <PortfolioBoard />

        {/* DECISION HISTORY */}
        <div className="panel history-board reveal" style={{ '--reveal-delay': '0.12s' }}>
          <h2 className="panel-header">
            <span className="panel-header-dot" />
            AI Decision History
          </h2>
          <DecisionHistory />
        </div>

        {/* CONTROLS */}
        <Controls />
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
