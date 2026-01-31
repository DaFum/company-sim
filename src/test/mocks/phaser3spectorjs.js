import { vi } from 'vitest';

// Mock Vector2
class MockVector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  reset() {
    this.x = 0;
    this.y = 0;
    return this;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }
  scale(v) {
    this.x *= v;
    this.y *= v;
    return this;
  }
}

// Mock Graphics
class MockGraphics {
  constructor() {
    this.clear = vi.fn().mockReturnThis();
    this.fillStyle = vi.fn().mockReturnThis();
    this.fillRect = vi.fn().mockReturnThis();
    this.fillCircle = vi.fn().mockReturnThis();
    this.fillEllipse = vi.fn().mockReturnThis();
    this.fillRoundedRect = vi.fn().mockReturnThis();
    this.lineStyle = vi.fn().mockReturnThis();
    this.strokeRect = vi.fn().mockReturnThis();
    this.strokeCircle = vi.fn().mockReturnThis();
    this.beginPath = vi.fn().mockReturnThis();
    this.closePath = vi.fn().mockReturnThis();
    this.moveTo = vi.fn().mockReturnThis();
    this.lineTo = vi.fn().mockReturnThis();
    this.strokePath = vi.fn().mockReturnThis();
    this.save = vi.fn().mockReturnThis();
    this.restore = vi.fn().mockReturnThis();
    this.translateCanvas = vi.fn().mockReturnThis();
    this.generateTexture = vi.fn().mockReturnThis();
    this.destroy = vi.fn();
  }
}

// Mock Texture
class MockTexture {
  constructor(key) {
    this.key = key;
    this.frames = {};
  }
}

// Mock TextureManager
class MockTextureManager {
  constructor() {
    this.textures = new Map();
  }

  exists(key) {
    return this.textures.has(key);
  }

  get(key) {
    if (!this.textures.has(key)) {
      this.textures.set(key, new MockTexture(key));
    }
    return this.textures.get(key);
  }

  create(key, width, height) {
    const texture = new MockTexture(key);
    this.textures.set(key, texture);
    return texture;
  }
}

// Mock Cache
class MockCache {
  constructor() {
    this.audio = {
      exists: vi.fn(() => false),
      get: vi.fn(() => null),
    };
  }
}

// Mock Loader
class MockLoader {
  constructor() {
    this.audio = vi.fn().mockReturnThis();
    this.image = vi.fn().mockReturnThis();
    this.spritesheet = vi.fn().mockReturnThis();
    this.on = vi.fn().mockReturnThis();
    this.once = vi.fn().mockReturnThis();
  }
}

// Mock GameObjects
class MockGameObject {
  constructor(scene, x, y, texture) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.texture = { key: texture };
    this.depth = 0;
    this.visible = true;
    this.alpha = 1;
    this.tint = 0xffffff;
    this.originX = 0;
    this.originY = 0;

    this.setDepth = vi.fn((depth) => {
      this.depth = depth;
      return this;
    });
    this.setVisible = vi.fn((visible) => {
      this.visible = visible;
      return this;
    });
    this.setAlpha = vi.fn((alpha) => {
      this.alpha = alpha;
      return this;
    });
    this.setTint = vi.fn((tint) => {
      this.tint = tint;
      return this;
    });
    this.setOrigin = vi.fn((x, y) => {
      this.originX = x;
      this.originY = y;
      return this;
    });
    this.setPosition = vi.fn((x, y) => {
      this.x = x;
      this.y = y;
      return this;
    });
    this.destroy = vi.fn();
    this.setScrollFactor = vi.fn().mockReturnThis();
    this.setInteractive = vi.fn().mockReturnThis();
    this.on = vi.fn().mockReturnThis();
    this.once = vi.fn().mockReturnThis();
    this.off = vi.fn().mockReturnThis();
    this.postFX = {
      addShadow: vi.fn().mockReturnThis(),
      addBloom: vi.fn().mockReturnThis(),
    };
    this.setPipeline = vi.fn().mockReturnThis();
    this.getBounds = vi.fn(() => ({
      contains: vi.fn(() => false),
      x: this.x - 16,
      y: this.y - 16,
      width: 32,
      height: 32,
    }));
  }
}

class MockSprite extends MockGameObject {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    this.play = vi.fn().mockReturnThis();
    this.anims = {
      play: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
    };
  }
}

class MockImage extends MockGameObject {}

