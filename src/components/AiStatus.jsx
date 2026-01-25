import React from 'react';
import { useGameStore } from '../store/gameStore';
import '../App.css';

export const AiStatus = () => {
  const isAiThinking = useGameStore((state) => state.isAiThinking);
  const mood = useGameStore((state) => state.mood);

  // Farbe basierend auf Mood: Grün (gut) -> Rot (böse/niedrig)
  const color = isAiThinking ? '#00ccff' : mood < 30 ? '#ff0000' : '#00ff00';
  const statusText = isAiThinking ? 'ANALYZING...' : 'WATCHING';

  return (
    <div
      className="ai-status-container"
      style={{
        borderColor: color,
        boxShadow: `0 0 10px ${color}`,
      }}
    >
      <div
        className="ai-status-eye"
        style={{
          backgroundColor: color,
          animation: isAiThinking ? 'pulse 0.5s infinite' : 'none',
        }}
      />
      <span className="ai-status-text" style={{ color: color }}>
        AI_CORE: {statusText}
      </span>
    </div>
  );
};
