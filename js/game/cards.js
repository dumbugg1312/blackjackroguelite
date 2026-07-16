// cards.js — card model, shoe, hand totals (soft/hard), enchantment hooks, SVG rendering

export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_NAME = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
export const RED = { H: true, D: true, S: false, C: false };

let _cardId = 0;
export function makeCard(rank, suit, ench = null) {
  return { id: ++_cardId, rank, suit, ench, sharpDelta: 0, dead: false };
}
// keep id counter ahead of any restored deck so new cards never collide
export function ensureCardId(maxSeen) { if (maxSeen > _cardId) _cardId = maxSeen; }

// Debt card: a dead card that counts 0 and does nothing.
export function makeDebtCard() {
  const c = makeCard('X', 'D', null);
  c.dead = true;
  return c;
}

export function makeStandardDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push(makeCard(r, s));
  return deck;
}

// base value of a non-ace card
function nonAceValue(card, faceValue = 10) {
  if (card.dead) return 0;
  if (card.rank === '10') return 10;
  if (['J', 'Q', 'K'].includes(card.rank)) return faceValue;
  return parseInt(card.rank, 10);
}

// Compute a hand total.
// opts: { faceValue, aceValue (force aces to fixed value & no soft), sharp (apply sharpDelta) }
export function handTotal(cards, opts = {}) {
  const faceValue = opts.faceValue ?? 10;
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.dead) continue;
    if (c.rank === 'A') {
      if (opts.aceValue != null) {
        total += opts.aceValue;
      } else {
        total += 11; aces++;
      }
    } else {
      total += nonAceValue(c, faceValue);
    }
    if (opts.sharp && c.sharpDelta) total += c.sharpDelta;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0, bust: total > 21 };
}

export function isNaturalBlackjack(cards, opts = {}) {
  const real = cards.filter((c) => !c.dead);
  if (real.length !== 2) return false;
  return handTotal(cards, opts).total === 21;
}

// display like "7 / 17" for soft
export function totalDisplay(cards, opts = {}) {
  const { total, soft, bust } = handTotal(cards, opts);
  if (soft && total <= 21) {
    const hard = total - 10;
    return { text: `${hard} / ${total}`, total, soft, bust };
  }
  return { text: `${total}`, total, soft, bust };
}

// ---- Shoe: shared draw pile for a fight ----
export class Shoe {
  constructor(masterCards, rng) {
    this.master = masterCards; // reference to run deck (source of truth)
    this.rng = rng;
    this.drawPile = [];
    this.discardPile = [];
    this.inPlay = new Set(); // ids of cards currently in a hand — never reshuffled back
    this.reshuffle();
    this.onReshuffle = null;
  }
  reshuffle(silent = false) {
    this.drawPile = this.rng.shuffle([...this.master, ...this.discardPile]);
    // when called at fight start, discard empty; during fight, master already dealt copies?
    // We treat master as full composition; fight uses fresh copies each reshuffle of remaining.
    this.discardPile = [];
    if (!silent && this.onReshuffle) this.onReshuffle();
  }
  // initialize a fresh fight shoe from full master
  freshFight() {
    this.drawPile = this.rng.shuffle(this.master.slice());
    this.discardPile = [];
  }
  get count() { return this.drawPile.length; }

