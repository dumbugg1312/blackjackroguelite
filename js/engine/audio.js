// audio.js — WebAudio synthesized SFX. Context created on first user gesture. Mute persisted.

const MUTE_KEY = 'house.muted';

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
    this.drone = null;
    this._armed = false;
  }

  // call on first user gesture
  arm() {
    if (this._armed) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
      this._armed = true;
    } catch (e) { /* audio unavailable */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime, 0.02);
    if (this.muted) this.stopDrone();
    return this.muted;
  }

  _now() { return this.ctx.currentTime; }

  _env(node, t0, attack, decay, peak = 1, sustain = 0) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t0 + attack + decay);
    node.connect(g);
    g.connect(this.master);
    return g;
  }

  _noise(dur) {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // card slide — filtered noise swish
  cardSlide() {
    if (!this._armed || this.muted) return;
    const t = this._now();
    const src = this._noise(0.22);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(1200, t);
    bp.frequency.exponentialRampToValueAtTime(3400, t + 0.18);
    bp.Q.value = 0.8;
    src.connect(bp);
    const g = this._env(bp, t, 0.01, 0.2, 0.28);
    src.start(t); src.stop(t + 0.24);
  }

  // chip clink — metallic FM ping
  chip() {
    if (!this._armed || this.muted) return;
    const t = this._now();
    const car = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const mg = this.ctx.createGain();
    car.frequency.value = 2100; mod.frequency.value = 3300;
    mg.gain.value = 900;
    mod.connect(mg); mg.connect(car.frequency);
    const g = this._env(car, t, 0.002, 0.16, 0.3);
    car.start(t); mod.start(t); car.stop(t + 0.18); mod.stop(t + 0.18);
  }

  // damage thud — low sine + noise burst
  thud(magnitude = 1) {
    if (!this._armed || this.muted) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.28);
    const g = this._env(o, t, 0.004, 0.3, Math.min(0.9, 0.4 + magnitude * 0.05));
    o.start(t); o.stop(t + 0.32);
    // noise crack
    const n = this._noise(0.12);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    n.connect(lp); this._env(lp, t, 0.002, 0.1, 0.3);
    n.start(t); n.stop(t + 0.12);
  }

  // blackjack chord — minor->major lift
  blackjack() {
    if (!this._armed || this.muted) return;
    const t = this._now();
    const freqs = [261.6, 311.1, 392.0]; // Cm
    const maj = [261.6, 329.6, 392.0];   // C
    freqs.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(maj[i], t + 0.25);
      const g = this._env(o, t + i * 0.02, 0.02, 0.7, 0.22, 0.05);
      o.start(t); o.stop(t + 0.85);
    });
  }

  win() {
    if (!this._armed || this.muted) return;
    const t = this._now();
    [392.0, 523.25].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      this._env(o, t + i * 0.06, 0.01, 0.3, 0.18);
      o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.32);
    });
  }

  coin() {
    if (!this._armed || this.muted) return;
    this.chip();
  }

  // boss drone — sustained detuned low
  startDrone() {
    if (!this._armed || this.muted || this.drone) return;
    const t = this._now();
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 1.5);
    g.connect(this.master);
    const oscs = [];
    [55, 55.4, 82.5].forEach((f) => {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
      o.connect(lp); lp.connect(g);
      o.start(t); oscs.push(o);
    });
    this.drone = { g, oscs };
  }
  stopDrone() {
    if (!this.drone) return;
    const t = this._now ? this._now() : 0;
    try {
      this.drone.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
      const d = this.drone;
      setTimeout(() => d.oscs.forEach((o) => { try { o.stop(); } catch (e) {} }), 1200);
    } catch (e) {}
    this.drone = null;
  }

  bossSting() {
    if (!this._armed || this.muted) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.6);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    o.connect(lp);
    this._env(lp, t, 0.01, 0.7, 0.5);
    o.start(t); o.stop(t + 0.75);
  }
}
