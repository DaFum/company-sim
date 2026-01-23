import Phaser from 'phaser';

const POP_WAV_B64 = 'UklGRmYGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUIGAACZC5sOmA+XEKkQFhHcEQYRbQ8lDjkK0AcbAegCFf6l+8f5HfPj8jfyP/PM8lD0XfUu+Zf7Qf8u/3b/2P+lAAEAZwFzAnkCdwJpAkwCHQHkAKcAaQAsAO0Aqf9t/7r+5f6C/ir+Ff5J/nH+1P5w/5r/0wAIAa8B4gH6Af4B6gG9AYkBVAEeAeEAoQAeAJX/3f+9/1v/ZP8W/yD/av+u/9cAFAFpAfwBKgJLAlcCUQIzAgkC2gGqAXkBQQEFAckAhwA+APv/tP+F/1P/S/8k/yv/df+0/9wAFwFjAfIBGwJFAk0CQQImAgAC0gGpAX8BRwEJAc4AiwA8APv/s/+F/1v/Uf8s/zH/eP+3/+AAFgFZAd4B+AEBARkBFAH0AMoAogB8AFEAJwD7/9H/pP+P/3f/W/8+';
const KACHING_WAV_B64 = 'UklGRjIVAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YfEUAABGmVY6kZaqm7Oqj6tVqa6n0r4cZ2c1n4sZ7rjg6+u9wX0y+qP0JqZ4K2r1dL2B0VhX1fufm8sQWqah2c9DqA2z1H1Y9n3a7L/2gGxSpmIpmWb2pY2l8KQn5CdlkqPfYpVf12NVGZRY1tWb1l1XKZcQmNRSkpIS1ZKTEhDQD4+OTQxLSkpJicoJigmJiYmJiYmJicoKSkqLC0uLzE0Nzk9P0JFR0pLTk9RUlNTU1JSUE5LSkdEQj49OTQvLCkqKisrKywsLS0tLSwsKysrKioqKSkpKCgoJycqKSwuLzE0Nzc7P0NGR0pLTk9QUFFRUFFQT05LSkdEQz89OTQvLCkqKisrKywsLS0tLSwsKysrKioqKSkpKCgoJycqKSwuLzE0Nzc7P0NGR0pLTk9QUFFRUFFQT05LSkdEQz89OTQvLCkqKisrKywsLS0tLSwsKysrKioqKSkpKCgoJycqKSwuLzE0Nzc7P0NGR0pLTk9QUFFRUFFQT05LSkdEQz89OTQvLCkqKisrKywsLS0tLSwsKysrKioqKSkpKCgoJycqKSwuLw==';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
    this._blobUrls = [];
  }

  preload() {
    console.log('[PreloadScene] Booting Asset Factory...');

    this.load.on('loaderror', (file) => {
      console.warn('[PreloadScene] Load error:', file?.key, file?.src);
    });

    this.load.once('complete', () => {
      for (const url of this._blobUrls) {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }
      this._blobUrls.length = 0;
    });

    this.safeLoadAudioFromBase64('pop', POP_WAV_B64, 'audio/wav');
    this.safeLoadAudioFromBase64('kaching', KACHING_WAV_B64, 'audio/wav');
  }

  create() {
    this.createAssets();
    console.log('[PreloadScene] Assets ready. Switching -> MainScene');
    this.scene.start('MainScene');
  }

  // ---------------------------------------------------------------------------
  // 🎨 Procedural Asset Factory
  // ---------------------------------------------------------------------------
  createAssets() {
    // --- WORKERS ---
    this.genTexture('worker_dev', 32, 32, (g) => {
      g.fillStyle(0x3366cc, 1); g.fillRect(8, 12, 16, 14);     // body
      g.fillStyle(0xffccaa, 1); g.fillRect(10, 4, 12, 12);     // head
      g.fillStyle(0x111111, 1);                                // headphones
      g.fillRect(8, 6, 2, 8); g.fillRect(22, 6, 2, 8);
    });

    this.genTexture('worker_sales', 32, 32, (g) => {
      g.fillStyle(0x228822, 1); g.fillRect(8, 12, 16, 14);
      g.fillStyle(0xffccaa, 1); g.fillRect(10, 4, 12, 12);
      g.fillStyle(0x000000, 1); g.fillRect(20, 6, 4, 8);       // phone
    });

    this.genTexture('worker_support', 32, 32, (g) => {
      g.fillStyle(0xcc3333, 1); g.fillRect(8, 12, 16, 14);
      g.fillStyle(0xffccaa, 1); g.fillRect(10, 4, 12, 12);
      g.fillStyle(0xcc3333, 1); g.fillRect(10, 2, 12, 4);      // cap
    });

    // --- VISITORS ---
    this.genTexture('visitor_pizza', 32, 32, (g) => {
      g.fillStyle(0xffaa00, 1); g.fillRect(8, 12, 16, 14);
      g.fillStyle(0xffffff, 1); g.fillRect(8, -5, 16, 16);
      g.fillStyle(0xffccaa, 1); g.fillRect(10, 6, 12, 10);
    });

    this.genTexture('visitor_investor', 32, 32, (g) => {
      g.fillStyle(0x555555, 1); g.fillRect(6, 10, 20, 20);
      g.fillStyle(0xffccaa, 1); g.fillRect(12, 2, 8, 8);
      g.fillStyle(0x000000, 1); g.fillRect(24, 20, 6, 10);
    });

    // --- OBJECTS ---
    this.genTexture('obj_server', 32, 32, (g) => {
      g.fillStyle(0x111111, 1); g.fillRect(4, 2, 24, 28);
      g.fillStyle(0x00ff00, 1); g.fillRect(6, 6, 4, 2); g.fillRect(12, 6, 4, 2); g.fillRect(6, 12, 4, 2);
      g.fillStyle(0xff0000, 1); g.fillRect(6, 24, 2, 2);
    });

    this.genTexture('obj_coffee', 32, 32, (g) => {
      g.fillStyle(0x888888, 1); g.fillRect(6, 6, 20, 24);
      g.fillStyle(0x332200, 1); g.fillRect(10, 18, 12, 10);
    });

    this.genTexture('obj_plant', 32, 32, (g) => {
      g.fillStyle(0x8b4513, 1); g.fillRect(10, 22, 12, 10);
      g.fillStyle(0x228822, 1); g.fillCircle(16, 18, 10);
    });

    // --- FLOORS ---
    this.genTexture('floor_1', 32, 32, (g) => {
      g.fillStyle(0x555555, 1); g.fillRect(0, 0, 32, 32);
      g.lineStyle(1, 0x444444, 1); g.strokeRect(0, 0, 32, 32);
    });

    this.genTexture('floor_2', 32, 32, (g) => {
      g.fillStyle(0xdcb484, 1); g.fillRect(0, 0, 32, 32);
      g.lineStyle(1, 0x8b5a2b, 1); g.strokeRect(0, 0, 32, 32);
    });

    this.genTexture('floor_3', 32, 32, (g) => {
      g.fillStyle(0x223344, 1); g.fillRect(0, 0, 32, 32);
      g.lineStyle(1, 0x446688, 1); g.strokeRect(0, 0, 32, 32);
    });
  }

  // ---------------------------------------------------------------------------
  // TextureGuard + MemSafe generator
  // ---------------------------------------------------------------------------
  genTexture(key, w, h, drawFn) {
    if (this.textures.exists(key)) return; // TextureGuard

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    try {
      g.clear();
      drawFn(g);
      g.generateTexture(key, w, h);
    } finally {
      g.destroy(); // Mandatory cleanup
    }
  }

  // ---------------------------------------------------------------------------
  // Audio: Base64 -> Blob -> ObjectURL -> Loader
  // ---------------------------------------------------------------------------
  safeLoadAudioFromBase64(key, base64OrDataUri, defaultMime = 'audio/wav') {
    const audioCache = this.cache?.audio;
    const alreadyCached =
      (audioCache?.exists?.(key) === true) ||
      (typeof audioCache?.get === 'function' && audioCache.get(key) != null);

    if (alreadyCached) return;

    const extracted = this.extractBase64(base64OrDataUri, defaultMime);
    const b64 = this.validateAudioBase64(extracted.base64)
      ? extracted.base64
      : POP_WAV_B64;

    try {
      const blob = this.base64ToBlob(b64, extracted.mime);
      const url = URL.createObjectURL(blob);
      this._blobUrls.push(url);
      this.load.audio(key, url);
    } catch (e) {
      console.warn(`[PreloadScene] Audio decode prep failed for "${key}". Using silent fallback.`, e);
    }
  }

  extractBase64(input, fallbackMime) {
    const str = this.stripInvisible(String(input));
    const match = /^data:([^;]+);base64,(.+)$/i.exec(str);
    if (match) return { mime: match[1], base64: match[2] };
    return { mime: fallbackMime, base64: str };
  }

  validateAudioBase64(b64) {
    const s = this.stripInvisible(String(b64));
    if (s.length < 50) return false;

    try {
      const needBytes = 12;
      const needChars = Math.ceil(needBytes / 3) * 4;
      const head = atob(s.slice(0, needChars));
      const riff = head.slice(0, 4) === 'RIFF';
      const wave = head.slice(8, 12) === 'WAVE';
      if (!riff || !wave) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  base64ToBlob(b64, mime) {
    const clean = this.stripInvisible(String(b64));
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  stripInvisible(s) {
    return s.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
  }
}
