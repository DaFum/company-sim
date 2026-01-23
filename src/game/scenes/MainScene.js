import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import EasyStar from 'easystarjs';
import SoundManager from '../SoundManager';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.workersGroup = null;
    this.floorGroup = null;
    this.overlayGroup = null;
    this.easystar = null;
    this.soundManager = null;
    this.currentLevel = 1;
    this.tileSize = 32;
    this.cols = 25;
    this.rows = 20;

    // Store Unsubscribers
    this.unsubscribers = [];
  }

  create() {
    console.log("MainScene started");
    this.soundManager = new SoundManager(this);

    // --- 1. Layers ---
    this.floorGroup = this.add.group();
    this.createFloor(1);

    this.workersGroup = this.add.group();
    this.overlayGroup = this.add.group(); // For Mood/Marketing effects

    // --- 2. Camera ---
    this.cameras.main.centerOn(400, 300);
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // --- 3. Logic ---
    this.easystar = new EasyStar.js();
    this.setupGrid();

    // --- 4. Subscriptions ---
    const store = useGameStore;

    // Workers & Mood Sync
    this.unsubscribers.push(store.subscribe(
        state => ({ workers: state.workers, mood: state.mood }),
        ({ workers, mood }, oldState) => {
            this.syncWorkers(workers);
            this.updateWorkerMoods(mood);

            // New Hire Sound
            if (oldState && workers > oldState.workers) {
                this.soundManager.play('pop');
                this.emitParticles("✨ New Hire!");
            }
            // Fire Sound (Sad)
            if (oldState && workers < oldState.workers) {
                this.emitParticles("💀 Fired!", '#ff0000');
            }
        },
        { equalityFn: (a, b) => a.workers === b.workers && a.mood === b.mood }
    ));

    // Office Level
    this.unsubscribers.push(store.subscribe(
        state => state.officeLevel,
        (level) => {
            if (level !== this.currentLevel) {
                this.updateOfficeVisuals(level);
                this.playTransitionEffect();
            }
        }
    ));

    // Marketing Multiplier (Visual Buff)
    this.unsubscribers.push(store.subscribe(
        state => state.marketingMultiplier,
        (mult) => {
            if (mult > 1.0) {
                this.cameras.main.setTint(0xffddee); // Pink Tint for Hype
                if (!this.hypeText) {
                    this.hypeText = this.add.text(400, 50, "🚀 HYPE MODE ACTIVATED 🚀", {
                        fontSize: '24px', color: '#ff00ff', fontStyle: 'bold', backgroundColor: '#000'
                    }).setOrigin(0.5);
                }
            } else {
                this.cameras.main.clearTint();
                if (this.hypeText) {
                    this.hypeText.destroy();
                    this.hypeText = null;
                }
            }
        }
    ));

    // Initial Sync
    const state = useGameStore.getState();
    this.syncWorkers(state.workers);
    this.updateOfficeVisuals(state.officeLevel);

    // Random Movement
    this.time.addEvent({ delay: 3000, callback: this.moveWorkersRandomly, callbackScope: this, loop: true });

    this.debugText = this.add.text(10, 10, 'Sim Running', { font: '16px monospace', fill: '#00ff00' }).setScrollFactor(0);
  }

  update() {
      // Logic for movement lerping
      this.workersGroup.children.iterate((worker) => {
        if (worker.path && worker.path.length > 0) {
            const target = worker.path[0];
            const targetX = target.x * this.tileSize + 16;
            const targetY = target.y * this.tileSize + 16;

            if (Phaser.Math.Distance.Between(worker.x, worker.y, targetX, targetY) < 4) {
                worker.path.shift();
                if (worker.path.length === 0) worker.isMoving = false;
            } else {
                this.physics.moveTo(worker, targetX, targetY, 100);
            }
        } else {
            worker.body.reset(worker.x, worker.y);
        }
    });
  }

  // --- Visual Logic ---

  syncWorkers(count) {
    const currentCount = this.workersGroup.getLength();
    if (count > currentCount) {
        for (let i = currentCount; i < count; i++) this.spawnWorker();
    } else if (count < currentCount) {
        const toRemove = currentCount - count;
        for (let i = 0; i < toRemove; i++) {
            const worker = this.workersGroup.getLast(true);
            if (worker) worker.destroy();
        }
    }
  }

  spawnWorker() {
    let x = Phaser.Math.Between(0, this.cols - 1);
    let y = Phaser.Math.Between(0, this.rows - 1);
    const worker = this.add.sprite(x * this.tileSize + 16, y * this.tileSize + 16, 'worker');
    this.physics.add.existing(worker);
    worker.path = [];
    worker.isMoving = false;
    this.workersGroup.add(worker);
  }

  updateWorkerMoods(mood) {
      // 100 = White/Happy, 0 = Blue/Sad
      // Tint Interpolation
      const red = Phaser.Math.Clamp(Math.floor(255 * (mood / 100)), 100, 255);
      const green = Phaser.Math.Clamp(Math.floor(255 * (mood / 100)), 100, 255);
      const blue = 255; // Always keep blue high for "Cold" look when low mood

      const tint = Phaser.Display.Color.GetColor(red, green, blue);

      this.workersGroup.children.iterate((worker) => {
          worker.setTint(tint);
      });
  }

  createFloor(level) {
    this.floorGroup.clear(true, true);
    const textureKey = `floor_${level}`;
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const tile = this.add.image(x * this.tileSize, y * this.tileSize, textureKey).setOrigin(0);
        if ((x + y) % 2 === 0) tile.setTint(0xdddddd);
        this.floorGroup.add(tile);
      }
    }
    this.currentLevel = level;
  }

  updateOfficeVisuals(level) {
      if (level === this.currentLevel) return;
      this.createFloor(level);
  }

  playTransitionEffect() {
      this.cameras.main.flash(1000, 255, 255, 255);
      const text = this.add.text(400, 300, "OFFICE UPGRADE!", { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      this.tweens.add({ targets: text, scale: 2, alpha: 0, duration: 2000, onComplete: () => text.destroy() });
  }

  emitParticles(msg, color='#ffff00') {
      const x = 400; const y = 300;
      const text = this.add.text(x, y, msg, { fontSize: '32px', color: color, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
      this.tweens.add({ targets: text, scale: 1.5, alpha: 0, duration: 1000, onComplete: () => text.destroy() });
  }

  setupGrid() {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
        const row = [];
        for (let x = 0; x < this.cols; x++) row.push(0);
        this.grid.push(row);
    }
    this.easystar.setGrid(this.grid);
    this.easystar.setAcceptableTiles([0]);
  }

  moveWorkersRandomly() {
    this.workersGroup.children.iterate((worker) => {
        if (!worker.isMoving && Math.random() > 0.7) {
            const startX = Math.floor(worker.x / this.tileSize);
            const startY = Math.floor(worker.y / this.tileSize);
            const endX = Phaser.Math.Between(0, this.cols - 1);
            const endY = Phaser.Math.Between(0, this.rows - 1);
            this.easystar.findPath(startX, startY, endX, endY, (path) => {
                if (path) { worker.path = path; worker.isMoving = true; }
            });
        }
    });
    this.easystar.calculate();
  }

  destroy() {
      this.unsubscribers.forEach(u => u());
  }
}
