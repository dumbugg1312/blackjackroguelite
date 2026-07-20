// run.js — run state, save/load, persistent stats.

import { RNG, randomSeed } from '../engine/rng.js';
import { makeStandardDeck, makeCard, makeDebtCard, ensureCardId } from './cards.js';
import { RELIC_BY_ID } from './relics.js';
import { loadPerks, perkRank, creditForRun } from './perks.js';

const SAVE_KEY = 'house.save.v1';
const STATS_KEY = 'house.stats.v1';
// Save schema version. Bumped when run serialization changes incompatibly. Old saves
// are detected on load and cleared gracefully (lifetime stats live under STATS_KEY and
// are untouched). Title copy on a wipe: "The House has rearranged the furniture."
const SAVE_VERSION = 2;

export class Run {
  constructor(seed) {
    this.seed = seed || randomSeed();
    this.rng = new RNG(this.seed);
    this.floor = 0;              // last cleared floor (0 = not started)
    this.maxHp = 70;
    this.hp = 70;
    this.chips = 0;
    this.deck = makeStandardDeck();
    this.relics = [];           // relic ids
    this.charms = [null, null, null]; // charm ids
    this.doors = null;          // current landing options
    this.houseWhisper = null;   // Voice-of-the-House line shown on the current landing
    this.location = 'landing';  // where Continue resumes
    this.pendingRoom = null;    // { type, floor }
    this.stats = { damageDealt: 0, handsWon: 0, handsPlayed: 0, biggestHand: 0, floorsCleared: 0 };

    // ---- SPEC2 systems state (all serialized) ----
    this.heat = 0;              // win-streak momentum (A1); synced from combat like hp
    this.activeStake = null;    // id of the stake in play on the current hand (A4)
    this.songs = [];            // Lounge song buffs: [{ id, fights }] (§C The Lounge)
    this.loungeActs = [];       // act numbers whose Lounge has been used (one per act)
    // Story arc state (js/game/story.js owns the semantics; serialized whole).
    // actSeen: interstitial acts shown; weepingBride 0/1/2; conciergeStage 0..3;
    // openingSeen, confessionSeen: once-per-run beat guards; ringId: the Ring card's id;
    // ringKept: player kept & upgraded the Ring; whisperSeen: no-repeat whisper indices.
    this.arc = { actSeen: [], weepingBride: 0, conciergeStage: 0, openingSeen: false, confessionSeen: false, ringId: null, ringKept: false, whisperSeen: { 1: [], 2: [], 3: [] } };
    this.heirloom = null;       // Pawnbroker heirloom relic chosen for this descent (§E)

    // Standing Ledger perks (persistent, bought with Credit at the Pawnbroker).
    // Flat start-of-run effects apply here; ongoing effects read perkRank at their site.
    const perks = loadPerks();
    const fat = perkRank('candlefat', perks);
    if (fat) { this.maxHp += fat * 5; this.hp = this.maxHp; }
    this.chips += perkRank('walking_in_money', perks) * 25;
  }

  // ---- flags / relics ----
  hasRelic(id) { return this.relics.includes(id); }
  addRelic(id) {
    if (this.hasRelic(id)) return false;
    this.relics.push(id);
    const r = RELIC_BY_ID[id];
    if (r && r.onPickup) r.onPickup(this);
    return true;
  }
  removeRelic(id) { this.relics = this.relics.filter((r) => r !== id); }

  // read a boolean/value flag from any owned relic
  hasFlag(name) {
    for (const id of this.relics) {
      const r = RELIC_BY_ID[id];
      if (r && r.flags && r.flags[name]) return r.flags[name];
    }
    return false;
  }
  shopMult() {
    let m = 1;
    for (const id of this.relics) {
      const r = RELIC_BY_ID[id];
      if (r && r.flags && r.flags.shopMult) m *= r.flags.shopMult;
    }
    m *= 1 - 0.05 * perkRank('crooked_deal'); // Standing Ledger perk
    return m;
  }

