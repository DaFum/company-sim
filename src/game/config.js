import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import MainScene from './scenes/MainScene';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container', // ID des DOM-Elements, in das Phaser rendert
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  scene: [PreloadScene, MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // Top-down view, keine Schwerkraft
      debug: false
    }
  }
};
