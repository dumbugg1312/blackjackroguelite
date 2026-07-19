// main.js — boot, screen router, RAF loop + time-scale, flow controller, global UI.

import { TweenManager } from './engine/tween.js';
import { FX } from './engine/fx.js';
import { Audio } from './engine/audio.js';
import { Run } from './game/run.js';
import { ENEMIES, BOSSES, makeEnemy } from './game/enemies.js';
import { generateDoors, BOSS_FLOORS } from './game/map.js';
import { EVENTS, pickShrineEvent } from './game/events.js';
import { CHARM_BY_ID } from './game/charms.js';
import { ensureArc, hasActSeen, markActSeen, actOf, drawWhisper, OPENING, INTERSTITIAL, CONFESSION } from './game/story.js';
import { showStoryBeat } from './ui/story-screens.js';

import { renderTitle } from './ui/title.js';
import { renderLanding } from './ui/landing.js';
import { renderFight } from './ui/fight.js';
import { renderReward } from './ui/reward.js';
import { renderShop } from './ui/shop.js';
import { renderShrine } from './ui/shrine.js';
import { renderParlor } from './ui/parlor.js';
import { renderLounge } from './ui/lounge.js';
import { renderPawnbroker } from './ui/pawnbroker.js';
import { renderDeath, renderVictory, renderFinalChoice, renderEnding } from './ui/endscreens.js';
import { openDeckView } from './ui/deckview.js';

