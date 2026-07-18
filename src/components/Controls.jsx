import React from 'react';
import { useGameStore } from '../store/gameStore';
import { AiStatus } from './AiStatus';

export function Controls() {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const gameSpeed = useGameStore((state) => state.gameSpeed);
  const togglePause = useGameStore((state) => state.togglePause);
  const toggleSpeed = useGameStore((state) => state.toggleSpeed);
  const hireWorker = useGameStore((state) => state.hireWorker);
  const fireWorker = useGameStore((state) => state.fireWorker);

  return (
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
          onClick={() => hireWorker()}
          disabled={gamePhase === 'CRUNCH'}
          className="action-button action-hire"
        >
          Hire <small>+Profit</small>
        </button>
        <button
          type="button"
          onClick={() => fireWorker()}
          disabled={gamePhase === 'CRUNCH'}
          className="action-button action-fire"
        >
          Fire <small>-Burn</small>
        </button>
      </div>
    </div>
  );
}
