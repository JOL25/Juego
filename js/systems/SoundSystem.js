import { AUDIO } from '../config.js';

// Original chip-style effects, synthesized once and reused; no downloads needed.
const EFFECTS = {
  ray: { cooldown: 0.12, priority: true, notes: [[0, 0.18, 1760, 220, 0.22], [0.025, 0.12, 880, 110, 0.1]] },
  rocket: { cooldown: 0.12, priority: true, notes: [[0, 0.24, 90, 720, 0.24, 'noise']] },
  explosion: { cooldown: 0.09, priority: true, notes: [[0, 0.27, 110, 28, 0.3, 'noise'], [0, 0.15, 65, 32, 0.12]] },
  ult_pierce_shot: { cooldown: 0.2, priority: true, notes: [[0, 0.09, 330, 1320, 0.24], [0.07, 0.32, 1760, 110, 0.28], [0.09, 0.2, 110, 45, 0.13, 'noise']] },
  ult_wave: { cooldown: 0.25, priority: true, notes: [[0, 0.45, 180, 30, 0.3, 'noise'], [0.06, 0.3, 90, 35, 0.17], [0.18, 0.25, 65, 28, 0.1, 'noise']] },
  ult_orbit_laser: { cooldown: 0.25, priority: true, notes: [[0, 0.12, 220, 880, 0.22], [0.1, 0.14, 880, 440, 0.21], [0.22, 0.14, 660, 1320, 0.19], [0.34, 0.2, 1320, 660, 0.17]] },
  hit: { cooldown: 0.045, notes: [[0, 0.065, 210, 65, 0.24, 'noise']] },
  defeat: { cooldown: 0.07, notes: [[0, 0.09, 330, 150, 0.23], [0.065, 0.11, 150, 45, 0.2, 'noise']] },
  xp: { cooldown: 0.045, notes: [[0, 0.045, 1047, 1047, 0.14], [0.04, 0.07, 1568, 1568, 0.12]] },
  levelUp: { cooldown: 0.3, priority: true, notes: [[0, 0.11, 523, 523, 0.24], [0.1, 0.11, 659, 659, 0.24], [0.2, 0.11, 784, 784, 0.24], [0.3, 0.28, 1047, 1047, 0.22]] },
  powerUp: { cooldown: 0.15, priority: true, notes: [[0, 0.075, 392, 392, 0.22], [0.07, 0.075, 523, 523, 0.22], [0.14, 0.075, 784, 784, 0.22], [0.21, 0.18, 1175, 1175, 0.2]] },
};

export class SoundSystem {
  constructor(createContext = () => {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    return Context ? new Context() : null;
  }) {
    this.createContext = createContext;
    this.context = null;
    this.buffers = new Map();
    this.lastPlayed = new Map();
    this.voices = new Set();
    this.muted = false;
    try { this.muted = localStorage.getItem('vs_clone_muted') === 'true'; } catch { /* Storage is optional. */ }
  }

  // Called from a user gesture, including subsequent gestures after tab suspension.
  unlock() {
    try {
      if (!this.context) {
        this.context = this.createContext();
        if (!this.context) return;
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : AUDIO.volume;
        this.master.connect(this.context.destination);
        for (const [name, effect] of Object.entries(EFFECTS)) {
          this.buffers.set(name, this._synthesize(effect.notes));
        }
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Audio unavailable: gameplay still works. */ }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : AUDIO.volume, this.context.currentTime, 0.01);
    if (this.muted) this.stopAll();
    try { localStorage.setItem('vs_clone_muted', String(this.muted)); } catch { /* Storage is optional. */ }
  }

  play(name) {
    const effect = EFFECTS[name];
    if (!effect || this.muted || this.context?.state !== 'running' || !this.buffers.has(name)) return false;
    const now = this.context.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -Infinity) < effect.cooldown) return false;
    if (this.voices.size >= AUDIO.maxVoices) {
      if (!effect.priority) return false;
      const oldest = this.voices.values().next().value;
      oldest.stop();
      this.voices.delete(oldest);
    }
    const source = this.context.createBufferSource();
    source.buffer = this.buffers.get(name);
    source.connect(this.master);
    source.onended = () => { this.voices.delete(source); source.disconnect(); };
    this.voices.add(source);
    this.lastPlayed.set(name, now);
    source.start();
    return true;
  }

  stopAll() {
    for (const source of this.voices) source.stop();
    this.voices.clear();
    this.lastPlayed.clear();
  }

  _synthesize(notes) {
    const rate = this.context.sampleRate;
    const duration = Math.max(...notes.map(([start, length]) => start + length));
    const buffer = this.context.createBuffer(1, Math.ceil(duration * rate), rate);
    const data = buffer.getChannelData(0);
    for (const [start, length, from, to, volume, type] of notes) {
      let phase = 0;
      let noise = 0;
      const offset = Math.floor(start * rate);
      for (let i = 0; i < Math.floor(length * rate) && offset + i < data.length; i++) {
        const t = i / rate;
        const progress = t / length;
        // Stepped pitch, square waves and held noise evoke classic sound chips.
        const frequency = from * Math.pow(to / from, Math.floor(progress * 12) / 12);
        phase += frequency / rate;
        if (i % 6 === 0) noise = Math.random() * 2 - 1;
        const square = phase % 1 < 0.5 ? 1 : -1;
        const wave = type === 'noise' ? square * 0.5 + noise * 0.5 : square;
        const envelope = Math.min(1, t / 0.003) * Math.pow(1 - progress, 1.5);
        data[offset + i] += wave * volume * envelope;
      }
    }
    return buffer;
  }
}
