// combat.js — the hand state machine. Logic emits an ordered event list; UI plays it.
//
// DAMAGE MODIFIER ORDERING (canonical — read before editing):
//   Damage DEALT to the enemy (player wins / blackjack / dealer bust / Charlie):
//     1. base           = { win: playerTotal, blackjack: 32, dealerBust: playerTotal + 5 }
//     2. ×2 if doubled
//     3. + enchantment bonus in the winning hand (bloodstained +5, cursed -4)
//     4. + song "Encore" flat +3 (winning hands)
//     5. relic modDealt hooks, in relic order   (Brass Knuckles +6@20, Noose +9@21,
//        Debt Collector +2@bust, Splitting Headache +4@split, Charlie's Watch +6@4-card)
//     6. × HEAT multiplier (1 + 0.15 × Heat)     <-- A1: after additive bonuses, before quirk mults
//     7. × Charlie (1.5) if a Five-Card Charlie   (A3)
//     8. × stake multipliers  (Double or Nothing ×2 ; The Long Odds ×3 on 5+ card wins)
//     9. × enemy quirk modDealt                   (Bouncer -> 0 when <17, The House -> ×2 at exactly 21)
//        (steps 7-9 skipped/adjusted if Widow's Veil active this hand)
//    10. floor at 0, round
//   Damage TAKEN by the player (bust / dealer win / dealer blackjack):
//     1. base           = { dealerWin: atk, dealerBlackjack: atk×1.5, bust: atk×1.25 }
//     2. ×2 if doubled
//     3. Cigarette / Iron Stomach zero-out on bust
//     4. relic modTaken hooks (Tourniquet ×0.75 on bust)
//     5. Insurance Slip negate
//     6. × Double or Nothing stake (×2)
//     7. enemy quirk modTaken (Cardsharp heals on doubled loss; skipped if Widow's Veil active)
//     8. floor at 0, round
//
// HEAT (A1): +1 per won hand (dealer bust & naturals count), cap 5 (Asbestos Gloves 7).
//   Applied increment-FIRST: the hand that lights a flame hits with the new Heat.
//   Push keeps Heat. Loss/bust resets to 0 (Slow Burn: -1 instead). Cold Room stake: frozen.
//   Split resolves each hand separately, so a split can gain 2 Heat, or gain then lose.

import { Shoe, handTotal, isNaturalBlackjack, makeCard } from './cards.js';
import { RELIC_BY_ID } from './relics.js';
import { enchantDamageBonus, gildedChipsOnDraw } from './enchants.js';
import { STAKE_BY_ID, BOSS_STAKE_IDS, pickStake } from './stakes.js';

export class Combat {
  constructor(run, enemy) {
    this.run = run;
    this.enemy = enemy;
    this.player = { hand: [], hp: run.hp };
    this.dealer = { hand: [], up: null, holes: [], holeRevealed: false };
    this.shoe = new Shoe(run.deck, run.rng);
    this.shoe.freshFight();
    this.shoe.onReshuffle = () => this._onReshuffle();
    this.state = 'idle';
    this._events = [];
    this.handNo = 0;
    this._hands = [];        // hand objects for the current dealt round (1, or 2 when split)
    this._activeIdx = 0;
    this.stake = null;       // current Table Stake def (A4)

    // per-fight relic setup
    for (const id of run.relics) {
      const r = RELIC_BY_ID[id];
      if (r && r.onFightStart) r.onFightStart(this);
    }
  }

  // ---------- helpers ----------
  drain() { const e = this._events; this._events = []; return e; }
  _sync() { this.run.hp = this.player.hp; }
  relicList() { return this.run.relics.map((id) => RELIC_BY_ID[id]).filter(Boolean); }

  playerTotalOpts() {
    const q = this.enemy.quirk;
    return {
      faceValue: q.playerFaceValue ?? 10,
      aceValue: q.playerAceValue ?? null,
      sharp: true,
    };
  }
  dealerTotalOpts() {
    const q = this.enemy.quirk;
    return { faceValue: 10, aceValue: q.dealerAceValue ?? null };
  }
  playerTotal() { return handTotal(this.player.hand, this.playerTotalOpts()); }
  dealerTotal() { return handTotal(this.dealer.hand, this.dealerTotalOpts()); }

  // ---------- Heat (A1) ----------
  heatCap() { return this.run.heatCap(); }
  heatMult(h = this.run.heat) { return 1 + 0.15 * h; }

  // ---------- Songs (§C Lounge) ----------
  _songActive(id) { return this.run.hasSong(id); }

