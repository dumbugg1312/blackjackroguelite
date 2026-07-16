// tween.js — minimal tween/timeline engine, respects global time-scale (hit-stop)

const EASE = {
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  linear: (t) => t,
  // approximation of cubic-bezier(0.16,1,0.3,1)
  expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

class Tween {
  constructor(dur, onUpdate, ease, onComplete) {
    this.dur = Math.max(0.0001, dur);
    this.onUpdate = onUpdate;
    this.ease = ease || EASE.expo;
    this.onComplete = onComplete;
    this.t = 0;
    this.done = false;
  }
  advance(dt) {
    if (this.done) return;
    this.t += dt;
    let p = Math.min(1, this.t / this.dur);
    this.onUpdate(this.ease(p), p);
    if (p >= 1) { this.done = true; if (this.onComplete) this.onComplete(); }
  }
}

export class TweenManager {
  constructor() {
    this.tweens = [];
    this.timeScale = 1;
    this._timers = []; // {remaining, cb, unscaled}
  }
  add(dur, onUpdate, ease, onComplete) {
    const tw = new Tween(dur, onUpdate, ease, onComplete);
    this.tweens.push(tw);
    return tw;
  }
  // convenience: run cb after `delay` seconds (scaled by timeScale unless unscaled)
  after(delay, cb, unscaled = false) {
    const timer = { remaining: delay, cb, unscaled };
    this._timers.push(timer);
    return timer;
  }
  update(dtReal) {
    const dt = dtReal * this.timeScale;
    for (const tw of this.tweens) tw.advance(dt);
    this.tweens = this.tweens.filter((t) => !t.done);

    for (const timer of this._timers) {
      timer.remaining -= timer.unscaled ? dtReal : dt;
      if (timer.remaining <= 0) timer.cb();
    }
    this._timers = this._timers.filter((t) => t.remaining > 0);
  }
  clear() { this.tweens = []; this._timers = []; }
}

export { EASE };

// Promise helper for sequencing combat animations against real time.
export function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
