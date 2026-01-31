import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Phaser from '../../test/mocks/phaser3spectorjs.js';
import MainScene from './MainScene.js';

// Mock dependencies
vi.mock('../../store/gameStore', () => ({
  useGameStore: {
    subscribe: vi.fn(() => vi.fn()),
    getState: vi.fn(() => ({
      roster: { dev: 1, sales: 0, support: 0 },
      activeVisitors: [],
      mood: 100,
      activeEvents: [],
      officeLevel: 1,
      tick: 0,
    })),
  },
}));

vi.mock('easystarjs', () => ({
  default: {
    js: vi.fn(function () {
      this.setGrid = vi.fn();
      this.setAcceptableTiles = vi.fn();
      this.setIterationsPerCalculation = vi.fn();
      this.findPath = vi.fn((sx, sy, ex, ey, callback) => {
        setTimeout(() => {
          callback([
            { x: sx, y: sy },
            { x: ex, y: ey },
          ]);
        }, 0);
      });
      this.calculate = vi.fn();
    }),
  },
}));

vi.mock('../SoundManager', () => ({
  default: class MockSoundManager {
    constructor() {
      this.play = vi.fn();
      this.setMute = vi.fn();
    }
  },
}));

vi.mock('../sprites/WorkerSprite', () => ({
  default: vi.fn(function (scene, x, y, role, id) {
    return {
      scene,
      x,
      y,
      role,
      id,
      energy: 100,
      destroy: vi.fn(),
      setDepth: vi.fn(),
      setTint: vi.fn(),
      showFeedback: vi.fn(),
      startPath: vi.fn(),
      getBounds: vi.fn(() => ({
        contains: vi.fn(() => false),
      })),
    };
  }),
}));