  // ---- charms ----
  freeCharmSlot() { return this.charms.indexOf(null); }
  addCharm(id) {
    const i = this.freeCharmSlot();
    if (i < 0) return false;
    this.charms[i] = id;
    return true;
  }
  consumeCharm(index) { this.charms[index] = null; }

  // ---- deck ops ----
  addCard(card) { this.deck.push(card); }
  addDebt() { this.deck.push(makeDebtCard()); }
  removeCard(id) { this.deck = this.deck.filter((c) => c.id !== id); }
  duplicateCard(card) {
    const copy = makeCard(card.rank, card.suit, card.ench);
    copy.sharpDelta = card.sharpDelta;
    copy.dead = card.dead;
    this.deck.push(copy);
    return copy;
  }
  findCard(id) { return this.deck.find((c) => c.id === id); }

  // ---- The Weeping Bride's Ring (SPEC2 §B) ----
  // A Gilded 5♦ named "the Ring". Kept-and-upgraded, it also gains Bloodstained (+4 dmg
  // in winning hands via card.ringUp — see enchants.enchantDamageBonus).
  addRingCard() {
    const c = makeCard('5', 'D', 'gilded');
    c.ring = true;
    this.deck.push(c);
    this.arc.ringId = c.id;
    return c;
  }
  ringCard() { return this.arc.ringId != null ? this.findCard(this.arc.ringId) : this.deck.find((c) => c.ring); }
  hasRingCard() { return !!this.ringCard(); }
  removeRingCard() { const r = this.ringCard(); if (r) { this.removeCard(r.id); this.arc.ringId = null; return true; } return false; }
  upgradeRingCard() { const r = this.ringCard(); if (r) { r.ringUp = true; this.arc.ringKept = true; return true; } return false; }

  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
  damage(n) { this.hp = Math.max(0, this.hp - n); }

  // ---- Heat (A1) ----
  heatCap() { return (this.hasFlag('heatCap') || 5) + (perkRank('old_flame') ? 1 : 0); }

  // Post-fight heal amount (§C base 6, plus Needle & Thread ranks).
  postFightHeal() { return 6 + perkRank('needle_thread') * 2; }

  // ---- Lounge songs (§C) ----
  hasSong(id) { return this.songs.some((s) => s.id === id && s.fights > 0); }
  addSong(id) {
    const fights = this.hasFlag('songFights') || 3; // Concierge's Key extends to 5
    this.songs = this.songs.filter((s) => s.id !== id);
    this.songs.push({ id, fights });
  }
  // Tick song durations down after a cleared fight; drop the exhausted ones.
  tickSongs() { this.songs = this.songs.map((s) => ({ id: s.id, fights: s.fights - 1 })).filter((s) => s.fights > 0); }

  // ---- persistence ----
  save() {
    try {
      const data = {
        v: SAVE_VERSION,
        seed: this.seed,
        rng: this.rng.save(),
        floor: this.floor, maxHp: this.maxHp, hp: this.hp, chips: this.chips,
        deck: this.deck.map((c) => ({ id: c.id, rank: c.rank, suit: c.suit, ench: c.ench, sharpDelta: c.sharpDelta, dead: c.dead, ring: c.ring, ringUp: c.ringUp })),
        relics: this.relics, charms: this.charms,
        doors: this.doors, houseWhisper: this.houseWhisper, location: this.location, pendingRoom: this.pendingRoom,
        stats: this.stats,
        // SPEC2 systems
        heat: this.heat, activeStake: this.activeStake,
        songs: this.songs, loungeActs: this.loungeActs, arc: this.arc, heirloom: this.heirloom,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* storage full / disabled */ }
  }

  static hasSave() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try { const d = JSON.parse(raw); return (d.v || 1) === SAVE_VERSION; }
    catch (e) { return false; }
  }

