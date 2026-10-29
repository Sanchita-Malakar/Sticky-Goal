// Web Audio API Synthesizer for Sticky Goal
// Produces tactile, realistic, and delightful audio cues without external audio files

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.8;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(val) {
    this.enabled = !!val;
  }

  playCheck() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.08); // A5

    gain.gain.setValueAtTime(0.2 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  playUncheck() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.09);

    gain.gain.setValueAtTime(0.15 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  playFold() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Paper rustle / white noise filter sweep
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + 0.08);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  playGentle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Peaceful 3-tone marimba chime (E5, G#5, B5, E6)
    const notes = [659.25, 830.61, 987.77, 1318.51];
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25 * this.volume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.6);
    });
  }

  playBell() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Harmonic bell with rich decay
    const t = this.ctx.currentTime;
    const baseFreq = 784; // G5
    const harmonics = [1, 2.01, 2.76, 4.05];
    const weights = [0.35, 0.2, 0.12, 0.06];

    harmonics.forEach((h, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * h, t);

      gain.gain.setValueAtTime(weights[i] * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 1.2);
    });
  }

  playUrgentAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Urgent double pulse for deadlines
    const t = this.ctx.currentTime;
    [0, 0.16].forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pulseTime = t + delay;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, pulseTime); // C6

      gain.gain.setValueAtTime(0.3 * this.volume, pulseTime);
      gain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.13);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(pulseTime);
      osc.stop(pulseTime + 0.13);
    });
  }

  playCelebration() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Joyful upward arpeggio fanfare (C5, E5, G5, C6, G6, C7)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1567.98, 2093.00];
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.06;

      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const dur = idx === notes.length - 1 ? 0.8 : 0.25;
      gain.gain.setValueAtTime(0.28 * this.volume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + dur);
    });
  }

  playWake() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Radiant welcome sunrise chord (C4, G4, C5, E5, G5, B5, C6)
    const notes = [261.63, 392.00, 523.25, 659.25, 783.99, 987.77, 1046.50];
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.24 * this.volume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 1.4);
    });
  }

  playHourlyNudge() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Friendly 2-tone mindfulness chime (E5 -> A5)
    const notes = [659.25, 880.00];
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.22;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.28 * this.volume, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.9);
    });
  }

  playPop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Sweet bubble pop / paper rustle tap
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

    gain.gain.setValueAtTime(0.3 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  play(type) {
    switch (type) {
      case 'wake':
      case 'welcome':
        this.playWake();
        break;
      case 'hourly':
      case 'nudge':
        this.playHourlyNudge();
        break;
      case 'pop':
        this.playPop();
        break;
      case 'check':
        this.playCheck();
        break;
      case 'uncheck':
        this.playUncheck();
        break;
      case 'fold':
        this.playFold();
        break;
      case 'bell':
        this.playBell();
        break;
      case 'alert':
      case 'urgent':
        this.playUrgentAlert();
        break;
      case 'celebration':
      case 'complete':
        this.playCelebration();
        break;
      case 'gentle':
      default:
        this.playGentle();
        break;
    }
  }
}

if (typeof window !== 'undefined') {
  window.SoundEngine = new SoundEngine();
}
if (typeof module !== 'undefined') {
  module.exports = SoundEngine;
}
