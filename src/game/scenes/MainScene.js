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
    this.soundManager = new SoundManager(this);

    // 1) Groups
    this.floorTexture = null; // Replaces floorGroup
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

    // Initialize touch-specific variables
    this.pinchDistance = 0;
    this.isDragging = false;
    this.dragOrigin = new Phaser.Math.Vector2();

    // Fullscreen Button for Mobile (optional but recommended)
    this.createFullscreenButton();

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

    // --- PUSH THE LIMITS: POST-PROCESSING STACK ---
    // Only apply postFX if supported (WebGL)
    if (this.game.renderer.type === Phaser.WEBGL) {
      // 1. Tilt Shift (Bokeh)
      this.cameras.main.postFX.addTiltShift(0.5, 2.0, 0.4, true);

      // 2. Vignette
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.8, 0.4);

      // 3. Bloom
      this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 1.2, 1.5);
    }

    // --- ATMOSPHERE: DYNAMIC LIGHTING ---
    // 1. ENABLE LIGHTS
    this.lights.enable();
    this.lights.setAmbientColor(0x555555); // Darker ambient light for contrast

    // Mouse follower light (Flashlight)
    this.mouseLight = this.lights.addLight(0, 0, 200).setColor(0xffffff).setIntensity(2);
    this._onPointerMove = (pointer) => {
      if (this.mouseLight) {
        this.mouseLight.x = pointer.worldX;
        this.mouseLight.y = pointer.worldY;
      }
    };
    this.input.on('pointermove', this._onPointerMove);

    // 2. CREATE COFFEE ANIMATION
    if (!this.anims.exists('coffee_drain')) {
      this.anims.create({
        key: 'coffee_drain',
        frames: this.anims.generateFrameNumbers('obj_coffee_anim', { start: 0, end: 2 }),
        frameRate: 0.5, // Drain slowly
        repeat: 0,
      });
      this.anims.create({
        key: 'coffee_refill',
        frames: this.anims.generateFrameNumbers('obj_coffee_anim', { frames: [3, 0] }),
        frameRate: 2,
        repeat: 0,
      });
    }

    // Store Event Handler references for clean removal
    this._onZoomIn = () => this.handleZoom(0.2);
    this._onZoomOut = () => this.handleZoom(-0.2);

    window.addEventListener('ZOOM_IN', this._onZoomIn);
    window.addEventListener('ZOOM_OUT', this._onZoomOut);

    // Use internal Phaser Shutdown Event
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

    this.handleMobileControls();
  }

  handleMobileControls() {
    const input = this.input;
    const camera = this.cameras.main;

    // Pointer references
    const pointer1 = input.pointer1;
    const pointer2 = input.pointer2;

    // --- 1. PINCH TO ZOOM (Two Fingers) ---
    if (pointer1.isDown && pointer2.isDown) {
      // Calculate distance between fingers
      const dist = Phaser.Math.Distance.Between(pointer1.x, pointer1.y, pointer2.x, pointer2.y);

      if (this.pinchDistance > 0) {
        // Compare with previous value
        const delta = dist - this.pinchDistance;

        // Adjust zoom (Sensitivity 0.005)
        const newZoom = camera.zoom + delta * 0.005;
        camera.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 3)); // Set limits
      }

      // Save current distance
      this.pinchDistance = dist;
      this.isDragging = false; // Zoom blocks dragging
      return;
    } else {
      // Reset pinch distance if not pinching
      this.pinchDistance = 0;
    }

    // --- 2. PANNING (One finger / Mouse drag) ---
    const activePointer = input.activePointer;

    if (activePointer.isDown) {
      if (this.isDragging) {
        // Move camera based on delta
        // Divide by zoom for consistent speed
        camera.scrollX -= (activePointer.x - activePointer.prevPosition.x) / camera.zoom;
        camera.scrollY -= (activePointer.y - activePointer.prevPosition.y) / camera.zoom;
      } else {
        // Start drag
        this.isDragging = true;
      }
    } else {
      this.isDragging = false;
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

    // 3) Destroy groups & Objects
    if (this.mouseLight) {
      this.mouseLight.destroy();
      this.mouseLight = null;
    }
    if (this._footprintGraphics) {
      this._footprintGraphics.destroy();
      this._footprintGraphics = null;
    }
    if (this.floorTexture) {
      this.floorTexture.destroy();
      this.floorTexture = null;
    }
    this.objectGroup?.clear(true, true);
    this.workersGroup?.clear(true, true);
    this.visitorGroup?.clear(true, true);
    this.overlayGroup?.clear(true, true);

    // 4) Input cleanup
    this.input?.off('pointermove', this._onPointerMove);
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
    // Clean up plugins or managers if necessary
    if (this.soundManager) {
      this.soundManager = null; // Help Garbage Collection
    }
  }

  // --- CAMERA & INPUT ---
  setupCameraControls() {
    // Zoom (Wheel)
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const newZoom = this.cameras.main.zoom - deltaY * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 3));
    });

    // Legacy Pan Removed - Handled in update() via handleMobileControls
  }

  handleZoom(delta) {
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom + delta, 0.5, 3));
  }

  setupTouchInteractions() {
    // Tap on Worker with Drag Tolerance
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject instanceof WorkerSprite) {
        // We set a once-listener on pointerup for this specific event
        // But gameobjectdown fires on start.
        // Simpler: Check global pointer up or use InputPlugin features.
      }
    });

    // Better: Global Pointer Up Check
    this.input.on('pointerup', (pointer) => {
      // Only if tap (< 10px movement)
      if (pointer.getDistance() < 10) {
        // Check Collision
        // Manually raycast or check under pointer
        const worldPoint = pointer.positionToCamera(this.cameras.main);
        const workers = this.workersGroup.getChildren();

        // Simple AABB check
        const clickedWorker = workers.find((w) =>
          w.getBounds().contains(worldPoint.x, worldPoint.y)
        );

        if (clickedWorker) {
          this.showTooltip(
            clickedWorker.x,
            clickedWorker.y - 40,
            `${clickedWorker.role.toUpperCase()}\nEnergy: ${Math.max(0, clickedWorker.energy).toFixed(0)}%`
          );
        } else {
          this.hideTooltip();
        }
      }
    });
  }

  createFullscreenButton() {
    // Simple button top right (Relative)
    const btn = this.add
      .text(this.scale.width - 40, 40, '⛶', {
        fontSize: '32px',
        backgroundColor: '#00000055',
        padding: { x: 5, y: 5 },
      })
      .setOrigin(1, 0) // Anchor top right
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();

    btn.on('pointerup', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen(); //
      } else {
        this.scale.startFullscreen(); //
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
        backgroundColor: '#000000dd', // More opaque for better contrast
        padding: { x: 8, y: 8 },
      })
      .setDepth(100)
      .setVisible(false)
      .setScrollFactor(0);

    // Add Shadow FX for depth (PostFX)
    // x, y, decay, power, color, samples, intensity
    if (this.game.renderer.type === Phaser.WEBGL) {
      this.tooltip.postFX.addShadow(0, 4, 0.1, 1, 0x000000, 2, 1);
    }
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

  // --- FLOOR (RenderTexture) ---
  createFloor(level) {
    // Instead of a Group, we use a RenderTexture for maximum performance
    if (this.floorTexture) this.floorTexture.destroy();

    // Double size to cover edges, but grid size is enough here
    this.floorTexture = this.add
      .renderTexture(0, 0, this.cols * this.tileSize, this.rows * this.tileSize)
      .setDepth(0);

    const textureKey = `floor_${level}`;

    this.floorTexture.beginDraw();
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.floorTexture.batchDrawFrame(textureKey, 0, x * this.tileSize, y * this.tileSize);
      }
    }
    this.floorTexture.endDraw();
    // Enable pipeline for floor? Optional. Standard for now.
  }

  addFootprint(x, y) {
    if (this.floorTexture) {
      // Optimize: Reuse a shared Graphics object or create once
      if (!this._footprintGraphics) {
        this._footprintGraphics = this.make.graphics({ add: false });
        this._footprintGraphics.fillStyle(0x000000, 0.1);
        this._footprintGraphics.fillCircle(0, 0, 2);
      }
      this.floorTexture.draw(this._footprintGraphics, x, y);
    }
  }

  // --- OBJECTS ---
  spawnObjects() {
    this.objectGroup?.clear(true, true);
    this.spawnObject(2, 2, 'obj_server');
    this.spawnObject(23, 2, 'obj_coffee_anim', true); // Animated coffee
    this.spawnObject(2, 17, 'obj_plant');

    // NEW: Printer near support
    this.spawnObject(5, 5, 'obj_printer');

    // NEW: Watercooler central
    this.spawnObject(12, 10, 'obj_watercooler');

    // NEW: Whiteboard in Dev area
    this.spawnObject(3, 15, 'obj_whiteboard');

    // NEW: Vending Machine
    this.spawnObject(20, 10, 'obj_vending');
  }

  spawnObject(x, y, texture, isAnimated = false) {
    let obj;
    if (isAnimated) {
      obj = this.add.sprite(x * this.tileSize + 16, y * this.tileSize + 16, texture);
      if (texture === 'obj_coffee_anim') {
        obj.play('coffee_drain');
        obj.setInteractive();
        obj.on('pointerdown', () => {
          obj.play('coffee_refill');
          this.soundManager.play('kaching');
        });
      }
    } else {
      obj = this.add.image(x * this.tileSize + 16, y * this.tileSize + 16, texture);
    }

    // Enable Normal Map Lighting for all objects if supported
    if (this.game.renderer.pipelines && this.game.renderer.pipelines.has('Light2D')) {
      obj.setPipeline('Light2D');
    }

    this.objectGroup.add(obj);

    // FX Polish (WebGL Only)
    if (this.game.renderer.type === Phaser.WEBGL && obj.postFX) {
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
      if (key === 'visitor_pizza') {
        this.spawnPizzaGuyOrbit();
      } else {
        for (let i = 0; i < count; i++) {
          const v = this.add.sprite(startX, startY + i * 40, key);
          this.physics.add.existing(v);
          // Enable lighting for visitors too
          if (this.game.renderer.pipelines && this.game.renderer.pipelines.has('Light2D')) {
            v.setPipeline('Light2D');
          }

          this.tweens.add({ targets: v, x: endX, duration: 2000 });
          v.once(Phaser.GameObjects.Events.DESTROY, () => this.tweens.killTweensOf(v));

          this.visitorGroup.add(v);
        }
      }
    } else if (!isActive && sprites.length > 0) {
      sprites.forEach((s) => {
        this.tweens.killTweensOf(s);
        s.destroy();
      });
    }
  }

  spawnPizzaGuyOrbit() {
    // 1. Define start point (e.g. room center)
    const centerX = 400;
    const centerY = 300;
    const xRadius = 250;
    const yRadius = 150;

    // 2. Create path
    const path = new Phaser.Curves.Path(centerX + xRadius, centerY);

    // 3. Add ellipse
    path.ellipseTo(xRadius, yRadius, 0, 360, false, 0);

    // 4. Create PathFollower
    const pizzaGuy = this.add.follower(path, 0, 0, 'visitor_pizza');
    if (this.game.renderer.pipelines && this.game.renderer.pipelines.has('Light2D')) {
      pizzaGuy.setPipeline('Light2D');
    }

    // 5. Start movement
    pizzaGuy.startFollow({
      duration: 10000,
      repeat: -1,
      rotateToPath: false,
      ease: 'Linear',
    });

    this.visitorGroup.add(pizzaGuy);
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