  maybeReshuffle() {
    if (this.drawPile.length < 15) {
      // Reshuffle only genuinely discarded cards. Cards still in a hand (inPlay)
      // must NOT return to the draw pile — otherwise the same physical card could
      // be dealt to both sides, breaking shared-shoe integrity and the count.
      const pool = [...this.drawPile, ...this.discardPile];
      const back = [], held = [];
      for (const c of pool) (this.inPlay.has(c.id) ? held : back).push(c);
      this.drawPile = this.rng.shuffle(back);
      this.discardPile = held; // wait for these to leave play, then a later reshuffle reclaims them
      if (this.onReshuffle) this.onReshuffle();
      return true;
    }
    return false;
  }
  // draw top card (from end)
  draw() {
    if (this.drawPile.length === 0) this.maybeReshuffle();
    const c = this.drawPile.pop();
    if (c) this.discardPile.push(c);
    return c;
  }
  // peek next n without drawing
  peek(n = 1) { return this.drawPile.slice(-n).reverse(); }
  // remove and return the lowest-value card remaining (for Loaded Spring)
  drawLowest() {
    if (this.drawPile.length === 0) this.maybeReshuffle();
    let idx = -1, best = Infinity;
    for (let i = 0; i < this.drawPile.length; i++) {
      const v = this.drawPile[i].rank === 'A' ? 1 : nonAceValue(this.drawPile[i]);
      if (v < best) { best = v; idx = i; }
    }
    if (idx < 0) return this.draw();
    const [c] = this.drawPile.splice(idx, 1);
    this.discardPile.push(c);
    return c;
  }
  // put a specific card next to be drawn (Cardsharp swap uses shoe next)
  drawSpecificNext() { return this.draw(); }
}

// ================= RENDERING =================

// Suit pip as SVG path (shape-distinct, not color-only).
export function suitSVG(suit, extraClass = '') {
  const paths = {
    S: '<path d="M32 6 C 20 22, 6 30, 6 42 C 6 52, 15 56, 22 52 C 22 52, 20 58, 14 62 L 50 62 C 44 58, 42 52, 42 52 C 49 56, 58 52, 58 42 C 58 30, 44 22, 32 6 Z"/>',
    H: '<path d="M32 60 C 10 44, 4 32, 4 22 C 4 12, 12 6, 20 6 C 26 6, 30 10, 32 15 C 34 10, 38 6, 44 6 C 52 6, 60 12, 60 22 C 60 32, 54 44, 32 60 Z"/>',
    D: '<path d="M32 4 L 58 32 L 32 60 L 6 32 Z"/>',
    C: '<circle cx="32" cy="18" r="13"/><circle cx="20" cy="39" r="13"/><circle cx="44" cy="39" r="13"/><path d="M29 42 C 30 51 27.5 58 22 63 L 42 63 C 36.5 58 34 51 35 42 Z"/>',
  };
  const cls = RED[suit] ? 'red' : 'black';
  return `<svg class="suit-mark ${cls} ${extraClass}" viewBox="0 0 64 66" fill="currentColor" aria-hidden="true">${paths[suit]}</svg>`;
}

const ENCH_BADGE = { gilded: 'G', bloodstained: 'B', sharp: 'S', heavy: 'H', cursed: 'C' };
export const ENCH_LABEL = {
  gilded: 'Gilded', bloodstained: 'Bloodstained', sharp: 'Sharp', heavy: 'Heavy', cursed: 'Cursed',
};
export const ENCH_DESC = {
  gilded: '+4 chips whenever you draw this card.',
  bloodstained: '+5 damage when this card is in your winning hand.',
  sharp: 'Counts +1 or -1 — your choice when you draw it.',
  heavy: 'A dealer who draws this card must immediately stand.',
  cursed: '-4 damage when this card is in your winning hand. Cleanse at a Parlor.',
};

// Build the innerHTML of a .card element (face + back). Caller sets classes.
export function cardInnerHTML(card) {
  const back = `<div class="card-back"><div class="back-art">${cardBackArt()}</div></div>`;
  if (card.dead) {
    const face = `<div class="card-face black" style="align-items:center;justify-content:center;display:flex">
      <div style="text-align:center;opacity:.6"><div style="font-family:var(--font-display);font-size:2rem">?</div><div style="font-size:.6rem;letter-spacing:.1em">DEBT</div></div></div>`;
    return `<div class="card-inner">${face}${back}</div>`;
  }
  const colorCls = RED[card.suit] ? 'red' : 'black';
  const rank = card.rank;
  const face = `<div class="card-face ${colorCls}">
      <div class="corner tl"><span class="rank">${rank}</span>${suitSVG(card.suit)}</div>
      <div class="center-pip">${suitSVG(card.suit)}</div>
      <div class="corner br"><span class="rank">${rank}</span>${suitSVG(card.suit)}</div>
    </div>`;
  const foil = card.ench && card.ench !== 'cursed' ? '<div class="foil"></div>' : '';
  const vein = card.ench === 'cursed' ? '<div class="vein"></div>' : '';
  const badge = card.ench ? `<div class="ench-badge" title="${ENCH_LABEL[card.ench]}">${ENCH_BADGE[card.ench]}</div>` : '';
  return `<div class="card-inner">${face}${back}</div>${foil}${vein}${badge}`;
}

