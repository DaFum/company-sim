import { vi } from 'vitest';

// Mock phaser3spectorjs before Phaser loads
vi.mock('phaser3spectorjs', () => ({
  default: {},
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock atob for base64 decoding
if (!global.atob) {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// Mock Blob
if (!global.Blob) {
  global.Blob = class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options || {};
      this.type = this.options.type || '';
    }
  };
}

// Mock Canvas and WebGL context for Phaser
HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
  if (type === '2d') {
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
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      measureText: vi.fn(() => ({ width: 0 })),
    };
  }
  if (type === 'webgl' || type === 'webgl2') {
    return {
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
    };
  }
  return null;
});

// Mock window.addEventListener for custom events
const originalAddEventListener = window.addEventListener;
window.addEventListener = vi.fn((event, handler, options) => {
  if (event === 'ZOOM_IN' || event === 'ZOOM_OUT') {
    // Store the handler for testing
    window[`_${event}_handler`] = handler;
  }
  originalAddEventListener.call(window, event, handler, options);
});

// Mock window.removeEventListener
const originalRemoveEventListener = window.removeEventListener;
window.removeEventListener = vi.fn((event, handler, options) => {
  if (event === 'ZOOM_IN' || event === 'ZOOM_OUT') {
    delete window[`_${event}_handler`];
  }
  originalRemoveEventListener.call(window, event, handler, options);
});