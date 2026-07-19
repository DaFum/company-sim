import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import SoundManager from '../SoundManager';

describe('SoundManager', () => {
  let sceneMock;
  let soundManager;

  beforeEach(() => {
    sceneMock = {
      cache: {
        audio: {
          exists: vi.fn(),
        },
      },
      sound: {
        play: vi.fn(),
        mute: false,
      },
    };
    soundManager = new SoundManager(sceneMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with isMuted false', () => {
    expect(soundManager.isMuted).toBe(false);
  });

  it('should not play sound if muted', () => {
    soundManager.setMute(true);
    soundManager.play('test-sound');
    expect(sceneMock.sound.play).not.toHaveBeenCalled();
  });

  it('should not play sound if it does not exist in cache', () => {
    sceneMock.cache.audio.exists.mockReturnValue(false);
    soundManager.play('test-sound');
    expect(sceneMock.cache.audio.exists).toHaveBeenCalledWith('test-sound');
    expect(sceneMock.sound.play).not.toHaveBeenCalled();
  });

  it('should play sound if it exists and is not muted', () => {
    sceneMock.cache.audio.exists.mockReturnValue(true);
    const config = { volume: 0.5 };
    soundManager.play('test-sound', config);
    expect(sceneMock.cache.audio.exists).toHaveBeenCalledWith('test-sound');
    expect(sceneMock.sound.play).toHaveBeenCalledWith('test-sound', config);
  });

  it('should update mute state correctly', () => {
    soundManager.setMute(true);
    expect(soundManager.isMuted).toBe(true);
    expect(sceneMock.sound.mute).toBe(true);

    soundManager.setMute(false);
    expect(soundManager.isMuted).toBe(false);
    expect(sceneMock.sound.mute).toBe(false);
  });
});
