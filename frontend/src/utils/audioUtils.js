class AudioService {
  constructor() {
    this.audioCtx = null;
    this.ringInterval = null;
    this.ringingInterval = null;
    this.oscNodes = [];
  }

  getContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (browser autoplay policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  stopAll() {
    if (this.ringInterval) clearInterval(this.ringInterval);
    if (this.ringingInterval) clearInterval(this.ringingInterval);
    this.ringInterval = null;
    this.ringingInterval = null;
    this.oscNodes.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    this.oscNodes = [];
  }

  // Receiver end: UK/Euro style double ring (0.4s on, 0.2s off, 0.4s on, 2s off)
  playRingtone() {
    this.stopAll();
    const ctx = this.getContext();
    const playRing = () => {
      this._playTone(400, 450, 0.4);
      setTimeout(() => this._playTone(400, 450, 0.4), 600);
    };
    playRing();
    this.ringInterval = setInterval(playRing, 3000);
  }

  // Caller end: US style ringing (2s on, 4s off)
  playRingingSound() {
    this.stopAll();
    const ctx = this.getContext();
    const playRinging = () => {
      this._playTone(440, 480, 2);
    };
    playRinging();
    this.ringingInterval = setInterval(playRinging, 6000);
  }

  // Play a soft pleasant ping for new messages
  playNotificationSound() {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Frequency slide down
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
    
    // Volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  // Call Answered (Connect): two quick high pitch beeps
  playConnectSound() {
    this.stopAll();
    this._playBeep(800, 0.1);
    setTimeout(() => this._playBeep(1000, 0.15), 150);
  }

  // Call Ended (Disconnect): three quick low pitch beeps
  playDisconnectSound() {
    this.stopAll();
    this._playBeep(300, 0.15);
    setTimeout(() => this._playBeep(300, 0.15), 250);
    setTimeout(() => this._playBeep(300, 0.2), 500);
  }

  _playTone(freq1, freq2, duration) {
    const ctx = this.getContext();
    const gain = ctx.createGain();
    gain.gain.value = 0.1;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    
    osc1.frequency.value = freq1;
    osc2.frequency.value = freq2;
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    
    this.oscNodes.push(osc1, osc2);
    
    setTimeout(() => {
      try {
        osc1.stop();
        osc2.stop();
        this.oscNodes = this.oscNodes.filter(n => n !== osc1 && n !== osc2);
      } catch(e) {}
    }, duration * 1000);
  }

  _playBeep(freq, duration) {
    const ctx = this.getContext();
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

export const audioUtils = new AudioService();
