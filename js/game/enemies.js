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
  // portrait builder: a candlelit bust emerging from the dark.
  // `id` must be unique per enemy — gradient ids are document-global.
  const id = opts.id || 'px';
  const glow = opts.glow || 'oklch(0.55 0.09 85)';
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="${id}-bg" cx="50%" cy="88%" r="85%">
        <stop offset="0%" stop-color="oklch(0.22 0.05 353)"/>
        <stop offset="55%" stop-color="oklch(0.12 0.025 353)"/>
        <stop offset="100%" stop-color="oklch(0.07 0.012 353)"/>
      </radialGradient>
      <radialGradient id="${id}-up" cx="50%" cy="100%" r="70%">
        <stop offset="0%" stop-color="${glow}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-sh" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stop-color="oklch(0.3 0.06 353)"/>
        <stop offset="100%" stop-color="oklch(0.14 0.03 353)"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#${id}-bg)"/>
    ${body}
    <rect width="100" height="100" fill="url(#${id}-up)" opacity="0.55"/>
  </svg>`;
}

export const ENEMIES = [
  {
    id: 'usher', name: 'The Usher', tier: 'normal', floors: [1, 2],
    intro: 'Welcome down. Sit. I will show you how we play.',
    voiceWin: ['A clean hand.', 'You learn quickly.'],
    voiceLose: ['Mind the count.', 'The House is patient.'],
    plaque: 'No tricks. The House plays it straight.',
    quirk: {},
    portrait: () => P(`
      <path d="M22 100 L26 66 Q28 52 40 48 L60 48 Q72 52 74 66 L78 100 Z" fill="url(#ush-sh)"/>
      <path d="M40 48 L46 56 L50 92 L54 56 L60 48 L58 100 L42 100 Z" fill="oklch(0.9 0.015 85)" opacity="0.9"/>
      <path d="M46 56 L50 92 L54 56 L52 54 L48 54 Z" fill="oklch(0.32 0.09 353)"/>
      <ellipse cx="50" cy="32" rx="13" ry="16" fill="oklch(0.78 0.03 85)"/>
      <path d="M37 30 Q37 14 50 14 Q63 14 63 30 L63 26 Q63 18 50 17 Q37 18 37 26 Z" fill="oklch(0.16 0.02 353)"/>
      <ellipse cx="44.5" cy="33" rx="3.4" ry="2.6" fill="oklch(0.12 0.02 353)"/>
      <ellipse cx="55.5" cy="33" rx="3.4" ry="2.6" fill="oklch(0.12 0.02 353)"/>
      <circle cx="44.5" cy="33" r="1" fill="var(--accent)"/>
      <circle cx="55.5" cy="33" r="1" fill="var(--accent)"/>
      <path d="M40 28 L48 30 M60 28 L52 30" stroke="oklch(0.5 0.03 85)" stroke-width="1" fill="none"/>
      <path d="M44 44 Q50 46.5 56 44" stroke="oklch(0.5 0.04 40)" stroke-width="1.2" fill="none"/>
      <path d="M47 38 Q50 40 53 38" stroke="oklch(0.62 0.03 85)" stroke-width="0.8" fill="none" opacity="0.7"/>
      <circle cx="56" cy="33" r="5.4" fill="none" stroke="var(--accent)" stroke-width="0.9" opacity="0.85"/>
      <path d="M60 37 Q66 46 64 58" stroke="var(--accent)" stroke-width="0.8" fill="none" opacity="0.7"/>
      <circle cx="64" cy="60" r="1.4" fill="var(--accent)"/>
      <path d="M35 62 Q42 58 46 60 M65 62 Q58 58 54 60" stroke="oklch(0.4 0.06 85)" stroke-width="1" fill="none" opacity="0.6"/>`,
      { id: 'ush' }),
  },
  {
    id: 'croupier', name: 'Rusted Croupier', tier: 'normal',
    intro: 'My hands are stiff, but the rake never sleeps.',
    voiceWin: ['Grind, grind.', 'The wheel turns.'],
    voiceLose: ['Tch. Oil in my joints.'],
    plaque: 'Every 3rd hand, strikes for half Attack — win or lose.',
    quirk: { everyN: { n: 3, halfAttack: true } },
    portrait: () => P(`
      <path d="M20 100 L26 68 Q30 54 44 52 L56 52 Q70 54 74 68 L80 100 Z" fill="url(#cro-sh)"/>
      <path d="M30 100 L34 70 L40 66 L38 100 M70 100 L66 70 L60 66 L62 100" fill="oklch(0.35 0.06 40)" opacity="0.7"/>
      <ellipse cx="50" cy="32" rx="15" ry="17" fill="oklch(0.82 0.02 85)"/>
      <path d="M38 22 Q44 14 50 15 Q60 15 64 26 L60 24 Q54 18 44 21 Z" fill="oklch(0.45 0.07 40)"/>
      <path d="M50 15 L50 49 M41 20 Q45 34 43 47 M59 20 Q55 34 57 47" stroke="oklch(0.55 0.05 40)" stroke-width="0.7" fill="none" opacity="0.8"/>
      <path d="M62 26 L64 40 L58 46 Z" fill="oklch(0.5 0.08 40)" opacity="0.85"/>
      <circle cx="44" cy="32" r="4.6" fill="oklch(0.14 0.02 353)"/>
      <circle cx="44" cy="32" r="4.6" fill="none" stroke="var(--accent-deep)" stroke-width="1"/>
      <circle cx="44" cy="32" r="1.2" fill="var(--primary)"/>
      <g stroke="var(--accent-deep)" stroke-width="0.9">
        <circle cx="57" cy="32" r="5" fill="oklch(0.2 0.03 85)"/>
        <path d="M57 26.5 L57 24.5 M57 37.5 L57 39.5 M51.5 32 L49.5 32 M62.5 32 L64.5 32 M53 28 L51.6 26.6 M61 36 L62.4 37.4 M61 28 L62.4 26.6 M53 36 L51.6 37.4"/>
      </g>
      <circle cx="57" cy="32" r="1.6" fill="var(--accent)"/>
      <path d="M42 43 L58 43" stroke="oklch(0.4 0.04 40)" stroke-width="1.4"/>
      <path d="M44 43 L44 46 M48 43 L48 46.5 M52 43 L52 46.5 M56 43 L56 46" stroke="oklch(0.4 0.04 40)" stroke-width="1"/>
      <path d="M36 56 Q50 62 64 56 L64 60 Q50 66 36 60 Z" fill="oklch(0.28 0.05 40)"/>`,
      { id: 'cro' }),
  },
  {
    id: 'weeper', name: 'The Weeper', tier: 'normal',
    intro: 'Your ruin nourishes me. Please... overreach.',
    voiceWin: ['Mmm. Delicious.', 'Cry with me.'],
    voiceLose: ['No... not yet...'],
    plaque: 'Heals 4 whenever you bust.',
    quirk: { onBust: (c) => { c.enemy.hp = Math.min(c.enemy.maxHp, c.enemy.hp + 4); c._events.push({ t: 'enemyHeal', amount: 4 }); } },
    portrait: () => P(`
      <path d="M24 100 Q24 62 34 54 L66 54 Q76 62 76 100 Z" fill="oklch(0.24 0.07 353)"/>
      <ellipse cx="50" cy="34" rx="14" ry="17" fill="oklch(0.75 0.035 353)"/>
      <path d="M32 16 Q50 8 68 16 L70 44 Q68 58 62 62 L62 40 Q60 20 50 19 Q40 20 38 40 L38 62 Q32 58 30 44 Z" fill="oklch(0.2 0.05 353)" opacity="0.92"/>
      <path d="M30 20 Q50 30 70 20 L70 30 Q50 40 30 30 Z" fill="oklch(0.3 0.09 353)" opacity="0.5"/>
      <ellipse cx="44" cy="33" rx="3" ry="3.6" fill="oklch(0.95 0.01 85)"/>
      <ellipse cx="56" cy="33" rx="3" ry="3.6" fill="oklch(0.95 0.01 85)"/>
      <circle cx="44" cy="34" r="1.1" fill="oklch(0.2 0.04 353)"/>
      <circle cx="56" cy="34" r="1.1" fill="oklch(0.2 0.04 353)"/>
      <path d="M44 37 Q43 58 40 78 Q39 88 37 96" stroke="var(--primary)" stroke-width="2.2" fill="none" opacity="0.9"/>
      <path d="M56 37 Q57 58 60 78 Q61 88 63 96" stroke="var(--primary)" stroke-width="2.2" fill="none" opacity="0.9"/>
      <path d="M44 37 Q44.8 52 44 62" stroke="oklch(0.8 0.1 353)" stroke-width="0.9" fill="none"/>
      <path d="M56 37 Q55.2 52 56 62" stroke="oklch(0.8 0.1 353)" stroke-width="0.9" fill="none"/>
      <path d="M45 45 Q50 48.5 55 45" stroke="oklch(0.45 0.05 353)" stroke-width="1.1" fill="none"/>
      <path d="M46.5 45.6 L46.5 47.4 M49 46.6 L49 48.4 M51.5 46.6 L51.5 48.4 M54 45.6 L54 47.4" stroke="oklch(0.45 0.05 353)" stroke-width="0.8"/>
      <circle cx="37.5" cy="97" r="1.3" fill="var(--primary)" opacity="0.8"/>
      <circle cx="62.5" cy="97" r="1.3" fill="var(--primary)" opacity="0.8"/>`,
      { id: 'wee', glow: 'oklch(0.5 0.14 353)' }),
  },
  {
    id: 'pitfiend', name: 'Pit Fiend', tier: 'normal',
    intro: 'I do not stop. I do not blink. I take.',
    voiceWin: ['More.', 'Down you go.'],
    voiceLose: ['Impossible.'],
    plaque: 'Dealer hits until 18.',
    quirk: { dealerStand: 18 },
    portrait: () => P(`
      <path d="M18 100 Q20 66 32 58 L68 58 Q80 66 82 100 Z" fill="oklch(0.18 0.05 20)"/>
      <path d="M50 10 Q44 20 46 26 Q48 30 50 30 Q52 30 54 26 Q56 20 50 10" fill="oklch(0.6 0.17 40)" opacity="0.55"/>
      <path d="M33 26 Q30 12 38 8 Q37 18 42 22 Z" fill="oklch(0.35 0.1 20)"/>
      <path d="M67 26 Q70 12 62 8 Q63 18 58 22 Z" fill="oklch(0.35 0.1 20)"/>
      <path d="M34 24 Q34 14 50 13 Q66 14 66 24 L68 46 Q64 60 50 62 Q36 60 32 46 Z" fill="oklch(0.26 0.08 20)"/>
      <path d="M34 24 Q50 30 66 24 L66 30 Q50 36 34 30 Z" fill="oklch(0.4 0.12 20)" opacity="0.5"/>
      <path d="M38 38 L46 34 L46 42 Z" fill="var(--primary-hot)"/>
      <path d="M62 38 L54 34 L54 42 Z" fill="var(--primary-hot)"/>
      <circle cx="44" cy="38" r="1" fill="oklch(0.95 0.05 85)"/>
      <circle cx="56" cy="38" r="1" fill="oklch(0.95 0.05 85)"/>
      <path d="M40 52 L44 48 L48 52 L52 48 L56 52 L60 48" stroke="oklch(0.9 0.02 85)" stroke-width="1.6" fill="none"/>
      <path d="M40 52 L44 56 L48 52 L52 56 L56 52 L60 56" stroke="oklch(0.75 0.02 85)" stroke-width="1.2" fill="none" opacity="0.7"/>
      <path d="M30 70 Q40 66 50 68 Q60 66 70 70" stroke="oklch(0.45 0.12 20)" stroke-width="2" fill="none" opacity="0.6"/>`,
      { id: 'pit', glow: 'oklch(0.55 0.17 30)' }),
  },
  {
    id: 'counter', name: 'The Counter', tier: 'normal',
    intro: 'I have nothing to hide. That is what makes me cruel.',
    voiceWin: ['Predicted.', 'I see every card.'],
    voiceLose: ['A miscalculation.'],
    plaque: 'Plays with its hole card face-up. Attack +3.',
    atkBonus: 3,
    quirk: { holeFaceUp: true },
    portrait: () => P(`
      <path d="M24 100 L28 70 Q30 58 42 56 L58 56 Q70 58 72 70 L76 100 Z" fill="url(#cnt-sh)"/>
      <path d="M42 56 L50 66 L58 56 L56 100 L44 100 Z" fill="oklch(0.2 0.03 353)"/>
      <rect x="34" y="12" width="32" height="46" rx="4" fill="oklch(0.94 0.01 85)" transform="rotate(-2 50 35)"/>
      <rect x="34" y="12" width="32" height="46" rx="4" fill="none" stroke="oklch(0.6 0.04 85)" stroke-width="0.8" transform="rotate(-2 50 35)"/>
      <path d="M38 17 L41 17 M38 17 L38 22" stroke="var(--card-ink)" stroke-width="1.4"/>
      <path d="M62 52 L59 52 M62 52 L62 47" stroke="var(--card-ink)" stroke-width="1.4" transform="rotate(-2 50 35)"/>
      <circle cx="50" cy="34" r="9" fill="none" stroke="var(--card-ink)" stroke-width="1.6"/>
      <circle cx="50" cy="34" r="9" fill="oklch(0.9 0.02 85)"/>
      <ellipse cx="50" cy="34" rx="4.2" ry="5.4" fill="oklch(0.16 0.02 353)"/>
      <circle cx="50" cy="33" r="1.6" fill="var(--primary)"/>
      <circle cx="49.2" cy="32" r="0.5" fill="oklch(0.95 0.01 85)"/>
      <path d="M43 27 Q46 24 50 25 M57 27 Q54 24 50 25" stroke="oklch(0.4 0.03 353)" stroke-width="0.8" fill="none"/>
      <path d="M44 46 L56 46" stroke="var(--card-ink)" stroke-width="1"/>
      <path d="M46 46 L46 48 M50 46 L50 49 M54 46 L54 48" stroke="var(--card-ink)" stroke-width="0.8"/>
      <path d="M36 70 L64 70 M38 76 L62 76 M40 82 L60 82" stroke="oklch(0.4 0.05 85)" stroke-width="0.7" opacity="0.6"/>`,
      { id: 'cnt' }),
  },
  {
    id: 'valet', name: 'Marble Valet', tier: 'normal',
    intro: 'A tie is a loss. I decide what a tie is.',
    voiceWin: ['As expected.', 'The stone remembers.'],
    voiceLose: ['A crack in the marble.'],
    plaque: 'Pushes count as dealer wins.',
    quirk: { pushIsDealerWin: true },
    portrait: () => P(`
      <path d="M26 100 L28 74 Q30 60 42 58 L58 58 Q70 60 72 74 L74 100 Z" fill="oklch(0.72 0.008 85)"/>
      <path d="M26 100 L28 74 Q30 60 42 58 L46 60 Q34 64 33 76 L31 100 Z" fill="oklch(0.55 0.01 85)"/>
      <ellipse cx="50" cy="34" rx="14" ry="17" fill="oklch(0.82 0.008 85)"/>
      <path d="M36 30 Q38 16 50 16 Q62 16 64 30 Q60 22 50 22 Q40 22 36 30" fill="oklch(0.68 0.01 85)"/>
      <path d="M40 34 Q43 32 46 34" stroke="oklch(0.5 0.01 85)" stroke-width="1.4" fill="none"/>
      <path d="M54 34 Q57 32 60 34" stroke="oklch(0.5 0.01 85)" stroke-width="1.4" fill="none"/>
      <ellipse cx="43" cy="35.5" rx="2.4" ry="2.8" fill="oklch(0.88 0.005 85)"/>
      <ellipse cx="57" cy="35.5" rx="2.4" ry="2.8" fill="oklch(0.88 0.005 85)"/>
      <path d="M46 44 L54 44" stroke="oklch(0.55 0.01 85)" stroke-width="1.2"/>
      <path d="M58 20 L64 44 L61 46 L55 22 Z" fill="oklch(0.6 0.008 85)" opacity="0.7"/>
      <path d="M62 40 L74 58 M64 46 L70 56" stroke="oklch(0.45 0.012 85)" stroke-width="0.7" opacity="0.8"/>
      <path d="M44 63 L50 70 L56 63 L54 61 L50 64 L46 61 Z" fill="oklch(0.94 0.005 85)"/>
      <path d="M48 70 L52 70 L51 78 L49 78 Z" fill="oklch(0.5 0.012 85)"/>`,
      { id: 'val', glow: 'oklch(0.6 0.02 85)' }),
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
    portrait: () => P(`
      <path d="M26 100 Q28 70 38 62 L62 62 Q72 70 74 100 Z" fill="oklch(0.5 0.06 85)" opacity="0.85"/>
      <path d="M38 62 Q34 74 36 100 L30 100 Q28 76 34 64 Z" fill="oklch(0.65 0.05 85)" opacity="0.5"/>
      <path d="M36 20 Q36 12 50 12 Q64 12 64 20 L66 40 Q66 54 58 60 L60 44 Q58 30 50 30 Q42 30 40 44 L42 60 Q34 54 34 40 Z" fill="oklch(0.85 0.04 85)"/>
      <path d="M34 40 Q30 52 36 58 L40 52 Z M66 40 Q70 52 64 58 L60 52 Z" fill="oklch(0.78 0.05 85)" opacity="0.8"/>
      <ellipse cx="50" cy="38" rx="12" ry="15" fill="oklch(0.88 0.03 85)"/>
      <path d="M38 34 Q40 46 44 52 Q40 48 38 40 Z M62 34 Q60 46 56 52 Q60 48 62 40 Z" fill="oklch(0.8 0.045 85)"/>
      <ellipse cx="44.5" cy="37" rx="2.6" ry="3.2" fill="oklch(0.3 0.06 40)"/>
      <ellipse cx="55.5" cy="37" rx="2.6" ry="3.2" fill="oklch(0.3 0.06 40)"/>
      <circle cx="44.5" cy="36" r="0.9" fill="oklch(0.85 0.14 75)"/>
      <circle cx="55.5" cy="36" r="0.9" fill="oklch(0.85 0.14 75)"/>
      <path d="M46 46 Q50 44 54 46" stroke="oklch(0.6 0.05 60)" stroke-width="1.1" fill="none"/>
      <path d="M50 12 L50 4" stroke="oklch(0.35 0.03 60)" stroke-width="1.6"/>
      <path d="M50 6 Q47 2 50 -2 Q53 2 50 6" fill="oklch(0.85 0.14 75)"/>
      <ellipse cx="50" cy="3" rx="2.6" ry="4.4" fill="oklch(0.9 0.12 80)" opacity="0.85"/>
      <path d="M46 14 Q44 18 46 22 M54 13 Q56 17 54 21 M50 30 Q48 26 50 22" stroke="oklch(0.92 0.02 85)" stroke-width="1.3" fill="none" opacity="0.8"/>`,
      { id: 'cha', glow: 'oklch(0.75 0.13 80)' }),
  },
  {
    id: 'widow', name: 'Velvet Widow', tier: 'normal',
    intro: 'Your royalty means nothing at my table, darling.',
    voiceWin: ['Poor little kings.', 'Bow to me.'],
    voiceLose: ['You cheated fate.'],
    plaque: 'Your face cards (J/Q/K) count as 9 while she deals.',
    quirk: { playerFaceValue: 9 },
    portrait: () => P(`
      <path d="M22 100 Q24 66 36 58 L64 58 Q76 66 78 100 Z" fill="oklch(0.28 0.1 353)"/>
      <path d="M36 58 Q30 70 30 84 L34 84 Q35 70 40 62 Z" fill="oklch(0.4 0.13 353)" opacity="0.6"/>
      <ellipse cx="50" cy="36" rx="12" ry="14.5" fill="oklch(0.85 0.025 353)"/>
      <path d="M20 26 Q50 8 80 26 Q66 20 50 20 Q34 20 20 26" fill="oklch(0.2 0.06 353)"/>
      <ellipse cx="50" cy="22" rx="26" ry="7" fill="oklch(0.24 0.08 353)"/>
      <path d="M28 22 Q34 10 50 10 Q66 10 72 22 Q60 16 50 16 Q40 16 28 22" fill="oklch(0.3 0.1 353)"/>
      <path d="M24 24 Q50 44 76 24 L76 30 Q50 50 24 30 Z" fill="oklch(0.55 0.13 353)" opacity="0.22"/>
      <path d="M42 34 Q45 32 48 34" stroke="oklch(0.35 0.05 353)" stroke-width="1.2" fill="none"/>
      <path d="M52 34 Q55 32 58 34" stroke="oklch(0.35 0.05 353)" stroke-width="1.2" fill="none"/>
      <ellipse cx="45" cy="36.5" rx="2" ry="1.4" fill="oklch(0.3 0.06 353)"/>
      <ellipse cx="55" cy="36.5" rx="2" ry="1.4" fill="oklch(0.3 0.06 353)"/>
      <path d="M46.5 45 Q50 47.5 53.5 45 Q50 44 46.5 45" fill="oklch(0.5 0.17 15)"/>
      <circle cx="57" cy="42" r="0.8" fill="oklch(0.4 0.08 353)"/>
      <path d="M40 64 Q50 60 60 64 L58 68 Q50 64 42 68 Z" fill="oklch(0.5 0.15 353)" opacity="0.8"/>
      <circle cx="50" cy="66" r="1.8" fill="var(--accent)"/>`,
      { id: 'wid', glow: 'oklch(0.5 0.15 353)' }),
  },
  {
    id: 'auditor', name: 'The Auditor', tier: 'normal',
    intro: 'Doubling is a form of hope. I have filed a complaint.',
    voiceWin: ['Noted.', 'Per the ledger.'],
    voiceLose: ['An irregularity.'],
    plaque: 'Doubling down is forbidden.',
    quirk: { forbidDouble: true },
    portrait: () => P(`
      <path d="M26 100 L30 70 Q32 58 44 56 L56 56 Q68 58 70 70 L74 100 Z" fill="oklch(0.17 0.02 353)"/>
      <path d="M44 56 L50 64 L56 56 L55 100 L45 100 Z" fill="oklch(0.88 0.01 85)"/>
      <path d="M47 66 L53 66 L52 74 L48 74 Z M48 78 L52 78 L51.5 86 L48.5 86 Z" fill="oklch(0.3 0.03 353)"/>
      <ellipse cx="50" cy="32" rx="12.5" ry="15" fill="oklch(0.72 0.025 85)"/>
      <path d="M38 26 Q40 15 50 15 Q60 15 62 26 L62 22 Q58 16 50 16 Q42 16 38 22 Z" fill="oklch(0.4 0.02 85)"/>
      <path d="M37 24 Q50 20 63 24" stroke="oklch(0.3 0.02 353)" stroke-width="1" fill="none"/>
      <g stroke="var(--accent-deep)" stroke-width="0.9" fill="oklch(0.9 0.01 85)">
        <circle cx="44.5" cy="32" r="4.4"/><circle cx="55.5" cy="32" r="4.4"/>
        <path d="M48.9 32 L51.1 32" fill="none"/>
        <path d="M40.1 32 Q36 30 34 26" fill="none"/>
      </g>
      <circle cx="44.5" cy="32" r="1.2" fill="oklch(0.15 0.02 353)"/>
      <circle cx="55.5" cy="32" r="1.2" fill="oklch(0.15 0.02 353)"/>
      <path d="M43 42.5 L57 42.5" stroke="oklch(0.42 0.03 40)" stroke-width="1.1"/>
      <path d="M40 27 Q42 25.5 44 26.5 M60 27 Q58 25.5 56 26.5" stroke="oklch(0.42 0.02 85)" stroke-width="0.8" fill="none"/>
      <rect x="60" y="66" width="16" height="22" rx="1" fill="oklch(0.62 0.05 85)" transform="rotate(8 68 77)"/>
      <path d="M63 71 L73 71 M63 75 L73 75 M63 79 L71 79 M63 83 L72 83" stroke="oklch(0.3 0.03 353)" stroke-width="0.7" transform="rotate(8 68 77)"/>
      <path d="M62 84 L74 68" stroke="var(--primary-hot)" stroke-width="1.6" transform="rotate(8 68 77)"/>`,
      { id: 'aud' }),
  },
  {
    id: 'clerk', name: 'Coffin Clerk', tier: 'normal',
    intro: 'I always start with ten. It is the weight of the lid.',
    voiceWin: ['Filed away.', 'Rest now.'],
    voiceLose: ['The nail slips.'],
    plaque: 'Starts every hand with a 10 showing.',
    quirk: { forceDealerTen: true },
    portrait: () => P(`
      <path d="M28 100 L32 72 Q34 62 44 60 L56 60 Q66 62 68 72 L72 100 Z" fill="oklch(0.2 0.035 300)"/>
      <path d="M40 10 L60 10 L66 30 L62 58 L38 58 L34 30 Z" fill="oklch(0.68 0.02 85)"/>
      <path d="M40 10 L60 10 L58 14 L42 14 Z" fill="oklch(0.45 0.025 85)"/>
      <path d="M34 30 L66 30" stroke="oklch(0.5 0.025 85)" stroke-width="0.8"/>
      <path d="M38 58 L62 58 L60 62 L40 62 Z" fill="oklch(0.5 0.025 85)"/>
      <ellipse cx="44" cy="33" rx="3.4" ry="4.6" fill="oklch(0.13 0.02 353)"/>
      <ellipse cx="56" cy="33" rx="3.4" ry="4.6" fill="oklch(0.13 0.02 353)"/>
      <circle cx="44" cy="34.5" r="1" fill="oklch(0.75 0.1 300)"/>
      <circle cx="56" cy="34.5" r="1" fill="oklch(0.75 0.1 300)"/>
      <path d="M42 48 L58 48" stroke="oklch(0.3 0.02 353)" stroke-width="1.6"/>
      <path d="M44 46.5 L44 49.5 M47 46.5 L47 49.5 M50 46.5 L50 49.5 M53 46.5 L53 49.5 M56 46.5 L56 49.5" stroke="oklch(0.35 0.02 85)" stroke-width="1.1"/>
      <path d="M46 22 Q50 20 54 22" stroke="oklch(0.5 0.025 85)" stroke-width="0.9" fill="none"/>
      <text x="50" y="25" font-family="Rozha One, serif" font-size="8" fill="oklch(0.36 0.05 85)" text-anchor="middle">10</text>
      <path d="M36 70 L64 70 M38 78 L62 78" stroke="oklch(0.4 0.06 300)" stroke-width="0.8" opacity="0.6"/>
      <circle cx="50" cy="74" r="2.4" fill="none" stroke="oklch(0.55 0.08 85)" stroke-width="0.8"/>`,
      { id: 'clk', glow: 'oklch(0.5 0.1 300)' }),
  },
  {
    id: 'bailiff', name: 'The Bailiff', tier: 'elite',
    intro: 'Two writs. I serve whichever hurts you more.',
    voiceWin: ['Order in the pit.', 'Sentenced.'],
    voiceLose: ['Objection sustained.'],
    plaque: 'ELITE — Draws two hole cards; plays the better hand.',
    quirk: { twoHands: true },
    portrait: () => P(`
      <path d="M18 100 L22 66 Q26 52 42 50 L58 50 Q74 52 78 66 L82 100 Z" fill="oklch(0.2 0.05 305)"/>
      <path d="M30 58 Q50 66 70 58 L68 64 Q50 72 32 64 Z" fill="var(--curse)" opacity="0.75"/>
      <circle cx="50" cy="62" r="3" fill="oklch(0.8 0.1 85)"/>
      <ellipse cx="50" cy="30" rx="16" ry="18" fill="oklch(0.68 0.03 305)"/>
      <path d="M50 12 Q34 12 34 30 L34 40 Q40 48 50 48 Z" fill="oklch(0.76 0.025 305)"/>
      <path d="M50 12 Q66 12 66 30 L66 40 Q60 48 50 48 Z" fill="oklch(0.5 0.04 305)"/>
      <path d="M50 12 L50 48" stroke="oklch(0.3 0.04 305)" stroke-width="1.2"/>
      <ellipse cx="42" cy="31" rx="2.8" ry="3.4" fill="oklch(0.14 0.02 353)"/>
      <ellipse cx="58" cy="31" rx="2.8" ry="3.4" fill="oklch(0.95 0.01 85)"/>
      <circle cx="58" cy="31" r="1.1" fill="var(--card-red)"/>
      <circle cx="42" cy="31" r="1.1" fill="oklch(0.7 0.1 305)"/>
      <path d="M42 41 Q46 44 50 43 M58 41 Q54 39 50 40" stroke="oklch(0.3 0.03 305)" stroke-width="1.2" fill="none"/>
      <path d="M36 22 Q40 19 45 21 M64 22 Q60 19 55 21" stroke="oklch(0.35 0.03 305)" stroke-width="1.1" fill="none"/>
      <rect x="24" y="64" width="15" height="21" rx="1.5" fill="oklch(0.93 0.01 85)" transform="rotate(-9 31 74)"/>
      <rect x="61" y="64" width="15" height="21" rx="1.5" fill="oklch(0.93 0.01 85)" transform="rotate(9 69 74)"/>
      <path d="M29 70 L34 70 M29 74 L34 74" stroke="var(--card-ink)" stroke-width="0.9" transform="rotate(-9 31 74)"/>
      <path d="M66 70 L71 70 M66 74 L71 74" stroke="var(--card-red)" stroke-width="0.9" transform="rotate(9 69 74)"/>`,
      { id: 'bai', glow: 'oklch(0.5 0.12 305)' }),
  },
  {
    id: 'saint', name: 'Saint of Aces', tier: 'elite',
    intro: 'Every ace is a prayer. They all answer to me.',
    voiceWin: ['Amen.', 'The aces are mine.'],
    voiceLose: ['Blasphemy.'],
    plaque: 'ELITE — Aces count 11 for her, 1 for you.',
    quirk: { dealerAceValue: 11, playerAceValue: 1 },
    portrait: () => P(`
      <circle cx="50" cy="34" r="24" fill="none" stroke="var(--accent)" stroke-width="1.4" opacity="0.9"/>
      <circle cx="50" cy="34" r="20" fill="none" stroke="oklch(0.65 0.11 85)" stroke-width="0.6" opacity="0.7"/>
      <g stroke="var(--accent)" stroke-width="0.8" opacity="0.75">
        <path d="M50 6 L50 12 M50 56 L50 62 M22 34 L28 34 M72 34 L78 34 M30 14 L34 18 M70 14 L66 18"/>
      </g>
      <path d="M26 100 Q28 70 40 62 L60 62 Q72 70 74 100 Z" fill="oklch(0.75 0.09 85)"/>
      <path d="M40 62 L50 74 L60 62 L58 100 L42 100 Z" fill="oklch(0.88 0.07 85)"/>
      <ellipse cx="50" cy="34" rx="12" ry="15" fill="oklch(0.9 0.045 85)"/>
      <path d="M38 30 Q38 17 50 17 Q62 17 62 30 L62 26 Q58 20 50 20 Q42 20 38 26 Z" fill="oklch(0.7 0.09 85)"/>
      <path d="M42 31 Q45 29.5 48 31 M52 31 Q55 29.5 58 31" stroke="oklch(0.45 0.07 85)" stroke-width="1.2" fill="none"/>
      <path d="M44 32 L44 35 M56 32 L56 35" stroke="oklch(0.45 0.07 85)" stroke-width="1"/>
      <path d="M44 37 Q44 44 42 50 M56 37 Q56 44 58 50" stroke="var(--accent)" stroke-width="1" fill="none" opacity="0.85"/>
      <circle cx="42" cy="52" r="1.2" fill="var(--accent)"/>
      <circle cx="58" cy="52" r="1.2" fill="var(--accent)"/>
      <path d="M47 45 Q50 46.5 53 45" stroke="oklch(0.55 0.06 85)" stroke-width="1" fill="none"/>
      <path d="M50 64 L53 70 L50 76 L47 70 Z" fill="var(--card-red)"/>
      <text x="50" y="72.5" font-family="Rozha One, serif" font-size="5" fill="oklch(0.95 0.01 85)" text-anchor="middle">A</text>`,
      { id: 'sai', glow: 'oklch(0.75 0.12 85)' }),
  },
  // SPEC2 §D — stake-aware enemy (Acts II–III). Every hand at his table flips a Stake.
  {
    id: 'oddsmaker', name: 'The Oddsmaker', tier: 'normal', minFloor: 8,
    intro: 'The odds move every hand. I make sure of it.',
    voiceWin: ['The house edge holds.', 'As the line predicted.'],
    voiceLose: ['The line was wrong. Rare.'],
    plaque: 'Every hand flips a Table Stake.',
    quirk: { stakeEveryHand: true },
    portrait: () => P(`
      <path d="M24 100 L28 70 Q30 58 42 56 L58 56 Q70 58 72 70 L76 100 Z" fill="oklch(0.22 0.04 353)"/>
      <path d="M42 56 L50 64 L58 56 L56 100 L44 100 Z" fill="oklch(0.35 0.09 353)"/>
      <path d="M46 68 L54 68 M46 76 L54 76 M47 84 L53 84" stroke="var(--accent)" stroke-width="0.8" opacity="0.7"/>
      <ellipse cx="50" cy="32" rx="13" ry="16" fill="oklch(0.74 0.03 85)"/>
      <path d="M50 16 Q37 16 37 32 L37 38 Q43 46 50 46 Z" fill="oklch(0.8 0.035 85)"/>
      <path d="M50 16 Q63 16 63 32 L63 38 Q57 46 50 46 Z" fill="oklch(0.58 0.04 85)"/>
      <path d="M36 22 Q36 12 50 12 Q64 12 64 22 L64 26 Q58 18 50 18 Q42 18 36 26 Z" fill="oklch(0.25 0.03 353)"/>
      <path d="M40 30 L44 34 L40 38 L36.5 34 Z" fill="none" stroke="oklch(0.35 0.05 85)" stroke-width="1.1"/>
      <path d="M60 30 L63.5 34 L60 38 L56 34 Z" fill="none" stroke="oklch(0.9 0.09 85)" stroke-width="1.1"/>
      <circle cx="40" cy="34" r="1" fill="oklch(0.25 0.04 353)"/>
      <circle cx="60" cy="34" r="1" fill="var(--accent)"/>
      <path d="M45 43 L55 41.5" stroke="oklch(0.35 0.04 40)" stroke-width="1.1"/>
      <path d="M50 12 L50 46" stroke="oklch(0.3 0.03 353)" stroke-width="0.7" opacity="0.7"/>
      <g opacity="0.85">
        <rect x="66" y="70" width="12" height="16" rx="1" fill="oklch(0.93 0.01 85)" transform="rotate(12 72 78)"/>
        <path d="M69 75 L75 75 M69 79 L75 79" stroke="var(--card-red)" stroke-width="0.8" transform="rotate(12 72 78)"/>
      </g>`,
      { id: 'odd' }),
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
    portrait: () => P(`
      <path d="M8 100 L12 62 Q16 44 34 42 L66 42 Q84 44 88 62 L92 100 Z" fill="oklch(0.24 0.08 353)"/>
      <path d="M34 42 L44 52 L50 48 L56 52 L66 42 L64 100 L36 100 Z" fill="oklch(0.15 0.03 353)"/>
      <path d="M44 52 L50 48 L56 52 L54 58 L46 58 Z" fill="oklch(0.9 0.01 85)"/>
      <path d="M48 58 L52 58 L51 70 L49 70 Z" fill="oklch(0.5 0.15 353)"/>
      <path d="M12 62 Q10 78 14 100 L22 100 Q20 76 24 60 Z M88 62 Q90 78 86 100 L78 100 Q80 76 76 60 Z" fill="oklch(0.3 0.09 353)"/>
      <path d="M35 8 L65 8 L68 24 L62 26 L38 26 L32 24 Z" fill="oklch(0.68 0.03 85)"/>
      <path d="M35 8 L65 8 L64 12 L36 12 Z" fill="oklch(0.45 0.025 85)"/>
      <path d="M38 26 L62 26 L64 40 Q57 46 50 46 Q43 46 36 40 Z" fill="oklch(0.72 0.03 85)"/>
      <path d="M38 30 L46 30 L46 34 L38 33 Z" fill="oklch(0.16 0.02 353)"/>
      <path d="M62 30 L54 30 L54 34 L62 33 Z" fill="oklch(0.16 0.02 353)"/>
      <circle cx="42.5" cy="31.8" r="1.1" fill="var(--primary-hot)"/>
      <circle cx="57.5" cy="31.8" r="1.1" fill="var(--primary-hot)"/>
      <path d="M43 41 L57 41" stroke="oklch(0.35 0.03 40)" stroke-width="1.8"/>
      <path d="M34 20 L38 22 M66 20 L62 22" stroke="oklch(0.4 0.025 85)" stroke-width="1"/>
      <g fill="oklch(0.75 0.1 85)">
        <circle cx="18" cy="88" r="2.6"/><circle cx="24" cy="86" r="2.6"/><circle cx="30" cy="86" r="2.6"/><circle cx="36" cy="88" r="2.6"/>
      </g>
      <path d="M64 84 Q72 82 80 86" stroke="oklch(0.55 0.09 85)" stroke-width="2" fill="none"/>`,
      { id: 'bou', glow: 'oklch(0.55 0.16 20)' }),
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
    portrait: () => P(`
      <path d="M22 100 L26 68 Q28 54 42 52 L58 52 Q72 54 74 68 L78 100 Z" fill="oklch(0.16 0.025 305)"/>
      <path d="M42 52 L50 62 L58 52 L57 100 L43 100 Z" fill="oklch(0.9 0.012 85)"/>
      <path d="M46 62 L54 62 L53 72 L47 72 Z" fill="oklch(0.4 0.1 305)"/>
      <circle cx="50" cy="78" r="1.6" fill="var(--accent)"/>
      <ellipse cx="50" cy="30" rx="12.5" ry="15.5" fill="oklch(0.88 0.015 85)"/>
      <path d="M38 24 Q39 13 50 13 Q61 13 62 24 L62 20 Q57 14 50 14 Q43 14 38 20 Z" fill="oklch(0.2 0.02 353)"/>
      <path d="M40 27 L47 27 L47 33 Q43.5 35.5 40 33 Z" fill="oklch(0.13 0.02 353)"/>
      <path d="M60 27 L53 27 L53 33 Q56.5 35.5 60 33 Z" fill="oklch(0.13 0.02 353)"/>
      <circle cx="43.5" cy="30" r="1" fill="var(--curse)"/>
      <circle cx="56.5" cy="30" r="1" fill="var(--curse)"/>
      <path d="M42 25.5 L47 26.5 M58 25.5 L53 26.5" stroke="oklch(0.3 0.02 353)" stroke-width="0.9"/>
      <path d="M44 40 Q50 44.5 56 40 Q53 41.5 50 41.5 Q47 41.5 44 40" fill="oklch(0.35 0.04 40)"/>
      <path d="M46 43.5 Q50 45 54 43.5" stroke="oklch(0.55 0.03 40)" stroke-width="0.7" fill="none"/>
      <g>
        <rect x="14" y="62" width="15" height="21" rx="1.5" fill="oklch(0.95 0.008 85)" transform="rotate(-24 21 72)"/>
        <rect x="20" y="58" width="15" height="21" rx="1.5" fill="oklch(0.95 0.008 85)" transform="rotate(-12 27 68)"/>
        <rect x="26" y="56" width="15" height="21" rx="1.5" fill="oklch(0.95 0.008 85)" transform="rotate(-2 33 66)"/>
        <path d="M31 62 L36 62 M31 66 L36 66" stroke="var(--card-red)" stroke-width="0.9" transform="rotate(-2 33 66)"/>
      </g>
      <g>
        <rect x="71" y="62" width="15" height="21" rx="1.5" fill="oklch(0.95 0.008 85)" transform="rotate(24 79 72)"/>
        <path d="M75 68 L80 68 M75 72 L80 72" stroke="var(--card-ink)" stroke-width="0.9" transform="rotate(24 79 72)"/>
      </g>
      <path d="M40 18 Q50 12 60 18" stroke="var(--curse)" stroke-width="0.8" fill="none" opacity="0.8"/>`,
      { id: 'shp', glow: 'oklch(0.5 0.12 305)' }),
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
    portrait: () => P(`
      <rect x="10" y="6" width="80" height="94" fill="oklch(0.09 0.015 353)"/>
      <path d="M10 6 L10 100 M22 6 L22 100 M78 6 L78 100 M90 6 L90 100" stroke="oklch(0.2 0.04 353)" stroke-width="2.5"/>
      <path d="M10 14 L90 14 M10 92 L90 92" stroke="oklch(0.35 0.06 85)" stroke-width="0.8" opacity="0.7"/>
      <path d="M26 6 L26 100 M74 6 L74 100" stroke="oklch(0.5 0.08 85)" stroke-width="0.5" opacity="0.5"/>
      <path d="M50 18 L80 52 L50 86 L20 52 Z" fill="none" stroke="var(--accent)" stroke-width="1.6"/>
      <path d="M50 24 L74 52 L50 80 L26 52 Z" fill="oklch(0.2 0.07 353)"/>
      <path d="M50 32 L66 52 L50 72 L34 52 Z" fill="oklch(0.3 0.11 353)"/>
      <path d="M50 32 L66 52 L50 72 Z" fill="oklch(0.24 0.09 353)"/>
      <ellipse cx="50" cy="52" rx="9" ry="12" fill="oklch(0.12 0.02 353)"/>
      <ellipse cx="50" cy="52" rx="4.5" ry="9" fill="oklch(0.55 0.17 20)"/>
      <ellipse cx="50" cy="52" rx="1.8" ry="6.5" fill="oklch(0.14 0.02 353)"/>
      <circle cx="48.8" cy="48" r="0.9" fill="oklch(0.95 0.02 85)"/>
      <g stroke="var(--accent)" stroke-width="0.7" opacity="0.85">
        <path d="M50 10 L50 16 M50 88 L50 94 M14 52 L20 52 M80 52 L86 52"/>
        <path d="M30 26 L35 31 M70 26 L65 31 M30 78 L35 73 M70 78 L65 73"/>
      </g>
      <path d="M22 30 Q26 52 22 74 M78 30 Q74 52 78 74" stroke="oklch(0.45 0.14 353)" stroke-width="0.8" fill="none" opacity="0.7"/>
      <path d="M34 96 L38 94 L42 96 L46 94 L50 96 L54 94 L58 96 L62 94 L66 96" stroke="oklch(0.5 0.08 85)" stroke-width="0.7" fill="none" opacity="0.8"/>`,
      { id: 'hou', glow: 'oklch(0.5 0.15 20)' }),
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
