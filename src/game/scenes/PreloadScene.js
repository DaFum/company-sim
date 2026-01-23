import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    console.log("PreloadScene: Generating Wusel Assets...");
    this.load.audio('pop', 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA');
    this.load.audio('kaching', 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACAgICAgICAgICAgICAgICA');
  }

  create() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // --- WORKERS ---

    // DEV (Blue Hoodie)
    graphics.clear();
    graphics.fillStyle(0x3366cc); // Blue Body
    graphics.fillRect(8, 12, 16, 14);
    graphics.fillStyle(0xffccaa); // Head
    graphics.fillRect(10, 4, 12, 12);
    graphics.fillStyle(0x111111); // Headphones
    graphics.fillRect(8, 6, 2, 8); graphics.fillRect(22, 6, 2, 8);
    graphics.generateTexture('worker_dev', 32, 32);

    // SALES (Green Suit)
    graphics.clear();
    graphics.fillStyle(0x228822); // Green Suit
    graphics.fillRect(8, 12, 16, 14);
    graphics.fillStyle(0xffccaa); // Head
    graphics.fillRect(10, 4, 12, 12);
    graphics.fillStyle(0x000000); // Phone
    graphics.fillRect(20, 6, 4, 8);
    graphics.generateTexture('worker_sales', 32, 32);

    // SUPPORT (Red Cap)
    graphics.clear();
    graphics.fillStyle(0xcc3333); // Red Shirt
    graphics.fillRect(8, 12, 16, 14);
    graphics.fillStyle(0xffccaa); // Head
    graphics.fillRect(10, 4, 12, 12);
    graphics.fillStyle(0xcc3333); // Cap
    graphics.fillRect(10, 2, 12, 4);
    graphics.generateTexture('worker_support', 32, 32);

    // --- VISITORS ---

    // PIZZA GUY (Orange/White)
    graphics.clear();
    graphics.fillStyle(0xffaa00); // Shirt
    graphics.fillRect(8, 12, 16, 14);
    graphics.fillStyle(0xffffff); // Box Stack
    graphics.fillRect(8, -5, 16, 16); // Carrying boxes high
    graphics.fillStyle(0xffccaa); // Head
    graphics.fillRect(10, 6, 12, 10); // Lower head
    graphics.generateTexture('visitor_pizza', 32, 32);

    // INVESTOR (Grey Suit)
    graphics.clear();
    graphics.fillStyle(0x555555); // Grey Suit
    graphics.fillRect(6, 10, 20, 20); // Bulkier
    graphics.fillStyle(0xffccaa); // Head
    graphics.fillRect(12, 2, 8, 8);
    graphics.fillStyle(0x000000); // Briefcase
    graphics.fillRect(24, 20, 6, 10);
    graphics.generateTexture('visitor_investor', 32, 32);


    // --- OBJECTS ---

    // SERVER RACK
    graphics.clear();
    graphics.fillStyle(0x111111); // Black Case
    graphics.fillRect(4, 2, 24, 28);
    graphics.fillStyle(0x00ff00); // Blinking Lights
    graphics.fillRect(6, 6, 4, 2);
    graphics.fillRect(12, 6, 4, 2);
    graphics.fillRect(6, 12, 4, 2);
    graphics.fillStyle(0xff0000);
    graphics.fillRect(6, 24, 2, 2);
    graphics.generateTexture('obj_server', 32, 32);

    // COFFEE MACHINE
    graphics.clear();
    graphics.fillStyle(0x888888); // Silver Machine
    graphics.fillRect(6, 6, 20, 24);
    graphics.fillStyle(0x332200); // Coffee Pot
    graphics.fillRect(10, 18, 12, 10);
    graphics.generateTexture('obj_coffee', 32, 32);

    // PLANT
    graphics.clear();
    graphics.fillStyle(0x8b4513); // Pot
    graphics.fillRect(10, 22, 12, 10);
    graphics.fillStyle(0x228822); // Leaves
    graphics.fillCircle(16, 18, 10);
    graphics.generateTexture('obj_plant', 32, 32);


    // --- FLOORS (Existing) ---
    graphics.clear(); graphics.fillStyle(0x555555); graphics.fillRect(0,0,32,32); graphics.lineStyle(1,0x444444); graphics.strokeRect(0,0,32,32);
    graphics.generateTexture('floor_1', 32, 32);

    graphics.clear(); graphics.fillStyle(0xdcb484); graphics.fillRect(0,0,32,32); graphics.lineStyle(1,0x8b5a2b); graphics.strokeRect(0,0,32,32);
    graphics.generateTexture('floor_2', 32, 32);

    graphics.clear(); graphics.fillStyle(0x223344); graphics.fillRect(0,0,32,32); graphics.lineStyle(1,0x446688); graphics.strokeRect(0,0,32,32);
    graphics.generateTexture('floor_3', 32, 32);

    console.log("Wusel Assets generated. Starting MainScene...");
    this.scene.start('MainScene');
  }
}