  // True when a save exists but is from an incompatible older schema. The title
  // screen uses this to show "The House has rearranged the furniture." then clears it.
  static hasStaleSave() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try { const d = JSON.parse(raw); return (d.v || 1) !== SAVE_VERSION; }
    catch (e) { return true; } // unparseable => stale/corrupt
  }

  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      // Incompatible schema: refuse to load; caller clears it. Lifetime stats (STATS_KEY) are untouched.
      if ((d.v || 1) !== SAVE_VERSION) return null;
      const run = new Run(d.seed);
      run.rng = RNG.restore(d.rng);
      run.floor = d.floor; run.maxHp = d.maxHp; run.hp = d.hp; run.chips = d.chips;
      run.deck = d.deck.map((c) => ({ ...c }));
      let maxId = 0;
      for (const c of run.deck) if (c.id > maxId) maxId = c.id;
      ensureCardId(maxId);
      run.relics = d.relics || [];
      run.charms = d.charms || [null, null, null];
      run.doors = d.doors || null;
      run.houseWhisper = d.houseWhisper || null;
      run.location = d.location || 'landing';
      run.pendingRoom = d.pendingRoom || null;
      run.stats = d.stats || run.stats;
      // SPEC2 systems (tolerant of any partial field)
      run.heat = d.heat || 0;
      run.activeStake = d.activeStake || null;
      run.songs = Array.isArray(d.songs) ? d.songs : [];
      run.loungeActs = Array.isArray(d.loungeActs) ? d.loungeActs : [];
      run.arc = d.arc || { actSeen: [], weepingBride: 0, conciergeStage: 0, openingSeen: false, confessionSeen: false, ringId: null, ringKept: false, whisperSeen: { 1: [], 2: [], 3: [] } };
      run.heirloom = d.heirloom || null;
      return run;
    } catch (e) { return null; }
  }

  static clearSave() { localStorage.removeItem(SAVE_KEY); }

  // ---- persistent lifetime stats ----
  // Fields: runs, wins (Escapes), inheritances (Chair endings), bestFloor (deepest),
  // handsWon (lifetime total), biggestHit (biggest single blow), diedOnce (Pawnbroker unlock),
  // credit (Pawnbroker meta-currency, earned at run end, spent on Standing Ledger perks).
  static loadStats() {
    const base = { runs: 0, wins: 0, inheritances: 0, bestFloor: 0, handsWon: 0, biggestHit: 0, diedOnce: false, credit: 0 };
    try { return Object.assign(base, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); }
    catch (e) { return base; }
  }
  static saveStats(s) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {} }

  // Record the end of a run. ending: 'escape' | 'inheritance' | null (death).
  static recordRun(won, floorReached, run = null, ending = null) {
    const s = Run.loadStats();
    s.runs += 1;
    if (won) {
      if (ending === 'inheritance') s.inheritances += 1;
      else s.wins += 1; // default victory counts as an Escape
    } else {
      s.diedOnce = true; // unlocks the Pawnbroker on the next New Descent
    }
    if (floorReached > s.bestFloor) s.bestFloor = floorReached;
    if (run && run.stats) {
      s.handsWon += run.stats.handsWon || 0;
      if ((run.stats.biggestHand || 0) > s.biggestHit) s.biggestHit = run.stats.biggestHand;
    }
    // The Pawnbroker credits your account for the run — deeper and better-played pays more.
    const earned = creditForRun(won, floorReached, run);
    s.credit = (s.credit || 0) + earned;
    Run.saveStats(s);
    // creditEarned rides on the returned object only (never persisted) for end screens.
    return Object.assign({}, s, { creditEarned: earned });
  }

  // Spend Pawnbroker credit; returns the new balance or null if insufficient.
  static spendCredit(n) {
    const s = Run.loadStats();
    if ((s.credit || 0) < n) return null;
    s.credit -= n;
    Run.saveStats(s);
    return s.credit;
  }
}