export function cardClasses(card) {
  const cls = ['card'];
  if (card.ench) cls.push('ench-' + card.ench);
  if (card.dead) cls.push('debt');
  if (card.ring) cls.push('ring-card');
  return cls.join(' ');
}

// Display name for a special card (the Weeping Bride's Ring), else null.
export function cardName(card) { return card.ring ? 'the Ring' : null; }

// A tooltip {title, body, tone} for an enchanted / special card (deck viewer).
export function cardEnchTooltip(card) {
  if (card.ring) {
    const body = card.ringUp
      ? 'Gilded (+4 chips when you draw it) and Bloodstained (+4 damage in a winning hand). Her ring, kept.'
      : 'Gilded (+4 chips when you draw it). The Weeping Bride\'s ring, riding in your shoe.';
    return { title: 'the Ring — 5 of Diamonds', body, tone: 'brass' };
  }
  if (!card.ench) return null;
  return { title: `${ENCH_LABEL[card.ench]} — ${card.rank}${card.suit === 'H' ? '♥' : card.suit === 'D' ? '♦' : card.suit === 'C' ? '♣' : '♠'}`, body: ENCH_DESC[card.ench], tone: card.ench === 'cursed' ? 'rose' : 'brass' };
}

// ornate rose-and-brass back pattern (pure SVG)
export function cardBackArt() {
  return `<svg viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id="rosegrid" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <path d="M10 2 L18 10 L10 18 L2 10 Z" fill="none" stroke="var(--accent-deep)" stroke-width="0.8"/>
        <circle cx="10" cy="10" r="1.6" fill="var(--primary)"/>
      </pattern>
    </defs>
    <rect x="2" y="2" width="96" height="126" fill="url(#rosegrid)" opacity="0.7"/>
    <g fill="none" stroke="var(--accent)" stroke-width="1.4">
      <circle cx="50" cy="65" r="26"/>
      <circle cx="50" cy="65" r="18"/>
    </g>
    <g fill="var(--primary)" transform="translate(50,65)">
      <path d="M0 -16 C -6 -8 -14 -6 -14 2 C -14 8 -8 10 -4 6 C -4 6 -6 10 -10 13 L 10 13 C 6 10 4 6 4 6 C 8 10 14 8 14 2 C 14 -6 6 -8 0 -16 Z" opacity="0.85"/>
    </g>
    <g stroke="var(--accent)" stroke-width="1" fill="none">
      <path d="M50 39 q 10 -6 18 0"/>
      <path d="M50 91 q 10 6 18 0"/>
      <path d="M50 39 q -10 -6 -18 0"/>
      <path d="M50 91 q -10 6 -18 0"/>
    </g>
  </svg>`;
}

// mini card for deck viewer
export function miniCardHTML(card) {
  if (card.dead) {
    return `<div class="mini-card black" title="Debt — a dead card"><div class="m-rank">?</div><div class="m-center" style="font-size:.55rem;align-self:center">DEBT</div></div>`;
  }
  const colorCls = RED[card.suit] ? 'red' : 'black';
  const enchCls = (card.ench ? ' ench-' + card.ench : '') + (card.ring ? ' ring-card' : '');
  const badge = card.ench ? `<div class="ench-badge" style="width:12px;height:12px;font-size:8px">${card.ring ? '♥' : ENCH_BADGE[card.ench]}</div>` : '';
  return `<div class="mini-card ${colorCls}${enchCls}" style="position:relative">
    <div style="display:flex;align-items:center;gap:2px"><span class="m-rank">${card.rank}</span>${suitSVG(card.suit, 'm-suit')}</div>
    <div class="m-center">${suitSVG(card.suit)}</div>${badge}</div>`;
}
