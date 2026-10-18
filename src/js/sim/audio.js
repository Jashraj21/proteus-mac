/**
 * Web Audio Engine for Piezo Buzzers and Sound Effects
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startBuzzer(freq = 2400) {
    this.init();
    if (!this.ctx || this.isPlaying) return;

    try {
      this.osc = this.ctx.createOscillator();
      this.gain = this.ctx.createGain();

      this.osc.type = 'square';
      this.osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Low volume for comfortable buzzer sound
      this.gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.osc.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.osc.start();
      this.isPlaying = true;
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  stopBuzzer() {
    if (!this.isPlaying || !this.osc) return;
    try {
      this.osc.stop();
      this.osc.disconnect();
      this.isPlaying = false;
      this.osc = null;
    } catch (e) {}
  }
}

const soundEngine = new SoundEngine();
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { soundEngine };
}