const SCREENS = ['title', 'landing', 'fight', 'reward', 'shop', 'shrine', 'parlor', 'lounge', 'pawnbroker', 'death', 'victory'];
const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class App {
  constructor() {
    this.tween = new TweenManager();
    this.fx = new FX(this.tween);
    this.audio = new Audio();
    this.run = null;
    this.currentFight = null;
    this.shopStock = null;
    this._lastClearChips = 0;
    window.__houseApp = this;
    this.debug = new URLSearchParams(location.search).has('debug');
    this._bootLoop();
    this._bindGlobalKeys();
    this._armAudioOnGesture();
    if (this.debug) this._installDebug();
  }

  // ---------- debug harness (only when ?debug=1) ----------
  // Exposes window.HOUSE for deterministic verification of un-verified mechanics.
  // Absent this flag nothing is installed and normal play is untouched.
  _installDebug() {
    const app = this;
    const ensureRun = (seed) => { if (!app.run) { app.run = new Run(seed); app.shopStock = null; app.run.doors = null; } return app.run; };
    const H = {
      get app() { return app; },
      get run() { return app.run; },
      get combat() { return app._activeCombat; },
      get fight() { return app.currentFight; },
      // ----- run lifecycle -----
      newRun(seed) { Run.clearSave(); app.run = new Run(seed); app.shopStock = null; app.run.doors = null; return H.snapshot(); },
      // Move to a landing whose upcoming floor is n (fight/room will be floor n).
      jumpToFloor(n) { ensureRun(); app.run.floor = Math.max(0, (n | 0) - 1); app.run.doors = null; app.run.pendingRoom = null; app.wipeTo(() => app.goLanding()); return H.snapshot(); },
      // Enter a room directly. type: table|elite|boss|shop|shrine|parlor. floor optional (defaults current+1).
      gotoRoom(type, floor) {
        ensureRun();
        const f = floor != null ? (floor | 0) : app.run.floor + 1;
        app.run.floor = f - 1;
        app.run.pendingRoom = { type, floor: f };
        app.run.location = 'room';
        app.wipeTo(() => app.enterRoom(type, f, false));
        return `entering ${type} @ floor ${f}`;
      },
      // Enter a specific event by id (bypasses random pick).
      gotoShrine(eventId, floor) {
        ensureRun();
        const ev = EVENTS.find((e) => e.id === eventId) || EVENTS[0];
        const f = floor != null ? (floor | 0) : app.run.floor + 1;
        app.run.floor = f - 1;
        app.run.pendingRoom = { type: 'shrine', floor: f };
        app.run.location = 'room';
        app.wipeTo(() => { app.audio.stopDrone(); renderShrine(app, ev); });
        return `shrine ${ev.id}`;
      },
      // ----- state pokes -----
      setPlayerHP(n) { ensureRun(); app.run.hp = Math.max(0, Math.min(app.run.maxHp, n | 0)); if (app._activeCombat) app._activeCombat.player.hp = app.run.hp; if (app._debugFight) app._debugFight.refresh(); return app.run.hp; },
      setMaxHP(n) { ensureRun(); app.run.maxHp = Math.max(1, n | 0); app.run.hp = Math.min(app.run.hp, app.run.maxHp); if (app._debugFight) app._debugFight.refresh(); return app.run.maxHp; },
      setEnemyHP(n) { if (app._debugFight) return app._debugFight.setEnemyHP(n | 0); return 'no active fight'; },
      addChips(n) { ensureRun(); app.run.chips = Math.max(0, app.run.chips + (n | 0)); if (app._debugFight) app._debugFight.refresh(); app.refreshTopChips && app.refreshTopChips(); return app.run.chips; },
      grantRelic(id) { ensureRun(); const ok = app.run.addRelic(id); return ok ? `granted ${id}` : `already had / unknown ${id}`; },
      grantCharm(id) { ensureRun(); const ok = app.run.addCharm(id); return ok ? `granted ${id}` : 'no free charm slot'; },
      grantEnchant(ench, rank) {
        ensureRun();
        const cands = app.run.deck.filter((c) => !c.dead && !c.ench && (!rank || c.rank === rank));
        if (!cands.length) return 'no candidate card';
        cands[0].ench = ench; if (ench === 'sharp') cands[0].sharpDelta = 0;
        return `enchanted ${cands[0].rank}${cands[0].suit} -> ${ench}`;
      },
      // ----- fight actions -----
      hit() { app.currentFight && app.currentFight.hit(); },
      stand() { app.currentFight && app.currentFight.stand(); },
      double() { app.currentFight && app.currentFight.double(); },
      split() { app.currentFight && app.currentFight.split(); },
      charm(i) { app.currentFight && app.currentFight.charm(i | 0); },
      undo() { app.currentFight && app.currentFight.undo(); },
      fastForward() { app.currentFight && app.currentFight.fastForward(); },
      // ----- SPEC2 system pokes -----
      setHeat(n) { ensureRun(); app.run.heat = Math.max(0, Math.min(app.run.heatCap(), n | 0)); if (app._activeCombat) app._activeCombat.run.heat = app.run.heat; if (app._debugFight) app._debugFight.refresh(); return app.run.heat; },
      // Force the next dealt hand's Table Stake (id from stakes.js). Applies on the NEXT hand.
      forceStake(id) { ensureRun(); app.run._forceStake = id; return `next hand stake -> ${id}`; },
      grantSong(id) { ensureRun(); app.run.addSong(id); return `song ${id} for ${app.run.songs.find((s) => s.id === id)?.fights} fights`; },
      previewStand() { return app._activeCombat ? app._activeCombat.previewStandDamage() : null; },
      stake() { return app._activeCombat && app._activeCombat.stake ? app._activeCombat.stake.id : null; },
      openLounge() { ensureRun(); app.wipeTo(() => renderLounge(app)); return 'lounge'; },
      openPawnbroker() { ensureRun(); app.wipeTo(() => renderPawnbroker(app, () => app.wipeTo(() => app.goLanding()))); return 'pawnbroker'; },
      // ----- story pokes -----
      setArc(patch) { ensureRun(); Object.assign(app.run.arc, patch || {}); return app.run.arc; },
      arc() { ensureRun(); return app.run.arc; },
      // Force a specific shrine/scripted event by id (bypasses arc-weighted pick).
      forceShrine(eventId, floor) {
        ensureRun();
        const ev = EVENTS.find((e) => e.id === eventId);
        if (!ev) return `unknown shrine ${eventId}`;
        const f = floor != null ? (floor | 0) : app.run.floor + 1;
        app.run.floor = f - 1; app.run.pendingRoom = { type: 'shrine', floor: f }; app.run.location = 'room';
        app.wipeTo(() => { app.audio.stopDrone(); renderShrine(app, ev); });
        return `shrine ${ev.id} @ floor ${f}`;
      },
      // Force a landing story beat (opening / act2 / act3 / confession) over a landing.
      forceBeat(which) {
        ensureRun();
        const map = { opening: 1, act2: 8, act3: 15, confession: 19 };
        const upcoming = map[which] != null ? map[which] : 1;
        app.run.floor = upcoming - 1;
        if (which === 'opening') app.run.arc.openingSeen = false;
        if (which === 'act2') app.run.arc.actSeen = app.run.arc.actSeen.filter((a) => a !== 2);
        if (which === 'act3') app.run.arc.actSeen = app.run.arc.actSeen.filter((a) => a !== 3);
        if (which === 'confession') { app.run.arc.confessionSeen = false; app.run.arc.conciergeStage = 2; }
        app.run.doors = null;
        app.wipeTo(() => app.goLanding());
        return `beat ${which} @ floor ${upcoming}`;
      },
      // Force the victory final-choice, or jump straight to an ending ('escape'|'inheritance').
      forceEnding(which) {
        ensureRun();
        app.run.floor = 21;
        if (which === 'escape' || which === 'inheritance') { app.wipeTo(() => renderEnding(app, which)); return `ending ${which}`; }
        app.wipeTo(() => renderFinalChoice(app));
        return 'final choice';
      },
      whisper() { ensureRun(); return app.run.houseWhisper; },
      // Instantly win / lose the active fight through the real resolution path.
      winFight() { if (app._debugFight) return app._debugFight.forceWin(); return 'no active fight'; },
      loseFight() { if (app._debugFight) return app._debugFight.forceLose(); return 'no active fight'; },
      // ----- inspection -----
      snapshot() {
        const r = app.run; if (!r) return { run: null };
        const c = app._activeCombat;
        return {
          screen: app.activeScreen, floor: r.floor, upcoming: r.floor + 1,
          hp: r.hp, maxHp: r.maxHp, chips: r.chips,
          relics: r.relics.slice(), charms: r.charms.slice(),
          deckLen: r.deck.length, enchanted: r.deck.filter((c) => c.ench).length,
          debt: r.deck.filter((c) => c.dead).length,
          seed: r.seed, rngCalls: r.rng.calls,
          enemy: c ? { name: c.enemy.name, hp: c.enemy.hp, maxHp: c.enemy.maxHp, atk: c.enemy.atk, state: c.state, handNo: c.handNo, phase2: !!(c._phase2 || c._housePhase2) } : null,
          playerHand: c ? c.player.hand.map((x) => x.rank + x.suit) : null,
          playerTotal: c ? c.playerTotal().total : null,
        };
      },
      lifetime() { return Run.loadStats(); },
    };
    window.HOUSE = H;
    console.log('[HOUSE debug] window.HOUSE installed. Methods:', Object.keys(H).filter((k) => typeof H[k] === 'function').join(', '));
  }

  // ---------- RAF loop ----------
  _bootLoop() {
    let last = performance.now();
    const frame = (now) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1; // clamp big gaps (also covers tab-backgrounding)
      // one bad frame must never kill the whole loop
      try { this.tween.update(dt); } catch (e) { console.error('tween', e); }
      try { this.fx.update(dt); } catch (e) { console.error('fx', e); }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  _armAudioOnGesture() {
    const arm = () => { this.audio.arm(); document.removeEventListener('pointerdown', arm); document.removeEventListener('keydown', arm); };
    document.addEventListener('pointerdown', arm);
    document.addEventListener('keydown', arm);
    // every interactive surface ticks under the cursor / clicks with weight
    let lastHover = null;
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest && e.target.closest('button:not(:disabled), .door, .reward-card, .parlor-opt, .shop-item');
      if (t && t !== lastHover) this.audio.hover();
      lastHover = t;
    });
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('button:not(:disabled), .door, .reward-card, .parlor-opt')) this.audio.press();
    });
  }

  // ---------- screen router ----------
  show(name) {
    for (const s of SCREENS) {
      const el = document.getElementById('screen-' + s);
      if (el) el.hidden = (s !== name);
    }
    this.activeScreen = name;
    // leaving the table: silence the fight's score and tension states
    if (name !== 'fight') {
      this.audio.stopMusic();
      this.audio.setHeartbeat(false);
      this.fx.setLethal(false);
      const stage = document.getElementById('stage');
      stage.classList.remove('lowhp', 'cine', 'hole-drama');
      if (name === 'title' || name === 'death' || name === 'victory') delete stage.dataset.act;
    }
  }

  wipeTo(cb) {
    const w = document.getElementById('wipe');
    this.fx.clearBursts();
    if (REDUCED()) { cb(); return; }
    w.style.transition = 'transform .3s var(--ease)';
    w.style.transform = 'translateY(0)';
    setTimeout(() => {
      cb();
      w.style.transform = 'translateY(100%)';
      setTimeout(() => { w.style.transition = 'none'; w.style.transform = 'translateY(-100%)'; }, 320);
    }, 300);
  }

  // ---------- top controls (deck / mute / help) ----------
  topControlsHTML() {
    return `<span class="hud-right" style="gap:8px">
      <button class="icon-btn tc-deck" title="View the shoe (V)" aria-label="View the shoe">
        <svg viewBox="0 0 24 24"><rect x="4" y="5" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="8" y="3" width="12" height="16" rx="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/></svg>
      </button>
      <button class="icon-btn tc-mute" title="Toggle sound" aria-label="Toggle sound">${this._muteIcon()}</button>
      <button class="icon-btn tc-help" title="How to play" aria-label="How to play">
        <svg viewBox="0 0 24 24"><path d="M9 9 a3 3 0 1 1 4 3 c-1 .7-1 1.2-1 2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="18" r="1.1" fill="currentColor"/></svg>
      </button>
    </span>`;
  }
  _muteIcon() {
    return this.audio.muted
      ? `<svg viewBox="0 0 24 24"><path d="M4 9 h4 l5-4 v14 l-5-4 H4 Z" fill="currentColor"/><path d="M16 9 l5 5 M21 9 l-5 5" stroke="currentColor" stroke-width="1.8"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M4 9 h4 l5-4 v14 l-5-4 H4 Z" fill="currentColor"/><path d="M16 8 a5 5 0 0 1 0 8 M18.5 6 a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
  }
  wireTopControls(root) {
    const deck = root.querySelector('.tc-deck');
    const mute = root.querySelector('.tc-mute');
    const help = root.querySelector('.tc-help');
    if (deck) deck.addEventListener('click', () => this.openDeck());
    if (help) help.addEventListener('click', () => this.openHowto());
    if (mute) mute.addEventListener('click', () => { this.audio.arm(); this.audio.toggleMute(); mute.innerHTML = this._muteIcon(); });
  }

  // ---------- toast / announce ----------
  toast(text) {
    const layer = document.getElementById('toast-layer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    layer.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, 2200);
  }
  announce(text) {
    const el = document.getElementById('announce');
    el.textContent = '';
    setTimeout(() => { el.textContent = text; }, 30);
  }
  refreshTopChips() {
    const el = document.querySelector('#chip-amount');
    if (el && this.run) el.textContent = this.run.chips;
  }

  // ---------- overlays ----------
  openDeck() { if (this.run) openDeckView(this.run); }
  openHowto() {
    const modal = document.getElementById('howto');
    modal.innerHTML = `<div class="modal">
      <div class="modal-head"><h2>How to Play</h2><button class="icon-btn" id="ht-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2"/></svg></button></div>
      <div class="howto-panels">
        <div class="howto-panel"><h3>Blackjack</h3><p>Beat the dealer without passing 21. <b>Hit</b> (H) draws a card, <b>Stand</b> (S) ends your turn, <b>Double</b> (D) draws one card and doubles the stakes both ways.</p><ul><li>Winning deals your hand's total as damage.</li><li>A natural blackjack deals 32 and crits.</li><li>Busting costs you the enemy's Attack ×1.25.</li></ul></div>
        <div class="howto-panel"><h3>Heat</h3><p>Every hand you win lights a <span class="brass">candle</span> beside you — <b>Heat</b>. Each point of Heat raises your damage by 15% (up to ×1.75). A loss snuffs it all out; a push keeps it burning.</p><p>The Stand button shows the damage a winning stand would deal, Heat included.</p></div>
        <div class="howto-panel"><h3>Split &amp; Charlie</h3><p>Dealt a matched pair? <b>Split</b> (P) plays two hands side by side, each wounding the dealer on its own. One Double per split hand.</p><p>Reach <b>five cards without busting</b> for a <span class="brass">Five-Card Charlie</span> — an automatic win for your total, plus half again.</p></div>
        <div class="howto-panel"><h3>Table Stakes</h3><p>From Floor 3, most hands flip a <span class="brass">Stake</span> card by the shoe — Blood Stakes, Glass Table, Double or Nothing, and more. Each rewrites this one hand. Hover the card to read it.</p><p>Bosses deal from a smaller, crueler pool.</p></div>
        <div class="howto-panel"><h3>The Descent</h3><p>Twenty-one floors down. Between fights, choose a door: a <span class="rose">Table</span>, a <span class="curse-c">High-Stakes Table</span>, the <span class="brass">Cage</span> (shop), a <span class="brass">Shrine</span>, a <span class="win-c">Parlor</span> (rest), or — deep down — <span class="brass">The Lounge</span>.</p><p>Bosses wait on floors 7, 14, and 21. They break the rules.</p></div>
        <div class="howto-panel"><h3>The Shoe is Shared</h3><p>You and the dealer draw from the <b>same deck</b>. Removing a card, duplicating it, or enchanting it changes the odds for <b>both</b> of you.</p><p>Keys: <kbd>H</kbd> hit · <kbd>S</kbd> stand · <kbd>D</kbd> double · <kbd>P</kbd> split · <kbd>Space</kbd> fast-forward · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> charms · <kbd>V</kbd> shoe.</p></div>
      </div>
    </div>`;
    modal.hidden = false;
    const close = () => { modal.hidden = true; modal.innerHTML = ''; };
    modal.querySelector('#ht-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  }

  replaceCharmPrompt(charmId, onDone) {
    const modal = document.getElementById('deckview');
    const ch = CHARM_BY_ID[charmId];
    modal.innerHTML = `<div class="modal"><div class="modal-head"><h2>Charm slots full</h2></div>
      <p class="muted">Replace which charm with <b class="brass">${ch.name}</b>?</p>
      <div class="reward-cards">${this.run.charms.map((cid, i) => {
        const c = CHARM_BY_ID[cid];
        return `<button class="reward-card" data-i="${i}"><div class="reward-icon">${c.icon()}</div><div class="reward-name">${c.name}</div><div class="reward-desc">${c.desc}</div></button>`;
      }).join('')}</div>
      <button class="btn btn-ghost btn-sm" id="rc-cancel" style="align-self:center">Cancel</button></div>`;
    modal.hidden = false;
    const closeIt = () => { modal.hidden = true; modal.innerHTML = ''; };
    modal.querySelectorAll('.reward-card').forEach((n) => n.addEventListener('click', () => {
      const i = +n.dataset.i;
      this.run.charms[i] = charmId;
      closeIt();
      if (onDone) onDone();
    }));
    modal.querySelector('#rc-cancel').addEventListener('click', closeIt);
  }

  // ---------- flow ----------
  toTitle() {
    this.audio.stopDrone();
    this.wipeTo(() => renderTitle(this));
  }

  newRun(seed) {
    Run.clearSave();
    this.run = new Run(seed);
    this.shopStock = null;
    this.run.doors = null;
    // SPEC2 §E — after the profile's first death, the Pawnbroker greets every New Descent.
    const life = Run.loadStats();
    if (life.diedOnce) {
      this.wipeTo(() => renderPawnbroker(this, () => { this.run.save(); this.wipeTo(() => this.goLanding()); }));
    } else {
      this.wipeTo(() => this.goLanding());
    }
  }

  continueRun() {
    const run = Run.load();
    if (!run) { this.toTitle(); return; }
    this.run = run;
    this.shopStock = null;
    if (run.location === 'landing' && run.doors) {
      this.wipeTo(() => renderLanding(this));
    } else if (run.location === 'room' && run.pendingRoom) {
      this.wipeTo(() => this.enterRoom(run.pendingRoom.type, run.pendingRoom.floor, true));
    } else {
      this.wipeTo(() => this.goLanding());
    }
  }

  goLanding() {
    const run = this.run;
    const upcoming = run.floor + 1;
    if (!run.doors) {
      run.doors = generateDoors(run, run.rng);
      // The Voice of the House whispers once per landing (seeded, no-repeat). Drawn with
      // the doors so it round-trips through the save and never re-rolls on reload.
      run.houseWhisper = drawWhisper(run, upcoming);
    }
    run.location = 'landing';
    run.pendingRoom = null;
    run.save();
    renderLanding(this);
    this._maybeLandingBeat(upcoming);
  }

  // A full-screen narrative beat that plays over the freshly-rendered landing:
  // the opening vignette (floor 1), the Act II/III interstitials (floors 8/15),
  // and the Concierge's confession (guaranteed in Act III, before floor 20).
  _maybeLandingBeat(upcoming) {
    const run = this.run;
    const a = ensureArc(run);
    let beat = null;
    if (upcoming === 1 && !a.openingSeen) {
      this._playOpening(0);
      return;
    } else if (upcoming === 8 && !hasActSeen(run, 2)) {
      beat = { kind: 'interstitial', title: INTERSTITIAL[2].title, lines: INTERSTITIAL[2].lines, cta: 'Descend', mark: () => markActSeen(run, 2) };
    } else if (upcoming === 15 && !hasActSeen(run, 3)) {
      beat = { kind: 'interstitial', title: INTERSTITIAL[3].title, lines: INTERSTITIAL[3].lines, cta: 'Descend', mark: () => markActSeen(run, 3) };
    } else if (actOf(upcoming) === 3 && !a.confessionSeen && ((a.conciergeStage || 0) >= 2 || upcoming >= 18)) {
      // Encounter 3 (dialogue-only) — must appear in Act III before floor 20.
      beat = { kind: 'confession', title: CONFESSION.title, lines: CONFESSION.lines, cta: 'Take the door', mark: () => { a.confessionSeen = true; a.conciergeStage = Math.max(a.conciergeStage || 0, 3); } };
    }
    if (!beat) return;
    showStoryBeat(this, {
      kind: beat.kind, title: beat.title, lines: beat.lines, cta: beat.cta,
      onDone: () => {
        beat.mark();
        run.save();
        const first = document.querySelector('#screen-landing .door');
        if (first) first.focus();
      },
    });
  }

  // The opening prologue: OPENING pages shown in sequence (world → you → tonight).
  // openingSeen is only marked after the last page, so a mid-prologue reload replays it.
  _playOpening(i) {
    const run = this.run;
    const a = ensureArc(run);
    const page = OPENING[i];
    const last = i >= OPENING.length - 1;
    showStoryBeat(this, {
      kind: 'opening', title: page.title, lines: page.lines,
      cta: last ? 'Be dealt in' : 'Continue',
      onDone: () => {
        if (!last) { this._playOpening(i + 1); return; }
        a.openingSeen = true;
        run.save();
        const first = document.querySelector('#screen-landing .door');
        if (first) first.focus();
      },
    });
  }

  enterDoor(door) {
    const floor = this.run.floor + 1;
    this.run.pendingRoom = { type: door.type, floor };
    this.run.location = 'room';
    this.run.save(); // snapshot rng BEFORE enemy pick so continue reproduces it
    this.wipeTo(() => this.enterRoom(door.type, floor, false));
  }

  enterRoom(type, floor, resuming) {
    this.audio.stopDrone();
    // A genuinely new fight starts a fresh Heat streak (A1) and clears any stake state.
    // On resume, Heat/stake persist from the save so they round-trip mid-fight.
    if (!resuming && (type === 'boss' || type === 'elite' || type === 'table')) {
      this.run.heat = 0; this.run.activeStake = null;
    }
    if (type === 'boss') { this.startFight(this._pickBoss(floor)); }
    else if (type === 'elite') { this.startFight(this._pickEnemy(floor, true)); }
    else if (type === 'table') { this.startFight(this._pickEnemy(floor, false)); }
    else if (type === 'shop') { renderShop(this); }
    else if (type === 'shrine') { renderShrine(this, this._pickEvent()); }
    else if (type === 'parlor') { renderParlor(this); }
    else if (type === 'lounge') { renderLounge(this); }
  }

  _pickEnemy(floor, elite) {
    if (!elite && floor <= 2) return makeEnemy(ENEMIES.find((e) => e.id === 'usher'), floor, false);
    const pool = ENEMIES.filter((e) => e.tier === (elite ? 'elite' : 'normal') && e.id !== 'usher' && (!e.minFloor || floor >= e.minFloor));
    const def = this.run.rng.pick(pool);
    return makeEnemy(def, floor, elite);
  }
  _pickBoss(floor) { return makeEnemy(BOSSES[floor], floor, false); }
  _pickEvent() { return pickShrineEvent(this.run); }

  startFight(enemy) {
    this.currentEnemy = enemy;
    renderFight(this, enemy);
  }

  onFightWon(enemy) {
    const run = this.run;
    const floor = run.pendingRoom.floor;
    // clear chips (+20% fight-clear payout per SPEC2 §C)
    const base = enemy.tier === 'boss' ? 70 : enemy.tier === 'elite' ? 55 : Math.round(30 + floor);
    const clear = Math.round((Math.min(60, base) + (enemy.tier === 'boss' ? 40 : 0)) * 1.2);
    run.chips += clear;
    this._lastClearChips = clear;

    // §C — automatic +6 heal after every cleared fight; Lounge songs tick down a fight.
    run.heal(6);
    run.tickSongs();
    run.heat = 0; run.activeStake = null;
    this.toast('You bind your wounds. The House disapproves.');

    if (floor === 21) {
      run.floor = 21;
      run.save();
      // The House has fallen — the final choice: the candle, the chair, the Marker.
      this.wipeTo(() => renderFinalChoice(this));
      return;
    }
    this.wipeTo(() => renderReward(this, enemy));
  }

  afterReward() {
    const run = this.run;
    run.floor = run.pendingRoom.floor;
    run.pendingRoom = null;
    run.doors = null;
    this.wipeTo(() => this.goLanding());
  }

  afterRoom() {
    const run = this.run;
    run.floor = run.pendingRoom.floor;
    run.pendingRoom = null;
    run.doors = null;
    this.shopStock = null;
    this.wipeTo(() => this.goLanding());
  }

  onPlayerDead(enemy, cause) {
    this.audio.stopDrone();
    this.wipeTo(() => renderDeath(this, enemy, cause));
  }

  // ---------- global keys ----------
  _bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      // close modals with Escape
      if (e.key === 'Escape') {
        for (const id of ['deckview', 'howto']) {
          const m = document.getElementById(id);
          if (m && !m.hidden) { m.hidden = true; m.innerHTML = ''; e.preventDefault(); return; }
        }
      }
      const modalOpen = ['deckview', 'howto'].some((id) => { const m = document.getElementById(id); return m && !m.hidden; });
      if (modalOpen) return;

      const k = e.key.toLowerCase();
      if (this.activeScreen === 'fight' && this.currentFight) {
        // Space (or click on empty felt) fast-forwards the current hand's animation to 4×.
        if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); this.currentFight.fastForward(); return; }
        if (k === 'h') { e.preventDefault(); this.currentFight.hit(); }
        else if (k === 's') { e.preventDefault(); this.currentFight.stand(); }
        else if (k === 'd') { e.preventDefault(); this.currentFight.double(); }
        else if (k === 'p') { e.preventDefault(); this.currentFight.split(); }
        else if (k === 'u') { e.preventDefault(); this.currentFight.undo(); }
        else if (k === '1' || k === '2' || k === '3') { e.preventDefault(); this.currentFight.charm(+k - 1); }
        else if (k === 'v') { e.preventDefault(); this.openDeck(); }
      } else if (k === 'v' && this.run) { this.openDeck(); }
    });
  }
}

// boot
const app = new App();
renderTitle(app);
