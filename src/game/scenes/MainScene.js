import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import EasyStar from 'easystarjs';
import SoundManager from '../SoundManager';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.workersGroup = null;
    this.floorGroup = null;
    this.unsubscribeStore = null;
    this.easystar = null;
    this.grid = [];
    this.tileSize = 32;
    this.cols = 25;
    this.rows = 20;
    this.soundManager = null;
    this.currentLevel = 1;
  }

  create() {
    console.log("MainScene started");

    // --- 0. Audio Setup ---
    this.soundManager = new SoundManager(this);

    // --- 1. Layering Setup ---
    this.floorGroup = this.add.group();
    this.createFloor(1); // Default Level 1

    // Entity Layer (Workers)
    this.workersGroup = this.add.group();

    // --- 2. Camera Setup ---
    this.cameras.main.centerOn(400, 300);
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // --- 2b. Pathfinding Setup ---
    this.easystar = new EasyStar.js();
    this.setupGrid();

    // --- 3. Initial Sync ---
    const state = useGameStore.getState();
    this.syncWorkers(state.workers);
    this.updateOfficeVisuals(state.officeLevel);

    // --- 4. Reactive Listeners ---

    // Workers Update
    this.unsubscribeStore = useGameStore.subscribe(
      (state) => state.workers,
      (newCount, oldCount) => {
        this.syncWorkers(newCount);
        if (newCount > oldCount) {
            this.soundManager.play('pop');
            this.emitParticles();
        }
      }
    );

    // Office Level Update
    this.unsubscribeLevel = useGameStore.subscribe(
        (state) => state.officeLevel,
        (newLevel, oldLevel) => {
            if (newLevel !== oldLevel) {
                this.updateOfficeVisuals(newLevel);
                this.playTransitionEffect();
            }
        }
    );

    // Game Phase Update (Crunch Mode Visuals)
    this.unsubscribePhase = useGameStore.subscribe(
        (state) => state.gamePhase,
        (newPhase) => {
            if (newPhase === 'CRUNCH') {
                this.cameras.main.flash(1000, 255, 0, 0, true); // Red tint flash
                this.tweens.add({
                    targets: this.cameras.main,
                    zoom: 1.05,
                    duration: 5000,
                    yoyo: true
                });
            } else {
                this.cameras.main.setZoom(1);
            }
        }
    );

    // Debug Text
    this.debugText = this.add.text(10, 10, 'Phaser Running', { font: '16px monospace', fill: '#00ff00' });
    this.debugText.setScrollFactor(0);

    // Random Movement Timer
    this.time.addEvent({ delay: 3000, callback: this.moveWorkersRandomly, callbackScope: this, loop: true });
  }

  update(time, delta) {
    const state = useGameStore.getState();

    this.debugText.setText(
      `Tick: ${state.tick} | Cash: ${state.cash.toFixed(0)}€ | Workers: ${state.workers} | Lvl: ${this.currentLevel}`
    );

    // Path Following Logic
    this.workersGroup.children.iterate((worker) => {
        if (worker.path && worker.path.length > 0) {
            const target = worker.path[0];
            const targetX = target.x * this.tileSize + this.tileSize/2;
            const targetY = target.y * this.tileSize + this.tileSize/2;

            const distance = Phaser.Math.Distance.Between(worker.x, worker.y, targetX, targetY);

            if (distance < 4) {
                worker.path.shift();
                if (worker.path.length === 0) {
                    worker.isMoving = false;
                }
            } else {
                this.physics.moveTo(worker, targetX, targetY, 100);
            }
        } else {
            worker.body.reset(worker.x, worker.y);
        }
    });
  }

  createFloor(level) {
    this.floorGroup.clear(true, true);
    const textureKey = `floor_${level}`;

    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        // Simple checker pattern for visual interest
        const tile = this.add.image(x * this.tileSize, y * this.tileSize, textureKey).setOrigin(0);
        if ((x + y) % 2 === 0) tile.setTint(0xdddddd); // Slight shading
        this.floorGroup.add(tile);
      }
    }
    this.currentLevel = level;
  }

  updateOfficeVisuals(level) {
      if (level === this.currentLevel) return;
      console.log(`Upgrading Office to Level ${level}`);
      this.createFloor(level);
  }

  playTransitionEffect() {
      // Flash White
      this.cameras.main.flash(1000, 255, 255, 255);
      // Shake
      this.cameras.main.shake(500);
      // Text
      const text = this.add.text(400, 300, "OFFICE UPGRADE!", { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
      this.tweens.add({
          targets: text,
          scale: 2,
          alpha: 0,
          duration: 2000,
          onComplete: () => text.destroy()
      });
  }

  setupGrid() {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
        const row = [];
        for (let x = 0; x < this.cols; x++) {
            row.push(0);
        }
        this.grid.push(row);
    }
    this.easystar.setGrid(this.grid);
    this.easystar.setAcceptableTiles([0]);
  }

  syncWorkers(count) {
    const currentCount = this.workersGroup.getLength();
    if (count > currentCount) {
        for (let i = currentCount; i < count; i++) {
            this.spawnWorker(i);
        }
    } else if (count < currentCount) {
        const toRemove = currentCount - count;
        for (let i = 0; i < toRemove; i++) {
            const worker = this.workersGroup.getLast(true);
            if (worker) worker.destroy();
        }
    }
  }

  spawnWorker(index) {
    let x = Phaser.Math.Between(0, this.cols - 1);
    let y = Phaser.Math.Between(0, this.rows - 1);
    const worker = this.add.sprite(x * this.tileSize + 16, y * this.tileSize + 16, 'worker');
    this.physics.add.existing(worker);
    worker.path = [];
    worker.isMoving = false;
    this.workersGroup.add(worker);
  }

  moveWorkersRandomly() {
    this.workersGroup.children.iterate((worker) => {
        if (!worker.isMoving && Math.random() > 0.7) {
            const startX = Math.floor(worker.x / this.tileSize);
            const startY = Math.floor(worker.y / this.tileSize);
            const endX = Phaser.Math.Between(0, this.cols - 1);
            const endY = Phaser.Math.Between(0, this.rows - 1);

            this.easystar.findPath(startX, startY, endX, endY, (path) => {
                if (path) {
                    worker.path = path;
                    worker.isMoving = true;
                }
            });
        }
    });
    this.easystar.calculate();
  }

  emitParticles() {
      const x = 400;
      const y = 300;
      const text = this.add.text(x, y, "✨ New Hire!", { fontSize: '32px', color: '#ffff00', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
      this.tweens.add({
          targets: text,
          scale: 1.5,
          alpha: 0,
          duration: 1000,
          onComplete: () => text.destroy()
      });
  }

  destroy() {
    if (this.unsubscribeStore) this.unsubscribeStore();
    if (this.unsubscribeLevel) this.unsubscribeLevel();
    if (this.unsubscribePhase) this.unsubscribePhase();
  }
}
