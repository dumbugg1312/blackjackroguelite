// enemies.js — roster + bosses. Quirks are hook objects consulted by combat.js.
//
// Quirk shape (all optional):
//   dealerStand: number (dealer hits until >= this; default 17)
//   holeFaceUp: bool          — dealer's hole card dealt face up
//   forbidDouble: bool
//   pushIsDealerWin: bool
//   playerFaceValue: number   — face cards count as this for the PLAYER
//   playerAceValue / dealerAceValue: number — force ace value for a side
//   forceDealerTen: bool      — dealer up card forced to a 10-value from the shoe
//   twoHands: bool            — dealer draws two hole cards, uses the better (Bailiff)
//   swapAfterFirstAction: bool — Cardsharp
//   everyN: {n, halfAttack}   — Rusted Croupier
//   Hook fns (receive combat `c`): onHandStart, onPlayerHit, onBust, onDealtHand,
//     modDealt(c,dmg,meta), modTaken(c,dmg,meta), onResolve(c,res), onEnemyDamaged(c)

function P(body, opts = {}) {
  // portrait builder: a framed sigil
  const bg = opts.bg || 'var(--surface)';
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="${bg}"/>${body}</svg>`;
}

export const ENEMIES = [
  {
    id: 'usher', name: 'The Usher', tier: 'normal', floors: [1, 2],
    intro: 'Welcome down. Sit. I will show you how we play.',
    voiceWin: ['A clean hand.', 'You learn quickly.'],
    voiceLose: ['Mind the count.', 'The House is patient.'],
    plaque: 'No tricks. The House plays it straight.',
    quirk: {},
    portrait: () => P(`<circle cx="50" cy="38" r="18" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <path d="M32 66 Q50 52 68 66 L68 82 L32 82 Z" fill="var(--primary-deep)" stroke="var(--accent-deep)"/>
      <rect x="44" y="30" width="12" height="16" fill="var(--accent)"/>`),
  },
  {
    id: 'croupier', name: 'Rusted Croupier', tier: 'normal',
    intro: 'My hands are stiff, but the rake never sleeps.',
    voiceWin: ['Grind, grind.', 'The wheel turns.'],
    voiceLose: ['Tch. Oil in my joints.'],
    plaque: 'Every 3rd hand, strikes for half Attack — win or lose.',
    quirk: { everyN: { n: 3, halfAttack: true } },
    portrait: () => P(`<g stroke="var(--accent-deep)" stroke-width="2" fill="none">
      <circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="8" fill="var(--primary)"/>
      </g><g stroke="var(--accent)" stroke-width="2">
      <line x1="50" y1="20" x2="50" y2="30"/><line x1="50" y1="70" x2="50" y2="80"/>
      <line x1="20" y1="50" x2="30" y2="50"/><line x1="70" y1="50" x2="80" y2="50"/></g>`),
  },
  {
    id: 'weeper', name: 'The Weeper', tier: 'normal',
    intro: 'Your ruin nourishes me. Please... overreach.',
    voiceWin: ['Mmm. Delicious.', 'Cry with me.'],
    voiceLose: ['No... not yet...'],
    plaque: 'Heals 4 whenever you bust.',
    quirk: { onBust: (c) => { c.enemy.hp = Math.min(c.enemy.maxHp, c.enemy.hp + 4); c._events.push({ t: 'enemyHeal', amount: 4 }); } },
    portrait: () => P(`<circle cx="50" cy="46" r="24" fill="var(--primary-deep)"/>
      <circle cx="42" cy="42" r="4" fill="var(--card-face)"/><circle cx="58" cy="42" r="4" fill="var(--card-face)"/>
      <path d="M42 46 Q42 70 40 82" stroke="var(--primary)" stroke-width="3" fill="none"/>
      <path d="M58 46 Q58 70 60 82" stroke="var(--primary)" stroke-width="3" fill="none"/>
      <path d="M42 58 Q50 64 58 58" stroke="var(--accent-deep)" stroke-width="2" fill="none"/>`),
  },
  {
    id: 'pitfiend', name: 'Pit Fiend', tier: 'normal',
    intro: 'I do not stop. I do not blink. I take.',
    voiceWin: ['More.', 'Down you go.'],
    voiceLose: ['Impossible.'],
    plaque: 'Dealer hits until 18.',
    quirk: { dealerStand: 18 },
    portrait: () => P(`<path d="M28 40 L50 20 L72 40 L64 76 L36 76 Z" fill="var(--primary-deep)" stroke="var(--primary-hot)" stroke-width="2"/>
      <path d="M30 40 L38 30 M70 40 L62 30" stroke="var(--primary-hot)" stroke-width="3"/>
      <circle cx="42" cy="52" r="4" fill="var(--primary-hot)"/><circle cx="58" cy="52" r="4" fill="var(--primary-hot)"/>
      <path d="M40 66 L50 62 L60 66" stroke="var(--card-face)" stroke-width="2" fill="none"/>`),
  },
  {
    id: 'counter', name: 'The Counter', tier: 'normal',
    intro: 'I have nothing to hide. That is what makes me cruel.',
    voiceWin: ['Predicted.', 'I see every card.'],
    voiceLose: ['A miscalculation.'],
    plaque: 'Plays with its hole card face-up. Attack +3.',
    atkBonus: 3,
    quirk: { holeFaceUp: true },
    portrait: () => P(`<rect x="30" y="26" width="40" height="48" rx="4" fill="var(--card-face)"/>
      <circle cx="50" cy="42" r="10" fill="none" stroke="var(--card-ink)" stroke-width="2"/>
      <circle cx="50" cy="42" r="4" fill="var(--primary)"/>
      <text x="50" y="66" font-family="serif" font-size="12" fill="var(--card-ink)" text-anchor="middle">21</text>`),
  },
  {
    id: 'valet', name: 'Marble Valet', tier: 'normal',
    intro: 'A tie is a loss. I decide what a tie is.',
    voiceWin: ['As expected.', 'The stone remembers.'],
    voiceLose: ['A crack in the marble.'],
    plaque: 'Pushes count as dealer wins.',
    quirk: { pushIsDealerWin: true },
    portrait: () => P(`<rect x="34" y="24" width="32" height="52" fill="var(--muted)" stroke="var(--line)" stroke-width="1.5"/>
      <circle cx="50" cy="40" r="9" fill="var(--surface)"/>
      <path d="M40 58 L60 58 M40 66 L60 66" stroke="var(--surface)" stroke-width="2"/>`),
  },
  {
    id: 'chandler', name: 'The Chandler', tier: 'normal',
    intro: 'Every light has its price. So does every card.',
    voiceWin: ['The wax runs low.', 'Burn for me.'],
    voiceLose: ['Snuffed.'],
    plaque: 'Your first hit each hand costs 2 HP (wax tax).',
    quirk: {
      onHandStart: (c) => { c._chandlerCharged = true; },
      onPlayerHit: (c) => {
        if (c._chandlerCharged) {
          c._chandlerCharged = false;
          c.player.hp = Math.max(0, c.player.hp - 2);
          c._events.push({ t: 'playerDamage', amount: 2, reason: 'wax', silent: true });
        }
      },
    },
    portrait: () => P(`<rect x="46" y="40" width="8" height="36" fill="var(--card-face)"/>
      <ellipse cx="50" cy="34" rx="5" ry="9" fill="var(--accent)"/>
      <ellipse cx="50" cy="30" rx="2.5" ry="5" fill="var(--card-face)"/>
      <path d="M40 76 L60 76 L58 82 L42 82 Z" fill="var(--accent-deep)"/>`),
  },
  {
    id: 'widow', name: 'Velvet Widow', tier: 'normal',
    intro: 'Your royalty means nothing at my table, darling.',
    voiceWin: ['Poor little kings.', 'Bow to me.'],
    voiceLose: ['You cheated fate.'],
    plaque: 'Your face cards (J/Q/K) count as 9 while she deals.',
    quirk: { playerFaceValue: 9 },
    portrait: () => P(`<path d="M30 76 Q30 40 50 30 Q70 40 70 76 Z" fill="var(--primary-deep)"/>
      <circle cx="50" cy="34" r="12" fill="var(--surface-2)"/>
      <path d="M38 30 Q50 18 62 30" fill="none" stroke="var(--primary)" stroke-width="3"/>
      <path d="M44 56 L50 60 L56 56" stroke="var(--primary-hot)" stroke-width="2" fill="none"/>`),
  },
  {
    id: 'auditor', name: 'The Auditor', tier: 'normal',
    intro: 'Doubling is a form of hope. I have filed a complaint.',
    voiceWin: ['Noted.', 'Per the ledger.'],
    voiceLose: ['An irregularity.'],
    plaque: 'Doubling down is forbidden.',
    quirk: { forbidDouble: true },
    portrait: () => P(`<rect x="32" y="24" width="36" height="52" fill="var(--surface-2)" stroke="var(--accent-deep)"/>
      <line x1="38" y1="34" x2="62" y2="34" stroke="var(--muted)" stroke-width="2"/>
      <line x1="38" y1="44" x2="62" y2="44" stroke="var(--muted)" stroke-width="2"/>
      <line x1="38" y1="54" x2="62" y2="54" stroke="var(--muted)" stroke-width="2"/>
      <path d="M34 60 L66 40" stroke="var(--primary-hot)" stroke-width="3"/>`),
  },
  {
    id: 'clerk', name: 'Coffin Clerk', tier: 'normal',
    intro: 'I always start with ten. It is the weight of the lid.',
    voiceWin: ['Filed away.', 'Rest now.'],
    voiceLose: ['The nail slips.'],
    plaque: 'Starts every hand with a 10 showing.',
    quirk: { forceDealerTen: true },
    portrait: () => P(`<path d="M40 22 L60 22 L66 50 L50 80 L34 50 Z" fill="var(--surface-2)" stroke="var(--accent-deep)" stroke-width="1.5"/>
      <text x="50" y="52" font-family="serif" font-size="18" fill="var(--accent)" text-anchor="middle">10</text>`),
  },
  {
    id: 'bailiff', name: 'The Bailiff', tier: 'elite',
    intro: 'Two writs. I serve whichever hurts you more.',
    voiceWin: ['Order in the pit.', 'Sentenced.'],
    voiceLose: ['Objection sustained.'],
    plaque: 'ELITE — Draws two hole cards; plays the better hand.',
    quirk: { twoHands: true },
    portrait: () => P(`<rect x="26" y="30" width="22" height="30" rx="2" fill="var(--card-face)"/>
      <rect x="52" y="30" width="22" height="30" rx="2" fill="var(--card-face)"/>
      <path d="M30 70 L70 70 L64 82 L36 82 Z" fill="var(--curse)"/>
      <circle cx="37" cy="45" r="3" fill="var(--card-ink)"/><circle cx="63" cy="45" r="3" fill="var(--card-red)"/>`, { bg: 'var(--surface)' }),
  },
  {
    id: 'saint', name: 'Saint of Aces', tier: 'elite',
    intro: 'Every ace is a prayer. They all answer to me.',
    voiceWin: ['Amen.', 'The aces are mine.'],
    voiceLose: ['Blasphemy.'],
    plaque: 'ELITE — Aces count 11 for her, 1 for you.',
    quirk: { dealerAceValue: 11, playerAceValue: 1 },
    portrait: () => P(`<circle cx="50" cy="46" r="26" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <path d="M50 26 L56 44 L74 44 L60 54 L64 72 L50 60 L36 72 L40 54 L26 44 L44 44 Z" fill="var(--accent)"/>
      <text x="50" y="52" font-family="serif" font-size="14" fill="var(--surface)" text-anchor="middle">A</text>`, { bg: 'var(--surface)' }),
  },
  // SPEC2 §D — stake-aware enemy (Acts II–III). Every hand at his table flips a Stake.
  {
    id: 'oddsmaker', name: 'The Oddsmaker', tier: 'normal', minFloor: 8,
    intro: 'The odds move every hand. I make sure of it.',
    voiceWin: ['The house edge holds.', 'As the line predicted.'],
    voiceLose: ['The line was wrong. Rare.'],
    plaque: 'Every hand flips a Table Stake.',
    quirk: { stakeEveryHand: true },
    portrait: () => P(`<rect x="26" y="24" width="48" height="52" rx="3" fill="var(--surface-2)" stroke="var(--accent-deep)"/>
      <path d="M40 34 L48 46 L40 58 L32 46 Z" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
      <path d="M60 34 L68 46 L60 58 L52 46 Z" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
      <path d="M32 68 h36" stroke="var(--primary)" stroke-width="2"/>`, { bg: 'var(--surface)' }),
  },
];

export const BOSSES = {
  7: {
    id: 'bouncer', name: 'THE BOUNCER', role: 'Keeper of the First Gate', tier: 'boss',
    intro: "You're not on the list. You're in it.",
    voiceWin: ['That all?', 'Sit back down.'],
    voiceLose: ['...huh.'],
    plaque: "Hands won with total < 17 deal him NOTHING. Below 50% HP: his Attack +4.",
    hp: 118, atk: 13,
    quirk: {
      modDealt: (c, dmg, meta) => {
        // Any winning hand whose total is under 17 deals nothing — including a
        // dealer-bust win (the only realistic way to "win" below 17 vs a dealer
        // that stands on 17). Naturals are 21, so never caught here.
        if (meta.playerTotal != null && meta.playerTotal < 17 && !meta.blackjack) {
          c._events.push({ t: 'note', text: "He doesn't feel small change." });
          return 0;
        }
        return dmg;
      },
      onEnemyDamaged: (c) => {
        if (!c._phase2 && c.enemy.hp <= c.enemy.maxHp * 0.5) {
          c._phase2 = true;
          c.enemy.atk += 4;
          c._events.push({ t: 'bossPhase', phase: 2, plaque: 'Enraged — Attack +4.', name: c.enemy.name });
        }
      },
    },
    portrait: () => P(`<rect x="24" y="30" width="52" height="50" rx="4" fill="var(--primary-deep)"/>
      <rect x="30" y="20" width="40" height="16" rx="3" fill="var(--surface-2)"/>
      <circle cx="40" cy="50" r="3" fill="var(--primary-hot)"/><circle cx="60" cy="50" r="3" fill="var(--primary-hot)"/>
      <path d="M38 66 L62 66" stroke="var(--card-face)" stroke-width="3"/>
      <path d="M20 44 L28 40 M80 44 L72 40" stroke="var(--accent)" stroke-width="3"/>`, { bg: 'var(--surface)' }),
  },
  14: {
    id: 'cardsharp', name: 'THE CARDSHARP', role: 'Master of the Vaults', tier: 'boss',
    intro: 'I dealt your wedding, you know. Lovely hand. Shame how it played out.',
    voiceWin: ['Sleight of fate.', 'You never saw it.'],
    voiceLose: ['A rare misdeal.'],
    plaque: 'After your first action, he swaps one of your cards with the shoe. Double & lose → he heals the difference.',
    hp: 165, atk: 17,
    quirk: {
      swapAfterFirstAction: true,
      modTaken: (c, dmg, meta) => {
        if (meta.doubled && meta.dealerWon) {
          const heal = Math.round(dmg / 2);
          c.enemy.hp = Math.min(c.enemy.maxHp, c.enemy.hp + heal);
          c._events.push({ t: 'enemyHeal', amount: heal, reason: 'sharp-double' });
        }
        return dmg;
      },
    },
    portrait: () => P(`<path d="M30 30 L50 22 L70 30 L66 74 L50 82 L34 74 Z" fill="var(--surface-2)" stroke="var(--curse)" stroke-width="2"/>
      <rect x="38" y="40" width="12" height="18" rx="2" fill="var(--card-face)" transform="rotate(-14 44 49)"/>
      <rect x="50" y="40" width="12" height="18" rx="2" fill="var(--card-face)" transform="rotate(14 56 49)"/>
      <circle cx="50" cy="34" r="3" fill="var(--accent)"/>`, { bg: 'var(--surface)' }),
  },
  21: {
    id: 'house', name: 'THE HOUSE', role: 'The Thing in the Walls', tier: 'boss',
    intro: 'Sit. You\'ve come twenty floors to hear me say it: the Marker is real. Your signature is real. Nothing in this room is yours — including the chair.',
    voiceWin: ['The House always wins.', 'Sign here. In blood.'],
    voiceLose: ['...you cannot. You CANNOT.'],
    plaque: 'THE RAKE — Pushes are House wins. Takes 2 chips per hand dealt.',
    plaque2: 'THE FINE PRINT — Your busts heal the House. Your 21s deal double.',
    hp: 220, atk: 19,
    quirk: {
      pushIsDealerWin: true,
      onDealtHand: (c) => {
        if (!c._housePhase2 && c.run.chips > 0) {
          const take = Math.min(2, c.run.chips);
          c.run.chips -= take;
          c._events.push({ t: 'chipLoss', amount: take, reason: 'rake' });
        }
      },
      onBust: (c) => {
        if (c._housePhase2) {
          // handled in resolve via bust heal — flagged
        }
      },
      modDealt: (c, dmg, meta) => {
        if (c._housePhase2 && meta.playerTotal === 21 && !meta.blackjack) {
          c._events.push({ t: 'note', text: 'Exactly twenty-one. The fine print bites.' });
          return dmg * 2;
        }
        return dmg;
      },
      onEnemyDamaged: (c) => {
        if (!c._housePhase2 && c.enemy.hp <= c.enemy.maxHp * 0.5) {
          c._housePhase2 = true;
          c.enemy.quirk.pushIsDealerWin = true;
          c._events.push({ t: 'bossPhase', phase: 2, plaque: c.enemy.def.plaque2, name: c.enemy.name, houseFinePrint: true });
        }
      },
    },
    portrait: () => P(`<rect x="18" y="18" width="64" height="64" fill="var(--bg)"/>
      <path d="M50 24 L74 50 L50 76 L26 50 Z" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <path d="M50 36 L64 50 L50 64 L36 50 Z" fill="var(--primary-deep)"/>
      <circle cx="50" cy="50" r="5" fill="var(--primary-hot)"/>
      <path d="M20 20 L30 20 M80 20 L70 20 M20 80 L30 80 M80 80 L70 80" stroke="var(--accent-deep)" stroke-width="2"/>`, { bg: 'var(--surface)' }),
  },
};

// Build a concrete enemy instance for a floor.
export function makeEnemy(def, floor, isElite = false) {
  let hp, atk;
  if (def.tier === 'boss') {
    hp = def.hp; atk = def.atk;
  } else {
    // SPEC2 §C retuned scaling: HP 24 + floor×6 (elite ×1.5), Attack 6 + floor×1.0 (elite +3).
    hp = Math.round((24 + floor * 6) * (isElite ? 1.5 : 1));
    atk = Math.round(6 + floor * 1.0) + (def.atkBonus || 0) + (isElite ? 3 : 0);
  }
  // deep-ish clone of quirk so per-fight mutable flags don't leak
  const quirk = Object.assign({}, def.quirk);
  return {
    def, id: def.id, name: def.name, tier: def.tier,
    hp, maxHp: hp, atk,
    quirk,
    plaque: def.plaque,
    portrait: def.portrait,
    handCount: 0,
  };
}
