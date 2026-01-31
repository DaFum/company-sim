/**
 * Manages audio playback and global mute state.
 */
export default class SoundManager {
  /**
   * Creates a new SoundManager.
   * @param {Phaser.Scene} scene - The Phaser scene instance.
   */
  constructor(scene) {
    this.scene = scene;
    this.isMuted = false;
  }

  /**
   * Plays a sound effect if not muted.
   * @param {string} key - The key of the audio asset.
   * @param {Object} [config={}] - Optional playback configuration (volume, loop, etc.).
   */
  play(key, config = {}) {
    if (this.isMuted) return;

    // Check if sound exists
    if (this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key, config);
    }
  }

  /**
   * Sets the global mute state.
   * @param {boolean} muted - Whether to mute all sounds.
   */
  setMute(muted) {
    this.isMuted = muted;
    this.scene.sound.mute = muted;
  }
}