class MockText extends MockGameObject {
  constructor(scene, x, y, text, style) {
    super(scene, x, y, null);
    this.text = text;
    this.style = style;
    this.setText = vi.fn((text) => {
      this.text = text;
      return this;
    });
  }
}

class MockRectangle extends MockGameObject {
  constructor(scene, x, y, width, height, color, alpha) {
    super(scene, x, y, null);
    this.width = width;
    this.height = height;
    this.fillColor = color;
    this.fillAlpha = alpha;
  }
}

class MockRenderTexture extends MockGameObject {
  constructor(scene, x, y, width, height) {
    super(scene, x, y, null);
    this.width = width;
    this.height = height;
    this.beginDraw = vi.fn().mockReturnThis();
    this.endDraw = vi.fn().mockReturnThis();
    this.batchDrawFrame = vi.fn().mockReturnThis();
    this.draw = vi.fn().mockReturnThis();
  }
}

class MockParticleEmitter {
  constructor() {
    this.setDepth = vi.fn().mockReturnThis();
    this.destroy = vi.fn();
  }
}

class MockFollower extends MockSprite {
  constructor(path, x, y, texture) {
    super(null, x, y, texture);
    this.path = path;
    this.startFollow = vi.fn().mockReturnThis();
  }
}

// Mock Group
class MockGroup {
  constructor() {
    this.children = {
      iterate: (cb) => {
        this._children.forEach(cb);
      },
    };
    this._children = new Set();
    this.runChildUpdate = true;
  }

  add(child) {
    this._children.add(child);
    return this;
  }

  remove(child) {
    this._children.delete(child);
    return this;
  }

  clear(removeChildren = true, destroyChildren = false) {
    if (destroyChildren) {
      this._children.forEach((child) => {
        child.destroy?.();
      });
    }
    this._children.clear();
    return this;
  }

  getChildren() {
    return Array.from(this._children);
  }

  iterate(callback) {
    this._children.forEach(callback);
  }
}

// Mock Curves and Path
class MockPath {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.ellipseTo = vi.fn().mockReturnThis();
  }
}

// Mock Camera
class MockCamera {
  constructor() {
    this.zoom = 1;
    this.scrollX = 0;
    this.scrollY = 0;
    this.x = 0;
    this.y = 0;
    this.width = 800;
    this.height = 600;

    this.setZoom = vi.fn((zoom) => {
      this.zoom = zoom;
      return this;
    });
    this.centerOn = vi.fn().mockReturnThis();
    this.setBackgroundColor = vi.fn().mockReturnThis();
    this.getWorldPoint = vi.fn((x, y) => ({ x, y }));
    this.shake = vi.fn().mockReturnThis();
    this.postFX = {
      addTiltShift: vi.fn().mockReturnThis(),
      addVignette: vi.fn().mockReturnThis(),
      addBloom: vi.fn().mockReturnThis(),
    };
  }
}

// Mock Input
class MockInput {
  constructor() {
    this.activePointer = {
      x: 0,
      y: 0,
      prevPosition: { x: 0, y: 0 },
      isDown: false,
      getDistance: vi.fn(() => 0),
      positionToCamera: vi.fn(() => ({ x: 0, y: 0 })),
    };
    this.pointer1 = { x: 0, y: 0, isDown: false };
    this.pointer2 = { x: 0, y: 0, isDown: false };
    this.keyboard = {
      createCursorKeys: vi.fn(() => ({
        up: { isDown: false },
        down: { isDown: false },
        left: { isDown: false },
        right: { isDown: false },
      })),
      removeAllListeners: vi.fn(),
      removeAllKeys: vi.fn(),
      shutdown: vi.fn(),
    };

    this.on = vi.fn().mockReturnThis();
    this.once = vi.fn().mockReturnThis();
    this.off = vi.fn().mockReturnThis();
    this.removeAllListeners = vi.fn().mockReturnThis();
    this.addPointer = vi.fn().mockReturnThis();
  }
}

// Mock Scale Manager
class MockScaleManager {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.isFullscreen = false;
    this.startFullscreen = vi.fn();
    this.stopFullscreen = vi.fn();
  }
}

// Mock Lights
class MockLight {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = 0xffffff;
    this.intensity = 1;
    this.setColor = vi.fn((color) => {
      this.color = color;
      return this;
    });
    this.setIntensity = vi.fn((intensity) => {
      this.intensity = intensity;
      return this;
    });
    this.destroy = vi.fn();
  }
}

