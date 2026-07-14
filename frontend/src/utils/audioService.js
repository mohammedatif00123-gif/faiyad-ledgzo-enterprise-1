class AudioService {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTone(frequency, type, duration, vol = 0.1) {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;

    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

    gainNode.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    oscillator.start();
    oscillator.stop(this.audioCtx.currentTime + duration);
  }

  playConnectSound() {
    this.init();
    // A pleasant ascending double tone
    this.playTone(440, 'sine', 0.1, 0.1); // A4
    setTimeout(() => this.playTone(659.25, 'sine', 0.2, 0.1), 100); // E5
  }

  playDisconnectSound() {
    this.init();
    // A descending double tone
    this.playTone(659.25, 'sine', 0.1, 0.1); // E5
    setTimeout(() => this.playTone(440, 'sine', 0.2, 0.1), 100); // A4
  }

  playErrorSound() {
    this.init();
    this.playTone(300, 'square', 0.2, 0.05);
    setTimeout(() => this.playTone(300, 'square', 0.2, 0.05), 250);
  }
}

export const audioService = new AudioService();
