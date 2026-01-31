import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';

import { useGameStore } from '../store/gameStore';

export const GameCanvas = React.memo(() => {
  console.log("GameCanvas render"); // Debug log
  const gameRef = useRef(null);
  const isMuted = useGameStore((state) => state.isMuted);

  // Sync Mute State with Phaser
  useEffect(() => {
    if (gameRef.current?.sound) {
      gameRef.current.sound.mute = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    // 1. Init: Start Phaser on mount
    if (!gameRef.current) {
      console.log('Initializing Phaser Game...');
      gameRef.current = new Phaser.Game(gameConfig);
    }

    // 2. Cleanup: Destroy Phaser on unmount
    return () => {
      if (gameRef.current) {
        console.log('Destroying Phaser Game...');
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // Empty array -> Run once on mount

  // The "Black Box" Container. React renders this once and never touches it again.
  return (
    <div
      id="game-container"
      style={{
        width: '800px',
        height: '600px',
        border: '4px solid #333',
        margin: '20px auto',
      }}
    />
  );
});