class MockLightsManager {
  constructor() {
    this.enable = vi.fn().mockReturnThis();
    this.disable = vi.fn().mockReturnThis();
    this.setAmbientColor = vi.fn().mockReturnThis();
    this.addLight = vi.fn((x, y, radius) => new MockLight(x, y, radius));
  }
}

// Mock Tweens
class MockTweens {
  constructor() {
    this.add = vi.fn().mockReturnValue({ on: vi.fn() });
    this.killAll = vi.fn();
    this.killTweensOf = vi.fn();
  }
}

// Mock Time
class MockTime {
  constructor() {
    this.delayedCall = vi.fn((delay, callback) => {
      const timeoutId = setTimeout(callback, delay);
      return { remove: () => clearTimeout(timeoutId) };
    });
  }
}

// Mock Physics
class MockPhysics {
  constructor() {
    this.add = {
      existing: vi.fn((obj) => obj),
    };
  }
}

// Mock Anims
class MockAnimationManager {
  constructor() {
    this.anims = new Map();
    this.exists = vi.fn((key) => this.anims.has(key));
    this.create = vi.fn((config) => {
      this.anims.set(config.key, config);
      return config;
    });
    this.generateFrameNumbers = vi.fn((key, config) => {
      const frames = [];
      if (config.frames) {
        frames.push(...config.frames);
      } else if (config.start !== undefined && config.end !== undefined) {
        for (let i = config.start; i <= config.end; i++) {
          frames.push(i);
        }
      }
      return frames.map((frame) => ({ key, frame }));
    });
  }
}

// Mock Scene
class MockScene {
  constructor(config) {
    this.key = config?.key || 'MockScene';
    this.sys = {
      config: config || {},
    };

    // Scene lifecycle
    this.events = {
      on: vi.fn().mockReturnThis(),
      once: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
      emit: vi.fn().mockReturnThis(),
    };

    // Factory methods
    this.add = {
      group: vi.fn((config) => new MockGroup()),
      image: vi.fn((x, y, texture) => new MockImage(this, x, y, texture)),
      sprite: vi.fn((x, y, texture) => new MockSprite(this, x, y, texture)),
      text: vi.fn((x, y, text, style) => new MockText(this, x, y, text, style)),
      rectangle: vi.fn((x, y, w, h, color, alpha) => new MockRectangle(this, x, y, w, h, color, alpha)),
      renderTexture: vi.fn((x, y, w, h) => new MockRenderTexture(this, x, y, w, h)),
      particles: vi.fn((x, y, texture, config) => new MockParticleEmitter()),
      follower: vi.fn((path, x, y, texture) => new MockFollower(path, x, y, texture)),
      existing: vi.fn((obj) => obj),
      graphics: vi.fn(() => new MockGraphics()),
    };

    this.make = {
      graphics: vi.fn(() => new MockGraphics()),
    };

    // Managers
    this.textures = new MockTextureManager();
    this.cache = new MockCache();
    this.load = new MockLoader();
    this.cameras = {
      main: new MockCamera(),
    };
    this.input = new MockInput();
    this.scale = new MockScaleManager();
    this.lights = new MockLightsManager();
    this.tweens = new MockTweens();
    this.time = new MockTime();
    this.physics = new MockPhysics();
    this.anims = new MockAnimationManager();

    // Scene management
    this.scene = {
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      switch: vi.fn(),
    };

    // Game reference
    this.game = {
      renderer: {
        type: 'WebGL',
        pipelines: {
          has: vi.fn(() => true),
        },
      },
    };
  }

  // Lifecycle methods
  init() {}
  preload() {}
  create() {}
  update() {}
}

// Phaser namespace mock
const Phaser = {
  Scene: MockScene,
  Math: {
    Vector2: MockVector2,
    Between: vi.fn((min, max) => Math.floor(Math.random() * (max - min + 1)) + min),
    Distance: {
      Between: vi.fn((x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)),
    },
    Clamp: vi.fn((value, min, max) => Math.max(min, Math.min(max, value))),
  },
  GameObjects: {
    Events: {
      DESTROY: 'destroy',
    },
    Sprite: MockSprite,
    Image: MockImage,
    Text: MockText,
    Rectangle: MockRectangle,
    Graphics: MockGraphics,
  },
  Textures: {
    Parsers: {
      SpriteSheet: vi.fn(),
    },
  },
  Scenes: {
    Events: {
      SHUTDOWN: 'shutdown',
      DESTROY: 'destroy',
    },
  },
  Curves: {
    Path: MockPath,
  },
  WEBGL: 'WebGL',
  CANVAS: 'Canvas',
};

export default Phaser;