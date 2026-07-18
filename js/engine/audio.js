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
      // music bus (score + room tone) — duckable under impacts
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 1;
      this.musicBus.connect(this.master);
      this._armed = true;
      this._startRoomTone();
    } catch (e) { /* audio unavailable */ }
  }

  // ---- constant near-silent room: air + faint rumble (silence = webpage) ----
  _startRoomTone() {
    const t = this._now();
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { // brown-ish noise
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.028, t + 3);
    src.connect(lp); lp.connect(g); g.connect(this.musicBus);
    src.start(t);
  }

  // ---- score: a slow, broken music-box waltz in C minor, layered by intensity ----
  // startMusic(level): 1 = parlors, 2 = deeper acts (adds a low pedal swell)
  startMusic(level = 1) {
    if (!this._armed || this.music) return;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this._now());
    g.gain.exponentialRampToValueAtTime(0.16, this._now() + 2.2);
    g.connect(this.musicBus);
    this.music = { g, level, step: 0, timer: null };
    const C3 = 130.81;
    const minor = [1, 6 / 5, 3 / 2, 2, 12 / 5, 3];           // C Eb G C Eb G
    const bass = [C3 / 2, C3 / 2 * 6 / 5, C3 / 2 * 3 / 4];   // C2 Eb2 G1
    const beat = 60 / 66;                                     // ~66bpm waltz
    const tick = () => {
      if (!this.music) return;
      const m = this.music;
      const t = this._now() + 0.05;
      const bar = Math.floor(m.step / 3), inBar = m.step % 3;
      if (inBar === 0) this._pluck(g, bass[bar % 3], t, 0.5, beat * 2.6, 'sine');
      // music-box voice: sparse, hesitant — skips beats like a dying mechanism
      if ((m.step * 7 + bar) % 5 !== 0) {
        const n = minor[(m.step * 3 + bar * 2) % minor.length];
        this._pluck(g, C3 * 2 * n, t + (inBar ? 0.02 : 0.08), 0.16, beat * 1.4, 'triangle');
      }
      if (m.level >= 2 && inBar === 0 && bar % 4 === 0) this._pluck(g, C3 / 4, t, 0.4, beat * 5, 'sine');
      m.step++;
      m.timer = setTimeout(tick, beat * 1000);
    };
    tick();
  }
  stopMusic() {
    if (!this.music) return;
    const m = this.music;
    this.music = null;
    clearTimeout(m.timer);
    try {
      m.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.6);
      setTimeout(() => { try { m.g.disconnect(); } catch (e) {} }, 2500);
    } catch (e) {}
  }
  _pluck(dest, freq, t, peak, dur, type) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    o.detune.value = (Math.random() - 0.5) * 7; // aged, slightly off pitch
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // duck the score so impacts punch through the mix
  duck(amount = 0.35, ms = 220) {
    if (!this._armed || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(amount, t);
    this.musicBus.gain.linearRampToValueAtTime(1, t + ms / 1000);
  }

  // ---- micro-interactions ----
  hover() {
    if (!this._armed || this.muted) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = 2600;
    this._env(o, t, 0.001, 0.035, 0.045);
    o.start(t); o.stop(t + 0.05);
  }
  press() {
    if (!this._armed || this.muted) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    o.type = 'square'; o.frequency.setValueAtTime(340, t);
    o.frequency.exponentialRampToValueAtTime(190, t + 0.06);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    o.connect(lp);
    this._env(lp, t, 0.002, 0.07, 0.14);
    o.start(t); o.stop(t + 0.09);
  }

  // the held breath before the hole card turns
  holeNote() {
    if (!this._armed || this.muted) return;
    const t = this._now();
    [98, 103.8].forEach((f) => { // G2 + detuned rub
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      this._env(o, t, 0.05, 0.7, 0.16);
      o.start(t); o.stop(t + 0.8);
    });
  }

  // low-HP heartbeat: lub-dub loop
  setHeartbeat(on) {
    if (on && !this._hb && this._armed) {
      const beat = () => {
        if (!this._hb) return;
        if (!this.muted) {
          const t = this._now();
          [[0, 0.5], [0.22, 0.34]].forEach(([dt, peak]) => {
            const o = this.ctx.createOscillator();
            o.type = 'sine';
            o.frequency.setValueAtTime(64, t + dt);
            o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.14);
            this._env(o, t + dt, 0.005, 0.16, peak);
            o.start(t + dt); o.stop(t + dt + 0.2);
          });
        }
        this._hb = setTimeout(beat, 1150);
      };
      this._hb = setTimeout(beat, 0);
    } else if (!on && this._hb) {
      clearTimeout(this._hb);
      this._hb = null;
    }
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
    this.duck(0.3, 260);
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
