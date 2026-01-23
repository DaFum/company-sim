import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Hier würden normalerweise externe Assets geladen (Tilesets, Spritesheets)
    // this.load.image('tiles', 'assets/tiles.png');
    // this.load.spritesheet('worker', 'assets/worker.png', { frameWidth: 32, frameHeight: 32 });

    // Für dieses Demo nutzen wir Placeholder, die wir im create() generieren
    console.log("PreloadScene: Loading assets (placeholders)...");

    // Placeholder Sounds (Base64 encoded wavs for demo purposes)
    // Pop sound (short blip)
    this.load.audio('pop', 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA');
    // Ka-ching (simulated high pitch)
    this.load.audio('kaching', 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA');
  }

  create() {
    // 1. Generiere "Worker" Textur (Ein 32x32 rotes Quadrat mit Gesicht)
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Körper
    graphics.fillStyle(0x3366cc);
    graphics.fillRect(0, 0, 32, 32);
    // Kopf
    graphics.fillStyle(0xffccaa);
    graphics.fillRect(8, 4, 16, 16);

    graphics.generateTexture('worker', 32, 32);

    // 2. Generiere "Floor" Textur (Ein graues Quadrat mit Rand)
    graphics.clear();
    graphics.lineStyle(1, 0xcccccc);
    graphics.fillStyle(0xeeeeee);
    graphics.fillRect(0, 0, 32, 32);
    graphics.strokeRect(0, 0, 32, 32);

    graphics.generateTexture('floor', 32, 32);

    // 3. Generiere "Wall" Textur
    graphics.clear();
    graphics.fillStyle(0x444444);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0x222222);
    graphics.strokeRect(0, 0, 32, 32);

    graphics.generateTexture('wall', 32, 32);

    console.log("Assets generated. Starting MainScene...");
    this.scene.start('MainScene');
  }
}
