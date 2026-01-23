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
    this.overlayGroup = null;
    this.easystar = null;
    this.soundManager = null;

    // Store subscriptions
    this.unsubscribers = [];
  }

  create() {
    console.log("[MainScene] Booting...");
    this.soundManager = new SoundManager(this);

    // 1. Groups
    this.floorGroup = this.add.group();
    this.objectGroup = this.add.group();
    this.workersGroup = this.add.group({ runChildUpdate: true });
    this.visitorGroup = this.add.group({ runChildUpdate: true });
    this.overlayGroup = this.add.group();

    // 2. Initial Setup
    this.createFloor(1);
    this.spawnObjects();
    this.setupGrid();

    this.cameras.main.centerOn(400, 300);
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // 3. Subscriptions
    const store = useGameStore;

    this.unsubscribers.push(store.subscribe(
        state => state.roster,
        (roster) => this.syncRoster(roster),
        { equalityFn: (a, b) => a.dev === b.dev && a.sales === b.sales && a.support === b.support }
    ));

    this.unsubscribers.push(store.subscribe(
        state => state.activeVisitors,
        (visitors) => this.syncVisitors(visitors)
    ));

    this.unsubscribers.push(store.subscribe(
        state => state.mood,
        (mood) => this.updateMoodVisuals(mood)
    ));

    this.unsubscribers.push(store.subscribe(
        state => state.activeEvents,
        (events) => this.syncChaosVisuals(events)
    ));

    this.unsubscribers.push(store.subscribe(
        state => state.officeLevel,
        (level) => this.createFloor(level)
    ));

    // 4. Initial Sync
    const state = store.getState();
    this.syncRoster(state.roster);

    // 5. Cleanup Hook
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  // --- CLEANUP (Omega Refactor) ---
  onShutdown() {
    console.log("[MainScene] Shutting down. Cleaning up...");

    // 1. Unsubscribe from Store
    this.unsubscribers.forEach(u => u());
    this.unsubscribers = [];

    // 2. Destroy Groups/Objects
    this.floorGroup?.clear(true, true);
    this.objectGroup?.clear(true, true);
    this.workersGroup?.clear(true, true);
    this.visitorGroup?.clear(true, true);
    this.overlayGroup?.clear(true, true);

    // 3. Clean Input/Events
    this.input?.removeAllListeners();
    if (this.input?.keyboard) {
        this.input.keyboard.removeAllListeners();
    }
  }

  // --- LOGIC ---
  setupGrid() {
    this.easystar = new EasyStar.js();
    this.cols = 25;
    this.rows = 20;
    this.tileSize = 32;

    const grid = [];
    for (let y = 0; y < this.rows; y++) {
        const row = [];
        for (let x = 0; x < this.cols; x++) row.push(0);
        grid.push(row);
    }
    this.easystar.setGrid(grid);
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

  spawnObjects() {
      this.objectGroup.clear(true, true);
      this.spawnObject(2, 2, 'obj_server');
      this.spawnObject(23, 2, 'obj_coffee');
      this.spawnObject(2, 17, 'obj_plant');
  }

  spawnObject(x, y, texture) {
      this.objectGroup.add(this.add.image(x * 32 + 16, y * 32 + 16, texture));
  }

  // --- WORKER SYNC ---
  syncRoster(roster) {
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
          for (let i = 0; i < target - current; i++) this.spawnWorker(role);
      } else if (current > target) {
          const toRemove = this.getWorkersByRole(role).slice(0, current - target);
          toRemove.forEach(w => w.destroy());
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

  // --- VISUALS ---
  syncVisitors(activeVisitors) {
      this.manageVisitor('pizza_guy', activeVisitors.includes('pizza_guy'), 0, 300, 400, 300);
      this.manageVisitor('visitor_investor', activeVisitors.includes('investors'), 800, 300, 600, 300, 3);
  }

  manageVisitor(key, isActive, startX, startY, endX, endY, count=1) {
      const sprites = this.visitorGroup.getChildren().filter(v => v.texture.key === key);

      if (isActive && sprites.length === 0) {
          for(let i=0; i<count; i++) {
              const v = this.add.sprite(startX, startY + (i*40), key);
              this.physics.add.existing(v);
              this.tweens.add({ targets: v, x: endX, duration: 2000 });
              this.visitorGroup.add(v);
          }
      } else if (!isActive && sprites.length > 0) {
          sprites.forEach(s => s.destroy());
      }
  }

  updateMoodVisuals(mood) {
      const tint = (mood > 80) ? 0xffffff : (mood > 40 ? 0xccccff : 0x8888ff);
      this.workersGroup.children.iterate(w => w.setTint(tint));
  }

  syncChaosVisuals(events) {
      this.overlayGroup.clear(true, true);
      this.cameras.main.clearTint();

      events.forEach(e => {
          if (e.type === 'TECH_OUTAGE') {
              this.cameras.main.setTint(0x0000aa);
              this.addOverlayText("SYSTEM FAILURE", '#0000ff');
              this.workersGroup.children.iterate(w => w.showFeedback('???'));
          } else if (e.type === 'RANSOMWARE') {
              const skull = this.add.text(400, 300, "💀", { fontSize: '200px' }).setOrigin(0.5);
              this.overlayGroup.add(skull);
              this.tweens.add({ targets: skull, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
              this.addOverlayText("RANSOMWARE: PAY UP", '#ff0000');
          } else if (e.type === 'MARKET_SHITSTORM') {
              this.addOverlayText("SHITSTORM IN PROGRESS", '#aa0000');
              this.cameras.main.shake(100, 0.005);
          }
      });
  }

  addOverlayText(msg, color) {
      const t = this.add.text(400, 100, msg, { fontSize: '32px', color: '#fff', backgroundColor: color, padding: 10 }).setOrigin(0.5);
      this.overlayGroup.add(t);
  }
}
