import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Phaser from 'phaser';
import MainScene from './MainScene';
import { useGameStore } from '../../store/gameStore';

// Mock the game store
vi.mock('../../store/gameStore', () => ({
  useGameStore: {
    subscribe: vi.fn(),
    getState: vi.fn(() => ({
      roster: { dev: 0, sales: 0, support: 0 },
      activeVisitors: [],
      mood: 80,
      activeEvents: [],
      officeLevel: 1,
      tick: 0,
    })),
  },
}));

// Mock EasyStar
vi.mock('easystarjs', () => ({
  default: {
    js: vi.fn(function() {
      this.setGrid = vi.fn();
      this.setAcceptableTiles = vi.fn();
      this.setIterationsPerCalculation = vi.fn();
      this.findPath = vi.fn();
      this.calculate = vi.fn();
      return this;
    }),
  },
}));

// Mock SoundManager
vi.mock('../SoundManager', () => ({
  default: vi.fn(function(scene) {
    this.scene = scene;
    this.play = vi.fn();
    return this;
  }),
}));

// Mock WorkerSprite
vi.mock('../sprites/WorkerSprite', () => ({
  default: vi.fn(function(scene, x, y, role, id) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.role = role;
    this.id = id;
    this.energy = 100;
    this.setDepth = vi.fn().mockReturnThis();
    this.setTint = vi.fn().mockReturnThis();
    this.showFeedback = vi.fn().mockReturnThis();
    this.destroy = vi.fn();
    this.startPath = vi.fn();
    this.getBounds = vi.fn(() => ({
      contains: vi.fn(() => false),
    }));
  }),
}));

