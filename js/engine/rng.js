// rng.js — deterministic seeded RNG (mulberry32) + helpers

export function hashSeed(str) {
  // xmur3 string -> 32-bit seed
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export class RNG {
  constructor(seed) {
    this.seedStr = String(seed);
    this.state = hashSeed(this.seedStr);
    this.calls = 0;
  }
  // mulberry32
  next() {
    this.calls++;
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // float in [min,max)
  range(min, max) { return min + this.next() * (max - min); }
  // int in [min,max] inclusive
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  // pick a random element
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  // weighted pick: items [{item, weight}]
  weighted(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = this.next() * total;
    for (const it of items) { r -= it.weight; if (r <= 0) return it.item; }
    return items[items.length - 1].item;
  }
  chance(p) { return this.next() < p; }
  // Fisher-Yates in place
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  // pick n distinct
  sample(arr, n) {
    const copy = arr.slice();
    this.shuffle(copy);
    return copy.slice(0, Math.min(n, copy.length));
  }
  // serialize / restore
  save() { return { state: this.state, seedStr: this.seedStr, calls: this.calls }; }
  static restore(data) {
    const r = new RNG(data.seedStr);
    r.state = data.state; r.calls = data.calls;
    return r;
  }
}

export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff).toString(36).toUpperCase();
}
