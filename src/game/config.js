import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import MainScene from './scenes/MainScene';

export const gameConfig = {
  type: Phaser.AUTO, // Try WebGL, fallback to Canvas
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#0d0f18', // Matches HUD frame so the canvas blends seamlessly
  pixelArt: true, // Crisp look for pixel art
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
  },
  input: {
    activePointers: 3, // Enable Multitouch (Pinch-to-Zoom)
  },
  scene: [PreloadScene, MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  render: {
    batchSize: 4096, // Increase batch size for many particles/lights
    maxLights: 50, // Allow more dynamic lights
  },
};