  _onReshuffle() {
    this._events.push({ t: 'reshuffle' });
    for (const r of this.relicList()) if (r.onReshuffle) r.onReshuffle(this);
  }

  // recompute which card ids are currently in play (never reshuffled back into the shoe)
  _updateInPlay() {
    const s = new Set();
    for (const h of this._hands) for (const c of h.cards) if (c) s.add(c.id);
    for (const c of this.player.hand) if (c) s.add(c.id);
    for (const c of this.dealer.hand) if (c) s.add(c.id);
    if (this.dealer.up) s.add(this.dealer.up.id);
    for (const c of this.dealer.holes) if (c) s.add(c.id);
    this.shoe.inPlay = s;
  }

  _drawFor(side, opts = {}) {
    this._updateInPlay();
    this.shoe.maybeReshuffle();
    let card;
    if (opts.lowest) card = this.shoe.drawLowest();
    else card = this.shoe.draw();
    if (!card) return null;
    if (side === 'player') {
      const g = gildedChipsOnDraw(card);
      if (g) { this.run.chips += g; this._events.push({ t: 'chipGain', amount: g, reason: 'gilded' }); }
    }
    return card;
  }

  _dealerUpCard() {
    if (this.enemy.quirk.forceDealerTen) {
      const pile = this.shoe.drawPile;
      for (let i = pile.length - 1; i >= 0; i--) {
        const c = pile[i];
        const v = c.dead ? 0 : (c.rank === '10' || ['J', 'Q', 'K'].includes(c.rank)) ? 10 : (c.rank === 'A' ? 11 : parseInt(c.rank, 10));
        if (v === 10) { pile.splice(i, 1); this.shoe.discardPile.push(c); return c; }
      }
    }
    return this._drawFor('dealer');
  }

  // active hand alias management
  _newHand(cards = [], split = false) {
    return { cards, doubled: false, closed: false, bust: false, charlie: false, forceTotal: null, split };
  }
  _setActive(idx) { this._activeIdx = idx; this.player.hand = this._hands[idx].cards; }
  activeHand() { return this._hands[this._activeIdx]; }

  // ---------- Table Stakes (A4) ----------
  _rollStake() {
    this.stake = null;
    this.run.activeStake = null;
    const q = this.enemy.quirk;
    const isBoss = this.enemy.tier === 'boss';
    const floor = this.run.pendingRoom ? this.run.pendingRoom.floor : this.run.floor + 1;
    // Debug harness: force a specific stake on this hand (consumed once).
    if (this.run._forceStake && STAKE_BY_ID[this.run._forceStake]) {
      this.stake = STAKE_BY_ID[this.run._forceStake];
      this.run._forceStake = null;
      this.run.activeStake = this.stake.id;
      this._stakeRerolled = false;
      this._events.push({ t: 'stake', id: this.stake.id, name: this.stake.name, desc: this.stake.desc });
      return;
    }
    // Never during a boss phase-transition hand (the hand right after a phase flip).
    if (this._suppressStake) { this._suppressStake = false; return; }
    let flips = false;
    if (q.stakeEveryHand) flips = true;                       // The Oddsmaker
    else if (floor >= 3 && this.handNo > 1) flips = this.run.rng.chance(0.30);
    if (!flips) return;
    const pool = isBoss ? BOSS_STAKE_IDS : undefined;
    this.stake = pickStake(this.run.rng, pool);
    this.run.activeStake = this.stake.id;
    this._stakeRerolled = false;
    this._events.push({ t: 'stake', id: this.stake.id, name: this.stake.name, desc: this.stake.desc });
  }

  // Stakeholder relic: reroll the current stake once per fight (called by UI).
  canRerollStake() { return !!this.stake && this._stakeReroll && !this._stakeRerolled && this.state === 'playerTurn' && this.activeHand().cards.length === 2 && this._hands.length === 1; }
  rerollStake() {
    if (!this.canRerollStake()) return { events: [], state: this.state };
    this._stakeReroll = false; this._stakeRerolled = true;
    const isBoss = this.enemy.tier === 'boss';
    const prev = this.stake.id;
    let next = this.stake;
    for (let i = 0; i < 8 && next.id === prev; i++) next = pickStake(this.run.rng, isBoss ? BOSS_STAKE_IDS : undefined);
    this.stake = next;
    this.run.activeStake = next.id;
    // Glass Table flipping in after deal: reveal now if applicable.
    if (this.stake.glassHole && !this.dealer.holeRevealed) { this.dealer.holeRevealed = true; this._events.push({ t: 'revealHole' }); }
    this._events.push({ t: 'stake', id: next.id, name: next.name, desc: next.desc, reroll: true });
    return { events: this.drain(), state: this.state };
  }

