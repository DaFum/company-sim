export default class SoundManager {
  constructor(scene) {
    this.scene = scene;
    this.isMuted = false;
  }

  play(key, config = {}) {
    if (this.isMuted) return;

    // Check if sound exists
    if (this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key, config);
    }
  }

  setMute(muted) {
    this.isMuted = muted;
    this.scene.sound.mute = muted;
  }
}
