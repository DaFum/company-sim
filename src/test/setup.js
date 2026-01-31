import { beforeAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Phaser globally
beforeAll(() => {
  // Mock window.URL if not available
  if (typeof window.URL.createObjectURL === 'undefined') {
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock-url'),
    });
  }
  if (typeof window.URL.revokeObjectURL === 'undefined') {
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: vi.fn(),
    });
  }

  // Mock atob for base64 decoding
  if (typeof window.atob === 'undefined') {
    global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
  }

  // Mock Blob if not available
  if (typeof window.Blob === 'undefined') {
    global.Blob = class Blob {
      constructor(parts, options) {
        this.parts = parts;
        this.options = options;
        this.size = parts.reduce((acc, part) => acc + (part.length || 0), 0);
        this.type = options?.type || '';
      }
    };
  }

  // Mock AudioContext
  global.AudioContext = vi.fn(() => ({
    createBufferSource: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { value: 1 },
    })),
    destination: {},
  }));

  // Mock WebGL context
  HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(4),
        })),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        canvas: {},
      };
    }
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        canvas: {},
        drawingBufferWidth: 800,
        drawingBufferHeight: 600,
        getParameter: vi.fn(),
        getExtension: vi.fn(),
        createTexture: vi.fn(),
        bindTexture: vi.fn(),
        texImage2D: vi.fn(),
        texParameteri: vi.fn(),
      };
    }
    return null;
  });

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
  global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});