  // ---------- start a hand ----------
  startHand() {
    this.handNo++;
    this.enemy.handCount++;
    this.dealer.hand = [];
    this.dealer.holes = [];
    this.dealer.holeRevealed = false;
    this._firstAction = true;
    this._swapDone = false;
    this._loadedSpring = false;
    this._veiled = false;
    this._sharpQueue = [];
    this._bribe = false;
    this._velvetGlove = false;
    this._periodicDone = false;

    this._hands = [this._newHand([], false)];
    this._setActive(0);

    const q = this.enemy.quirk;
    if (q.onHandStart) q.onHandStart(this);

    // Table Stake for this hand (A4) — rolled before the deal so Glass Table can show the hole.
    this._rollStake();

    // deal: player up, dealer up, player up, dealer hole
    const p1 = this._drawFor('player');
    this.player.hand.push(p1);
    this._pushDeal('player', p1, true);

    const dUp = this._dealerUpCard();
    this.dealer.up = dUp;
    this._pushDeal('dealer', dUp, true);

    const p2 = this._drawFor('player');
    this.player.hand.push(p2);
    this._pushDeal('player', p2, true);

    // dealer hole — face up if the enemy shows it, if Glass Table, or if the "Tell" song fires (<30% HP)
    const glass = this.stake && this.stake.glassHole;
    const tell = this._songActive('tell') && this.enemy.hp <= this.enemy.maxHp * 0.3;
    const holeFaceUp = !!q.holeFaceUp || glass || tell;
    const hole = this._drawFor('dealer');
    this.dealer.hand = [dUp, hole];
    this._pushDeal('dealer', hole, holeFaceUp, true);
    if (q.twoHands) {
      const hole2 = this._drawFor('dealer');
      this.dealer.holes = [hole, hole2];
      this._pushDeal('dealer', hole2, false, true, true);
    }
    if (holeFaceUp) this.dealer.holeRevealed = true;

    // House / Rake: chips per hand dealt
    if (q.onDealtHand) q.onDealtHand(this);

    // Loaded Die relic (first hand only) reveals hole for info
    if (this._revealHoleFirstHand) {
      this._revealHoleFirstHand = false;
      this._events.push({ t: 'peekHole' });
      this.dealer.holeRevealed = true;
    }

    // naturals check (only the initial two-card hand — split 21s are not naturals)
    const pNat = isNaturalBlackjack(this.player.hand, this.playerTotalOpts());
    const dNat = this._dealerNatural();

    if (pNat || dNat) {
      this.dealer.holeRevealed = true;
      this._events.push({ t: 'revealHole' });
      const hand = this._hands[0];
      if (pNat && dNat) { this._resolveHand(hand, 'push'); }
      else if (pNat) { this._resolveHand(hand, 'playerBlackjack'); }
      else { this._resolveHand(hand, 'dealerBlackjack'); }
      this._finalizeDealtHand();
      this.state = this._fightState('resolved');
      this._sync();
      return { events: this.drain(), state: this.state };
    }

    this.state = 'playerTurn';
    for (const c of this.player.hand) if (c.ench === 'sharp') this._sharpQueue.push(c.id);
    return { events: this.drain(), state: this.state };
  }

  _dealerNatural() {
    if (this.dealer.hand.length < 2) return false;
    return handTotal(this.dealer.hand, this.dealerTotalOpts()).total === 21 &&
      this.dealer.hand.filter((c) => !c.dead).length === 2;
  }

  _pushDeal(side, card, faceUp, hole = false, extraHole = false) {
    this._events.push({ t: 'deal', side, card, faceUp, hole, extraHole, handIdx: side === 'player' ? this._activeIdx : undefined });
  }

  // ---------- Split (A2) ----------
  canSplit() {
    if (this.state !== 'playerTurn') return false;
    if (this._hands.length !== 1) return false;         // no re-splits
    const h = this.activeHand();
    if (h.cards.length !== 2) return false;
    const [a, b] = h.cards;
    if (a.dead || b.dead) return false;
    return a.rank === b.rank;
  }
  split() {
    if (!this.canSplit()) return { events: [], state: this.state };
    const [a, b] = this.activeHand().cards;
    this._hands = [this._newHand([a], true), this._newHand([b], true)];
    this._setActive(0);
    this._events.push({ t: 'split', cards: [a.id, b.id] });
    // one fresh card to each hand
    const c0 = this._drawFor('player');
    this._hands[0].cards.push(c0);
    this._events.push({ t: 'deal', side: 'player', card: c0, faceUp: true, handIdx: 0 });
    if (c0.ench === 'sharp') this._sharpQueue.push(c0.id);
    const c1 = this._drawFor('player');
    this._hands[1].cards.push(c1);
    this._events.push({ t: 'deal', side: 'player', card: c1, faceUp: true, handIdx: 1 });
    if (c1.ench === 'sharp') this._sharpQueue.push(c1.id);
    this._firstAction = true;
    this._events.push({ t: 'activeHand', idx: 0 });
    this._sync();
    return { events: this.drain(), state: this.state, sharp: this._sharpQueue.slice() };
  }

