import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';

import { useGameStore } from '../store/gameStore';

export const GameCanvas = () => {
  const gameRef = useRef(null);
  const isMuted = useGameStore((state) => state.isMuted);

  // Sync Mute State with Phaser
  useEffect(() => {
    if (gameRef.current && gameRef.current.sound) {
        gameRef.current.sound.mute = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    // 1. Initialisierung: Phaser starten, wenn Komponente mountet
    if (!gameRef.current) {
      console.log("Initializing Phaser Game...");
      gameRef.current = new Phaser.Game(gameConfig);
    }

    // 2. Aufräumen: Phaser zerstören, wenn Komponente unmountet
    return () => {
      if (gameRef.current) {
        console.log("Destroying Phaser Game...");
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // Leeres Array -> Nur einmal beim Mounten ausführen

  // Der "Black Box" Container. React rendert dies einmal und fasst es dann nie wieder an.
  return (
    <div
      id="game-container"
      style={{
        width: '800px',
        height: '600px',
        border: '4px solid #333',
        margin: '20px auto'
      }}
    />
  );
};