describe('MainScene', () => {
  let scene;

  beforeEach(() => {
    // Initialize scene
    scene = new MainScene();

    // Setup mocked Phaser scene components
    const mockScene = new Phaser.Scene({ key: 'MainScene' });
    Object.assign(scene, {
      textures: mockScene.textures,
      cache: mockScene.cache,
      add: mockScene.add,
      make: mockScene.make,
      cameras: mockScene.cameras,
      input: mockScene.input,
      scale: mockScene.scale,
      lights: mockScene.lights,
      tweens: mockScene.tweens,
      time: mockScene.time,
      physics: mockScene.physics,
      anims: mockScene.anims,
      scene: mockScene.scene,
      game: mockScene.game,
      events: mockScene.events,
    });

    // Mock window events
    global.window.addEventListener = vi.fn();
    global.window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct scene key', () => {
      expect(scene.key).toBe('MainScene');
    });

    it('should initialize group properties as null', () => {
      expect(scene.workersGroup).toBeNull();
      expect(scene.floorGroup).toBeNull();
      expect(scene.objectGroup).toBeNull();
      expect(scene.visitorGroup).toBeNull();
      expect(scene.overlayGroup).toBeNull();
    });

    it('should initialize pathfinding properties', () => {
      expect(scene.easystar).toBeNull();
      expect(scene._grid).toBeNull();
    });

    it('should initialize unsubscribers array', () => {
      expect(scene.unsubscribers).toEqual([]);
    });

    it('should initialize path batching properties', () => {
      expect(scene._pendingPathRequests).toBe(0);
      expect(scene._maxPathCalculationsPerTick).toBe(4);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      vi.spyOn(scene, 'setupGrid').mockImplementation(() => {});
      vi.spyOn(scene, 'createFloor').mockImplementation(() => {});
      vi.spyOn(scene, 'spawnObjects').mockImplementation(() => {});
      vi.spyOn(scene, 'applyObstaclesToGrid').mockImplementation(() => {});
      vi.spyOn(scene, 'setupCameraControls').mockImplementation(() => {});
      vi.spyOn(scene, 'setupTouchInteractions').mockImplementation(() => {});
      vi.spyOn(scene, 'createFullscreenButton').mockImplementation(() => {});
      vi.spyOn(scene, 'setupTooltip').mockImplementation(() => {});
      vi.spyOn(scene, 'setupDayNightCycle').mockImplementation(() => {});
      vi.spyOn(scene, 'syncRoster').mockImplementation(() => {});
      vi.spyOn(scene, 'syncVisitors').mockImplementation(() => {});
      vi.spyOn(scene, 'updateMoodVisuals').mockImplementation(() => {});
      vi.spyOn(scene, 'syncChaosVisuals').mockImplementation(() => {});
    });

    it('should create SoundManager', () => {
      scene.create();
      expect(scene.soundManager).toBeDefined();
    });

    it('should create all game groups', () => {
      scene.create();

      expect(scene.add.group).toHaveBeenCalled();
      expect(scene.objectGroup).toBeDefined();
      expect(scene.workersGroup).toBeDefined();
      expect(scene.visitorGroup).toBeDefined();
      expect(scene.overlayGroup).toBeDefined();
    });

    it('should setup grid before creating floor', () => {
      const callOrder = [];
      scene.setupGrid = vi.fn(() => callOrder.push('grid'));
      scene.createFloor = vi.fn(() => callOrder.push('floor'));

      scene.create();

      expect(callOrder).toEqual(['grid', 'floor']);
    });

    it('should create floor with level 1', () => {
      scene.create();
      expect(scene.createFloor).toHaveBeenCalledWith(1);
    });

    it('should spawn objects', () => {
      scene.create();
      expect(scene.spawnObjects).toHaveBeenCalled();
    });

    it('should apply obstacles to grid', () => {
      scene.create();
      expect(scene.applyObstaclesToGrid).toHaveBeenCalled();
    });

    it('should setup camera controls', () => {
      scene.create();
      expect(scene.setupCameraControls).toHaveBeenCalled();
    });

    it('should center camera on office', () => {
      scene.create();
      expect(scene.cameras.main.centerOn).toHaveBeenCalledWith(400, 300);
    });

    it('should set camera background color', () => {
      scene.create();
      expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#2d2d2d');
    });

    it('should add multi-touch pointer', () => {
      scene.create();
      expect(scene.input.addPointer).toHaveBeenCalledWith(1);
    });

    it('should enable lights', () => {
      scene.create();
      expect(scene.lights.enable).toHaveBeenCalled();
      expect(scene.lights.setAmbientColor).toHaveBeenCalledWith(0x888888);
    });

    it('should create mouse light', () => {
      scene.create();
      expect(scene.mouseLight).toBeDefined();
    });

    it('should setup mouse follower light', () => {
      scene.create();
      expect(scene.input.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
    });

    it('should create coffee animations', () => {
      scene.create();
      expect(scene.anims.create).toHaveBeenCalledTimes(2);
    });

    it('should register window zoom events', () => {
      scene.create();
      expect(window.addEventListener).toHaveBeenCalledWith('ZOOM_IN', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('ZOOM_OUT', expect.any(Function));
    });

    it('should register shutdown and destroy events', () => {
      scene.create();
      expect(scene.events.once).toHaveBeenCalledWith(
        Phaser.Scenes.Events.SHUTDOWN,
        scene.onShutdown,
        scene
      );
      expect(scene.events.once).toHaveBeenCalledWith(
        Phaser.Scenes.Events.DESTROY,
        scene.onDestroy,
        scene
      );
    });

    it('should sync initial state from store', () => {
      scene.create();
      expect(scene.syncRoster).toHaveBeenCalled();
      expect(scene.syncVisitors).toHaveBeenCalled();
      expect(scene.updateMoodVisuals).toHaveBeenCalled();
      expect(scene.syncChaosVisuals).toHaveBeenCalled();
    });

    it('should subscribe to store changes', async () => {
      const { useGameStore } = await import('../../store/gameStore');
      scene.create();
      expect(useGameStore.subscribe).toHaveBeenCalled();
    });
  });

  describe('setupGrid', () => {
    it('should initialize EasyStar pathfinding', () => {
      scene.setupGrid();
      expect(scene.easystar).toBeDefined();
    });

    it('should set grid dimensions', () => {
      scene.setupGrid();
      expect(scene.cols).toBe(25);
      expect(scene.rows).toBe(20);
      expect(scene.tileSize).toBe(32);
    });

    it('should create 2D grid array', () => {
      scene.setupGrid();
      expect(scene._grid).toHaveLength(20);
      expect(scene._grid[0]).toHaveLength(25);
    });

    it('should initialize grid with zeros', () => {
      scene.setupGrid();
      const allZeros = scene._grid.every((row) => row.every((cell) => cell === 0));
      expect(allZeros).toBe(true);
    });

    it('should configure EasyStar with grid', () => {
      scene.setupGrid();
      expect(scene.easystar.setGrid).toHaveBeenCalledWith(scene._grid);
      expect(scene.easystar.setAcceptableTiles).toHaveBeenCalledWith([0]);
      expect(scene.easystar.setIterationsPerCalculation).toHaveBeenCalledWith(200);
    });
  });

  describe('applyObstaclesToGrid', () => {
    beforeEach(() => {
      scene.setupGrid();
    });

    it('should not apply obstacles if grid is not initialized', () => {
      scene._grid = null;
      expect(() => scene.applyObstaclesToGrid()).not.toThrow();
    });

    it('should reset grid to zeros (inner tiles)', () => {
      scene._grid[1][1] = 1; // Use inner tile as 0,0 is now wall
      scene.applyObstaclesToGrid();
      expect(scene._grid[1][1]).toBe(0);
    });

    it('should mark perimeter walls', () => {
      scene.applyObstaclesToGrid();
      expect(scene._grid[0][0]).toBe(1); // Top Left
      expect(scene._grid[0][24]).toBe(1); // Top Right
      expect(scene._grid[19][0]).toBe(1); // Bottom Left
      expect(scene._grid[19][24]).toBe(1); // Bottom Right
    });

    it('should mark hardcoded obstacles', () => {
      scene.applyObstaclesToGrid();
      expect(scene._grid[2][2]).toBe(1);
      expect(scene._grid[2][23]).toBe(1);
      expect(scene._grid[17][2]).toBe(1);
    });

    it('should update EasyStar grid', () => {
      scene.applyObstaclesToGrid();
      expect(scene.easystar.setGrid).toHaveBeenCalled();
    });

    it('should handle out-of-bounds obstacles gracefully', () => {
      expect(() => scene.applyObstaclesToGrid()).not.toThrow();
    });
  });

  describe('requestMove', () => {
    let mockWorker;

    beforeEach(() => {
      scene.setupGrid();
      mockWorker = {
        x: 100,
        y: 100,
        startPath: vi.fn(),
      };
    });

    it('should increment pending path requests', () => {
      const initialCount = scene._pendingPathRequests;
      scene.requestMove(mockWorker, 10, 10);
      expect(scene._pendingPathRequests).toBe(initialCount + 1);
    });

    it('should clamp target coordinates to grid bounds', () => {
      scene.requestMove(mockWorker, 50, 50);
      expect(scene.easystar.findPath).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        24,
        19,
        expect.any(Function)
      );
    });

    it('should call worker.startPath when path is found', async () => {
      scene.requestMove(mockWorker, 10, 10);

      // Wait for async path callback
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockWorker.startPath).toHaveBeenCalled();
    });

    it('should decrement pending requests when path is found', async () => {
      scene.requestMove(mockWorker, 10, 10);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(scene._pendingPathRequests).toBe(0);
    });

    it('should not start path if path is null', async () => {
      scene.easystar.findPath = vi.fn((sx, sy, ex, ey, callback) => {
        callback(null);
      });

      scene.requestMove(mockWorker, 10, 10);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockWorker.startPath).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      scene.setupGrid();
      scene.create();
      scene.workersGroup = { children: { iterate: vi.fn() } };
      scene.visitorGroup = { children: { iterate: vi.fn() } };
      vi.spyOn(scene, 'handleMobileControls').mockImplementation(() => {});
    });

    it('should process pending path calculations', () => {
      scene._pendingPathRequests = 3;
      scene._maxPathCalculationsPerTick = 3;
      scene.update();

      expect(scene.easystar.calculate).toHaveBeenCalledTimes(3);
    });

    it('should limit path calculations per tick', () => {
      scene._pendingPathRequests = 10;
      scene.update();

      expect(scene.easystar.calculate).toHaveBeenCalledTimes(scene._maxPathCalculationsPerTick);
    });

    it('should update worker depths based on y position', () => {
      const mockWorker = { y: 100, setDepth: vi.fn() };
      scene.workersGroup.children.iterate = vi.fn((callback) => callback(mockWorker));

      scene.update();

      expect(mockWorker.setDepth).toHaveBeenCalledWith(100);
    });

    it('should update visitor depths based on y position', () => {
      const mockVisitor = { y: 200, setDepth: vi.fn() };
      scene.visitorGroup.children.iterate = vi.fn((callback) => callback(mockVisitor));

      scene.update();

      expect(mockVisitor.setDepth).toHaveBeenCalledWith(200);
    });

    it('should call handleMobileControls', () => {
      scene.update();
      expect(scene.handleMobileControls).toHaveBeenCalled();
    });
  });

  describe('handleMobileControls', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should handle pinch zoom with two fingers', () => {
      scene.input.pointer1.isDown = true;
      scene.input.pointer2.isDown = true;
      scene.input.pointer1.x = 100;
      scene.input.pointer1.y = 100;
      scene.input.pointer2.x = 200;
      scene.input.pointer2.y = 100;

      scene.handleMobileControls();

      expect(scene.pinchDistance).toBeGreaterThan(0);
    });

    it('should reset pinch distance when not pinching', () => {
      scene.pinchDistance = 100;
      scene.input.pointer1.isDown = false;
      scene.input.pointer2.isDown = false;

      scene.handleMobileControls();

      expect(scene.pinchDistance).toBe(0);
    });

    it('should handle panning with one finger', () => {
      scene.input.activePointer.isDown = true;
      scene.input.activePointer.x = 150;
      scene.input.activePointer.y = 150;
      scene.input.activePointer.prevPosition.x = 100;
      scene.input.activePointer.prevPosition.y = 100;
      scene.isDragging = true;

      const initialScrollX = scene.cameras.main.scrollX;

      scene.handleMobileControls();

      expect(scene.cameras.main.scrollX).not.toBe(initialScrollX);
    });

    it('should start dragging when pointer is down', () => {
      scene.input.activePointer.isDown = true;
      scene.isDragging = false;

      scene.handleMobileControls();

      expect(scene.isDragging).toBe(true);
    });

    it('should stop dragging when pointer is up', () => {
      scene.isDragging = true;
      scene.input.activePointer.isDown = false;

      scene.handleMobileControls();

      expect(scene.isDragging).toBe(false);
    });
  });

  describe('handleZoom', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should increase zoom by delta', () => {
      const initialZoom = scene.cameras.main.zoom;
      scene.handleZoom(0.2);
      expect(scene.cameras.main.setZoom).toHaveBeenCalled();
    });

    it('should decrease zoom by negative delta', () => {
      scene.handleZoom(-0.2);
      expect(scene.cameras.main.setZoom).toHaveBeenCalled();
    });

    it('should clamp zoom between 0.5 and 3', () => {
      scene.cameras.main.zoom = 3;
      scene.handleZoom(0.5);
      expect(Phaser.Math.Clamp).toHaveBeenCalled();
    });
  });

  describe('createFloor', () => {
    beforeEach(() => {
      scene.setupGrid();
      scene.create();
    });

    it('should destroy existing floor texture', () => {
      const destroy = vi.fn();
      scene.floorTexture = { destroy };
      scene.createFloor(1);
      expect(destroy).toHaveBeenCalled();
    });

    it('should create render texture with correct dimensions', () => {
      scene.createFloor(1);
      expect(scene.add.renderTexture).toHaveBeenCalledWith(
        0,
        0,
        scene.cols * scene.tileSize,
        scene.rows * scene.tileSize
      );
    });

    it('should use correct texture key based on level', () => {
      scene.createFloor(2);
      expect(scene.floorTexture.batchDrawFrame).toHaveBeenCalledWith(
        'floor_2',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should set floor depth to 0', () => {
      scene.createFloor(1);
      expect(scene.floorTexture.setDepth).toHaveBeenCalledWith(0);
    });

    it('should draw floor tiles for entire grid', () => {
      scene.createFloor(1);
      const expectedCalls = scene.cols * scene.rows;
      expect(scene.floorTexture.batchDrawFrame).toHaveBeenCalledTimes(expectedCalls);
    });
  });

  describe('addFootprint', () => {
    beforeEach(() => {
      scene.setupGrid();
      scene.createFloor(1);
    });

    it('should create footprint graphics if not exists', () => {
      scene.addFootprint(100, 100);
      expect(scene._footprintGraphics).toBeDefined();
    });

    it('should reuse existing footprint graphics', () => {
      scene.addFootprint(100, 100);
      const graphics = scene._footprintGraphics;
      scene.addFootprint(150, 150);
      expect(scene._footprintGraphics).toBe(graphics);
    });

    it('should draw footprint on floor texture', () => {
      scene.addFootprint(100, 100);
      expect(scene.floorTexture.draw).toHaveBeenCalled();
    });

    it('should not crash if floor texture is null', () => {
      scene.floorTexture = null;
      expect(() => scene.addFootprint(100, 100)).not.toThrow();
    });
  });

  describe('spawnObjects', () => {
    beforeEach(() => {
      scene.setupGrid();
      scene.create();
      vi.spyOn(scene, 'spawnObject').mockImplementation(() => {});
    });

    it('should clear existing objects', () => {
      const clearSpy = vi.spyOn(scene.objectGroup, 'clear');
      scene.spawnObjects();
      expect(clearSpy).toHaveBeenCalledWith(true, true);
    });

    it('should spawn server object', () => {
      scene.spawnObjects();
      expect(scene.spawnObject).toHaveBeenCalledWith(2, 2, 'obj_server');
    });

    it('should spawn animated coffee machine', () => {
      scene.spawnObjects();
      expect(scene.spawnObject).toHaveBeenCalledWith(23, 17, 'obj_coffee_anim', true);
    });

    it('should spawn plant object', () => {
      scene.spawnObjects();
      expect(scene.spawnObject).toHaveBeenCalledWith(2, 17, 'obj_plant');
    });

    it('should spawn printer object', () => {
      scene.spawnObjects();
      expect(scene.spawnObject).toHaveBeenCalledWith(8, 14, 'obj_printer');
    });

    it('should spawn watercooler object', () => {
      scene.spawnObjects();
      expect(scene.spawnObject).toHaveBeenCalledWith(19, 17, 'obj_watercooler');
    });

    it('should spawn whiteboard object', () => {
      scene.spawnObjects();
      expect(scene.spawnObject).toHaveBeenCalledWith(3, 14, 'obj_whiteboard');
    });

    it('should spawn vending machine object', () => {
      scene.spawnObjects();
      expect(scene.spawnObject).toHaveBeenCalledWith(21, 17, 'obj_vending');
    });
  });

  describe('spawnObject', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should create sprite for animated object', () => {
      scene.spawnObject(0, 0, 'obj_coffee_anim', true);
      expect(scene.add.sprite).toHaveBeenCalled();
    });

    it('should create image for non-animated object', () => {
      scene.spawnObject(0, 0, 'obj_plant', false);
      expect(scene.add.image).toHaveBeenCalled();
    });

    it('should position object at grid center', () => {
      scene.tileSize = 32;
      scene.spawnObject(5, 5, 'test_obj', false);
      expect(scene.add.image).toHaveBeenCalledWith(176, 176, 'test_obj');
    });

    it('should add object to objectGroup', () => {
      const addSpy = vi.spyOn(scene.objectGroup, 'add');
      scene.spawnObject(0, 0, 'test_obj', false);
      expect(addSpy).toHaveBeenCalled();
    });

    it('should play animation for coffee machine', () => {
      const mockSprite = {
        play: vi.fn(),
        setInteractive: vi.fn(),
        on: vi.fn(),
        setDepth: vi.fn(),
        setPipeline: vi.fn(),
      };
      scene.add.sprite = vi.fn(() => mockSprite);

      scene.spawnObject(0, 0, 'obj_coffee_anim', true);

      expect(mockSprite.play).toHaveBeenCalledWith('coffee_drain');
    });

    it('should make coffee machine interactive', () => {
      const mockSprite = {
        play: vi.fn(),
        setInteractive: vi.fn(),
        on: vi.fn(),
        setDepth: vi.fn(),
        setPipeline: vi.fn(),
      };
      scene.add.sprite = vi.fn(() => mockSprite);

      scene.spawnObject(0, 0, 'obj_coffee_anim', true);

      expect(mockSprite.setInteractive).toHaveBeenCalled();
      expect(mockSprite.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    });
  });

  describe('syncRoster', () => {
    beforeEach(() => {
      scene.create();
      scene.workersGroup = { getChildren: vi.fn(() => []) };
      vi.spyOn(scene, 'getWorkersByRole').mockReturnValue([]);
      vi.spyOn(scene, 'adjustRoleCount').mockImplementation(() => {});
    });

    it('should adjust dev count', () => {
      scene.syncRoster({ dev: 2, sales: 1, support: 0 });
      expect(scene.adjustRoleCount).toHaveBeenCalledWith('dev', 0, 2);
    });

    it('should adjust sales count', () => {
      scene.syncRoster({ dev: 1, sales: 2, support: 0 });
      expect(scene.adjustRoleCount).toHaveBeenCalledWith('sales', 0, 2);
    });

    it('should adjust support count', () => {
      scene.syncRoster({ dev: 1, sales: 0, support: 3 });
      expect(scene.adjustRoleCount).toHaveBeenCalledWith('support', 0, 3);
    });
  });

  describe('getWorkersByRole', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should filter workers by role', () => {
      const workers = [{ role: 'dev' }, { role: 'sales' }, { role: 'dev' }, { role: 'support' }];
      scene.workersGroup.getChildren = vi.fn(() => workers);

      const devs = scene.getWorkersByRole('dev');
      expect(devs).toHaveLength(2);
      expect(devs[0].role).toBe('dev');
    });

    it('should return empty array if no workers match', () => {
      scene.workersGroup.getChildren = vi.fn(() => [{ role: 'dev' }]);
      const sales = scene.getWorkersByRole('sales');
      expect(sales).toHaveLength(0);
    });
  });

  describe('adjustRoleCount', () => {
    beforeEach(() => {
      scene.create();
      vi.spyOn(scene, 'spawnWorker').mockImplementation(() => {});
      vi.spyOn(scene, 'getWorkersByRole').mockReturnValue([]);
    });

    it('should spawn workers when target is greater than current', () => {
      scene.adjustRoleCount('dev', 1, 3);
      expect(scene.spawnWorker).toHaveBeenCalledTimes(2);
      expect(scene.spawnWorker).toHaveBeenCalledWith('dev');
    });

    it('should remove workers when target is less than current', () => {
      const workers = [{ destroy: vi.fn() }, { destroy: vi.fn() }];
      scene.getWorkersByRole = vi.fn(() => workers);

      scene.adjustRoleCount('dev', 3, 1);

      expect(workers[0].destroy).toHaveBeenCalled();
      expect(workers[1].destroy).toHaveBeenCalled();
    });

    it('should do nothing when current equals target', () => {
      scene.adjustRoleCount('dev', 2, 2);
      expect(scene.spawnWorker).not.toHaveBeenCalled();
    });
  });

  describe('spawnWorker', () => {
    beforeEach(() => {
      scene.setupGrid();
      scene.create();
    });

    it('should create WorkerSprite with random position', async () => {
      const WorkerSprite = (await import('../sprites/WorkerSprite')).default;
      scene.spawnWorker('dev');

      expect(WorkerSprite).toHaveBeenCalledWith(
        scene,
        expect.any(Number),
        expect.any(Number),
        'dev',
        expect.any(Number)
      );
    });

    it('should add worker to scene and group', () => {
      const addSpy = vi.spyOn(scene.workersGroup, 'add');
      scene.spawnWorker('sales');
      expect(scene.add.existing).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalled();
    });
  });

  describe('syncVisitors', () => {
    beforeEach(() => {
      scene.create();
      vi.spyOn(scene, 'manageVisitor').mockImplementation(() => {});
    });

    it('should manage pizza guy visitor', () => {
      scene.syncVisitors(['pizza_guy']);
      expect(scene.manageVisitor).toHaveBeenCalledWith(
        'visitor_pizza',
        true,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should manage investors visitor', () => {
      scene.syncVisitors(['investors']);
      expect(scene.manageVisitor).toHaveBeenCalledWith(
        'visitor_investor',
        true,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        3
      );
    });

    it('should deactivate visitors not in list', () => {
      scene.syncVisitors([]);
      expect(scene.manageVisitor).toHaveBeenCalledWith(
        'visitor_pizza',
        false,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('updateMoodVisuals', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should apply white tint for high mood', () => {
      const mockWorker = { setTint: vi.fn() };
      scene.workersGroup.children.iterate = vi.fn((callback) => callback(mockWorker));

      scene.updateMoodVisuals(85);

      expect(mockWorker.setTint).toHaveBeenCalledWith(0xffffff);
    });

    it('should apply blue tint for medium mood', () => {
      const mockWorker = { setTint: vi.fn() };
      scene.workersGroup.children.iterate = vi.fn((callback) => callback(mockWorker));

      scene.updateMoodVisuals(50);

      expect(mockWorker.setTint).toHaveBeenCalledWith(0xccccff);
    });

    it('should apply darker blue tint for low mood', () => {
      const mockWorker = { setTint: vi.fn() };
      scene.workersGroup.children.iterate = vi.fn((callback) => callback(mockWorker));

      scene.updateMoodVisuals(30);

      expect(mockWorker.setTint).toHaveBeenCalledWith(0x8888ff);
    });

    it('should handle null workers gracefully', () => {
      scene.workersGroup.children.iterate = vi.fn((callback) => callback(null));

      expect(() => scene.updateMoodVisuals(50)).not.toThrow();
    });
  });

  describe('syncChaosVisuals', () => {
    beforeEach(() => {
      scene.create();
      vi.spyOn(scene, 'addOverlayText').mockImplementation(() => {});
      vi.spyOn(scene, 'createSmoke').mockImplementation(() => {});
    });

    it('should stop chaos tweens before syncing', () => {
      const mockTween = { stop: vi.fn() };
      scene._chaosTweens = [mockTween];

      scene.syncChaosVisuals([]);

      expect(mockTween.stop).toHaveBeenCalled();
      expect(scene._chaosTweens).toHaveLength(0);
    });

    it('should clear overlay group', () => {
      const clearSpy = vi.spyOn(scene.overlayGroup, 'clear');
      scene.syncChaosVisuals([]);
      expect(clearSpy).toHaveBeenCalledWith(true, true);
    });

    it('should create overlay for TECH_OUTAGE', () => {
      scene.syncChaosVisuals([{ type: 'TECH_OUTAGE' }]);
      expect(scene.add.rectangle).toHaveBeenCalledWith(400, 300, 800, 600, 0x0000aa, 0.3);
      expect(scene.addOverlayText).toHaveBeenCalledWith('SYSTEM FAILURE', '#0000ff');
    });

    it('should create smoke for TECH_OUTAGE', () => {
      scene.syncChaosVisuals([{ type: 'TECH_OUTAGE' }]);
      expect(scene.createSmoke).toHaveBeenCalled();
    });

    it('should create skull for RANSOMWARE', () => {
      scene.syncChaosVisuals([{ type: 'RANSOMWARE' }]);
      expect(scene.add.text).toHaveBeenCalledWith(400, 300, '💀', expect.any(Object));
      expect(scene.addOverlayText).toHaveBeenCalledWith('RANSOMWARE: PAY UP', '#ff0000');
    });

    it('should shake camera for MARKET_SHITSTORM', () => {
      scene.syncChaosVisuals([{ type: 'MARKET_SHITSTORM' }]);
      expect(scene.cameras.main.shake).toHaveBeenCalledWith(100, 0.005);
    });

    it('should handle multiple events', () => {
      scene.syncChaosVisuals([{ type: 'TECH_OUTAGE' }, { type: 'RANSOMWARE' }]);
      expect(scene.addOverlayText).toHaveBeenCalledTimes(2);
    });
  });

  describe('setupTooltip', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should create tooltip text', () => {
      scene.setupTooltip();
      expect(scene.tooltip).toBeDefined();
    });

    it('should set tooltip depth to 100', () => {
      scene.setupTooltip();
      expect(scene.tooltip.setDepth).toHaveBeenCalledWith(100);
    });

    it('should initially hide tooltip', () => {
      scene.setupTooltip();
      expect(scene.tooltip.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('showTooltip / hideTooltip', () => {
    beforeEach(() => {
      scene.create();
      scene.setupTooltip();
    });

    it('should show tooltip with text', () => {
      scene.showTooltip(100, 100, 'Test tooltip');
      expect(scene.tooltip.setText).toHaveBeenCalledWith('Test tooltip');
      expect(scene.tooltip.setVisible).toHaveBeenCalledWith(true);
    });

    it('should position tooltip correctly', () => {
      scene.showTooltip(150, 200, 'Test');
      expect(scene.tooltip.setPosition).toHaveBeenCalledWith(150, 200);
    });

    it('should hide tooltip', () => {
      scene.hideTooltip();
      expect(scene.tooltip.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('setupDayNightCycle', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should create day/night overlay', () => {
      scene.setupDayNightCycle();
      expect(scene.dayNightOverlay).toBeDefined();
    });

    it('should set overlay depth to 90', () => {
      scene.setupDayNightCycle();
      expect(scene.dayNightOverlay.setDepth).toHaveBeenCalledWith(90);
    });

    it('should initially set overlay alpha to 0', () => {
      scene.setupDayNightCycle();
      expect(scene.dayNightOverlay.setAlpha).toHaveBeenCalledWith(0);
    });
  });

  describe('updateDayNight', () => {
    beforeEach(() => {
      scene.create();
      scene.setupDayNightCycle();
    });

    it('should keep overlay hidden before tick 40', () => {
      scene.updateDayNight(20);
      expect(scene.dayNightOverlay.setAlpha).toHaveBeenCalledWith(0);
    });

    it('should gradually darken after tick 40', () => {
      scene.updateDayNight(50);
      expect(scene.dayNightOverlay.setAlpha).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should reach maximum darkness at tick 60', () => {
      scene.updateDayNight(60);
      expect(scene.dayNightOverlay.setAlpha).toHaveBeenCalledWith(0.6);
    });
  });

  describe('createSmoke', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should create particle emitter', () => {
      scene.createSmoke(100, 100);
      expect(scene.add.particles).toHaveBeenCalled();
    });

    it('should schedule emitter destruction', () => {
      scene.createSmoke(100, 100);
      expect(scene.time.delayedCall).toHaveBeenCalledWith(2000, expect.any(Function));
    });
  });

  describe('createCodeBits', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should create particle emitter', () => {
      scene.createCodeBits(100, 100);
      expect(scene.add.particles).toHaveBeenCalled();
    });

    it('should schedule emitter destruction', () => {
      scene.createCodeBits(100, 100);
      expect(scene.time.delayedCall).toHaveBeenCalledWith(1000, expect.any(Function));
    });
  });

  describe('onShutdown', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should unsubscribe all store subscriptions', () => {
      const unsubscribe = vi.fn();
      scene.unsubscribers = [unsubscribe, unsubscribe];

      scene.onShutdown();

      expect(unsubscribe).toHaveBeenCalledTimes(2);
      expect(scene.unsubscribers).toEqual([]);
    });

    it('should kill all tweens', () => {
      scene.onShutdown();
      expect(scene.tweens.killAll).toHaveBeenCalled();
    });

    it('should destroy mouse light', () => {
      const destroy = vi.fn();
      scene.mouseLight = { destroy };
      scene.onShutdown();
      expect(destroy).toHaveBeenCalled();
      expect(scene.mouseLight).toBeNull();
    });

    it('should destroy footprint graphics', () => {
      const destroy = vi.fn();
      scene._footprintGraphics = { destroy };
      scene.onShutdown();
      expect(destroy).toHaveBeenCalled();
    });

    it('should destroy floor texture', () => {
      const destroy = vi.fn();
      scene.floorTexture = { destroy };
      scene.onShutdown();
      expect(destroy).toHaveBeenCalled();
    });

    it('should clear all groups', () => {
      const objClear = vi.spyOn(scene.objectGroup, 'clear');
      const workClear = vi.spyOn(scene.workersGroup, 'clear');
      const visClear = vi.spyOn(scene.visitorGroup, 'clear');
      const overClear = vi.spyOn(scene.overlayGroup, 'clear');

      scene.onShutdown();

      expect(objClear).toHaveBeenCalledWith(true, true);
      expect(workClear).toHaveBeenCalledWith(true, true);
      expect(visClear).toHaveBeenCalledWith(true, true);
      expect(overClear).toHaveBeenCalledWith(true, true);
    });

    it('should remove all input listeners', () => {
      scene.onShutdown();
      expect(scene.input.removeAllListeners).toHaveBeenCalled();
    });

    it('should cleanup keyboard', () => {
      scene.onShutdown();
      expect(scene.input.keyboard.removeAllListeners).toHaveBeenCalled();
      expect(scene.input.keyboard.removeAllKeys).toHaveBeenCalledWith(true);
      expect(scene.input.keyboard.shutdown).toHaveBeenCalled();
    });

    it('should remove window event listeners', () => {
      scene.onShutdown();
      expect(window.removeEventListener).toHaveBeenCalledWith('ZOOM_IN', scene._onZoomIn);
      expect(window.removeEventListener).toHaveBeenCalledWith('ZOOM_OUT', scene._onZoomOut);
    });

    it('should reset pathfinding state', () => {
      scene.onShutdown();
      expect(scene.easystar).toBeNull();
      expect(scene._grid).toBeNull();
      expect(scene._pendingPathRequests).toBe(0);
    });
  });

  describe('onDestroy', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should nullify sound manager', () => {
      scene.onDestroy();
      expect(scene.soundManager).toBeNull();
    });
  });

  describe('edge cases and regression tests', () => {
    it('should handle missing store gracefully', async () => {
      const { useGameStore } = await import('../../store/gameStore');
      const originalGetState = useGameStore.getState;
      useGameStore.getState = vi.fn(() => null);

      expect(() => scene.create()).not.toThrow();

      useGameStore.getState = originalGetState;
    });

    it('should handle null workers group in update', () => {
      scene.create();
      scene.workersGroup = null;

      expect(() => scene.update()).not.toThrow();
    });

    it('should not crash when spawning workers with invalid role', () => {
      scene.setupGrid();
      scene.create();

      expect(() => scene.spawnWorker('invalid_role')).not.toThrow();
    });

    it('should handle empty visitor array', () => {
      scene.create();
      scene.visitorGroup.getChildren = vi.fn(() => []);

      expect(() => scene.syncVisitors([])).not.toThrow();
    });

    it('should handle rapid zoom changes', () => {
      scene.create();
      scene.handleZoom(1);
      scene.handleZoom(-1);
      scene.handleZoom(0.5);

      expect(scene.cameras.main.setZoom).toHaveBeenCalledTimes(3);
    });

    it('should prevent negative pending path requests', () => {
      scene.setupGrid();
      scene._pendingPathRequests = 0;

      scene.easystar.findPath = vi.fn((sx, sy, ex, ey, callback) => {
        callback([]);
      });

      const mockWorker = { x: 100, y: 100, startPath: vi.fn() };
      scene.requestMove(mockWorker, 10, 10);

      expect(scene._pendingPathRequests).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing texture key in spawnObject', () => {
      scene.create();

      expect(() => scene.spawnObject(0, 0, null, false)).not.toThrow();
    });

    it('should handle tooltip operations when tooltip is not initialized', () => {
      scene.tooltip = null;

      expect(() => scene.showTooltip(0, 0, 'test')).toThrow();
      expect(() => scene.hideTooltip()).toThrow();
    });
  });
});