  // ---------- player actions ----------
  hit() {
    if (this.state !== 'playerTurn') return { events: [], state: this.state };
    const q = this.enemy.quirk;
    if (q.onPlayerHit) q.onPlayerHit(this);
    const c = this._drawFor('player');
    this.player.hand.push(c);
    this._pushDeal('player', c, true);
    if (c.ench === 'sharp') this._sharpQueue.push(c.id);
    this._afterFirstAction();
    this._checkHandProgress();
    this._sync();
    return { events: this.drain(), state: this.state, sharp: this._sharpQueue.slice() };
  }

  stand() {
    if (this.state !== 'playerTurn') return { events: [], state: this.state };
    this._afterFirstAction();
    this._closeHand(this.activeHand(), false);
    this._advance();
    this._sync();
    return { events: this.drain(), state: this.state };
  }

  double() {
    if (this.state !== 'playerTurn') return { events: [], state: this.state };
    if (this.enemy.quirk.forbidDouble) return { error: 'Doubling down is forbidden here.', events: [], state: this.state };
    if (this.activeHand().cards.length !== 2) return { error: 'You can only double on your first two cards.', events: [], state: this.state };
    this.activeHand().doubled = true;
    const c = this._drawFor('player');
    this.player.hand.push(c);
    this._pushDeal('player', c, true);
    if (c.ench === 'sharp') this._sharpQueue.push(c.id);
    this._afterFirstAction();
    const ht = this.playerTotal();
    if (ht.bust && this._consumeVelvetGlove()) {
      // velvet glove converts the bust into a stand at 21
    } else if (ht.bust) {
      this._closeHand(this.activeHand(), true);
    } else {
      this._closeHand(this.activeHand(), false);
    }
    this._advance();
    this._sync();
    return { events: this.drain(), state: this.state, sharp: this._sharpQueue.slice() };
  }

  // After a hit/charm draw: bust -> close(bust) & advance; Five-Card Charlie -> close(charlie) & advance.
  _checkHandProgress() {
    const hand = this.activeHand();
    const ht = this.playerTotal();
    const longOdds = this.stake && this.stake.longOdds;
    if (ht.bust) {
      if (this._consumeVelvetGlove()) { this._advance(); return; }
      this._closeHand(hand, true);
      this._advance();
    } else if (!longOdds && hand.cards.filter((x) => !x.dead).length >= 5) {
      // Five-Card Charlie (A3) — automatic win at hand end (unless The Long Odds supersedes it)
      hand.charlie = true;
      this._closeHand(hand, false);
      this._events.push({ t: 'note', text: 'Five-Card Charlie.' });
      this._advance();
    }
  }

  // Velvet Glove charm: a would-be bust becomes a stand at 21, once this hand.
  _consumeVelvetGlove() {
    if (!this._velvetGlove) return false;
    this._velvetGlove = false;
    const hand = this.activeHand();
    hand.forceTotal = 21;
    hand.closed = true;
    this._events.push({ t: 'note', text: 'The velvet glove — your bust settles at twenty-one.' });
    return true;
  }

  _closeHand(hand, bust) {
    hand.closed = true;
    hand.bust = bust;
    hand.total = hand.forceTotal != null ? hand.forceTotal : this.playerTotal().total;
  }

  // Move to the next split hand, or run the dealer + resolve everything.
  _advance() {
    if (this._activeIdx < this._hands.length - 1) {
      this._setActive(this._activeIdx + 1);
      this._firstAction = true;
      this.state = 'playerTurn';
      this._events.push({ t: 'activeHand', idx: this._activeIdx });
      return;
    }
    this._dealerAndResolveAll();
    this.state = this._fightState('resolved');
  }

