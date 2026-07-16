// particles.js — canvas particle system: embers, dust, chip bursts, card shreds

// Read OKLCH tokens as concrete colors for canvas by sampling computed style.
function cssColor(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export class ParticleSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.parts = [];
    this.reduced = false;
    this._colorCache = {};
  }
  color(name, fb) {
    if (!this._colorCache[name]) this._colorCache[name] = cssColor(name, fb);
    return this._colorCache[name];
  }
  clear() { this.parts = []; }

  emitEmber(x, y) {
    this.parts.push({
      type: 'ember', x, y,
      vx: (Math.random() - 0.5) * 8, vy: -12 - Math.random() * 18,
      life: 2 + Math.random() * 2.5, age: 0,
      size: 1 + Math.random() * 2, drift: Math.random() * Math.PI * 2,
      color: Math.random() < 0.5 ? this.color('--accent', '#d9a441') : this.color('--primary', '#c85a86'),
    });
  }
  emitDust(x, y) {
    this.parts.push({
      type: 'dust', x, y,
      vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 2,
      life: 4 + Math.random() * 4, age: 0,
      size: 0.6 + Math.random() * 1.4, drift: Math.random() * Math.PI * 2,
      color: this.color('--muted', '#a08a92'),
    });
  }
  // chip burst — brass coins scattering
  chipBurst(x, y, count = 14, hot = false) {
    if (this.reduced) count = Math.min(count, 4);
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const sp = 90 + Math.random() * 180;
      this.parts.push({
        type: 'chip', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.7 + Math.random() * 0.5, age: 0,
        size: 3 + Math.random() * 3, spin: Math.random() * Math.PI, vspin: (Math.random() - 0.5) * 20,
        gravity: 620,
        color: hot ? this.color('--primary-hot', '#e8506a') : this.color('--accent', '#d9a441'),
      });
    }
  }
  // card shreds — velvet/ivory fragments
  cardShreds(x, y, count = 10) {
    if (this.reduced) count = Math.min(count, 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      this.parts.push({
        type: 'shred', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: 0.8 + Math.random() * 0.6, age: 0,
        w: 4 + Math.random() * 8, h: 6 + Math.random() * 10,
        spin: Math.random() * Math.PI, vspin: (Math.random() - 0.5) * 16,
        gravity: 700,
        color: this.color('--card-face', '#f2ead8'),
      });
    }
  }
  bloodBurst(x, y, count = 16) {
    if (this.reduced) count = Math.min(count, 5);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 220;
      this.parts.push({
        type: 'chip', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: 0.5 + Math.random() * 0.5, age: 0,
        size: 2 + Math.random() * 3, spin: 0, vspin: 0, gravity: 700,
        color: this.color('--primary-hot', '#e8506a'),
      });
    }
  }

  update(dt) {
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.age += dt;
      if (p.age >= p.life) { ps.splice(i, 1); continue; }
      if (p.type === 'ember') {
        p.drift += dt * 2;
        p.x += (p.vx + Math.sin(p.drift) * 6) * dt;
        p.y += p.vy * dt;
        p.vy *= 0.99;
      } else if (p.type === 'dust') {
        p.drift += dt;
        p.x += (p.vx + Math.sin(p.drift) * 3) * dt;
        p.y += p.vy * dt;
      } else {
        // physics particles
        p.vy += (p.gravity || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.spin !== undefined) p.spin += (p.vspin || 0) * dt;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    for (const p of this.parts) {
      const lifeLeft = 1 - p.age / p.life;
      ctx.save();
      if (p.type === 'ember') {
        ctx.globalAlpha = Math.min(1, lifeLeft * 1.5) * 0.9;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'dust') {
        ctx.globalAlpha = lifeLeft * 0.22;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'chip') {
        ctx.globalAlpha = Math.min(1, lifeLeft * 1.4);
        ctx.translate(p.x, p.y); ctx.rotate(p.spin || 0);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * (0.5 + Math.abs(Math.cos(p.spin || 0)) * 0.5), 0, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'shred') {
        ctx.globalAlpha = Math.min(1, lifeLeft * 1.4);
        ctx.translate(p.x, p.y); ctx.rotate(p.spin || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
  }
  get count() { return this.parts.length; }
}
