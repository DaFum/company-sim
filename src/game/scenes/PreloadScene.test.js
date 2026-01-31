import { describe, it, expect, beforeEach, vi } from 'vitest';
import Phaser from '../../test/mocks/phaser3spectorjs.js';
import PreloadScene from './PreloadScene.js';

describe('PreloadScene', () => {
  let scene;

  beforeEach(() => {
    scene = new PreloadScene();
    // Initialize scene components manually since we're not using Phaser's full lifecycle
    scene.textures = new Phaser.Scene().textures;
    scene.cache = new Phaser.Scene().cache;
    scene.load = new Phaser.Scene().load;
    scene.add = new Phaser.Scene().add;
    scene.make = new Phaser.Scene().make;
    scene.anims = new Phaser.Scene().anims;
    scene.scene = new Phaser.Scene().scene;
    scene.game = new Phaser.Scene().game;
  });

  describe('constructor', () => {
    it('should initialize with correct scene key', () => {
      expect(scene.key).toBe('PreloadScene');
    });

    it('should initialize _blobUrls as empty array', () => {
      expect(scene._blobUrls).toEqual([]);
    });
  });

  describe('preload', () => {
    it('should set up load error handler', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      scene.preload();

      expect(scene.load.on).toHaveBeenCalledWith('loaderror', expect.any(Function));
      consoleSpy.mockRestore();
    });

    it('should set up load complete handler for cleanup', () => {
      scene.preload();
      expect(scene.load.once).toHaveBeenCalledWith('complete', expect.any(Function));
    });

    it('should load audio assets from base64', () => {
      const audioSpy = vi.spyOn(scene.load, 'audio');
      scene.preload();

      // Note: kaching might fail validation and fall back to pop
      expect(audioSpy).toHaveBeenCalledWith('pop', expect.any(String));
      expect(audioSpy).toHaveBeenCalled();
      expect(audioSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should clean up blob URLs after loading completes', () => {
      scene._blobUrls = ['blob:url1', 'blob:url2'];
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      scene.preload();

      // Simulate load complete
      const completeHandler = scene.load.once.mock.calls.find(
        (call) => call[0] === 'complete'
      )?.[1];
      if (completeHandler) {
        completeHandler();
      }

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url1');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url2');
      expect(scene._blobUrls).toHaveLength(0);

      revokeObjectURLSpy.mockRestore();
    });

    it('should handle blob URL revocation errors gracefully', () => {
      scene._blobUrls = ['blob:invalid'];
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
        throw new Error('Revoke failed');
      });

      scene.preload();

      const completeHandler = scene.load.once.mock.calls.find(
        (call) => call[0] === 'complete'
      )?.[1];

      expect(() => {
        if (completeHandler) completeHandler();
      }).not.toThrow();

      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('create', () => {
    beforeEach(() => {
      vi.spyOn(scene, 'createHighQualityAssets').mockImplementation(() => {});
      vi.spyOn(scene, 'createAdvancedAssets').mockImplementation(() => {});
    });

    it('should call createHighQualityAssets', () => {
      scene.create();
      expect(scene.createHighQualityAssets).toHaveBeenCalled();
    });

    it('should call createAdvancedAssets', () => {
      scene.create();
      expect(scene.createAdvancedAssets).toHaveBeenCalled();
    });

    it('should start MainScene', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      scene.create();

      expect(scene.scene.start).toHaveBeenCalledWith('MainScene');
      consoleSpy.mockRestore();
    });

    it('should log completion message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      scene.create();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High-Fidelity Assets ready')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('createAdvancedAssets', () => {
    beforeEach(() => {
      vi.spyOn(scene, 'genSpriteSheetWithNormal').mockImplementation(() => {});
      vi.spyOn(scene, 'genSpriteWithNormal').mockImplementation(() => {});
    });

    it('should create animated coffee sprite sheet', () => {
      scene.createAdvancedAssets();

      expect(scene.genSpriteSheetWithNormal).toHaveBeenCalledWith(
        'obj_coffee_anim',
        32,
        32,
        4,
        expect.any(Function)
      );
    });

    it('should create watercooler sprite with normal', () => {
      scene.createAdvancedAssets();

      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'obj_watercooler',
        32,
        32,
        expect.any(Function)
      );
    });

    it('should create printer sprite with normal', () => {
      scene.createAdvancedAssets();

      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'obj_printer',
        32,
        32,
        expect.any(Function)
      );
    });

    it('should create whiteboard sprite with normal', () => {
      scene.createAdvancedAssets();

      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'obj_whiteboard',
        32,
        32,
        expect.any(Function)
      );
    });

    it('should create desk sprite with normal', () => {
      scene.createAdvancedAssets();

      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'obj_desk',
        32,
        32,
        expect.any(Function)
      );
    });

    it('should create vending machine sprite with normal', () => {
      scene.createAdvancedAssets();

      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'obj_vending',
        32,
        32,
        expect.any(Function)
      );
    });
  });

  describe('createHighQualityAssets', () => {
    beforeEach(() => {
      vi.spyOn(scene, 'genTexture').mockImplementation(() => {});
      vi.spyOn(scene, 'genSpriteWithNormal').mockImplementation(() => {});
    });

    it('should create particle pixel texture', () => {
      scene.createHighQualityAssets();

      expect(scene.genTexture).toHaveBeenCalledWith('particle_pixel', 4, 4, expect.any(Function));
    });

    it('should create shadow blob texture', () => {
      scene.createHighQualityAssets();

      expect(scene.genTexture).toHaveBeenCalledWith('shadow_blob', 24, 12, expect.any(Function));
    });

    it('should create worker sprites for all roles', () => {
      scene.createHighQualityAssets();

      expect(scene.genTexture).toHaveBeenCalledWith('worker_dev', 32, 32, expect.any(Function));
      expect(scene.genTexture).toHaveBeenCalledWith('worker_sales', 32, 32, expect.any(Function));
      expect(scene.genTexture).toHaveBeenCalledWith('worker_support', 32, 32, expect.any(Function));
    });

    it('should create visitor sprites', () => {
      scene.createHighQualityAssets();

      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'visitor_pizza',
        32,
        32,
        expect.any(Function)
      );
      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'visitor_investor',
        32,
        32,
        expect.any(Function)
      );
    });

    it('should create object sprites', () => {
      scene.createHighQualityAssets();

      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'obj_server',
        32,
        32,
        expect.any(Function),
        expect.any(Function)
      );
      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'obj_coffee',
        32,
        32,
        expect.any(Function)
      );
      expect(scene.genSpriteWithNormal).toHaveBeenCalledWith(
        'obj_plant',
        32,
        32,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should create floor textures for all levels', () => {
      scene.createHighQualityAssets();

      expect(scene.genTexture).toHaveBeenCalledWith('floor_1', 32, 32, expect.any(Function));
      expect(scene.genTexture).toHaveBeenCalledWith('floor_2', 32, 32, expect.any(Function));
      expect(scene.genTexture).toHaveBeenCalledWith('floor_3', 32, 32, expect.any(Function));
    });
  });

  describe('genTexture', () => {
    it('should not create texture if it already exists', () => {
      scene.textures.textures.set('test_texture', {});
      const makeGraphicsSpy = vi.spyOn(scene.make, 'graphics');

      scene.genTexture('test_texture', 32, 32, () => {});

      expect(makeGraphicsSpy).not.toHaveBeenCalled();
    });

    it('should create new texture with provided dimensions', () => {
      const graphics = scene.make.graphics();
      vi.spyOn(scene.make, 'graphics').mockReturnValue(graphics);
      const drawFn = vi.fn();

      scene.genTexture('new_texture', 64, 64, drawFn);

      expect(scene.make.graphics).toHaveBeenCalled();
      expect(graphics.clear).toHaveBeenCalled();
      expect(drawFn).toHaveBeenCalledWith(graphics);
      expect(graphics.generateTexture).toHaveBeenCalledWith('new_texture', 64, 64);
    });

    it('should destroy graphics after texture generation', () => {
      const graphics = scene.make.graphics();
      vi.spyOn(scene.make, 'graphics').mockReturnValue(graphics);

      scene.genTexture('new_texture', 32, 32, () => {});

      expect(graphics.destroy).toHaveBeenCalled();
    });

    it('should destroy graphics even if drawFn throws', () => {
      const graphics = scene.make.graphics();
      vi.spyOn(scene.make, 'graphics').mockReturnValue(graphics);
      const errorFn = () => {
        throw new Error('Draw error');
      };

      expect(() => {
        scene.genTexture('error_texture', 32, 32, errorFn);
      }).toThrow('Draw error');

      expect(graphics.destroy).toHaveBeenCalled();
    });
  });

  describe('genSpriteWithNormal', () => {
    beforeEach(() => {
      vi.spyOn(scene, 'genTexture').mockImplementation(() => {});
    });

    it('should create diffuse texture', () => {
      const drawFn = vi.fn();
      scene.genSpriteWithNormal('test_sprite', 32, 32, drawFn);

      expect(scene.genTexture).toHaveBeenCalledWith('test_sprite', 32, 32, drawFn);
    });

    it('should create normal map texture with _n suffix', () => {
      const drawFn = vi.fn();
      scene.genSpriteWithNormal('test_sprite', 32, 32, drawFn);

      expect(scene.genTexture).toHaveBeenCalledWith('test_sprite_n', 32, 32, expect.any(Function));
    });

    it('should use provided normal map function', () => {
      const drawFn = vi.fn();
      const normalFn = vi.fn();
      scene.genSpriteWithNormal('test_sprite', 32, 32, drawFn, normalFn);

      const normalCallArgs = scene.genTexture.mock.calls.find(
        (call) => call[0] === 'test_sprite_n'
      );
      expect(normalCallArgs).toBeDefined();

      // Execute the normal map function
      const normalMapFn = normalCallArgs[3];
      const mockGraphics = {};
      normalMapFn(mockGraphics);

      expect(normalFn).toHaveBeenCalledWith(mockGraphics);
    });

    it('should create default flat normal map if none provided', () => {
      const drawFn = vi.fn();
      scene.genSpriteWithNormal('test_sprite', 64, 64, drawFn);

      const normalCallArgs = scene.genTexture.mock.calls.find(
        (call) => call[0] === 'test_sprite_n'
      );
      expect(normalCallArgs[1]).toBe(64);
      expect(normalCallArgs[2]).toBe(64);
    });
  });

  describe('genSpriteSheet', () => {
    beforeEach(() => {
      vi.spyOn(scene, 'genSpriteSheet').mockRestore();
    });

    it('should not create spritesheet if it already exists', () => {
      scene.textures.textures.set('test_sheet', {});
      const makeGraphicsSpy = vi.spyOn(scene.make, 'graphics');

      scene.genSpriteSheet('test_sheet', 32, 32, 4, () => {});

      expect(makeGraphicsSpy).not.toHaveBeenCalled();
    });

    it('should create spritesheet with correct total width', () => {
      const graphics = scene.make.graphics();
      vi.spyOn(scene.make, 'graphics').mockReturnValue(graphics);

      scene.genSpriteSheet('test_sheet', 32, 32, 4, () => {});

      expect(graphics.generateTexture).toHaveBeenCalledWith('test_sheet', 128, 32);
    });

    it('should call draw function for each frame', () => {
      const graphics = scene.make.graphics();
      vi.spyOn(scene.make, 'graphics').mockReturnValue(graphics);
      const drawFn = vi.fn();

      scene.genSpriteSheet('test_sheet', 32, 32, 3, drawFn);

      expect(drawFn).toHaveBeenCalledTimes(3);
      expect(drawFn).toHaveBeenNthCalledWith(1, graphics, 0);
      expect(drawFn).toHaveBeenNthCalledWith(2, graphics, 1);
      expect(drawFn).toHaveBeenNthCalledWith(3, graphics, 2);
    });

    it('should translate canvas for each frame', () => {
      const graphics = scene.make.graphics();
      vi.spyOn(scene.make, 'graphics').mockReturnValue(graphics);

      scene.genSpriteSheet('test_sheet', 32, 32, 3, () => {});

      expect(graphics.save).toHaveBeenCalledTimes(3);
      expect(graphics.translateCanvas).toHaveBeenCalledTimes(3);
      expect(graphics.restore).toHaveBeenCalledTimes(3);
    });

    it('should parse spritesheet into frames', () => {
      const graphics = scene.make.graphics();
      vi.spyOn(scene.make, 'graphics').mockReturnValue(graphics);

      scene.genSpriteSheet('test_sheet', 32, 32, 4, () => {});

      expect(Phaser.Textures.Parsers.SpriteSheet).toHaveBeenCalled();
    });
  });

  describe('genSpriteSheetWithNormal', () => {
    beforeEach(() => {
      vi.spyOn(scene, 'genSpriteSheet').mockImplementation(() => {});
    });

    it('should create diffuse spritesheet', () => {
      const drawFn = vi.fn();
      scene.genSpriteSheetWithNormal('test_anim', 32, 32, 4, drawFn);

      expect(scene.genSpriteSheet).toHaveBeenCalledWith('test_anim', 32, 32, 4, drawFn);
    });

    it('should create normal map spritesheet with _n suffix', () => {
      const drawFn = vi.fn();
      scene.genSpriteSheetWithNormal('test_anim', 32, 32, 4, drawFn);

      expect(scene.genSpriteSheet).toHaveBeenCalledWith(
        'test_anim_n',
        32,
        32,
        4,
        expect.any(Function)
      );
    });

    it('should use provided normal map function for each frame', () => {
      const drawFn = vi.fn();
      const normalFn = vi.fn();
      scene.genSpriteSheetWithNormal('test_anim', 32, 32, 4, drawFn, normalFn);

      const normalCallArgs = scene.genSpriteSheet.mock.calls.find(
        (call) => call[0] === 'test_anim_n'
      );
      expect(normalCallArgs).toBeDefined();

      // Execute the normal map function
      const normalMapFn = normalCallArgs[4];
      const mockGraphics = {};
      normalMapFn(mockGraphics, 0);

      expect(normalFn).toHaveBeenCalledWith(mockGraphics, 0);
    });
  });

  describe('audio helper methods', () => {
    describe('extractBase64', () => {
      it('should extract mime and base64 from data URI', () => {
        const dataUri = 'data:audio/wav;base64,ABCD1234';
        const result = scene.extractBase64(dataUri, 'audio/mpeg');

        expect(result.mime).toBe('audio/wav');
        expect(result.base64).toBe('ABCD1234');
      });

      it('should use fallback mime for plain base64', () => {
        const base64 = 'ABCD1234';
        const result = scene.extractBase64(base64, 'audio/mpeg');

        expect(result.mime).toBe('audio/mpeg');
        expect(result.base64).toBe('ABCD1234');
      });

      it('should strip invisible characters', () => {
        const dataUri = 'data:audio/wav;base64,ABCD\u200B1234';
        const result = scene.extractBase64(dataUri, 'audio/wav');

        expect(result.base64).toBe('ABCD1234');
      });
    });

    describe('validateAudioBase64', () => {
      it('should return false for short strings', () => {
        expect(scene.validateAudioBase64('short')).toBe(false);
      });

      it('should return false for invalid base64', () => {
        expect(scene.validateAudioBase64('not!valid@base64#')).toBe(false);
      });

      it('should return false for non-RIFF format', () => {
        const notRiff = btoa('NOTARIFF');
        expect(scene.validateAudioBase64(notRiff)).toBe(false);
      });

      it('should return true for valid WAV base64', () => {
        // Create a minimal valid WAV header
        const wavHeader = 'RIFF\x00\x00\x00\x00WAVE';
        const validBase64 = btoa(wavHeader + 'A'.repeat(50));
        expect(scene.validateAudioBase64(validBase64)).toBe(true);
      });
    });

    describe('base64ToBlob', () => {
      it('should convert base64 to blob', () => {
        const base64 = btoa('test data');
        const blob = scene.base64ToBlob(base64, 'audio/wav');

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('audio/wav');
      });

      it('should strip invisible characters before conversion', () => {
        const base64 = btoa('test') + '\u200B';
        const blob = scene.base64ToBlob(base64, 'audio/wav');

        expect(blob).toBeInstanceOf(Blob);
      });

      it('should handle different mime types', () => {
        const base64 = btoa('test');
        const blob = scene.base64ToBlob(base64, 'audio/mpeg');

        expect(blob.type).toBe('audio/mpeg');
      });
    });

    describe('stripInvisible', () => {
      it('should remove zero-width spaces', () => {
        const input = 'test\u200Bdata';
        expect(scene.stripInvisible(input)).toBe('testdata');
      });

      it('should remove multiple invisible characters', () => {
        const input = 'a\u00A0b\u200Bc\u200Cd\u200De\uFEFF';
        expect(scene.stripInvisible(input)).toBe('abcde');
      });

      it('should return same string if no invisible characters', () => {
        const input = 'normal text';
        expect(scene.stripInvisible(input)).toBe('normal text');
      });
    });

    describe('safeLoadAudioFromBase64', () => {
      it('should not load if audio already cached', () => {
        scene.cache.audio.exists = vi.fn(() => true);
        const loadSpy = vi.spyOn(scene.load, 'audio');

        scene.safeLoadAudioFromBase64('test', 'ABCD', 'audio/wav');

        expect(loadSpy).not.toHaveBeenCalled();
      });

      it('should create blob URL and load audio', () => {
        scene.cache.audio.exists = vi.fn(() => false);
        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        const loadSpy = vi.spyOn(scene.load, 'audio');

        const validWav = 'UklGRmYGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUIGAAA=';
        scene.safeLoadAudioFromBase64('test_sound', validWav, 'audio/wav');

        expect(createObjectURLSpy).toHaveBeenCalled();
        expect(loadSpy).toHaveBeenCalledWith('test_sound', 'blob:test');
        expect(scene._blobUrls).toContain('blob:test');

        createObjectURLSpy.mockRestore();
      });

      it('should handle blob creation errors gracefully', () => {
        scene.cache.audio.exists = vi.fn(() => false);
        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
          throw new Error('Blob error');
        });
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(() => {
          scene.safeLoadAudioFromBase64('test', 'invalid', 'audio/wav');
        }).not.toThrow();

        expect(consoleSpy).toHaveBeenCalled();

        createObjectURLSpy.mockRestore();
        consoleSpy.mockRestore();
      });

      it('should use fallback base64 if validation fails', () => {
        scene.cache.audio.exists = vi.fn(() => false);
        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        vi.spyOn(scene, 'validateAudioBase64').mockReturnValue(false);

        scene.safeLoadAudioFromBase64('test', 'invalid', 'audio/wav');

        // Should still create blob with fallback
        expect(createObjectURLSpy).toHaveBeenCalled();

        createObjectURLSpy.mockRestore();
      });
    });
  });

  describe('edge cases and regression tests', () => {
    it('should handle empty blob URLs array during cleanup', () => {
      scene._blobUrls = [];
      scene.preload();

      const completeHandler = scene.load.once.mock.calls.find(
        (call) => call[0] === 'complete'
      )?.[1];

      expect(() => {
        if (completeHandler) completeHandler();
      }).not.toThrow();
    });

    it('should handle null texture manager gracefully', () => {
      scene.textures = null;
      expect(() => {
        scene.genTexture('test', 32, 32, () => {});
      }).toThrow();
    });

    it('should generate correct frame numbers for animations', () => {
      const frames = scene.anims.generateFrameNumbers('test', { start: 0, end: 2 });
      expect(frames).toHaveLength(3);
      expect(frames[0]).toEqual({ key: 'test', frame: 0 });
      expect(frames[2]).toEqual({ key: 'test', frame: 2 });
    });

    it('should handle custom frame arrays for animations', () => {
      const frames = scene.anims.generateFrameNumbers('test', { frames: [3, 0] });
      expect(frames).toHaveLength(2);
      expect(frames[0]).toEqual({ key: 'test', frame: 3 });
      expect(frames[1]).toEqual({ key: 'test', frame: 0 });
    });

    it('should not create duplicate textures', () => {
      // Mock exists to return true
      vi.spyOn(scene.textures, 'exists').mockReturnValue(true);

      const makeGraphicsSpy = vi.spyOn(scene.make, 'graphics');

      scene.genTexture('duplicate_test', 32, 32, () => {});

      expect(makeGraphicsSpy).not.toHaveBeenCalled();
    });
  });
});
