import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import EasyStar from 'easystarjs';
import SoundManager from '../SoundManager';
import WorkerSprite from '../sprites/WorkerSprite';

const DRAG_FRICTION = 0.95;
const ZOOM_SENSITIVITY = 0.002;
const MIN_INERTIA_VELOCITY_SQ = 0.1;

/**
 * @typedef {Object} Roster
 * @property {number} dev - Number of developers.
 * @property {number} sales - Number of sales people.
 * @property {number} support - Number of support staff.
 */

/**
 * @typedef {Object} GameEvent
 * @property {string} type - The type of event (e.g., 'TECH_OUTAGE').
 * @property {number} timeLeft - Remaining duration in ticks.
 * @property {string} severity - Severity level (e.g., 'HIGH').
 * @property {string} description - Description of the event.
 */

/**
 * Main gameplay scene controlling the office simulation.
 * Handles rendering, input, pathfinding, and syncing with the game store.
 */
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

    this._chaosTweens = [];
  }

  /**
   * Initializes the scene, sets up groups, grid, inputs, and subscriptions.
   */
  create() {
    this.soundManager = new SoundManager(this);

    // 0) Animations (Must be before spawnObjects)
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
    this.createWalls();
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
    this.dragVelocity = new Phaser.Math.Vector2(0, 0);
    this.dragFriction = DRAG_FRICTION;

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
      if (state) {
        this.syncRoster(state.roster);
        this.syncVisitors(state.activeVisitors);
        this.updateMoodVisuals(state.mood);
        this.syncChaosVisuals(state.activeEvents);
      }
    } else {
      console.warn('[MainScene] Store unavailable.');
    }

    // --- PUSH THE LIMITS: POST-PROCESSING STACK ---
    // Only apply postFX if supported (WebGL)
    // if (this.game.renderer.type === Phaser.WEBGL) {
    //   // 1. Tilt Shift (Bokeh)
    //   this.cameras.main.postFX.addTiltShift(0.5, 2.0, 0.4, true);

    //   // 2. Vignette
    //   this.cameras.main.postFX.addVignette(0.5, 0.5, 0.8, 0.4);

    //   // 3. Bloom
    //   this.cameras.main.postFX.addBloom(0xffffff, 1, 1, 0.5, 1.0);
    // }

    // --- ATMOSPHERE: DYNAMIC LIGHTING ---
    // 1. ENABLE LIGHTS
    this.lights.enable();
    this.lights.setAmbientColor(0x888888); // Brighter ambient light for better visibility

    // Mouse follower light (Flashlight)
    this.mouseLight = this.lights.addLight(0, 0, 200).setColor(0xffffff).setIntensity(2);
    this._onPointerMove = (pointer) => {
      if (this.mouseLight) {
        this.mouseLight.x = pointer.worldX;
        this.mouseLight.y = pointer.worldY;
      }
    };
    this.input.on('pointermove', this._onPointerMove);

    // Store Event Handler references for clean removal
    this._onZoomIn = () => this.handleZoom(0.2);
    this._onZoomOut = () => this.handleZoom(-0.2);

    window.addEventListener('ZOOM_IN', this._onZoomIn);
    window.addEventListener('ZOOM_OUT', this._onZoomOut);

    // Use internal Phaser Shutdown Event
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onDestroy, this);
  }

  /**
   * Main update loop. Handles pathfinding batching, depth sorting, and mobile controls.
   */
  update() {
    // Batch EasyStar calculations
    if (this.easystar && this._pendingPathRequests > 0) {
      for (let i = 0; i < this._maxPathCalculationsPerTick; i++) {
        this.easystar.calculate();
        if (this._pendingPathRequests <= 0) break;
      }
    }

    // Depth Sorting
    this.workersGroup?.children.iterate((child) => {
      child.setDepth(child.y);
    });
    this.visitorGroup?.children.iterate((child) => {
      child.setDepth(child.y);
    });
    // Static objects can also be sorted if they are in a Group,
    // but typically they are static. If we want them to interact properly
    // with workers, they should be setDepth(y) once on creation.
    // For now, let's ensure objectGroup members have depth set.
    // (Optional: this could be done in spawnObject)
    // this.objectGroup.children.iterate((child) => child.setDepth(child.y));

    this.handleMobileControls();
  }

  /**
   * Handles touch input for panning and pinching to zoom.
   */
  handleMobileControls() {
    const input = this.input;
    const camera = this.cameras.main;

    // Pointer references
    const pointer1 = input.pointer1;
    const pointer2 = input.pointer2;

    // --- 1. PINCH TO ZOOM (Two Fingers) ---
    if (pointer1.isDown && pointer2.isDown) {
      this.isDragging = false; // Stop panning if pinching
      this.dragVelocity.reset(); // Stop inertia

      // Calculate distance between fingers
      const dist = Phaser.Math.Distance.Between(pointer1.x, pointer1.y, pointer2.x, pointer2.y);
      const midX = (pointer1.x + pointer2.x) / 2;
      const midY = (pointer1.y + pointer2.y) / 2;

      if (this.pinchDistance > 0) {
        const delta = dist - this.pinchDistance;

        // Scale zoom factor based on current zoom for uniform feel
        const zoomFactor = delta * ZOOM_SENSITIVITY * camera.zoom;
        const newZoom = Phaser.Math.Clamp(camera.zoom + zoomFactor, 0.5, 3);

        if (newZoom !== camera.zoom) {
          // Zoom-to-Point: Keep the world point under the pinch center stable
          const worldPointBefore = camera.getWorldPoint(midX, midY);

          camera.setZoom(newZoom);
          camera.preRender(); // Update matrices for accurate calculation

          const worldPointAfter = camera.getWorldPoint(midX, midY);

          // Adjust scroll to compensate for the drift
          camera.scrollX += worldPointBefore.x - worldPointAfter.x;
          camera.scrollY += worldPointBefore.y - worldPointAfter.y;
        }
      }

      // Save current distance
      this.pinchDistance = dist;
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
        const dx = (activePointer.x - activePointer.prevPosition.x) / camera.zoom;
        const dy = (activePointer.y - activePointer.prevPosition.y) / camera.zoom;

        camera.scrollX -= dx;
        camera.scrollY -= dy;

        // Track velocity (instantaneous)
        this.dragVelocity.set(-dx, -dy);
      } else {
        // Start drag
        this.isDragging = true;
        this.dragVelocity.reset();
      }
    } else {
      this.isDragging = false;

      // Apply Inertia
      if (this.dragVelocity.lengthSq() > MIN_INERTIA_VELOCITY_SQ) {
        camera.scrollX += this.dragVelocity.x;
        camera.scrollY += this.dragVelocity.y;

        // Damping
        this.dragVelocity.scale(this.dragFriction);

        // Stop if too slow
        if (this.dragVelocity.lengthSq() < MIN_INERTIA_VELOCITY_SQ) {
          this.dragVelocity.reset();
        }
      }
    }
  }

  /**
   * Cleans up resources when the scene shuts down.
   */
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

    this._chaosTweens = [];
  }

  /**
   * Called when the scene is destroyed.
   */
  onDestroy() {
    // Clean up plugins or managers if necessary
    if (this.soundManager) {
      this.soundManager = null; // Help Garbage Collection
    }
  }

  // --- CAMERA & INPUT ---
  /**
   * Sets up mouse wheel zoom control.
   */
  setupCameraControls() {
    // Zoom (Wheel)
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const newZoom = this.cameras.main.zoom - deltaY * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 3));
    });

    // Legacy Pan Removed - Handled in update() via handleMobileControls
  }

  /**
   * Adjusts camera zoom by a delta.
   * @param {number} delta - Amount to change zoom level.
   */
  handleZoom(delta) {
    this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom + delta, 0.5, 3));
  }

  /**
   * Sets up touch interactions for selecting workers.
   */
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

  /**
   * Creates an on-screen button to toggle fullscreen mode.
   */
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
  /**
   * Spawns smoke particles at a location.
   * @param {number} x - X position.
   * @param {number} y - Y position.
   */
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

  /**
   * Spawns code bit particles (green matrix style).
   * @param {number} x - X position.
   * @param {number} y - Y position.
   */
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
  /**
   * Initializes the shared tooltip text object.
   */
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

  /**
   * Shows a tooltip at the specified position.
   * @param {number} x - X position.
   * @param {number} y - Y position.
   * @param {string} text - Tooltip content.
   */
  showTooltip(x, y, text) {
    this.tooltip.setScrollFactor(1);
    this.tooltip.setPosition(x, y);
    this.tooltip.setText(text);
    this.tooltip.setVisible(true);
  }

  /**
   * Hides the tooltip.
   */
  hideTooltip() {
    this.tooltip.setVisible(false);
  }

  // --- VISUALS: DAY/NIGHT ---
  /**
   * Creates the day/night overlay rectangle.
   */
  setupDayNightCycle() {
    this.dayNightOverlay = this.add
      .rectangle(0, 0, 8000, 6000, 0x000033)
      .setDepth(90)
      .setAlpha(0)
      .setOrigin(0.5, 0.5); // Center large overlay
  }

  /**
   * Updates the day/night overlay alpha based on the current tick.
   * @param {number} tick - Current game tick (0-60).
   */
  updateDayNight(tick) {
    if (tick > 40) {
      const darkness = (tick - 40) / 20; // 0.0 to 1.0
      this.dayNightOverlay.setAlpha(darkness * 0.6);
    } else {
      this.dayNightOverlay.setAlpha(0);
    }
  }

  // --- GRID / PATHFINDING ---
  /**
   * Initializes EasyStar pathfinding and the grid.
   */
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

  /**
   * Marks static obstacles on the grid (walls, furniture).
   */
  applyObstaclesToGrid() {
    if (!this._grid) return;

    // Reset
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) this._grid[y][x] = 0;
    }

    // 1. Perimeter Walls
    // Top & Bottom walls
    for (let x = 0; x < this.cols; x++) {
      this._grid[0][x] = 1;
      this._grid[this.rows - 1][x] = 1;
    }
    // Left & Right walls (excluding corners)
    for (let y = 1; y < this.rows - 1; y++) {
      this._grid[y][0] = 1;
      this._grid[y][this.cols - 1] = 1;
    }

    // 2. Hardcoded obstacles
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

  /**
   * Spawns wall sprites around the perimeter.
   */
  createWalls() {
    // Add walls to object group or a dedicated group
    // Top & Bottom
    for (let x = 0; x < this.cols; x++) {
      this.spawnWall(x, 0);
      this.spawnWall(x, this.rows - 1);
    }
    // Left & Right (skip corners as they are covered)
    for (let y = 1; y < this.rows - 1; y++) {
      this.spawnWall(0, y);
      this.spawnWall(this.cols - 1, y);
    }
  }

  /**
   * Spawns a single wall sprite at the grid coordinates.
   * @param {number} x - Grid X.
   * @param {number} y - Grid Y.
   */
  spawnWall(x, y) {
    const wall = this.add.image(
      x * this.tileSize + this.tileSize / 2,
      y * this.tileSize + this.tileSize / 2,
      'wall'
    );

    // Enable Lighting
    if (this.game.renderer.pipelines && this.game.renderer.pipelines.has('Light2D')) {
      wall.setPipeline('Light2D');
    }

    // Depth: Walls at the top (y=0) should be behind everything?
    // Walls at the bottom (y=rows-1) should be in front.
    // Standard setDepth(y) works fine for isometric/top-down logic.
    wall.setDepth(wall.y);

    this.objectGroup.add(wall);
  }

  /**
   * Requests a path for a worker using EasyStar.
   * @param {WorkerSprite} worker - The worker requesting movement.
   * @param {number} x - Target grid X.
   * @param {number} y - Target grid Y.
   */
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
  /**
   * Creates the floor texture using a RenderTexture.
   * @param {number} level - Office level (determines floor style).
   */
  createFloor(level) {
    // Instead of a Group, we use a RenderTexture for maximum performance
    if (this.floorTexture) this.floorTexture.destroy();

    // Double size to cover edges, but grid size is enough here
    this.floorTexture = this.add
      .renderTexture(0, 0, this.cols * this.tileSize, this.rows * this.tileSize)
      .setOrigin(0, 0)
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

  /**
   * Adds a temporary footprint decal to the floor.
   * @param {number} x - X position.
   * @param {number} y - Y position.
   */
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
  /**
   * Spawns all static objects (furniture, plants) in the office.
   */
  spawnObjects() {
    this.objectGroup?.clear(true, true);

    // --- ZONE: SERVER ROOM (Top Left) ---
    this.spawnObject(2, 2, 'obj_server');
    this.spawnObject(3, 2, 'obj_server');
    this.spawnObject(4, 2, 'obj_server');
    this.spawnObject(2, 3, 'obj_server');

    // --- ZONE: DEV AREA (Left/Mid) ---
    // Rows of desks
    for (let row = 6; row <= 12; row += 3) {
      for (let col = 3; col <= 8; col += 2) {
        this.spawnObject(col, row, 'obj_desk');
        this.spawnObject(col, row - 1, 'obj_chair');
      }
    }
    this.spawnObject(3, 14, 'obj_whiteboard');
    this.spawnObject(8, 14, 'obj_printer');

    // --- ZONE: MEETING ROOM (Top Right) ---
    // Table is 2 tiles wide, spawn at x,y (x is left tile)
    // We handle custom sprites carefully, but spawnObject centers them on x,y
    // Let's spawn two separate "halves" or just place it and block tiles.
    // For simplicity, we used a 64px texture. spawnObject logic assumes 32px grid centers.
    // We'll spawn it at x=18, y=4. 18*32=576. +16=592.
    // 64px wide means it covers x=18 and x=19.
    this.spawnObject(18, 4, 'obj_table_meeting');
    // Adjust position if needed, or just let it overlap.
    // Since it's 64 wide, center is at +32. spawnObject puts center at tile center +16.
    // So visual x is (18*32)+16 = 592. Real width 64 -> left 560, right 624.
    // Tile 18 starts 576. So it overhangs left? No.
    // Phaser Image Origin 0.5. Center 592. Extent 560-624.
    // Tile 17: 544-576. Tile 18: 576-608. Tile 19: 608-640.
    // So it covers half of 18 and half of 19?
    // Let's just place it and see.

    // Chairs around table
    this.spawnObject(18, 3, 'obj_chair');
    this.spawnObject(19, 3, 'obj_chair');
    this.spawnObject(18, 5, 'obj_chair');
    this.spawnObject(19, 5, 'obj_chair');

    // --- ZONE: SALES/SUPPORT (Bottom Right) ---
    for (let row = 10; row <= 16; row += 3) {
      for (let col = 16; col <= 21; col += 3) {
        this.spawnObject(col, row, 'obj_desk');
        this.spawnObject(col, row - 1, 'obj_chair');
      }
    }
    this.spawnObject(22, 12, 'obj_cabinet');
    this.spawnObject(22, 13, 'obj_cabinet');

    // --- ZONE: LOUNGE (Bottom Left/Center) ---
    this.spawnObject(12, 16, 'obj_rug'); // Decoration, walkable?
    this.spawnObject(11, 16, 'obj_couch');
    this.spawnObject(13, 16, 'obj_couch');

    this.spawnObject(23, 17, 'obj_coffee_anim', true);
    this.spawnObject(21, 17, 'obj_vending');
    this.spawnObject(19, 17, 'obj_watercooler');

    // Plants
    this.spawnObject(2, 17, 'obj_plant');
    this.spawnObject(23, 1, 'obj_plant');
    this.spawnObject(10, 10, 'obj_plant');
  }

  /**
   * Spawns a single object at the given grid coordinates.
   * @param {number} x - Grid X.
   * @param {number} y - Grid Y.
   * @param {string} texture - Texture key.
   * @param {boolean} [isAnimated=false] - Whether the object is an animated sprite.
   */
  spawnObject(x, y, texture, isAnimated = false) {
    let obj;
    if (isAnimated) {
      obj = this.add.sprite(
        x * this.tileSize + this.tileSize / 2,
        y * this.tileSize + this.tileSize / 2,
        texture
      );
      if (texture === 'obj_coffee_anim') {
        obj.play('coffee_drain');
        obj.setInteractive();
        obj.on('pointerdown', () => {
          obj.play('coffee_refill');
          this.soundManager.play('kaching');
        });
      }
    } else {
      obj = this.add.image(
        x * this.tileSize + this.tileSize / 2,
        y * this.tileSize + this.tileSize / 2,
        texture
      );
    }

    // Enable Normal Map Lighting for all objects if supported
    if (this.game.renderer.pipelines && this.game.renderer.pipelines.has('Light2D')) {
      obj.setPipeline('Light2D');
    }

    // Set Initial Depth for static objects
    obj.setDepth(obj.y);

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
  /**
   * Syncs the visual worker count with the store roster.
   * @param {Roster} roster - Roster object containing role counts.
   */
  syncRoster(roster) {
    const currentDevs = this.getWorkersByRole('dev');
    const currentSales = this.getWorkersByRole('sales');
    const currentSupport = this.getWorkersByRole('support');

    this.adjustRoleCount('dev', currentDevs.length, roster.dev);
    this.adjustRoleCount('sales', currentSales.length, roster.sales);
    this.adjustRoleCount('support', currentSupport.length, roster.support);
  }

  /**
   * Gets all workers of a specific role.
   * @param {string} role - Worker role (dev, sales, support).
   * @returns {WorkerSprite[]} Array of workers.
   */
  getWorkersByRole(role) {
    return this.workersGroup.getChildren().filter((w) => w.role === role);
  }

  /**
   * Spawns or removes workers to match the target count.
   * @param {string} role - Worker role.
   * @param {number} current - Current count.
   * @param {number} target - Target count.
   */
  adjustRoleCount(role, current, target) {
    if (current < target) {
      for (let i = 0; i < target - current; i++) this.spawnWorker(role);
    } else if (current > target) {
      const toRemove = this.getWorkersByRole(role).slice(0, current - target);
      toRemove.forEach((w) => w.destroy());
    }
  }

  /**
   * Spawns a new worker of the given role.
   * @param {string} role - Worker role.
   */
  spawnWorker(role) {
    const x = Phaser.Math.Between(1, this.cols - 2);
    const y = Phaser.Math.Between(1, this.rows - 2);
    const worker = new WorkerSprite(
      this,
      x * this.tileSize + this.tileSize / 2,
      y * this.tileSize + this.tileSize / 2,
      role,
      Date.now()
    );
    this.add.existing(worker);
    this.workersGroup.add(worker);
  }

  // --- VISITORS ---
  /**
   * Syncs visitor visuals based on active visitors in the store.
   * @param {string[]} activeVisitors - List of active visitor keys.
   */
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

  /**
   * Spawns or removes visitor sprites.
   * @param {string} key - Visitor sprite key.
   * @param {boolean} isActive - Whether the visitor should be present.
   * @param {number} startX - Spawn X.
   * @param {number} startY - Spawn Y.
   * @param {number} endX - Target X.
   * @param {number} endY - Target Y.
   * @param {number} [count=1] - Number of visitors to spawn.
   */
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

  /**
   * Spawns the pizza guy with an orbiting path.
   */
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
  /**
   * Updates worker tints based on the mood.
   * @param {number} mood - Current mood value (0-100).
   */
  updateMoodVisuals(mood) {
    const tint = mood > 80 ? 0xffffff : mood > 40 ? 0xccccff : 0x8888ff;
    this.workersGroup.children.iterate((w) => w?.setTint?.(tint));
  }

  /**
   * Triggers visual effects for chaos events.
   * @param {GameEvent[]} events - List of active events.
   */
  syncChaosVisuals(events) {
    if (this._chaosTweens?.length) {
      this._chaosTweens.forEach((t) => t.stop());
    }
    this._chaosTweens = [];
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

        const tween = this.tweens.add({
          targets: skull,
          alpha: 0.5,
          yoyo: true,
          repeat: -1,
          duration: 500,
        });
        this._chaosTweens.push(tween);
        skull.once(Phaser.GameObjects.Events.DESTROY, () => this.tweens.killTweensOf(skull));

        this.addOverlayText('RANSOMWARE: PAY UP', '#ff0000');
      } else if (e.type === 'MARKET_SHITSTORM') {
        this.addOverlayText('SHITSTORM IN PROGRESS', '#aa0000');
        this.cameras.main.shake(100, 0.005);
      }
    }
  }

  /**
   * Adds text to the overlay group.
   * @param {string} msg - Text message.
   * @param {string} color - Background color hex string.
   */
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