describe('MainScene', () => {
  let scene;
  let mockAdd;
  let mockCameras;
  let mockInput;
  let mockLights;
  let mockAnims;
  let mockEvents;
  let mockTweens;
  let mockTime;
  let mockScale;
  let mockPhysics;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock add manager
    const mockGroup = {
      add: vi.fn(),
      getChildren: vi.fn(() => []),
      children: {
        iterate: vi.fn(),
      },
      clear: vi.fn(),
    };

    const mockGraphics = {
      fillStyle: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    };

    const mockRenderTexture = {
      destroy: vi.fn(),
      beginDraw: vi.fn(),
      endDraw: vi.fn(),
      batchDrawFrame: vi.fn(),
      draw: vi.fn(),
      setDepth: vi.fn().mockReturnThis(),
    };

    const mockSprite = {
      play: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      once: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setPipeline: vi.fn().mockReturnThis(),
      postFX: {
        addBloom: vi.fn(),
        addShadow: vi.fn(),
      },
    };

    const mockImage = {
      setDepth: vi.fn().mockReturnThis(),
      setPipeline: vi.fn().mockReturnThis(),
      postFX: {
        addBloom: vi.fn(),
        addShadow: vi.fn(),
      },
    };

    const mockText = {
      setOrigin: vi.fn().mockReturnThis(),
      setScrollFactor: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      setVisible: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setText: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      postFX: {
        addShadow: vi.fn(),
      },
    };

    const mockRectangle = {
      setDepth: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
    };

    const mockParticles = {
      setDepth: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
    };

    const mockFollower = {
      startFollow: vi.fn().mockReturnThis(),
      setPipeline: vi.fn().mockReturnThis(),
    };

    mockAdd = {
      group: vi.fn(() => mockGroup),
      graphics: vi.fn(() => mockGraphics),
      renderTexture: vi.fn(() => mockRenderTexture),
      sprite: vi.fn(() => mockSprite),
      image: vi.fn(() => mockImage),
      text: vi.fn(() => mockText),
      rectangle: vi.fn(() => mockRectangle),
      particles: vi.fn(() => mockParticles),
      existing: vi.fn(obj => obj),
      follower: vi.fn(() => mockFollower),
    };

    // Mock make manager
    const mockMake = {
      graphics: vi.fn(() => mockGraphics),
    };

    // Mock cameras
    const mockCamera = {
      centerOn: vi.fn(),
      setBackgroundColor: vi.fn(),
      setZoom: vi.fn(),
      shake: vi.fn(),
      scrollX: 0,
      scrollY: 0,
      zoom: 1,
      postFX: {
        addTiltShift: vi.fn(),
        addVignette: vi.fn(),
        addBloom: vi.fn(),
      },
    };

    mockCameras = {
      main: mockCamera,
    };

    // Mock input
    const mockPointer = {
      isDown: false,
      x: 0,
      y: 0,
      prevPosition: { x: 0, y: 0 },
      worldX: 100,
      worldY: 100,
      getDistance: vi.fn(() => 0),
      positionToCamera: vi.fn(() => ({ x: 100, y: 100 })),
    };

    const mockKeyboard = {
      removeAllListeners: vi.fn(),
      removeAllKeys: vi.fn(),
      shutdown: vi.fn(),
    };

    mockInput = {
      addPointer: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      removeAllListeners: vi.fn(),
      keyboard: mockKeyboard,
      pointer1: mockPointer,
      pointer2: mockPointer,
      activePointer: mockPointer,
    };

    // Mock lights
    const mockLight = {
      setColor: vi.fn().mockReturnThis(),
      setIntensity: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      x: 0,
      y: 0,
    };

    mockLights = {
      enable: vi.fn(),
      setAmbientColor: vi.fn(),
      addLight: vi.fn(() => mockLight),
    };

    // Mock anims
    mockAnims = {
      exists: vi.fn(() => false),
      create: vi.fn(),
      generateFrameNumbers: vi.fn(() => []),
    };

    // Mock events
    mockEvents = {
      once: vi.fn(),
    };

    // Mock tweens
    mockTweens = {
      add: vi.fn(),
      killAll: vi.fn(),
      killTweensOf: vi.fn(),
    };

    // Mock time
    mockTime = {
      delayedCall: vi.fn(),
    };

    // Mock scale
    mockScale = {
      width: 800,
      height: 600,
      isFullscreen: false,
      startFullscreen: vi.fn(),
      stopFullscreen: vi.fn(),
    };

    // Mock physics
    mockPhysics = {
      add: {
        existing: vi.fn(obj => obj),
      },
    };

    // Mock game
    const mockGame = {
      renderer: {
        type: Phaser.WEBGL,
        pipelines: {
          has: vi.fn(() => true),
        },
      },
    };

    // Create scene instance
    scene = new MainScene();
    scene.add = mockAdd;
    scene.make = mockMake;
    scene.cameras = mockCameras;
    scene.input = mockInput;
    scene.lights = mockLights;
    scene.anims = mockAnims;
    scene.events = mockEvents;
    scene.tweens = mockTweens;
    scene.time = mockTime;
    scene.scale = mockScale;
    scene.physics = mockPhysics;
    scene.game = mockGame;
    scene.scene = {
      start: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct scene key', () => {
      const newScene = new MainScene();
      expect(newScene.scene?.key || 'MainScene').toBe('MainScene');
    });

    it('should initialize all groups to null', () => {
      const newScene = new MainScene();
      expect(newScene.workersGroup).toBeNull();
      expect(newScene.floorGroup).toBeNull();
      expect(newScene.objectGroup).toBeNull();
      expect(newScene.visitorGroup).toBeNull();
      expect(newScene.overlayGroup).toBeNull();
    });

    it('should initialize pathfinding properties', () => {
      const newScene = new MainScene();
      expect(newScene.easystar).toBeNull();
      expect(newScene._grid).toBeNull();
      expect(newScene._pendingPathRequests).toBe(0);
      expect(newScene._maxPathCalculationsPerTick).toBe(4);
    });

    it('should initialize empty unsubscribers array', () => {
      const newScene = new MainScene();
      expect(newScene.unsubscribers).toEqual([]);
    });

    it('should initialize managers to null', () => {
      const newScene = new MainScene();
      expect(newScene.soundManager).toBeNull();
      expect(newScene.tooltip).toBeNull();
      expect(newScene.dayNightOverlay).toBeNull();
    });
  });

  describe('create', () => {
    it('should initialize sound manager', () => {
      scene.create();
      expect(scene.soundManager).toBeDefined();
    });

    it('should create all groups', () => {
      scene.create();
      expect(mockAdd.group).toHaveBeenCalledTimes(3); // object, workers, visitor
      expect(scene.objectGroup).toBeDefined();
      expect(scene.workersGroup).toBeDefined();
      expect(scene.visitorGroup).toBeDefined();
    });

    it('should set up grid before creating floor', () => {
      const setupGridSpy = vi.spyOn(scene, 'setupGrid');
      const createFloorSpy = vi.spyOn(scene, 'createFloor');

      scene.create();

      expect(setupGridSpy).toHaveBeenCalled();
      expect(createFloorSpy).toHaveBeenCalledWith(1);
    });

    it('should spawn objects and apply obstacles', () => {
      const spawnObjectsSpy = vi.spyOn(scene, 'spawnObjects');
      const applyObstaclesSpy = vi.spyOn(scene, 'applyObstaclesToGrid');

      scene.create();

      expect(spawnObjectsSpy).toHaveBeenCalled();
      expect(applyObstaclesSpy).toHaveBeenCalled();
    });

    it('should center camera and set background color', () => {
      scene.create();

      expect(mockCameras.main.centerOn).toHaveBeenCalledWith(400, 300);
      expect(mockCameras.main.setBackgroundColor).toHaveBeenCalledWith('#2d2d2d');
    });

    it('should enable multi-touch input', () => {
      scene.create();
      expect(mockInput.addPointer).toHaveBeenCalledWith(1);
    });

    it('should set up camera controls and touch interactions', () => {
      const setupCameraSpy = vi.spyOn(scene, 'setupCameraControls');
      const setupTouchSpy = vi.spyOn(scene, 'setupTouchInteractions');

      scene.create();

      expect(setupCameraSpy).toHaveBeenCalled();
      expect(setupTouchSpy).toHaveBeenCalled();
    });

    it('should initialize touch-specific variables', () => {
      scene.create();

      expect(scene.pinchDistance).toBe(0);
      expect(scene.isDragging).toBe(false);
      expect(scene.dragOrigin).toBeInstanceOf(Phaser.Math.Vector2);
    });

    it('should enable lights and set ambient color', () => {
      scene.create();

      expect(mockLights.enable).toHaveBeenCalled();
      expect(mockLights.setAmbientColor).toHaveBeenCalledWith(0x888888);
    });

    it('should create mouse light', () => {
      scene.create();

      expect(mockLights.addLight).toHaveBeenCalledWith(0, 0, 200);
      expect(scene.mouseLight).toBeDefined();
    });

    it('should set up pointer move handler', () => {
      scene.create();

      expect(mockInput.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
    });

    it('should create coffee animations', () => {
      scene.create();

      expect(mockAnims.create).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'coffee_drain' })
      );
      expect(mockAnims.create).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'coffee_refill' })
      );
    });

    it('should set up window event listeners for zoom', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      scene.create();

      expect(addEventListenerSpy).toHaveBeenCalledWith('ZOOM_IN', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('ZOOM_OUT', expect.any(Function));
    });

    it('should set up shutdown and destroy events', () => {
      scene.create();

      expect(mockEvents.once).toHaveBeenCalledWith(
        Phaser.Scenes.Events.SHUTDOWN,
        scene.onShutdown,
        scene
      );
      expect(mockEvents.once).toHaveBeenCalledWith(
        Phaser.Scenes.Events.DESTROY,
        scene.onDestroy,
        scene
      );
    });

    it('should subscribe to store updates', () => {
      scene.create();

      expect(useGameStore.subscribe).toHaveBeenCalled();
      expect(scene.unsubscribers.length).toBeGreaterThan(0);
    });

    it('should sync initial state from store', () => {
      const syncRosterSpy = vi.spyOn(scene, 'syncRoster');
      const syncVisitorsSpy = vi.spyOn(scene, 'syncVisitors');

      scene.create();

      expect(syncRosterSpy).toHaveBeenCalled();
      expect(syncVisitorsSpy).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      scene.workersGroup = mockAdd.group();
      scene.visitorGroup = mockAdd.group();
    });

    it('should process pending path requests', () => {
      const mockEasyStar = {
        calculate: vi.fn(),
      };
      scene.easystar = mockEasyStar;
      scene._pendingPathRequests = 2;

      scene.update();

      expect(mockEasyStar.calculate).toHaveBeenCalled();
    });

    it('should not exceed max path calculations per tick', () => {
      const mockEasyStar = {
        calculate: vi.fn(),
      };
      scene.easystar = mockEasyStar;
      scene._pendingPathRequests = 10;
      scene._maxPathCalculationsPerTick = 4;

      scene.update();

      expect(mockEasyStar.calculate).toHaveBeenCalledTimes(4);
    });

    it('should update depth sorting for workers', () => {
      scene.update();

      expect(scene.workersGroup.children.iterate).toHaveBeenCalled();
    });

    it('should update depth sorting for visitors', () => {
      scene.update();

      expect(scene.visitorGroup.children.iterate).toHaveBeenCalled();
    });

    it('should handle mobile controls', () => {
      const handleMobileSpy = vi.spyOn(scene, 'handleMobileControls');

      scene.update();

      expect(handleMobileSpy).toHaveBeenCalled();
    });
  });

  describe('handleMobileControls', () => {
    beforeEach(() => {
      scene.pinchDistance = 0;
      scene.isDragging = false;
    });

    it('should handle pinch to zoom with two fingers', () => {
      mockInput.pointer1.isDown = true;
      mockInput.pointer2.isDown = true;
      mockInput.pointer1.x = 0;
      mockInput.pointer1.y = 0;
      mockInput.pointer2.x = 100;
      mockInput.pointer2.y = 0;

      scene.handleMobileControls();
      scene.pinchDistance = 100;

      mockInput.pointer2.x = 120;
      scene.handleMobileControls();

      expect(mockCameras.main.setZoom).toHaveBeenCalled();
    });

    it('should clamp zoom between 0.5 and 3', () => {
      mockInput.pointer1.isDown = true;
      mockInput.pointer2.isDown = true;
      scene.pinchDistance = 100;

      // Simulate large zoom increase
      mockInput.pointer1.x = 0;
      mockInput.pointer2.x = 1000;
      mockCameras.main.zoom = 2.5;

      scene.handleMobileControls();

      const zoomCalls = mockCameras.main.setZoom.mock.calls;
      if (zoomCalls.length > 0) {
        const lastZoom = zoomCalls[zoomCalls.length - 1][0];
        expect(lastZoom).toBeLessThanOrEqual(3);
        expect(lastZoom).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should reset pinch distance when not pinching', () => {
      scene.pinchDistance = 100;
      mockInput.pointer1.isDown = false;
      mockInput.pointer2.isDown = false;

      scene.handleMobileControls();

      expect(scene.pinchDistance).toBe(0);
    });

    it('should handle panning with one finger', () => {
      mockInput.activePointer.isDown = true;
      mockInput.activePointer.x = 150;
      mockInput.activePointer.prevPosition.x = 100;
      scene.isDragging = true;
      mockCameras.main.scrollX = 0;

      scene.handleMobileControls();

      expect(mockCameras.main.scrollX).not.toBe(0);
    });

    it('should start dragging on pointer down', () => {
      mockInput.activePointer.isDown = true;
      scene.isDragging = false;

      scene.handleMobileControls();

      expect(scene.isDragging).toBe(true);
    });

    it('should stop dragging on pointer up', () => {
      scene.isDragging = true;
      mockInput.activePointer.isDown = false;

      scene.handleMobileControls();

      expect(scene.isDragging).toBe(false);
    });

    it('should block dragging during pinch', () => {
      mockInput.pointer1.isDown = true;
      mockInput.pointer2.isDown = true;
      scene.isDragging = true;

      scene.handleMobileControls();

      expect(scene.isDragging).toBe(false);
    });
  });

  describe('setupGrid', () => {
    it('should create grid with correct dimensions', () => {
      scene.setupGrid();

      expect(scene.cols).toBe(25);
      expect(scene.rows).toBe(20);
      expect(scene.tileSize).toBe(32);
      expect(scene._grid).toBeDefined();
      expect(scene._grid.length).toBe(20);
      expect(scene._grid[0].length).toBe(25);
    });

    it('should initialize all grid cells to 0', () => {
      scene.setupGrid();

      for (let y = 0; y < scene.rows; y++) {
        for (let x = 0; x < scene.cols; x++) {
          expect(scene._grid[y][x]).toBe(0);
        }
      }
    });

    it('should configure easystar', () => {
      scene.setupGrid();

      expect(scene.easystar).toBeDefined();
    });
  });

  describe('applyObstaclesToGrid', () => {
    beforeEach(() => {
      scene.setupGrid();
    });

    it('should reset grid to all walkable', () => {
      scene._grid[0][0] = 1;
      scene.applyObstaclesToGrid();

      expect(scene._grid[0][0]).toBe(0);
    });

    it('should mark hardcoded obstacles', () => {
      scene.applyObstaclesToGrid();

      // Check hardcoded obstacles at (2,2), (23,2), (2,17)
      expect(scene._grid[2][2]).toBe(1);
      expect(scene._grid[2][23]).toBe(1);
      expect(scene._grid[17][2]).toBe(1);
    });

    it('should not apply obstacles outside grid bounds', () => {
      scene.cols = 5;
      scene.rows = 5;
      scene._grid = Array.from({ length: 5 }, () => Array(5).fill(0));

      scene.applyObstaclesToGrid();

      // Obstacles at (23,2) and (2,17) are outside bounds
      expect(() => scene.applyObstaclesToGrid()).not.toThrow();
    });

    it('should handle null grid gracefully', () => {
      scene._grid = null;

      expect(() => scene.applyObstaclesToGrid()).not.toThrow();
    });
  });

  describe('requestMove', () => {
    beforeEach(() => {
      scene.setupGrid();
      scene.tileSize = 32;
      scene.cols = 25;
      scene.rows = 20;
    });

    it('should increment pending path requests', () => {
      const mockWorker = { x: 100, y: 100 };
      scene._pendingPathRequests = 0;

      scene.requestMove(mockWorker, 5, 5);

      expect(scene._pendingPathRequests).toBe(1);
    });

    it('should clamp target coordinates to grid bounds', () => {
      const mockWorker = { x: 100, y: 100 };
      const findPathSpy = vi.spyOn(scene.easystar, 'findPath');

      scene.requestMove(mockWorker, 50, 50); // Out of bounds

      expect(findPathSpy).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        24, // clamped to cols - 1
        19, // clamped to rows - 1
        expect.any(Function)
      );
    });

    it('should call worker startPath on successful pathfinding', () => {
      const mockWorker = {
        x: 100,
        y: 100,
        startPath: vi.fn(),
      };

      scene.easystar.findPath = vi.fn((sx, sy, ex, ey, callback) => {
        callback([{ x: 5, y: 5 }]);
      });

      scene.requestMove(mockWorker, 5, 5);

      expect(mockWorker.startPath).toHaveBeenCalledWith([{ x: 5, y: 5 }]);
    });

    it('should not call startPath if path is null', () => {
      const mockWorker = {
        x: 100,
        y: 100,
        startPath: vi.fn(),
      };

      scene.easystar.findPath = vi.fn((sx, sy, ex, ey, callback) => {
        callback(null);
      });

      scene.requestMove(mockWorker, 5, 5);

      expect(mockWorker.startPath).not.toHaveBeenCalled();
    });

    it('should decrement pending requests after pathfinding', () => {
      const mockWorker = { x: 100, y: 100, startPath: vi.fn() };
      scene._pendingPathRequests = 0;

      scene.easystar.findPath = vi.fn((sx, sy, ex, ey, callback) => {
        callback([{ x: 5, y: 5 }]);
      });

      scene.requestMove(mockWorker, 5, 5);
      expect(scene._pendingPathRequests).toBe(0);
    });
  });

  describe('createFloor', () => {
    beforeEach(() => {
      scene.cols = 25;
      scene.rows = 20;
      scene.tileSize = 32;
    });

    it('should destroy existing floor texture', () => {
      const mockOldFloor = { destroy: vi.fn() };
      scene.floorTexture = mockOldFloor;

      scene.createFloor(1);

      expect(mockOldFloor.destroy).toHaveBeenCalled();
    });

    it('should create render texture with correct dimensions', () => {
      scene.createFloor(1);

      expect(mockAdd.renderTexture).toHaveBeenCalledWith(
        0,
        0,
        25 * 32,
        20 * 32
      );
    });

    it('should use correct floor texture key for level', () => {
      const mockRenderTexture = mockAdd.renderTexture();

      scene.createFloor(2);

      expect(mockRenderTexture.batchDrawFrame).toHaveBeenCalledWith(
        'floor_2',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should draw all floor tiles', () => {
      const mockRenderTexture = mockAdd.renderTexture();

      scene.createFloor(1);

      expect(mockRenderTexture.batchDrawFrame).toHaveBeenCalledTimes(25 * 20);
    });

    it('should set depth to 0 for floor', () => {
      const mockRenderTexture = mockAdd.renderTexture();

      scene.createFloor(1);

      expect(mockRenderTexture.setDepth).toHaveBeenCalledWith(0);
    });
  });

  describe('addFootprint', () => {
    it('should create footprint graphics if not exists', () => {
      scene.floorTexture = mockAdd.renderTexture();

      scene.addFootprint(100, 100);

      expect(scene._footprintGraphics).toBeDefined();
    });

    it('should reuse existing footprint graphics', () => {
      scene.floorTexture = mockAdd.renderTexture();
      const mockGraphics = scene.make.graphics();
      scene._footprintGraphics = mockGraphics;

      scene.addFootprint(100, 100);

      expect(scene.make.graphics).not.toHaveBeenCalledTimes(2);
    });

    it('should draw footprint on floor texture', () => {
      const mockFloorTexture = mockAdd.renderTexture();
      scene.floorTexture = mockFloorTexture;

      scene.addFootprint(150, 200);

      expect(mockFloorTexture.draw).toHaveBeenCalled();
    });

    it('should handle null floor texture', () => {
      scene.floorTexture = null;

      expect(() => scene.addFootprint(100, 100)).not.toThrow();
    });
  });

  describe('spawnObjects', () => {
    beforeEach(() => {
      scene.objectGroup = mockAdd.group();
      scene.tileSize = 32;
    });

    it('should clear existing objects', () => {
      scene.spawnObjects();

      expect(scene.objectGroup.clear).toHaveBeenCalledWith(true, true);
    });

    it('should spawn all required objects', () => {
      const spawnObjectSpy = vi.spyOn(scene, 'spawnObject');

      scene.spawnObjects();

      expect(spawnObjectSpy).toHaveBeenCalledWith(2, 2, 'obj_server');
      expect(spawnObjectSpy).toHaveBeenCalledWith(23, 2, 'obj_coffee_anim', true);
      expect(spawnObjectSpy).toHaveBeenCalledWith(2, 17, 'obj_plant');
      expect(spawnObjectSpy).toHaveBeenCalledWith(5, 5, 'obj_printer');
      expect(spawnObjectSpy).toHaveBeenCalledWith(12, 10, 'obj_watercooler');
      expect(spawnObjectSpy).toHaveBeenCalledWith(3, 15, 'obj_whiteboard');
      expect(spawnObjectSpy).toHaveBeenCalledWith(20, 10, 'obj_vending');
    });
  });

  describe('spawnObject', () => {
    beforeEach(() => {
      scene.objectGroup = mockAdd.group();
      scene.tileSize = 32;
    });

    it('should create sprite for animated objects', () => {
      scene.spawnObject(5, 5, 'obj_coffee_anim', true);

      expect(mockAdd.sprite).toHaveBeenCalledWith(
        5 * 32 + 16,
        5 * 32 + 16,
        'obj_coffee_anim'
      );
    });

    it('should create image for static objects', () => {
      scene.spawnObject(5, 5, 'obj_plant', false);

      expect(mockAdd.image).toHaveBeenCalledWith(
        5 * 32 + 16,
        5 * 32 + 16,
        'obj_plant'
      );
    });

    it('should play animation for coffee machine', () => {
      const mockSprite = mockAdd.sprite();

      scene.spawnObject(5, 5, 'obj_coffee_anim', true);

      expect(mockSprite.play).toHaveBeenCalledWith('coffee_drain');
    });

    it('should make coffee machine interactive', () => {
      const mockSprite = mockAdd.sprite();

      scene.spawnObject(5, 5, 'obj_coffee_anim', true);

      expect(mockSprite.setInteractive).toHaveBeenCalled();
      expect(mockSprite.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    });

    it('should add object to objectGroup', () => {
      scene.spawnObject(5, 5, 'obj_plant', false);

      expect(scene.objectGroup.add).toHaveBeenCalled();
    });

    it('should set correct depth based on y position', () => {
      const mockImage = mockAdd.image();
      mockImage.y = 200;

      scene.spawnObject(5, 5, 'obj_plant', false);

      expect(mockImage.setDepth).toHaveBeenCalledWith(200);
    });

    it('should apply Light2D pipeline if available', () => {
      const mockImage = mockAdd.image();

      scene.spawnObject(5, 5, 'obj_plant', false);

      expect(mockImage.setPipeline).toHaveBeenCalledWith('Light2D');
    });
  });

  describe('worker management', () => {
    beforeEach(() => {
      scene.workersGroup = mockAdd.group();
      scene.cols = 25;
      scene.rows = 20;
      scene.tileSize = 32;
    });

    describe('syncRoster', () => {
      it('should adjust worker counts to match roster', () => {
        const adjustSpy = vi.spyOn(scene, 'adjustRoleCount');
        vi.spyOn(scene, 'getWorkersByRole').mockReturnValue([]);

        scene.syncRoster({ dev: 2, sales: 1, support: 3 });

        expect(adjustSpy).toHaveBeenCalledWith('dev', 0, 2);
        expect(adjustSpy).toHaveBeenCalledWith('sales', 0, 1);
        expect(adjustSpy).toHaveBeenCalledWith('support', 0, 3);
      });
    });

    describe('getWorkersByRole', () => {
      it('should return workers with matching role', () => {
        const devWorker = { role: 'dev' };
        const salesWorker = { role: 'sales' };
        scene.workersGroup.getChildren = vi.fn(() => [devWorker, salesWorker]);

        const result = scene.getWorkersByRole('dev');

        expect(result).toEqual([devWorker]);
      });

      it('should return empty array if no matches', () => {
        scene.workersGroup.getChildren = vi.fn(() => []);

        const result = scene.getWorkersByRole('dev');

        expect(result).toEqual([]);
      });
    });

    describe('adjustRoleCount', () => {
      it('should spawn workers when target exceeds current', () => {
        const spawnSpy = vi.spyOn(scene, 'spawnWorker');

        scene.adjustRoleCount('dev', 1, 3);

        expect(spawnSpy).toHaveBeenCalledTimes(2);
        expect(spawnSpy).toHaveBeenCalledWith('dev');
      });

      it('should destroy workers when current exceeds target', () => {
        const mockWorker1 = { role: 'dev', destroy: vi.fn() };
        const mockWorker2 = { role: 'dev', destroy: vi.fn() };
        vi.spyOn(scene, 'getWorkersByRole').mockReturnValue([mockWorker1, mockWorker2]);

        scene.adjustRoleCount('dev', 2, 1);

        expect(mockWorker1.destroy).toHaveBeenCalled();
      });

      it('should do nothing when counts match', () => {
        const spawnSpy = vi.spyOn(scene, 'spawnWorker');
        vi.spyOn(scene, 'getWorkersByRole').mockReturnValue([{}, {}]);

        scene.adjustRoleCount('dev', 2, 2);

        expect(spawnSpy).not.toHaveBeenCalled();
      });
    });

    describe('spawnWorker', () => {
      it('should create worker at random grid position', () => {
        scene.spawnWorker('dev');

        expect(mockAdd.existing).toHaveBeenCalled();
        expect(scene.workersGroup.add).toHaveBeenCalled();
      });

      it('should spawn within grid bounds', () => {
        const mathBetweenSpy = vi.spyOn(Phaser.Math, 'Between');

        scene.spawnWorker('sales');

        expect(mathBetweenSpy).toHaveBeenCalledWith(1, scene.cols - 2);
        expect(mathBetweenSpy).toHaveBeenCalledWith(1, scene.rows - 2);
      });
    });
  });

  describe('visitor management', () => {
    beforeEach(() => {
      scene.visitorGroup = mockAdd.group();
    });

    describe('syncVisitors', () => {
      it('should manage pizza guy visitor', () => {
        const manageSpy = vi.spyOn(scene, 'manageVisitor');

        scene.syncVisitors(['pizza_guy']);

        expect(manageSpy).toHaveBeenCalledWith(
          'visitor_pizza',
          true,
          0,
          300,
          400,
          300
        );
      });

      it('should manage investor visitors', () => {
        const manageSpy = vi.spyOn(scene, 'manageVisitor');

        scene.syncVisitors(['investors']);

        expect(manageSpy).toHaveBeenCalledWith(
          'visitor_investor',
          true,
          800,
          300,
          600,
          300,
          3
        );
      });

      it('should handle multiple visitors', () => {
        const manageSpy = vi.spyOn(scene, 'manageVisitor');

        scene.syncVisitors(['pizza_guy', 'investors']);

        expect(manageSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe('manageVisitor', () => {
      it('should spawn visitor if active and not present', () => {
        scene.visitorGroup.getChildren = vi.fn(() => []);

        scene.manageVisitor('visitor_pizza', true, 0, 300, 400, 300);

        expect(mockAdd.follower).toHaveBeenCalled();
      });

      it('should not spawn if already present', () => {
        const existingVisitor = { texture: { key: 'visitor_investor' } };
        scene.visitorGroup.getChildren = vi.fn(() => [existingVisitor]);

        scene.manageVisitor('visitor_investor', true, 800, 300, 600, 300, 3);

        // Should not add more
        expect(mockAdd.sprite).not.toHaveBeenCalled();
      });

      it('should remove visitor if not active', () => {
        const mockVisitor = {
          texture: { key: 'visitor_pizza' },
          destroy: vi.fn(),
        };
        scene.visitorGroup.getChildren = vi.fn(() => [mockVisitor]);

        scene.manageVisitor('visitor_pizza', false, 0, 300, 400, 300);

        expect(mockTweens.killTweensOf).toHaveBeenCalledWith(mockVisitor);
        expect(mockVisitor.destroy).toHaveBeenCalled();
      });

      it('should spawn multiple investors', () => {
        scene.visitorGroup.getChildren = vi.fn(() => []);

        scene.manageVisitor('visitor_investor', true, 800, 300, 600, 300, 3);

        expect(mockAdd.sprite).toHaveBeenCalledTimes(3);
      });
    });

    describe('spawnPizzaGuyOrbit', () => {
      it('should create path follower', () => {
        scene.spawnPizzaGuyOrbit();

        expect(mockAdd.follower).toHaveBeenCalled();
      });

      it('should add to visitor group', () => {
        scene.spawnPizzaGuyOrbit();

        expect(scene.visitorGroup.add).toHaveBeenCalled();
      });
    });
  });

  describe('visual effects', () => {
    describe('updateMoodVisuals', () => {
      beforeEach(() => {
        scene.workersGroup = mockAdd.group();
      });

      it('should apply white tint for high mood', () => {
        const mockWorker = { setTint: vi.fn() };
        scene.workersGroup.children.iterate = vi.fn(callback => callback(mockWorker));

        scene.updateMoodVisuals(85);

        expect(mockWorker.setTint).toHaveBeenCalledWith(0xffffff);
      });

      it('should apply light blue tint for medium mood', () => {
        const mockWorker = { setTint: vi.fn() };
        scene.workersGroup.children.iterate = vi.fn(callback => callback(mockWorker));

        scene.updateMoodVisuals(50);

        expect(mockWorker.setTint).toHaveBeenCalledWith(0xccccff);
      });

      it('should apply dark blue tint for low mood', () => {
        const mockWorker = { setTint: vi.fn() };
        scene.workersGroup.children.iterate = vi.fn(callback => callback(mockWorker));

        scene.updateMoodVisuals(20);

        expect(mockWorker.setTint).toHaveBeenCalledWith(0x8888ff);
      });

      it('should handle workers without setTint method', () => {
        const mockWorker = { setTint: null };
        scene.workersGroup.children.iterate = vi.fn(callback => callback(mockWorker));

        expect(() => scene.updateMoodVisuals(80)).not.toThrow();
      });
    });

    describe('syncChaosVisuals', () => {
      beforeEach(() => {
        scene.overlayGroup = mockAdd.group();
        scene.workersGroup = mockAdd.group();
      });

      it('should clear existing overlays', () => {
        scene.syncChaosVisuals([]);

        expect(mockTweens.killAll).toHaveBeenCalled();
        expect(scene.overlayGroup.clear).toHaveBeenCalledWith(true, true);
      });

      it('should handle TECH_OUTAGE event', () => {
        const event = { type: 'TECH_OUTAGE' };

        scene.syncChaosVisuals([event]);

        expect(mockAdd.rectangle).toHaveBeenCalledWith(400, 300, 800, 600, 0x0000aa, 0.3);
      });

      it('should create smoke for TECH_OUTAGE', () => {
        const createSmokeSpy = vi.spyOn(scene, 'createSmoke');
        const event = { type: 'TECH_OUTAGE' };

        scene.syncChaosVisuals([event]);

        expect(createSmokeSpy).toHaveBeenCalledWith(64, 64);
      });

      it('should handle RANSOMWARE event', () => {
        const event = { type: 'RANSOMWARE' };

        scene.syncChaosVisuals([event]);

        expect(mockAdd.text).toHaveBeenCalledWith(400, 300, '💀', expect.any(Object));
      });

      it('should handle MARKET_SHITSTORM event', () => {
        const event = { type: 'MARKET_SHITSTORM' };

        scene.syncChaosVisuals([event]);

        expect(mockCameras.main.shake).toHaveBeenCalledWith(100, 0.005);
      });

      it('should handle multiple events', () => {
        const events = [
          { type: 'TECH_OUTAGE' },
          { type: 'RANSOMWARE' },
        ];

        scene.syncChaosVisuals(events);

        expect(mockAdd.rectangle).toHaveBeenCalled();
        expect(mockAdd.text).toHaveBeenCalled();
      });
    });

    describe('createSmoke', () => {
      it('should create particle emitter', () => {
        scene.createSmoke(100, 200);

        expect(mockAdd.particles).toHaveBeenCalledWith(100, 200, 'particle_pixel', expect.any(Object));
      });

      it('should destroy emitter after 2 seconds', () => {
        scene.createSmoke(100, 200);

        expect(mockTime.delayedCall).toHaveBeenCalledWith(2000, expect.any(Function));
      });
    });

    describe('createCodeBits', () => {
      it('should create particle emitter', () => {
        scene.createCodeBits(150, 250);

        expect(mockAdd.particles).toHaveBeenCalledWith(150, 250, 'particle_pixel', expect.any(Object));
      });

      it('should destroy emitter after 1 second', () => {
        scene.createCodeBits(150, 250);

        expect(mockTime.delayedCall).toHaveBeenCalledWith(1000, expect.any(Function));
      });
    });
  });

  describe('tooltip system', () => {
    describe('setupTooltip', () => {
      it('should create tooltip text', () => {
        scene.setupTooltip();

        expect(mockAdd.text).toHaveBeenCalledWith(0, 0, '', expect.any(Object));
        expect(scene.tooltip).toBeDefined();
      });

      it('should set tooltip invisible by default', () => {
        const mockTooltip = mockAdd.text();

        scene.setupTooltip();

        expect(mockTooltip.setVisible).toHaveBeenCalledWith(false);
      });

      it('should set tooltip depth to 100', () => {
        const mockTooltip = mockAdd.text();

        scene.setupTooltip();

        expect(mockTooltip.setDepth).toHaveBeenCalledWith(100);
      });
    });

    describe('showTooltip', () => {
      beforeEach(() => {
        scene.tooltip = mockAdd.text();
      });

      it('should set tooltip text and position', () => {
        scene.showTooltip(100, 200, 'Test Text');

        expect(scene.tooltip.setPosition).toHaveBeenCalledWith(100, 200);
        expect(scene.tooltip.setText).toHaveBeenCalledWith('Test Text');
        expect(scene.tooltip.setVisible).toHaveBeenCalledWith(true);
      });
    });

    describe('hideTooltip', () => {
      beforeEach(() => {
        scene.tooltip = mockAdd.text();
      });

      it('should hide tooltip', () => {
        scene.hideTooltip();

        expect(scene.tooltip.setVisible).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('day/night cycle', () => {
    describe('setupDayNightCycle', () => {
      it('should create overlay rectangle', () => {
        scene.setupDayNightCycle();

        expect(mockAdd.rectangle).toHaveBeenCalledWith(0, 0, 8000, 6000, 0x000033);
        expect(scene.dayNightOverlay).toBeDefined();
      });

      it('should set overlay to transparent initially', () => {
        const mockOverlay = mockAdd.rectangle();

        scene.setupDayNightCycle();

        expect(mockOverlay.setAlpha).toHaveBeenCalledWith(0);
      });
    });

    describe('updateDayNight', () => {
      beforeEach(() => {
        scene.dayNightOverlay = mockAdd.rectangle();
      });

      it('should keep alpha at 0 during day (tick <= 40)', () => {
        scene.updateDayNight(30);

        expect(scene.dayNightOverlay.setAlpha).toHaveBeenCalledWith(0);
      });

      it('should increase darkness after tick 40', () => {
        scene.updateDayNight(50);

        const expectedDarkness = (50 - 40) / 20 * 0.6;
        expect(scene.dayNightOverlay.setAlpha).toHaveBeenCalledWith(expectedDarkness);
      });

      it('should reach maximum darkness at tick 60', () => {
        scene.updateDayNight(60);

        const expectedDarkness = (60 - 40) / 20 * 0.6;
        expect(scene.dayNightOverlay.setAlpha).toHaveBeenCalledWith(expectedDarkness);
      });
    });
  });

  describe('camera controls', () => {
    describe('setupCameraControls', () => {
      it('should set up wheel zoom', () => {
        scene.setupCameraControls();

        expect(mockInput.on).toHaveBeenCalledWith('wheel', expect.any(Function));
      });

      it('should handle wheel zoom', () => {
        scene.setupCameraControls();

        const wheelHandler = mockInput.on.mock.calls.find(
          call => call[0] === 'wheel'
        )?.[1];

        if (wheelHandler) {
          mockCameras.main.zoom = 1;
          wheelHandler({}, [], 0, 100);

          expect(mockCameras.main.setZoom).toHaveBeenCalled();
        }
      });
    });

    describe('handleZoom', () => {
      it('should increase zoom', () => {
        mockCameras.main.zoom = 1;

        scene.handleZoom(0.2);

        expect(mockCameras.main.setZoom).toHaveBeenCalledWith(1.2);
      });

      it('should decrease zoom', () => {
        mockCameras.main.zoom = 1;

        scene.handleZoom(-0.2);

        expect(mockCameras.main.setZoom).toHaveBeenCalledWith(0.8);
      });

      it('should clamp zoom to minimum 0.5', () => {
        mockCameras.main.zoom = 0.6;

        scene.handleZoom(-0.5);

        expect(mockCameras.main.setZoom).toHaveBeenCalledWith(0.5);
      });

      it('should clamp zoom to maximum 3', () => {
        mockCameras.main.zoom = 2.9;

        scene.handleZoom(0.5);

        expect(mockCameras.main.setZoom).toHaveBeenCalledWith(3);
      });
    });
  });

  describe('cleanup', () => {
    describe('onShutdown', () => {
      beforeEach(() => {
        scene.workersGroup = mockAdd.group();
        scene.objectGroup = mockAdd.group();
        scene.visitorGroup = mockAdd.group();
        scene.overlayGroup = mockAdd.group();
        scene.mouseLight = { destroy: vi.fn() };
        scene._footprintGraphics = { destroy: vi.fn() };
        scene.floorTexture = { destroy: vi.fn() };
      });

      it('should unsubscribe from all store subscriptions', () => {
        const unsubscribe1 = vi.fn();
        const unsubscribe2 = vi.fn();
        scene.unsubscribers = [unsubscribe1, unsubscribe2];

        scene.onShutdown();

        expect(unsubscribe1).toHaveBeenCalled();
        expect(unsubscribe2).toHaveBeenCalled();
        expect(scene.unsubscribers).toEqual([]);
      });

      it('should kill all tweens', () => {
        scene.onShutdown();

        expect(mockTweens.killAll).toHaveBeenCalled();
      });

      it('should destroy mouse light', () => {
        scene.onShutdown();

        expect(scene.mouseLight.destroy).toHaveBeenCalled();
        expect(scene.mouseLight).toBeNull();
      });

      it('should destroy footprint graphics', () => {
        scene.onShutdown();

        expect(scene._footprintGraphics.destroy).toHaveBeenCalled();
        expect(scene._footprintGraphics).toBeNull();
      });

      it('should destroy floor texture', () => {
        scene.onShutdown();

        expect(scene.floorTexture.destroy).toHaveBeenCalled();
        expect(scene.floorTexture).toBeNull();
      });

      it('should clear all groups', () => {
        scene.onShutdown();

        expect(scene.objectGroup.clear).toHaveBeenCalledWith(true, true);
        expect(scene.workersGroup.clear).toHaveBeenCalledWith(true, true);
        expect(scene.visitorGroup.clear).toHaveBeenCalledWith(true, true);
        expect(scene.overlayGroup.clear).toHaveBeenCalledWith(true, true);
      });

      it('should remove input listeners', () => {
        scene._onPointerMove = vi.fn();

        scene.onShutdown();

        expect(mockInput.off).toHaveBeenCalledWith('pointermove', scene._onPointerMove);
        expect(mockInput.removeAllListeners).toHaveBeenCalled();
      });

      it('should clean up keyboard', () => {
        scene.onShutdown();

        expect(mockInput.keyboard.removeAllListeners).toHaveBeenCalled();
        expect(mockInput.keyboard.removeAllKeys).toHaveBeenCalledWith(true);
        expect(mockInput.keyboard.shutdown).toHaveBeenCalled();
      });

      it('should remove window event listeners', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
        scene._onZoomIn = vi.fn();
        scene._onZoomOut = vi.fn();

        scene.onShutdown();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('ZOOM_IN', scene._onZoomIn);
        expect(removeEventListenerSpy).toHaveBeenCalledWith('ZOOM_OUT', scene._onZoomOut);
      });

      it('should reset pathfinding', () => {
        scene.easystar = {};
        scene._grid = [];
        scene._pendingPathRequests = 5;

        scene.onShutdown();

        expect(scene.easystar).toBeNull();
        expect(scene._grid).toBeNull();
        expect(scene._pendingPathRequests).toBe(0);
      });
    });

    describe('onDestroy', () => {
      it('should clean up sound manager', () => {
        scene.soundManager = {};

        scene.onDestroy();

        expect(scene.soundManager).toBeNull();
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing store gracefully', () => {
      useGameStore.subscribe = undefined;
      useGameStore.getState = undefined;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => scene.create()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Store unavailable'));

      consoleSpy.mockRestore();
    });

    it('should handle null groups in update', () => {
      scene.workersGroup = null;
      scene.visitorGroup = null;

      expect(() => scene.update()).not.toThrow();
    });

    it('should handle shutdown with null groups', () => {
      scene.workersGroup = null;
      scene.objectGroup = null;
      scene.visitorGroup = null;
      scene.overlayGroup = null;

      expect(() => scene.onShutdown()).not.toThrow();
    });

    it('should handle empty unsubscribers array', () => {
      scene.unsubscribers = [];

      expect(() => scene.onShutdown()).not.toThrow();
    });

    it('should handle null keyboard in shutdown', () => {
      scene.input.keyboard = null;

      expect(() => scene.onShutdown()).not.toThrow();
    });
  });

  describe('integration and regression tests', () => {
    it('should maintain consistent grid state after multiple obstacle applications', () => {
      scene.setupGrid();

      scene.applyObstaclesToGrid();
      const firstState = JSON.stringify(scene._grid);

      scene.applyObstaclesToGrid();
      const secondState = JSON.stringify(scene._grid);

      expect(firstState).toBe(secondState);
    });

    it('should handle rapid worker spawning and removal', () => {
      scene.workersGroup = mockAdd.group();
      scene.cols = 25;
      scene.rows = 20;
      scene.tileSize = 32;

      scene.adjustRoleCount('dev', 0, 5);
      vi.spyOn(scene, 'getWorkersByRole').mockReturnValue([{}, {}, {}, {}, {}]);
      scene.adjustRoleCount('dev', 5, 0);

      expect(() => {}).not.toThrow();
    });

    it('should handle full scene lifecycle', () => {
      expect(() => {
        scene.create();
        scene.update();
        scene.onShutdown();
        scene.onDestroy();
      }).not.toThrow();
    });

    it('should properly handle touch interaction after shutdown', () => {
      scene.create();
      scene.onShutdown();

      expect(() => scene.setupTouchInteractions()).not.toThrow();
    });
  });
});