  // Cold Coffee — undo last hit once per fight (single-hand only, before any split resolution)
  canUndo() { return this.state === 'playerTurn' && this._coldCoffee && this._hands.length === 1 && this.player.hand.length > 2; }
  undoHit() {
    if (!this.canUndo()) return { events: [], state: this.state };
    this._coldCoffee = false;
    const removed = this.player.hand.pop();
    this.shoe.drawPile.push(removed);
    const di = this.shoe.discardPile.indexOf(removed);
    if (di >= 0) this.shoe.discardPile.splice(di, 1);
    this._events.push({ t: 'undo', cardId: removed.id });
    return { events: this.drain(), state: this.state };
  }

  setSharp(cardId, delta) {
    for (const h of this._hands) { const c = h.cards.find((x) => x.id === cardId); if (c) c.sharpDelta = delta; }
    this._sharpQueue = this._sharpQueue.filter((id) => id !== cardId);
  }

  _afterFirstAction() {
    if (!this._firstAction) return;
    this._firstAction = false;
    if (this.enemy.quirk.swapAfterFirstAction && !this._swapDone) {
      this._swapDone = true;
      const idx = this.player.hand.length - 1;
      const outCard = this.player.hand[idx];
      const inCard = this._drawFor('player');
      if (inCard) {
        this.player.hand[idx] = inCard;
        this.shoe.discardPile.push(outCard);
        this._events.push({ t: 'sharpSwap', outCardId: outCard.id, inCard, index: idx });
        if (inCard.ench === 'sharp') this._sharpQueue.push(inCard.id);
      }
    }
  }

  // ---------- charms ----------
  useCharm(index, charmDef) {
    if (this.state !== 'playerTurn') return { events: [], state: this.state };
    if (this.stake && this.stake.sealCharms) return { events: [], state: this.state, failed: true };
    const res = charmDef.use(this) || {};
    if (res.failed) { return { events: this.drain(), state: this.state, failed: true }; }
    this.run.consumeCharm(index);
    if (res.stand) {
      // Dead Man's Hand / Bribe end the turn immediately
      this.activeHand().forceTotal = res.forceTotal != null ? res.forceTotal : this._forcePlayerTotal;
      this._closeHand(this.activeHand(), false);
      this._advance();
    } else {
      this._checkHandProgress();
    }
    this._sync();
    return { events: this.drain(), state: this.state, sharp: this._sharpQueue.slice() };
  }

  // ---------- dealer turn + resolution ----------
  _needsDealerDraw() {
    // A dealer draw is only meaningful if some hand is standing (not bust, not Charlie)
    // and the player hasn't Bribed the dealer out of drawing.
    if (this._bribe) return false;
    return this._hands.some((h) => h.closed && !h.bust && !h.charlie);
  }

  _dealerAndResolveAll() {
    // reveal hole
    if (!this.dealer.holeRevealed) { this.dealer.holeRevealed = true; this._events.push({ t: 'revealHole' }); }

    // Bailiff: choose the better of two hole cards
    if (this.enemy.quirk.twoHands && this.dealer.holes.length === 2) {
      const [h1, h2] = this.dealer.holes;
      const up = this.dealer.up;
      const t1 = handTotal([up, h1], this.dealerTotalOpts()).total;
      const t2 = handTotal([up, h2], this.dealerTotalOpts()).total;
      const score = (t) => (t > 21 ? -1 : t);
      const keep = score(t1) >= score(t2) ? h1 : h2;
      const drop = keep === h1 ? h2 : h1;
      this.dealer.hand = [up, keep];
      this.shoe.discardPile.push(drop);
      this._events.push({ t: 'bailiffPick', keepId: keep.id, dropId: drop.id });
    }

    if (this._bribe) {
      // Bribe: skip the dealer's turn; resolve against the dealer's current showing +10.
      const up = handTotal([this.dealer.up], this.dealerTotalOpts()).total;
      this._bribeTotal = up + 10;
      this._events.push({ t: 'note', text: `Bribed. The dealer settles at ${this._bribeTotal}.` });
    } else if (this._needsDealerDraw()) {
      const standAt = this.enemy.quirk.dealerStand || 17;
      const standSoft17 = this.run.hasFlag('dealerStandSoft17');
      let first = true, guard = 0;
      while (guard++ < 25) {
        const ht = handTotal(this.dealer.hand, this.dealerTotalOpts());
        if (ht.total > 21) break;
        if (standSoft17 && ht.soft && ht.total === 17) break;
        if (ht.total >= standAt) break;
        const c = (first && this._loadedSpring) ? this._drawFor('dealer', { lowest: true }) : this._drawFor('dealer');
        first = false; this._loadedSpring = false;
        if (!c) break;
        this.dealer.hand.push(c);
        this._events.push({ t: 'deal', side: 'dealer', card: c, faceUp: true });
        if (c.ench === 'heavy') { this._events.push({ t: 'note', text: 'A Heavy card — the dealer must stand.' }); break; }
      }
    }

    // resolve each hand in order
    for (const hand of this._hands) {
      this._resolveHand(hand, null);
      if (this._over) break; // enemy or player died mid-split
    }
    this._finalizeDealtHand();
  }

