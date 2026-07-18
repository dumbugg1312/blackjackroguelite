// fx.js — shake, hit-stop, flashes, floating numbers, candle-flicker + ember ambient bg

import { ParticleSystem } from './particles.js';

export class FX {
  constructor(tween) {
    this.tween = tween;
    this.bg = document.getElementById('fx-bg');
    this.fg = document.getElementById('fx-fg');
    this.bgCtx = this.bg.getContext('2d');
    this.fgCtx = this.fg.getContext('2d');
    this.stage = document.getElementById('stage');
    this.flashEl = document.getElementById('flash');
    this.floatLayer = document.getElementById('float-layer');

    this.ambient = new ParticleSystem(this.bgCtx);
    this.burst = new ParticleSystem(this.fgCtx);

    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ambient.reduced = this.reduced;
    this.burst.reduced = this.reduced;

    // shake state
    this.shake = { amp: 0, decay: 0 };
    // hit-stop
    this.hitStopTimer = 0;
    // camera: idle drift + damage punch-in + lethal push-in
    this.camera = { punch: 0, push: 0, pushTarget: 0 };
    this.impactEl = document.getElementById('impact');
    // candle
    this.candle = { intensity: 1, target: 1, x: 0.5, y: 0.42 };
    this.emberAccum = 0;
    this.dustAccum = 0;
    this.time = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.reduced = e.matches; this.ambient.reduced = e.matches; this.burst.reduced = e.matches;
    });
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [this.bg, this.fg]) {
      const r = c.getBoundingClientRect();
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      c._cssW = r.width; c._cssH = r.height;
    }
  }
  get W() { return this.bg._cssW || this.bg.width; }
  get H() { return this.bg._cssH || this.bg.height; }

  // ---- hit-stop: freeze/slow time briefly ----
  hitStop(scale = 0.15, ms = 180) {
    if (this.reduced) return;
    this.tween.timeScale = scale;
    this.hitStopTimer = ms / 1000;
  }

  // ---- shake proportional to magnitude ----
  doShake(magnitude) {
    if (this.reduced) return;
    const amp = Math.min(26, 3 + magnitude * 0.7);
    this.shake.amp = Math.max(this.shake.amp, amp);
    this.shake.decay = amp / 0.4; // decays over ~0.4s
  }

  flash(white = false) {
    if (this.reduced) return;
    this.flashEl.classList.toggle('white', white);
    this.flashEl.classList.remove('fire');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('fire');
  }

  // ---- floating number ----
  floatNumber(x, y, text, cls = 'dmg-enemy', size = 2.4) {
    const el = document.createElement('div');
    el.className = `float-num ${cls}${size >= 3 ? ' big' : ''} rise`;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontSize = size + 'rem';
    this.floatLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  chipBurstAt(x, y, count, hot) { this.burst.chipBurst(x, y, count, hot); }
  cardShredsAt(x, y, count) { this.burst.cardShreds(x, y, count); }
  bloodAt(x, y, count) { this.burst.bloodBurst(x, y, count); }

  // candle re-light dramatic moment (boss phase 2)
  candleFlare() { this.candle.intensity = 2.2; }

  // ---- camera ----
  // brief punch-in on big hits (0..1)
  punchIn(strength = 1) {
    if (this.reduced) return;
    this.camera.punch = Math.max(this.camera.punch, Math.min(1, strength));
  }
  // sustained lean-in while a lethal hand is live
  setLethal(on) {
    this.camera.pushTarget = on && !this.reduced ? 1 : 0;
    this.stage.classList.toggle('lethal', !!on);
  }

  // ---- impact frame: 2-frame white silhouette (kills / crits) ----
  impact() {
    if (this.reduced || !this.impactEl) return;
    this.impactEl.classList.remove('fire');
    void this.impactEl.offsetWidth;
    this.impactEl.classList.add('fire');
  }

  // ---- chromatic-style grade punch on the stage ----
  chroma() {
    if (this.reduced) return;
    this.stage.classList.remove('chroma-pulse');
    void this.stage.offsetWidth;
    this.stage.classList.add('chroma-pulse');
    clearTimeout(this._chromaT);
    this._chromaT = setTimeout(() => this.stage.classList.remove('chroma-pulse'), 180);
  }

  update(dtReal) {
    this.time += dtReal;

    // hit-stop resolution (uses real time)
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dtReal;
      if (this.hitStopTimer <= 0) this.tween.timeScale = 1;
    }

    const dt = dtReal * this.tween.timeScale;

    // camera: decay punch, ease push toward target
    this.camera.punch = Math.max(0, this.camera.punch - dtReal * 3.2);
    this.camera.push += (this.camera.pushTarget - this.camera.push) * Math.min(1, dtReal * 1.4);

    // compose camera (idle drift + punch + push) with shake into one stage transform
    let dx = 0, dy = 0, rot = 0;
    if (this.shake.amp > 0) {
      this.shake.amp = Math.max(0, this.shake.amp - this.shake.decay * dtReal);
      const a = this.shake.amp;
      dx = (Math.random() * 2 - 1) * a;
      dy = (Math.random() * 2 - 1) * a;
      rot = (Math.random() * 2 - 1) * a * 0.12;
    }
    if (!this.reduced) {
      const t = this.time;
      const idleScale = 1.004 + Math.sin(t * 0.22) * 0.004;                       // slow breathing zoom
      const scale = idleScale + this.camera.punch * 0.028 + this.camera.push * 0.03;
      dx += Math.sin(t * 0.13) * 3;                                               // idle pan
      dy += Math.cos(t * 0.1) * 2 - this.camera.push * 6;
      this.stage.style.transformOrigin = '50% 58%';
      this.stage.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
    } else if (dx || dy) {
      this.stage.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (this.stage.style.transform) {
      this.stage.style.transform = '';
    }

    // candle flicker
    if (!this.reduced) {
      this.candle.target = 0.85 + Math.sin(this.time * 7.3) * 0.06 + (Math.random() - 0.5) * 0.12;
    } else {
      this.candle.target = 0.9;
    }
    this.candle.intensity += (this.candle.target - this.candle.intensity) * Math.min(1, dtReal * 6);

    // ambient emission
    if (!this.reduced) {
      this.emberAccum += dtReal;
      const emberEvery = 0.16;
      while (this.emberAccum > emberEvery) {
        this.emberAccum -= emberEvery;
        this.ambient.emitEmber(this.W * (0.35 + Math.random() * 0.3), this.H * 0.6 + Math.random() * 40);
      }
      this.dustAccum += dtReal;
      while (this.dustAccum > 0.5) {
        this.dustAccum -= 0.5;
        this.ambient.emitDust(Math.random() * this.W, Math.random() * this.H);
      }
    }

    this.ambient.update(dt);
    this.burst.update(dt);

    this._drawBg();
    this._drawFg();
  }

  _drawBg() {
    const ctx = this.bgCtx;
    ctx.clearRect(0, 0, this.W, this.H);
    // candlelight pool
    if (!this.reduced || true) {
      const cx = this.W * this.candle.x, cy = this.H * this.candle.y;
      const rad = Math.min(this.W, this.H) * (0.75 + this.candle.intensity * 0.12);
      const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, rad);
      const a = 0.14 * this.candle.intensity;
      g.addColorStop(0, `rgba(217,164,65,${a})`);
      g.addColorStop(0.4, `rgba(200,90,134,${a * 0.4})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    this.ambient.draw();
  }
  _drawFg() {
    const ctx = this.fgCtx;
    ctx.clearRect(0, 0, this.W, this.H);
    this.burst.draw();
  }

  clearBursts() { this.burst.clear(); }
}
