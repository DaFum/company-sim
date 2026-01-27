import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import MainScene from './scenes/MainScene';

export const gameConfig = {
  type: Phaser.WEBGL, // Enforce WebGL for Shader Support
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2d', // Darker background for light effects
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