  _dealerFinalTotal() {
    if (this._bribe) return this._bribeTotal;
    return handTotal(this.dealer.hand, this.dealerTotalOpts()).total;
  }

  // fire per-dealt-hand effects that must happen exactly once (Rusted Croupier tick)
  _finalizeDealtHand() {
    if (this._periodicDone) return;
    this._periodicDone = true;
    this._maybePeriodicStrike();
  }

  // ---------- resolution & damage ----------
  _resolveHand(hand, forced) {
    const q = this.enemy.quirk;
    this._curHand = hand;
    const pt = hand.forceTotal != null ? hand.forceTotal : (hand.total != null ? hand.total : handTotal(hand.cards, this.playerTotalOpts()).total);
    const dt = this._dealerFinalTotal();

    let outcome = forced;
    if (!outcome) {
      if (hand.bust) outcome = 'playerBust';
      else if (hand.charlie) outcome = 'playerCharlie';
      else if (dt > 21) outcome = 'dealerBust';
      else if (pt > dt) outcome = 'playerWin';
      else if (pt < dt) outcome = 'dealerWin';
      else outcome = 'push';
    }

    // Widow's Veil: disable enemy quirks on hands where player stood <= 16
    this._veiled = this.run.hasFlag('widowsVeil') && (outcome !== 'playerBust') && pt <= 16;

    // Marble Valet / House: pushes count as dealer wins
    if (outcome === 'push' && (this._veiled ? false : q.pushIsDealerWin)) outcome = 'dealerWin';

    const win = outcome === 'playerWin' || outcome === 'playerBlackjack' || outcome === 'dealerBust' || outcome === 'playerCharlie';
    const meta = {
      outcome, playerTotal: pt, dealerTotal: this._bribe ? this._bribeTotal : dt,
      win, blackjack: outcome === 'playerBlackjack', dealerBust: outcome === 'dealerBust',
      charlie: outcome === 'playerCharlie', bust: outcome === 'playerBust',
      doubled: hand.doubled, split: hand.split, cards: hand.cards.filter((c) => !c.dead).length,
      dealerWon: outcome === 'dealerWin' || outcome === 'dealerBlackjack',
    };

    // HEAT change happens BEFORE damage so a winning hand hits with the flame it just lit.
    this._applyHeat(meta);

    if (win) this._dealDamage(outcome, meta);
    else if (outcome === 'push') this._resolvePush(meta);
    else this._takeDamage(outcome, meta);

    // Stake side-effects that key off winner/loser (Blood heal, The Rake chips)
    this._applyStakeResolution(meta);

    if (q.onResolve && !this._veiled) q.onResolve(this, meta);

    this.run.stats.handsPlayed++;
    this._checkDeaths();
    this._curHand = null;
  }

  _applyHeat(meta) {
    if (this.stake && this.stake.frozenHeat) { this._events.push({ t: 'heat', value: this.run.heat, delta: 0 }); return; }
    const before = this.run.heat;
    if (meta.win) {
      this.run.heat = Math.min(this.heatCap(), before + 1);
    } else if (meta.outcome === 'push') {
      // push keeps Heat
    } else {
      this.run.heat = this.run.hasFlag('slowBurn') ? Math.max(0, before - 1) : 0;
    }
    this._events.push({ t: 'heat', value: this.run.heat, delta: this.run.heat - before });
  }

  // Pure damage-dealt calculation (also used by the Stand preview). No side effects.
  _damageDealtValue(meta, hand, heatOverride = null) {
    let dmg;
    if (meta.blackjack) dmg = 32;
    else if (meta.dealerBust) dmg = meta.playerTotal + 5;
    else dmg = meta.playerTotal;

    if (meta.doubled) dmg *= 2;
    dmg += enchantDamageBonus(hand.cards);
    if (this._songActive('encore') && meta.win) dmg += 3;                 // song: Encore +3
    for (const r of this.relicList()) if (r.modDealt) dmg = r.modDealt(this, dmg, meta);

    const heat = heatOverride != null ? heatOverride : this.run.heat;
    dmg *= this.heatMult(heat);                                           // A1 Heat multiplier
    if (meta.charlie) dmg *= 1.5;                                         // A3 Five-Card Charlie
    if (this.stake && this.stake.allDamageX2) dmg *= 2;                   // Double or Nothing
    if (this.stake && this.stake.longOdds && meta.win && meta.cards >= 5) dmg *= 3; // The Long Odds

    if (this.enemy.quirk.modDealt && !this._veiled) dmg = this.enemy.quirk.modDealt(this, dmg, meta);
    return Math.max(0, Math.round(dmg));
  }

