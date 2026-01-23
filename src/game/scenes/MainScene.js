import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import EasyStar from 'easystarjs';
import SoundManager from '../SoundManager';
import WorkerSprite from '../sprites/WorkerSprite';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.workersGroup = null;
    this.floorGroup = null;
    this.objectGroup = null;
    this.visitorGroup = null;
    this.easystar = null;
    this.soundManager = null;
    this.currentLevel = 1;
    this.tileSize = 32;
    this.cols = 25;
    this.rows = 20;

    this.unsubscribers = [];
  }

  create() {
    console.log("MainScene started (Wuselfaktor enabled)");
    this.soundManager = new SoundManager(this);

    // --- 1. Layers ---
    this.floorGroup = this.add.group();
    this.createFloor(1);

    this.objectGroup = this.add.group();
    this.spawnObjects();

    this.workersGroup = this.add.group({ runChildUpdate: true });
    this.visitorGroup = this.add.group({ runChildUpdate: true });

    // --- 2. Logic ---
    this.easystar = new EasyStar.js();
    this.setupGrid();

    // --- 3. Subscriptions ---
    const store = useGameStore;

    // Roster Sync (Granular)
    this.unsubscribers.push(store.subscribe(
        state => state.roster,
        (roster) => {
            this.syncRoster(roster);
        },
        { equalityFn: (a, b) => a.dev === b.dev && a.sales === b.sales && a.support === b.support }
    ));

    // Visitor Events
    this.unsubscribers.push(store.subscribe(
        state => state.activeVisitors,
        (visitors) => {
            this.syncVisitors(visitors);
        }
    ));

    // Mood Sync
    this.unsubscribers.push(store.subscribe(
        state => state.mood,
        (mood) => this.updateMoodVisuals(mood)
    ));

    // --- 4. Init ---
    const state = store.getState();
    this.syncRoster(state.roster);

    this.cameras.main.centerOn(400, 300);
    this.cameras.main.setBackgroundColor('#2d2d2d');
  }

  update(time, delta) {
      // Worker updates handled by group runChildUpdate
  }

  // --- OBJECTS ---
  spawnObjects() {
      // Fixed Positions for now
      this.spawnObject(2, 2, 'obj_server');
      this.spawnObject(23, 2, 'obj_coffee');
      this.spawnObject(2, 17, 'obj_plant');
  }

  spawnObject(x, y, texture) {
      const obj = this.add.image(x * 32 + 16, y * 32 + 16, texture);
      this.objectGroup.add(obj);
      // Mark as obstacle?
      // For now, let's keep them walkable to avoid stuck agents
  }

  // --- WORKERS ---
  syncRoster(roster) {
      // Calculate diffs per role
      const currentDevs = this.getWorkersByRole('dev');
      const currentSales = this.getWorkersByRole('sales');
      const currentSupport = this.getWorkersByRole('support');

      this.adjustRoleCount('dev', currentDevs.length, roster.dev);
      this.adjustRoleCount('sales', currentSales.length, roster.sales);
      this.adjustRoleCount('support', currentSupport.length, roster.support);
  }

  getWorkersByRole(role) {
      return this.workersGroup.getChildren().filter(w => w.role === role);
  }

  adjustRoleCount(role, current, target) {
      if (current < target) {
          for (let i = 0; i < target - current; i++) {
              this.spawnWorker(role);
          }
      } else if (current > target) {
          const toRemove = this.getWorkersByRole(role).slice(0, current - target);
          toRemove.forEach(w => {
              w.destroy(); // Add particle effect here
          });
      }
  }

  spawnWorker(role) {
      let x = Phaser.Math.Between(1, this.cols - 2);
      let y = Phaser.Math.Between(1, this.rows - 2);
      const worker = new WorkerSprite(this, x * 32 + 16, y * 32 + 16, role, Date.now());
      this.workersGroup.add(worker);
  }

  requestMove(worker, x, y) {
      const startX = Math.floor(worker.x / 32);
      const startY = Math.floor(worker.y / 32);

      this.easystar.findPath(startX, startY, x, y, (path) => {
          if (path) worker.startPath(path);
      });
      this.easystar.calculate();
  }

  // --- VISITORS ---
  syncVisitors(activeVisitors) {
      // Check Pizza Guy
      const hasPizza = activeVisitors.includes('pizza_guy');
      const pizzaSprite = this.visitorGroup.getChildren().find(v => v.texture.key === 'visitor_pizza');

      if (hasPizza && !pizzaSprite) {
          // Spawn Pizza
          const v = this.add.sprite(0, 300, 'visitor_pizza');
          this.physics.add.existing(v);
          this.tweens.add({ targets: v, x: 400, y: 300, duration: 2000 });
          this.visitorGroup.add(v);

          // Trigger Worker Swarm
          this.workersGroup.children.iterate(w => {
             this.requestMove(w, 12, 9); // Center
             w.showFeedback('PIZZA!');
          });
      } else if (!hasPizza && pizzaSprite) {
          pizzaSprite.destroy();
      }

      // Check Investors
      const hasInvestors = activeVisitors.includes('investors');
      const investorSprite = this.visitorGroup.getChildren().find(v => v.texture.key === 'visitor_investor');

      if (hasInvestors && !investorSprite) {
          // Spawn 3 Investors
          for(let i=0; i<3; i++) {
              const v = this.add.sprite(800, 300 + (i*40), 'visitor_investor');
              this.physics.add.existing(v);
              this.tweens.add({ targets: v, x: 600, duration: 4000 });
              this.visitorGroup.add(v);
          }
      } else if (!hasInvestors && investorSprite) {
          // Clear all investors
          this.visitorGroup.clear(true, true);
      }
  }

  // --- VISUALS ---
  updateMoodVisuals(mood) {
      const tint = this.getMoodTint(mood);
      this.workersGroup.children.iterate(w => w.setTint(tint));
  }

  getMoodTint(mood) {
      if (mood > 80) return 0xffffff;
      if (mood > 40) return 0xccccff;
      return 0x8888ff; // Blue/Sad
  }

  // --- SETUP ---
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
  }

  destroy() {
      this.unsubscribers.forEach(u => u());
  }
}
