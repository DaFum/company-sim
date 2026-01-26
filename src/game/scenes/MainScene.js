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
    this.particles = null;

    this.easystar = null;
    this._grid = null;

    this.soundManager = null;
    this.tooltip = null;
    this.dayNightOverlay = null;

    // Store subscriptions
    this.unsubscribers = [];

    // Path batching
    this._pendingPathRequests = 0;
    this._maxPathCalculationsPerTick = 4;
  }

  create() {
    console.log('[MainScene] Booting (Refactor)...');
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

    // Camera
    this.cameras.main.centerOn(400, 300);
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // INPUTS
    this.input.addPointer(1); // Enable multi-touch
    this.setupCameraControls();
    this.setupTouchInteractions();

    // Visuals
    this.setupTooltip();
    this.setupDayNightCycle();

    // 4) Subscriptions
    const store = useGameStore;
    if (store && store.subscribe && store.getState) {
      this.unsubscribers.push(
        store.subscribe(
          (state) => state.roster,
          (roster) => this.syncRoster(roster),
          {
            equalityFn: (a, b) => a.dev === b.dev && a.sales === b.sales && a.support === b.support,
          }
        )
      );

      this.unsubscribers.push(
        store.subscribe(
          (state) => state.activeVisitors,
          (visitors) => this.syncVisitors(visitors)
        )
      );

      this.unsubscribers.push(
        store.subscribe(
          (state) => state.mood,
          (mood) => this.updateMoodVisuals(mood)
        )
      );

      this.unsubscribers.push(
        store.subscribe(
          (state) => state.activeEvents,
          (events) => this.syncChaosVisuals(events)
        )
      );

      this.unsubscribers.push(
        store.subscribe(
          (state) => state.officeLevel,
          (level) => {
            this.createFloor(level);
            this.applyObstaclesToGrid();
          }
        )
      );

      this.unsubscribers.push(
        store.subscribe(
          (state) => state.tick,
          (tick) => this.updateDayNight(tick)
        )
      );

      // 5) Initial Sync
      const state = store.getState();
      this.syncRoster(state.roster);
      this.syncVisitors(state.activeVisitors);
      this.updateMoodVisuals(state.mood);
      this.syncChaosVisuals(state.activeEvents);
    } else {
      console.warn('[MainScene] Store unavailable.');
    }

    // Event Handler Referenzen speichern für sauberes Entfernen
    this._onZoomIn = () => this.handleZoom(0.2);
    this._onZoomOut = () => this.handleZoom(-0.2);

    window.addEventListener('ZOOM_IN', this._onZoomIn);
    window.addEventListener('ZOOM_OUT', this._onZoomOut);

    // Phaser-internes Shutdown Event nutzen
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onDestroy, this);
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
    if (this.unsubscribers) {
        this.unsubscribers.forEach((u) => u());
        this.unsubscribers = [];
    }

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

    // Clean Window Events
    window.removeEventListener('ZOOM_IN', this._onZoomIn);
    window.removeEventListener('ZOOM_OUT', this._onZoomOut);

    // 5) Pathing cleanup
    this.easystar = null;
    this._grid = null;
    this._pendingPathRequests = 0;
  }

  onDestroy() {
    // Aufräumen von Plugins oder Managern, falls nötig
    if (this.soundManager) {
        this.soundManager = null; // Garbage Collection helfen
    }
  }

  // --- CAMERA & INPUT ---
  setupCameraControls() {
    // Zoom (Wheel)
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const newZoom = this.cameras.main.zoom - deltaY * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 2));
    });

    // Pan (Pointer Move - Works for Mouse & Touch drag)
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
      this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
    });
  }

  handleZoom(delta) {
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom + delta, 0.5, 2));
  }

  setupTouchInteractions() {
    // Tap on Worker
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject instanceof WorkerSprite) {
        this.showTooltip(
          gameObject.x,
          gameObject.y - 40,
          `${gameObject.role.toUpperCase()}\nEnergy: ${Math.max(0, gameObject.energy).toFixed(0)}%`
        );
      }
    });

    // Tap on BG to close
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (currentlyOver.length === 0) {
        this.hideTooltip();
      }
    });
  }

  // --- VISUALS: PARTICLES ---
  createSmoke(x, y) {
    const emitter = this.add.particles(x, y, 'particle_pixel', {
      speed: { min: 10, max: 30 },
      angle: { min: 240, max: 300 },
      scale: { start: 1, end: 3 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 1000,
      frequency: 100,
      tint: 0x555555,
    });
    emitter.setDepth(50);
    this.time.delayedCall(2000, () => emitter.destroy());
  }

  createCodeBits(x, y) {
    const emitter = this.add.particles(x, y, 'particle_pixel', {
      speed: { min: 5, max: 15 },
      angle: { min: 260, max: 280 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500,
      frequency: 200,
      tint: 0x00ff00,
    });
    emitter.setDepth(50);
    this.time.delayedCall(1000, () => emitter.destroy());
  }

  // --- VISUALS: TOOLTIPS ---
  setupTooltip() {
    this.tooltip = this.add
      .text(0, 0, '', {
        font: '12px monospace',
        fill: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 5, y: 5 },
      })
      .setDepth(100)
      .setVisible(false)
      .setScrollFactor(0);
  }

  showTooltip(x, y, text) {
    this.tooltip.setScrollFactor(1);
    this.tooltip.setPosition(x, y);
    this.tooltip.setText(text);
    this.tooltip.setVisible(true);
  }

  hideTooltip() {
    this.tooltip.setVisible(false);
  }

  // --- VISUALS: DAY/NIGHT ---
  setupDayNightCycle() {
    this.dayNightOverlay = this.add
      .rectangle(0, 0, 8000, 6000, 0x000033)
      .setDepth(90)
      .setAlpha(0)
      .setOrigin(0.5, 0.5); // Center large overlay
  }

  updateDayNight(tick) {
    if (tick > 40) {
      const darkness = (tick - 40) / 20; // 0.0 to 1.0
      this.dayNightOverlay.setAlpha(darkness * 0.6);
    } else {
      this.dayNightOverlay.setAlpha(0);
    }
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
    const blocked = [
      { x: 2, y: 2 },
      { x: 23, y: 2 },
      { x: 2, y: 17 },
    ];
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
    const obj = this.add.image(x * this.tileSize + 16, y * this.tileSize + 16, texture);
    this.objectGroup.add(obj);

    // FX Polish
    if (obj.postFX) {
        if (texture === 'obj_server') {
            // Bloom: color, offsetX, offsetY, blurStrength, strength, steps
            obj.postFX.addBloom(0x00ff00, 1, 1, 1, 1.2, 2);
        }

        if (texture === 'obj_plant') {
            // Shadow: x, y, decay, power, color, samples, intensity
            obj.postFX.addShadow(0, 0, 0.1, 0.5, 0x000000, 2, 0.8);
        }
    }
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
    return this.workersGroup.getChildren().filter((w) => w.role === role);
  }

  adjustRoleCount(role, current, target) {
    if (current < target) {
      for (let i = 0; i < target - current; i++) this.spawnWorker(role);
    } else if (current > target) {
      const toRemove = this.getWorkersByRole(role).slice(0, current - target);
      toRemove.forEach((w) => w.destroy());
    }
  }

  spawnWorker(role) {
    const x = Phaser.Math.Between(1, this.cols - 2);
    const y = Phaser.Math.Between(1, this.rows - 2);
    const worker = new WorkerSprite(
      this,
      x * this.tileSize + 16,
      y * this.tileSize + 16,
      role,
      Date.now()
    );
    this.add.existing(worker);
    this.workersGroup.add(worker);
  }

  // --- VISITORS ---
  syncVisitors(activeVisitors) {
    this.manageVisitor('visitor_pizza', activeVisitors.includes('pizza_guy'), 0, 300, 400, 300);
    this.manageVisitor(
      'visitor_investor',
      activeVisitors.includes('investors'),
      800,
      300,
      600,
      300,
      3
    );
  }

  manageVisitor(key, isActive, startX, startY, endX, endY, count = 1) {
    const sprites = this.visitorGroup.getChildren().filter((v) => v.texture?.key === key);

    if (isActive && sprites.length === 0) {
      for (let i = 0; i < count; i++) {
        const v = this.add.sprite(startX, startY + i * 40, key);
        this.physics.add.existing(v);

        this.tweens.add({ targets: v, x: endX, duration: 2000 });
        v.once(Phaser.GameObjects.Events.DESTROY, () => this.tweens.killTweensOf(v));

        this.visitorGroup.add(v);
      }
    } else if (!isActive && sprites.length > 0) {
      sprites.forEach((s) => {
        this.tweens.killTweensOf(s);
        s.destroy();
      });
    }
  }

  // --- VISUALS ---
  updateMoodVisuals(mood) {
    const tint = mood > 80 ? 0xffffff : mood > 40 ? 0xccccff : 0x8888ff;
    this.workersGroup.children.iterate((w) => w?.setTint?.(tint));
  }

  syncChaosVisuals(events) {
    this.tweens.killAll();
    this.overlayGroup?.clear(true, true);

    for (const e of events) {
      if (e.type === 'TECH_OUTAGE') {
        const rect = this.add.rectangle(400, 300, 800, 600, 0x0000aa, 0.3);
        this.overlayGroup.add(rect);

        this.addOverlayText('SYSTEM FAILURE', '#0000ff');
        this.createSmoke(2 * 32, 2 * 32); // Server Smoke
        this.workersGroup.children.iterate((w) => w?.showFeedback?.('???'));
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
    const t = this.add
      .text(400, 100, msg, {
        fontSize: '32px',
        color: '#fff',
        backgroundColor: color,
        padding: { x: 10, y: 10 },
      })
      .setOrigin(0.5);
    this.overlayGroup.add(t);
  }
}