  _dealDamage(outcome, meta) {
    const hand = this._curHand;
    const dmg = this._damageDealtValue(meta, hand);
    this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
    this.run.stats.damageDealt += dmg;
    if (dmg > this.run.stats.biggestHand) this.run.stats.biggestHand = dmg;
    this.run.stats.handsWon++;

    const heat = this.run.heat;
    this._events.push({
      t: 'outcome',
      kind: meta.blackjack ? 'blackjack' : meta.charlie ? 'charlie' : 'win',
      label: meta.blackjack ? 'BLACKJACK' : meta.charlie ? 'CHARLIE' : (outcome === 'dealerBust' ? 'DEALER BUSTS' : 'YOU WIN'),
      playerTotal: meta.playerTotal, dealerTotal: meta.dealerTotal, split: meta.split,
    });
    this._events.push({ t: 'enemyDamage', amount: dmg, crit: meta.blackjack || meta.charlie, heat });

    // song: Lullaby — heal 4 per hand won
    if (this._songActive('lullaby')) {
      const before = this.player.hp;
      this.player.hp = Math.min(this.run.maxHp, this.player.hp + 4);
      if (this.player.hp > before) this._events.push({ t: 'playerHeal', amount: this.player.hp - before, reason: 'song' });
    }

    this._awardChips(meta);
    if (this.enemy.quirk.onEnemyDamaged) this.enemy.quirk.onEnemyDamaged(this);
  }

  _takeDamage(outcome, meta) {
    let dmg;
    if (outcome === 'dealerBlackjack') dmg = this.enemy.atk * 1.5;
    else if (outcome === 'playerBust') dmg = this.enemy.atk * 1.25;
    else dmg = this.enemy.atk;

    if (meta.doubled) dmg *= 2;

    if (meta.bust && this._cigarette) { dmg = 0; this._cigarette = false; this._events.push({ t: 'note', text: 'The cigarette burns your fear to nothing.' }); }
    if (meta.bust && this.enemy.quirk.onBust && !this._veiled) this.enemy.quirk.onBust(this);
    if (meta.bust && this._housePhase2) {
      const heal = meta.playerTotal;
      this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + heal);
      this._events.push({ t: 'enemyHeal', amount: heal, reason: 'fine-print' });
    }
    for (const r of this.relicList()) if (r.modTaken) dmg = r.modTaken(this, dmg, meta);
    if (this._insurance && dmg > 0) { dmg = 0; this._insurance = false; this._events.push({ t: 'note', text: 'The Insurance Slip pays out — no wound taken.' }); }
    if (this.stake && this.stake.allDamageX2) dmg *= 2;                   // Double or Nothing (both ways)
    if (this.enemy.quirk.modTaken && !this._veiled) dmg = this.enemy.quirk.modTaken(this, dmg, meta);

    dmg = Math.max(0, Math.round(dmg));

