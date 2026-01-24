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
    this._grid = null;

    this.soundManager = null;

    // Store subscriptions
    this.unsubscribers = [];

    // Path batching
    this._pendingPathRequests = 0;
    this._maxPathCalculationsPerTick = 4;
  }

  create() {
    console.log('[MainScene] Booting (Omega Refactor)...');
    this.soundManager = new SoundManager(this);

    // 1) Groups
    this.floorGroup = this.add.group();
    this.objectGroup = this.add.group();
    this.workersGroup = this.add.group({ runChildUpdate: true });
    this.visitorGroup = this.add.group({ runChildUpdate: true });
    this.overlayGroup = this.add.group();

    // 2) Grid FIRST
    this.setupGrid();

    // 3) Initial Setup
    this.createFloor(1);
    this.spawnObjects();
    this.applyObstaclesToGrid();

    this.cameras.main.centerOn(400, 300);
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // 4) Subscriptions
    const store = useGameStore;
    if (store && store.subscribe && store.getState) {
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
            (level) => {
                this.createFloor(level);
                this.applyObstaclesToGrid();
            }
        ));

        // 5) Initial Sync
        const state = store.getState();
        this.syncRoster(state.roster);
        this.syncVisitors(state.activeVisitors);
        this.updateMoodVisuals(state.mood);
        this.syncChaosVisuals(state.activeEvents);
    } else {
        console.warn('[MainScene] Store unavailable.');
    }

    // 6) Cleanup Hook
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  update() {
    // Batch EasyStar calculations
    if (this.easystar && this._pendingPathRequests > 0) {
      for (let i = 0; i < this._maxPathCalculationsPerTick; i++) {
        this.easystar.calculate();
        if (this._pendingPathRequests <= 0) break;
      }
    }
  }

  onShutdown() {
    console.log('[MainScene] Shutting down. Cleaning up...');

    // 1) Unsubscribe store
    this.unsubscribers.forEach(u => u());
    this.unsubscribers = [];

    // 2) Kill tweens
    this.tweens.killAll();

    // 3) Destroy groups
    this.floorGroup?.clear(true, true);
    this.objectGroup?.clear(true, true);
    this.workersGroup?.clear(true, true);
    this.visitorGroup?.clear(true, true);
    this.overlayGroup?.clear(true, true);

    // 4) Input cleanup
    this.input?.removeAllListeners();
    if (this.input?.keyboard) {
      this.input.keyboard.removeAllListeners();
      this.input.keyboard.removeAllKeys(true);
      this.input.keyboard.shutdown();
    }

    // 5) Pathing cleanup
    this.easystar = null;
    this._grid = null;
    this._pendingPathRequests = 0;
  }

  // --- GRID / PATHFINDING ---
  setupGrid() {
    this.easystar = new EasyStar.js();
    this.cols = 25;
    this.rows = 20;
    this.tileSize = 32;

    this._grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.easystar.setGrid(this._grid);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.setIterationsPerCalculation(200);
  }

  applyObstaclesToGrid() {
    if (!this._grid) return;

    // Reset
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) this._grid[y][x] = 0;
    }

    // Hardcoded obstacles
    const blocked = [{ x: 2, y: 2 }, { x: 23, y: 2 }, { x: 2, y: 17 }];
    for (const b of blocked) {
      if (b.x >= 0 && b.x < this.cols && b.y >= 0 && b.y < this.rows) {
        this._grid[b.y][b.x] = 1;
      }
    }

    this.easystar.setGrid(this._grid);
    this.easystar.setAcceptableTiles([0]);
  }

  requestMove(worker, x, y) {
    const startX = Math.floor(worker.x / this.tileSize);
    const startY = Math.floor(worker.y / this.tileSize);
    const endX = Phaser.Math.Clamp(x, 0, this.cols - 1);
    const endY = Phaser.Math.Clamp(y, 0, this.rows - 1);

    this._pendingPathRequests++;

    this.easystar.findPath(startX, startY, endX, endY, (path) => {
      this._pendingPathRequests = Math.max(0, this._pendingPathRequests - 1);
      if (path && path.length) worker.startPath(path);
    });
  }

  // --- FLOOR ---
  createFloor(level) {
    this.floorGroup?.clear(true, true);
    const textureKey = `floor_${level}`;
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const tile = this.add.image(x * this.tileSize, y * this.tileSize, textureKey).setOrigin(0);
        if ((x + y) % 2 === 0) tile.setTint(0xdddddd);
        this.floorGroup.add(tile);
      }
    }
  }

  // --- OBJECTS ---
  spawnObjects() {
    this.objectGroup?.clear(true, true);
    this.spawnObject(2, 2, 'obj_server');
    this.spawnObject(23, 2, 'obj_coffee');
    this.spawnObject(2, 17, 'obj_plant');
  }

  spawnObject(x, y, texture) {
    this.objectGroup.add(this.add.image(x * this.tileSize + 16, y * this.tileSize + 16, texture));
  }

  // --- WORKERS ---
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
    const x = Phaser.Math.Between(1, this.cols - 2);
    const y = Phaser.Math.Between(1, this.rows - 2);
    const worker = new WorkerSprite(this, x * this.tileSize + 16, y * this.tileSize + 16, role, Date.now());
    this.add.existing(worker);
    this.workersGroup.add(worker);
  }

  // --- VISITORS ---
  syncVisitors(activeVisitors) {
    this.manageVisitor('visitor_pizza', activeVisitors.includes('pizza_guy'), 0, 300, 400, 300);
    this.manageVisitor('visitor_investor', activeVisitors.includes('investors'), 800, 300, 600, 300, 3);
  }

  manageVisitor(key, isActive, startX, startY, endX, endY, count = 1) {
    const sprites = this.visitorGroup.getChildren().filter(v => v.texture?.key === key);

    if (isActive && sprites.length === 0) {
      for (let i = 0; i < count; i++) {
        const v = this.add.sprite(startX, startY + (i * 40), key);
        this.physics.add.existing(v);

        const tween = this.tweens.add({ targets: v, x: endX, duration: 2000 });
        v.once(Phaser.GameObjects.Events.DESTROY, () => this.tweens.killTweensOf(v));

        this.visitorGroup.add(v);
      }
    } else if (!isActive && sprites.length > 0) {
      sprites.forEach(s => {
        this.tweens.killTweensOf(s);
        s.destroy();
      });
    }
  }

  // --- VISUALS ---
  updateMoodVisuals(mood) {
    const tint = (mood > 80) ? 0xffffff : (mood > 40 ? 0xccccff : 0x8888ff);
    this.workersGroup.children.iterate(w => w?.setTint?.(tint));
  }

  syncChaosVisuals(events) {
    this.tweens.killAll();
    this.overlayGroup?.clear(true, true);
    this.cameras.main.clearTint();

    for (const e of events) {
      if (e.type === 'TECH_OUTAGE') {
        this.cameras.main.setTint(0x0000aa);
        this.addOverlayText('SYSTEM FAILURE', '#0000ff');
        this.workersGroup.children.iterate(w => w?.showFeedback?.('???'));
      } else if (e.type === 'RANSOMWARE') {
        const skull = this.add.text(400, 300, '💀', { fontSize: '200px' }).setOrigin(0.5);
        this.overlayGroup.add(skull);

        this.tweens.add({ targets: skull, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
        skull.once(Phaser.GameObjects.Events.DESTROY, () => this.tweens.killTweensOf(skull));

        this.addOverlayText('RANSOMWARE: PAY UP', '#ff0000');
      } else if (e.type === 'MARKET_SHITSTORM') {
        this.addOverlayText('SHITSTORM IN PROGRESS', '#aa0000');
        this.cameras.main.shake(100, 0.005);
      }
    }
  }

  addOverlayText(msg, color) {
    const t = this.add.text(400, 100, msg, { fontSize: '32px', color: '#fff', backgroundColor: color, padding: { x: 10, y: 10 } }).setOrigin(0.5);
    this.overlayGroup.add(t);
  }
}
