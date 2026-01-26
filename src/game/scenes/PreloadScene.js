import Phaser from 'phaser';

// Definieren einer Palette für Konsistenz (inspiriert von Arne16)
const PALETTE = {
    SKIN: 0xffccaa,
    OUTLINE: 0x222034,
    SHIRT_DEV: 0x5b6ee1, // Blau
    SHIRT_SALES: 0x6abe30, // Grün
    SHIRT_SUPPORT: 0xac3232, // Rot
    HAIR: 0x45283c,
    METAL: 0x9fadbc,
    PLANT: 0x37946e
};

const POP_WAV_B64 =
  'UklGRmYGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUIGAACZC5sOmA+XEKkQFhHcEQYRbQ8lDjkK0AcbAegCFf6l+8f5HfPj8jfyP/PM8lD0XfUu+Zf7Qf8u/3b/2P+lAAEAZwFzAnkCdwJpAkwCHQHkAKcAaQAsAO0Aqf9t/7r+5f6C/ir+Ff5J/nH+1P5w/5r/0wAIAa8B4gH6Af4B6gG9AYkBVAEeAeEAoQAeAJX/3f+9/1v/ZP8W/yD/av+u/9cAFAFpAfwBKgJLAlcCUQIzAgkC2gGqAXkBQQEFAckAhwA+APv/tP+F/1P/S/8k/yv/df+0/9wAFwFjAfIBGwJFAk0CQQImAgAC0gGpAX8BRwEJAc4AiwA8APv/s/+F/1v/Uf8s/zH/eP+3/+AAFgFZAd4B+AEBARkBFAH0AMoAogB8AFEAJwD7/9H/pP+P/3f/W/8+';