    this.player.hp = Math.max(0, this.player.hp - dmg);
    // remember how the last wound was dealt, for keyed death epitaphs (story.js)
    this._lastLoss = meta.bust ? 'bust' : 'dealer';
    this._events.push({
      t: 'outcome',
      kind: meta.bust ? 'bust' : 'lose',
      label: meta.bust ? 'BUST' : (outcome === 'dealerBlackjack' ? 'DEALER BLACKJACK' : 'YOU LOSE'),
      playerTotal: meta.playerTotal, dealerTotal: meta.dealerTotal, split: meta.split,
    });
    if (dmg > 0) this._events.push({ t: 'playerDamage', amount: dmg });
  }

  _resolvePush(meta) {
    const pd = this.run.hasFlag('pushDamage');
    if (pd) {
      const dmg = pd;
      this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
      this.run.stats.damageDealt += dmg;
      this._events.push({ t: 'outcome', kind: 'push', label: 'PUSH', playerTotal: meta.playerTotal, dealerTotal: meta.dealerTotal, split: meta.split });
      this._events.push({ t: 'enemyDamage', amount: dmg, crit: false });
      if (this.enemy.quirk.onEnemyDamaged) this.enemy.quirk.onEnemyDamaged(this);
    } else {
      this._events.push({ t: 'outcome', kind: 'push', label: 'PUSH', playerTotal: meta.playerTotal, dealerTotal: meta.dealerTotal, split: meta.split });
    }
  }

  // Blood Stakes (winner heals 6) and The Rake (winner takes 12 chips from loser).
  _applyStakeResolution(meta) {
    if (!this.stake) return;
    if (meta.outcome === 'push') return;
    if (this.stake.heal) {
      if (meta.win) {
        const before = this.player.hp;
        this.player.hp = Math.min(this.run.maxHp, this.player.hp + this.stake.heal);
        if (this.player.hp > before) this._events.push({ t: 'playerHeal', amount: this.player.hp - before, reason: 'blood' });
      } else if (meta.dealerWon) {
        const before = this.enemy.hp;
        this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + this.stake.heal);
        if (this.enemy.hp > before) this._events.push({ t: 'enemyHeal', amount: this.enemy.hp - before, reason: 'blood' });
      }
    }
    if (this.stake.rake) {
      if (meta.win) { this.run.chips += this.stake.rake; this._events.push({ t: 'chipGain', amount: this.stake.rake, reason: 'rake' }); }
      else if (meta.dealerWon || meta.bust) { const take = Math.min(this.stake.rake, this.run.chips); if (take > 0) { this.run.chips -= take; this._events.push({ t: 'chipLoss', amount: take, reason: 'rake' }); } }
    }
  }

  _maybePeriodicStrike() {
    const en = this.enemy.quirk.everyN;
    if (!en || this._veiled) return;
    if (this.enemy.handCount % en.n === 0) {
      const strike = Math.max(1, Math.round(this.enemy.atk * (en.halfAttack ? 0.5 : 1)));
      this.player.hp = Math.max(0, this.player.hp - strike);
      this._lastLoss = 'dealer';
      this._events.push({ t: 'playerDamage', amount: strike, reason: 'periodic' });
      this._events.push({ t: 'note', text: 'The Croupier strikes on the count.' });
      this._checkDeaths();
    }
  }

  _awardChips(meta) {
    let chips = 6;
    let margin = Math.min(10, Math.max(0, meta.playerTotal - Math.min(21, meta.dealerTotal)));
    if (meta.dealerBust) margin = Math.min(10, Math.max(1, meta.playerTotal - 17));
    if (meta.charlie) margin = Math.min(10, Math.max(1, meta.playerTotal - 17));
    chips += margin;
    if (this.run.hasFlag('rabbitFoot')) chips += margin;
    this.run.chips += chips;
    this._events.push({ t: 'chipGain', amount: chips, reason: 'win' });
    for (const r of this.relicList()) if (r.onWin) r.onWin(this, meta);
  }

  _checkDeaths() {
    if (this.enemy.hp <= 0 && !this._over) { this._events.push({ t: 'enemyDead' }); this._over = 'won'; }
    else if (this.player.hp <= 0 && !this._over) {
      // Keyed death cause: a boss names itself; otherwise how the last wound landed.
      this.deathCause = this.enemy.tier === 'boss' ? this.enemy.id : (this._lastLoss || 'dealer');
      this._events.push({ t: 'playerDead' });
      this._over = 'lost';
    }
  }

  _fightState(fallback) {
    if (this._over === 'won') return 'won';
    if (this._over === 'lost') return 'lost';
    return fallback;
  }

  // ---------- Stand damage preview (A5) ----------
  // The damage you'd deal if you STAND now and win — including Heat and bonuses.
  previewStandDamage() {
    if (this.state !== 'playerTurn') return null;
    const hand = this.activeHand();
    const ht = handTotal(hand.cards, this.playerTotalOpts());
    if (ht.bust) return null;
    const cards = hand.cards.filter((c) => !c.dead).length;
    const frozen = this.stake && this.stake.frozenHeat;
    const heat = frozen ? this.run.heat : Math.min(this.heatCap(), this.run.heat + 1);
    const meta = {
      outcome: 'playerWin', playerTotal: ht.total, dealerTotal: 0,
      win: true, blackjack: false, dealerBust: false, charlie: false, bust: false,
      doubled: false, split: hand.split, cards, dealerWon: false,
    };
    this._veiled = false;
    return this._damageDealtValue(meta, hand, heat);
  }

  // fight end relic hooks (called by UI on victory)
  onFightEnd() {
    for (const r of this.relicList()) if (r.onFightEnd) r.onFightEnd(this);
    this._sync();
  }
}
