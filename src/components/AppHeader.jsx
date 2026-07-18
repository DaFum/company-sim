import React from 'react';
import { useGameStore } from '../store/gameStore';

export function AppHeader() {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const isMuted = useGameStore((state) => state.isMuted);
  const toggleMute = useGameStore((state) => state.toggleMute);

  const phaseLabel = gamePhase === 'CRUNCH' ? 'CRUNCH' : isPlaying ? 'LIVE' : 'STANDBY';

  return (
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
  );
}
