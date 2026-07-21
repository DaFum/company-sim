import React, { useEffect, lazy, Suspense } from 'react';
import { useGameStore } from './store/gameStore';
import { useGameLoop } from './hooks/useGameLoop';
import { useAiDirector } from './hooks/useAiDirector';
import { ApiKeyModal } from './components/ApiKeyModal';
import { RetroTerminal } from './components/RetroTerminal';
import { DecisionPopup } from './components/DecisionPopup';
import { FloatingNumbers } from './components/FloatingNumbers';
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

  // Individual selectors so App only re-renders when a value it actually shows
  // changes — not on every unrelated store mutation (logs, mood, events, …).
  const gameState = useGameStore((state) => state.gameState);

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
      <FloatingNumbers />

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
