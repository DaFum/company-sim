import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    console.log("PreloadScene: Loading assets (placeholders)...");
    // Minimal placeholder sounds
    this.load.audio('pop', 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA');
    this.load.audio('kaching', 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA');
  }

  create() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // --- COMMON ASSETS ---
    // Worker
    graphics.fillStyle(0x3366cc);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0xffccaa);
    graphics.fillRect(8, 4, 16, 16);
    graphics.generateTexture('worker', 32, 32);

    // --- LEVEL 1: GARAGE ---
    // Floor: Concrete with cracks/stains
    graphics.clear();
    graphics.fillStyle(0x555555); // Dark Grey
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0x444444); // Stain
    graphics.fillRect(5, 5, 10, 10);
    graphics.lineStyle(1, 0x333333);
    graphics.strokeRect(0, 0, 32, 32);
    graphics.generateTexture('floor_1', 32, 32);

    // Wall: Brick/Dirty
    graphics.clear();
    graphics.fillStyle(0x884444); // Reddish Brick
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0x552222);
    graphics.moveTo(0, 16); graphics.lineTo(32, 16); // Horizontal mortar
    graphics.moveTo(16, 0); graphics.lineTo(16, 32); // Vertical
    graphics.generateTexture('wall_1', 32, 32);

    // --- LEVEL 2: COWORKING ---
    // Floor: Wood Planks
    graphics.clear();
    graphics.fillStyle(0xdcb484); // Light Wood
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0x8b5a2b);
    graphics.moveTo(0, 8); graphics.lineTo(32, 8);
    graphics.moveTo(0, 24); graphics.lineTo(32, 24);
    graphics.generateTexture('floor_2', 32, 32);

    // Wall: White/Clean
    graphics.clear();
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(4, 0xdddddd);
    graphics.strokeRect(0, 0, 32, 32);
    graphics.generateTexture('wall_2', 32, 32);

    // --- LEVEL 3: OFFICE ---
    // Floor: Blue Carpet / Tech
    graphics.clear();
    graphics.fillStyle(0x223344); // Dark Blue
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(1, 0x446688);
    graphics.strokeRect(0, 0, 32, 32); // Grid
    graphics.generateTexture('floor_3', 32, 32);

    // Wall: Glass/Tech
    graphics.clear();
    graphics.fillStyle(0x88ccff); // Light Blue Glass
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0xffffff, 0.5); // Reflection
    graphics.moveTo(0, 32); graphics.lineTo(32, 0);
    graphics.generateTexture('wall_3', 32, 32);

    // Fallback for logic that uses 'floor'/'wall' generic names initially
    // We can just alias Level 1
    // Actually MainScene will use level specific names now.

    console.log("Level Assets generated. Starting MainScene...");
    this.scene.start('MainScene');
  }
}