const KACHING_WAV_B64 =
  'UklGRjIVAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YfEUAABGmVY6kZaqm7Oqj6tVqa6n0r4cZ2c1n4sZ7rjg6+u9wX0y+qP0JqZ4K2r1dL2B0VhX1fufm8sQWqah2c9DqA2z1H1Y9n3a7L/2gGxSpmIpmWb2pY2l8KQn5CdlkqPfYpVf12NVGZRY1tWb1l1XKZcQmNRSkpIS1ZKTEhDQD4+OTQxLSkpJicoJigmJiYmJiYmJicoKSkqLC0uLzE0Nzk9P0JFR0pLTk9RUlNTU1JSUE5LSkdEQj49OTQvLCkqKisrKywsLS0tLSwsKysrKioqKSkpKCgoJycqKSwuLzE0Nzc7P0NGR0pLTk9QUFFRUFFQT05LSkdEQz89OTQvLCkqKisrKywsLS0tLSwsKysrKioqKSkpKCgoJycqKSwuLzE0Nzc7P0NGR0pLTk9QUFFRUFFQT05LSkdEQz89OTQvLCkqKisrKywsLS0tLSwsKysrKioqKSkpKCgoJycqKSwuLzE0Nzc7P0NGR0pLTk9QUFFRUFFQT05LSkdEQz89OTQvLCkqKisrKywsLS0tLSwsKysrKioqKSkpKCgoJycqKSwuLw==';

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
                try {
                    URL.revokeObjectURL(url);
                } catch {
                    // ignore
                }
            }
            this._blobUrls.length = 0;
        });

        this.safeLoadAudioFromBase64('pop', POP_WAV_B64, 'audio/wav');
        this.safeLoadAudioFromBase64('kaching', KACHING_WAV_B64, 'audio/wav');
    }

    create() {
        this.createHighQualityAssets();
        this.createAdvancedAssets(); // Procedural Normal Maps & Animations
        console.log('[PreloadScene] High-Fidelity Assets ready. Switching -> MainScene');
        this.scene.start('MainScene');
    }

    createAdvancedAssets() {
        // 1. WORKER MIT NORMAL MAP (Reagiert auf Licht)
        this.genSpriteWithNormal('worker_dev_adv', 32, 32, (g, isNormal) => {
            if (isNormal) {
                // Flat Surface (Zeigt nach oben Z) = 0x8080ff (RGB: 128, 128, 255)
                g.fillStyle(0x8080ff, 1);
                g.fillRect(0, 0, 32, 32);

                // Kanten simulieren (Links=Rot-, Rechts=Rot+, Oben=Grün+, Unten=Grün-)
                // Wir nutzen einfache Farben, um Neigung zu simulieren
                g.fillStyle(0xff8080, 1); // Rechts geneigt
                g.fillRect(24, 12, 4, 14);
                g.fillStyle(0x008080, 1); // Links geneigt
                g.fillRect(4, 12, 4, 14);
            } else {
                // Diffuse Textur (Das eigentliche Bild)
                g.fillStyle(0x3366cc, 1); // Blaues Shirt
                g.fillRect(4, 12, 24, 14); // Breiterer Körper

                // Kopf
                g.fillStyle(0xffccaa, 1);
                g.fillRect(8, 2, 16, 14);

                // Monitor-Brille (Cyberpunk Look)
                g.fillStyle(0x00ffff, 0.8);
                g.fillRect(10, 6, 12, 4);
            }
        });

        // 2. ANIMIERTE KAFFEEMASCHINE (Sprite Sheet Generation)
        // Wir erstellen 4 Frames horizontal: Voll -> Halb -> Leer -> Refilling
        this.genSpriteSheet('obj_coffee_anim', 32, 32, 4, (g, frameIndex) => {
            // Gehäuse
            g.fillStyle(0x444444, 1);
            g.fillRoundedRect(4, 4, 24, 28, 2);

            // Kanne Glas
            g.fillStyle(0xaaddff, 0.3);
            g.fillRect(8, 14, 16, 14);

            // Flüssigkeit (Höhe basiert auf Frame)
            const levels = [10, 5, 0, 10]; // Pixel Höhe
            const color = frameIndex === 3 ? 0x00ff00 : 0x6f4e37; // Grün beim Nachfüllen

            if (levels[frameIndex] > 0) {
                g.fillStyle(color, 1);
                g.fillRect(8, 28 - levels[frameIndex], 16, levels[frameIndex]);
            }

            // LED Status
            const ledColor = frameIndex === 2 ? 0xff0000 : 0x00ff00;
            g.fillStyle(ledColor);
            g.fillCircle(16, 8, 2);
        });

        // --- NEW PROCEDURAL ASSETS ---

        // WATER COOLER
        this.genTexture('obj_watercooler', 32, 32, (g) => {
            g.fillStyle(0x4488ff, 0.6); // Tank
            g.fillRect(10, 2, 12, 12);
            g.fillStyle(0xeeeeee, 1); // Base
            g.fillRect(8, 14, 16, 18);
            g.fillStyle(0xff0000, 1); // Tap Hot
            g.fillRect(12, 18, 2, 4);
            g.fillStyle(0x0000ff, 1); // Tap Cold
            g.fillRect(18, 18, 2, 4);
            g.lineStyle(1, 0x999999);
            g.strokeRect(8, 14, 16, 18);
        });

        // PRINTER
        this.genTexture('obj_printer', 32, 32, (g) => {
            g.fillStyle(0xd0d0d0, 1);
            g.fillRect(4, 10, 24, 18);
            g.lineStyle(1, 0x555555);
            g.strokeRect(4, 10, 24, 18);
            g.fillStyle(0xffffff, 1); // Paper
            g.fillRect(8, 4, 16, 6);
            g.fillStyle(0x333333, 1); // Display
            g.fillRect(18, 12, 8, 4);
            g.fillStyle(0x00ff00, 1); // LED
            g.fillCircle(8, 14, 2);
        });

        // WHITEBOARD
        this.genTexture('obj_whiteboard', 32, 32, (g) => {
            g.lineStyle(2, 0x888888, 1);
            g.beginPath();
            g.moveTo(4, 30); g.lineTo(4, 10);
            g.moveTo(28, 30); g.lineTo(28, 10);
            g.strokePath();
            g.fillStyle(0xffffff, 1);
            g.fillRect(2, 6, 28, 18);
            g.lineStyle(1, 0xcccccc);
            g.strokeRect(2, 6, 28, 18);
            g.lineStyle(1, 0xff0000, 0.8);
            g.beginPath();
            g.moveTo(6, 14); g.lineTo(12, 10); g.lineTo(18, 16);
            g.strokePath();
            g.lineStyle(1, 0x0000ff, 0.8);
            g.strokeCircle(22, 12, 3);
        });

        // DESK
        this.genTexture('obj_desk', 32, 32, (g) => {
            g.fillStyle(0x8b5a2b, 1);
            g.fillRect(2, 12, 28, 14);
            g.fillStyle(0x333333, 1);
            g.fillRect(6, 6, 12, 8); // Screen
            g.fillStyle(0x111111, 1);
            g.fillRect(10, 14, 4, 2); // Stand
            g.fillStyle(0xffffff, 1);
            g.fillRect(22, 14, 6, 4); // Papers
        });

        // VENDING MACHINE
        this.genTexture('obj_vending', 32, 32, (g) => {
            g.fillStyle(0xcc3333, 1);
            g.fillRect(6, 2, 20, 28);
            g.fillStyle(0x222222, 0.8);
            g.fillRect(8, 6, 16, 16);
            g.fillStyle(0xffaa00); g.fillRect(10, 8, 2, 2);
            g.fillStyle(0x00ff00); g.fillRect(14, 8, 2, 2);
            g.fillStyle(0x0000ff); g.fillRect(18, 8, 2, 2);
            g.fillStyle(0x111111, 1);
            g.fillRect(8, 24, 16, 4);
        });
    }

    createHighQualityAssets() {
        // --- PARTICLES ---
        this.genTexture('particle_pixel', 4, 4, (g) => {
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 4, 4);
        });

        // Hilfsfunktion für konsistente Charakter-Basis
        const drawCharBase = (g, shirtColor) => {
            g.lineStyle(2, PALETTE.OUTLINE, 1); // Fette Outline für Lesbarkeit

            // Körper
            g.fillStyle(shirtColor, 1);
            g.fillRect(8, 18, 16, 12);
            g.strokeRect(8, 18, 16, 12);

            // Kopf
            g.fillStyle(PALETTE.SKIN, 1);
            g.fillRect(10, 6, 12, 12);
            g.strokeRect(10, 6, 12, 12);

            // Haare (Top)
            g.fillStyle(PALETTE.HAIR, 1);
            g.fillRect(10, 6, 12, 4);
        };

        // --- WORKER: DEV ---
        this.genTexture('worker_dev', 32, 32, (g) => {
            drawCharBase(g, PALETTE.SHIRT_DEV);
            // Kopfhörer (typisch für Devs)
            g.fillStyle(PALETTE.OUTLINE, 1);
            g.fillRect(8, 10, 2, 6);  // Links
            g.fillRect(22, 10, 2, 6); // Rechts
            g.lineStyle(1, PALETTE.OUTLINE);
            g.beginPath();
            g.moveTo(8, 10);
            g.lineTo(10, 4);
            g.lineTo(22, 4);
            g.lineTo(24, 10);
            g.strokePath();
        });

        // --- WORKER: SALES ---
        this.genTexture('worker_sales', 32, 32, (g) => {
            drawCharBase(g, PALETTE.SHIRT_SALES);
            // Krawatte (Geld verdienen!)
            g.fillStyle(PALETTE.OUTLINE, 1);
            g.fillRect(15, 20, 2, 6);
            // Handy am Ohr
            g.fillStyle(0x000000, 1);
            g.fillRect(20, 8, 4, 8);
        });

        // --- WORKER: SUPPORT ---
        this.genTexture('worker_support', 32, 32, (g) => {
            drawCharBase(g, PALETTE.SHIRT_SUPPORT);
            // Headset Mikrofon
            g.lineStyle(1, 0x000000, 1);
            g.beginPath();
            g.moveTo(22, 12);
            g.lineTo(24, 12);
            g.lineTo(24, 16);
            g.lineTo(18, 16);
            g.strokePath();
        });

        // --- VISITOR: PIZZA ---
        this.genTexture('visitor_pizza', 32, 32, (g) => {
             // Keep simple or improve? User didn't specify, but I should keep it to avoid missing texture
             // Let's make it match style slightly
            g.lineStyle(2, PALETTE.OUTLINE, 1);
            g.fillStyle(0xffaa00, 1);
            g.fillRect(8, 12, 16, 14);
            g.strokeRect(8, 12, 16, 14);

            g.fillStyle(0xffffff, 1);
            g.fillRect(8, -5, 16, 16); // Box
            g.strokeRect(8, -5, 16, 16);

            g.fillStyle(PALETTE.SKIN, 1);
            g.fillRect(10, 6, 12, 10);
        });

        // --- VISITOR: INVESTOR ---
        this.genTexture('visitor_investor', 32, 32, (g) => {
             g.lineStyle(2, PALETTE.OUTLINE, 1);
             g.fillStyle(0x555555, 1); // Suit
             g.fillRect(6, 10, 20, 20);
             g.strokeRect(6, 10, 20, 20);

             g.fillStyle(PALETTE.SKIN, 1);
             g.fillRect(12, 2, 8, 8);

             g.fillStyle(0x000000, 1); // Briefcase
             g.fillRect(24, 20, 6, 10);
        });


        // --- OBJECT: SERVER ---
        this.genTexture('obj_server', 32, 32, (g) => {
            // Gehäuse
            g.fillStyle(0x222222, 1);
            g.lineStyle(2, 0x000000, 1);
            g.fillRect(4, 2, 24, 28);
            g.strokeRect(4, 2, 24, 28);

            // Blinkende Lichter (Statisch, Animation via Tween später)
            g.fillStyle(0x00ff00, 1); // Grün
            g.fillRect(8, 6, 4, 2);
            g.fillRect(8, 10, 4, 2);
            g.fillStyle(0xff0000, 1); // Rot
            g.fillRect(20, 6, 4, 2);

            // Lüftungsschlitze
            g.lineStyle(1, 0x555555);
            g.beginPath();
            g.moveTo(6, 20); g.lineTo(26, 20);
            g.moveTo(6, 24); g.lineTo(26, 24);
            g.strokePath();
        });

        // --- OBJECT: COFFEE --- (Missing in user snippet but needed for game)
        this.genTexture('obj_coffee', 32, 32, (g) => {
            g.fillStyle(PALETTE.METAL, 1);
            g.lineStyle(2, PALETTE.OUTLINE, 1);
            g.fillRect(6, 6, 20, 24);
            g.strokeRect(6, 6, 20, 24);
            g.fillStyle(0x332200, 1);
            g.fillRect(10, 18, 12, 10);
        });

        // --- OBJECT: PLANT ---
        this.genTexture('obj_plant', 32, 32, (g) => {
            // Topf
            g.fillStyle(0x8b4513, 1); // Braun
            g.fillRect(10, 22, 12, 8);
            g.lineStyle(1, 0x000000, 0.5);
            g.strokeRect(10, 22, 12, 8);

            // Blätter (Kreise für organischeren Look)
            g.fillStyle(PALETTE.PLANT, 1);
            g.fillCircle(16, 18, 6);
            g.fillCircle(12, 22, 4);
            g.fillCircle(20, 22, 4);
        });

        // --- FLOORS (Tiles) ---
        // Ein sauberes Kachelmuster wirkt professioneller als ein flaches Rechteck
        const createFloor = (name, baseColor, checkColor) => {
             this.genTexture(name, 32, 32, (g) => {
                g.fillStyle(baseColor, 1); // Basis hell
                g.fillRect(0, 0, 32, 32);
                g.fillStyle(checkColor, 0.5); // Schachbrett leicht
                g.fillRect(0, 0, 16, 16);
                g.fillRect(16, 16, 16, 16);
                g.lineStyle(1, 0xcccccc, 0.5); // Subtile Fuge
                g.strokeRect(0, 0, 32, 32);
            });
        }

        createFloor('floor_1', 0xeeeeee, 0xd0d0d0);
        createFloor('floor_2', 0xdcb484, 0x8b5a2b); // keeping old colors roughly? no user snippet implies floor_1 style
        createFloor('floor_3', 0x223344, 0x446688);
    }

    /**
     * Erstellt eine Textur UND eine zugehörige Normal Map.
     */
    genSpriteWithNormal(key, w, h, drawFn) {
        // 1. Diffuse Textur
        this.genTexture(key, w, h, (g) => drawFn(g, false));
        // 2. Normal Map (Key + '_n')
        this.genTexture(key + '_n', w, h, (g) => drawFn(g, true));
    }

    /**
     * Erstellt ein Spritesheet durch mehrfaches Zeichnen auf eine breite Textur.
     */
    genSpriteSheet(key, frameW, frameH, frameCount, drawFn) {
        if (this.textures.exists(key)) return;

        const totalWidth = frameW * frameCount;
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        try {
            g.clear();

            for (let i = 0; i < frameCount; i++) {
                // Verschiebe den Ursprung für jeden Frame
                g.save();
                g.translate(i * frameW, 0);
                drawFn(g, i); // Zeichne Frame i
                g.restore();
            }

            g.generateTexture(key, totalWidth, frameH);

            const texture = this.textures.get(key);
            Phaser.Textures.Parsers.SpriteSheet(texture, 0, 0, 0, totalWidth, frameH, {
                frameWidth: frameW,
                frameHeight: frameH
            });
        } finally {
            g.destroy();
        }
    }

    // TextureGuard + MemSafe generator
    genTexture(key, w, h, drawFn) {
        if (this.textures.exists(key)) return;
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        try {
            g.clear();
            drawFn(g);
            g.generateTexture(key, w, h);
        } finally {
            g.destroy();
        }
    }

    // ---------------------------------------------------------------------------
    // Audio Helpers (Preserved)
    // ---------------------------------------------------------------------------
    safeLoadAudioFromBase64(key, base64OrDataUri, defaultMime = 'audio/wav') {
        const audioCache = this.cache?.audio;
        const alreadyCached =
          audioCache?.exists?.(key) === true ||
          (typeof audioCache?.get === 'function' && audioCache.get(key) != null);

        if (alreadyCached) return;

        const extracted = this.extractBase64(base64OrDataUri, defaultMime);
        const b64 = this.validateAudioBase64(extracted.base64) ? extracted.base64 : POP_WAV_B64;

        try {
          const blob = this.base64ToBlob(b64, extracted.mime);
          const url = URL.createObjectURL(blob);
          this._blobUrls.push(url);
          this.load.audio(key, url);
        } catch (e) {
          console.warn(
            `[PreloadScene] Audio decode prep failed for "${key}". Using silent fallback.`,
            e
          );
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
        } catch {
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
        // eslint-disable-next-line no-misleading-character-class
        return s.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
    }
}
