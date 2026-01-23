import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import EasyStar from 'easystarjs';
import SoundManager from '../SoundManager';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.workersGroup = null;
    this.unsubscribeStore = null;
    this.easystar = null;
    this.grid = [];
    this.tileSize = 32;
    this.cols = 25;
    this.rows = 20;
    this.soundManager = null;
  }

  create() {
    console.log("MainScene started");

    // --- 0. Audio Setup ---
    this.soundManager = new SoundManager(this);

    // --- 1. Layering Setup ---
    // Background (Floor)
    this.createFloor();

    // Entity Layer (Workers)
    this.workersGroup = this.add.group();

    // --- 2. Camera Setup ---
    this.cameras.main.centerOn(400, 300);
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // --- 2b. Pathfinding Setup ---
    this.easystar = new EasyStar.js();
    this.setupGrid();

    // --- 3. Initial Sync ---
    const currentWorkers = useGameStore.getState().workers;
    this.syncWorkers(currentWorkers);

    // --- 4. Reactive Listener (Subscription) ---
    this.unsubscribeStore = useGameStore.subscribe(
      (state) => state.workers,
      (newCount, oldCount) => {
        console.log(`Phaser received worker update: ${newCount}`);
        this.syncWorkers(newCount);

        // Play Sound if count increased
        if (newCount > oldCount) {
            this.soundManager.play('pop');
            this.emitParticles();
        }
      }
    );

    // Subscribe to Cash for Kaching
    this.unsubscribeCash = useGameStore.subscribe(
        (state) => state.cash,
        (newCash, oldCash) => {
            // Wenn signifikanter Gewinn (z.B. > 100 in einem Tick, simplified logic)
            if (newCash > oldCash + 50) {
                this.soundManager.play('kaching', { volume: 0.5 });
                // Show emote (placeholder logic)
            }
        }
    );

    this.debugText = this.add.text(10, 10, 'Phaser Running', { font: '16px monospace', fill: '#00ff00' });
    this.debugText.setScrollFactor(0);

    // Timer für zufällige Bewegungen
    this.time.addEvent({ delay: 3000, callback: this.moveWorkersRandomly, callbackScope: this, loop: true });
  }

  update(time, delta) {
    const state = useGameStore.getState();

    this.debugText.setText(
      `Tick: ${state.tick} | Cash: ${state.cash.toFixed(0)}€ | Workers: ${state.workers}`
    );

    // Custom Path Following Logic (Lerp)
    this.workersGroup.children.iterate((worker) => {
        if (worker.path && worker.path.length > 0) {
            const target = worker.path[0];
            const targetX = target.x * this.tileSize + this.tileSize/2;
            const targetY = target.y * this.tileSize + this.tileSize/2;

            const distance = Phaser.Math.Distance.Between(worker.x, worker.y, targetX, targetY);

            if (distance < 4) {
                // Reached step
                worker.path.shift();
                if (worker.path.length === 0) {
                    worker.isMoving = false;
                }
            } else {
                // Move towards
                this.physics.moveTo(worker, targetX, targetY, 100);
            }
        } else {
            worker.body.reset(worker.x, worker.y); // Stop
        }
    });
  }

  createFloor() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.add.image(x * this.tileSize, y * this.tileSize, 'floor').setOrigin(0);
      }
    }
  }

  setupGrid() {
    // 0 = walkable, 1 = obstacle
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
    // Sync logic optimized to not kill everyone
    const currentCount = this.workersGroup.getLength();

    if (count > currentCount) {
        // Add new
        for (let i = currentCount; i < count; i++) {
            this.spawnWorker(i);
        }
    } else if (count < currentCount) {
        // Remove last
        const toRemove = currentCount - count;
        for (let i = 0; i < toRemove; i++) {
            const worker = this.workersGroup.getLast(true);
            if (worker) worker.destroy();
        }
    }
  }

  spawnWorker(index) {
    // Random valid pos
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

  showEmote(x, y, type) {
    const text = this.add.text(x, y - 20, type, { fontSize: '20px' }).setOrigin(0.5);
    this.tweens.add({
        targets: text,
        y: y - 50,
        alpha: 0,
        duration: 1500,
        onComplete: () => text.destroy()
    });
  }

  emitParticles() {
      // Create a particle manager (emitter)
      // Since Phaser 3.60+ syntax varies, we use a generic add.particles approach compatible with newer versions
      if (!this.particleManager) {
          // Fallback or simple setup.
          // Note: In strict Phaser 3.60+, createEmitter syntax changed.
          // We will use a simple one-shot graphic for the effect if particles are complex to setup without assets.
          // But here is a basic implementation assuming a 'worker' texture or similar dot.
      }

      // Simple visual flair:
      // Flash the screen slightly or spawn a "Smoke" text
      const x = 400;
      const y = 300;

      // Spawn "New Hire" text that fades out
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
    if (this.unsubscribeCash) this.unsubscribeCash();
  }
}
