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
  // portrait builder: one candle below the sitter, darkness everywhere else.
  // Scaffolding shared by every portrait: warm pool of light rising from the
  // bottom edge, corner vignette, and two blur filters (`-soft` for shadow
  // edges, `-halo` for glows). Bodies declare their own gradients in a <defs>.
  // `id` must be unique per enemy — gradient/filter ids are document-global.
  const id = opts.id || 'px';
  const glow = opts.glow || 'oklch(0.66 0.11 80)';
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="${id}-bg" cx="50%" cy="98%" r="98%">
        <stop offset="0%" stop-color="oklch(0.20 0.05 65)"/>
        <stop offset="42%" stop-color="oklch(0.115 0.022 353)"/>
        <stop offset="100%" stop-color="oklch(0.055 0.008 353)"/>
      </radialGradient>
      <radialGradient id="${id}-pool" cx="50%" cy="100%" r="62%">
        <stop offset="0%" stop-color="${glow}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${id}-vig" cx="50%" cy="55%" r="72%">
        <stop offset="0%" stop-color="oklch(0 0 0)" stop-opacity="0"/>
        <stop offset="70%" stop-color="oklch(0 0 0)" stop-opacity="0"/>
        <stop offset="100%" stop-color="oklch(0 0 0)" stop-opacity="0.6"/>
      </radialGradient>
      <filter id="${id}-soft" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="1.1"/>
      </filter>
      <filter id="${id}-halo" x="-120%" y="-120%" width="340%" height="340%">
        <feGaussianBlur stdDeviation="3.4"/>
      </filter>
    </defs>
    <rect width="100" height="100" fill="url(#${id}-bg)"/>
    <ellipse cx="50" cy="103" rx="52" ry="30" fill="url(#${id}-pool)"/>
    ${body}
    <rect width="100" height="100" fill="url(#${id}-vig)"/>
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
      <defs>
        <linearGradient id="ush-coat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.35 0.055 45)"/>
          <stop offset="45%" stop-color="oklch(0.18 0.03 353)"/>
          <stop offset="100%" stop-color="oklch(0.10 0.015 353)"/>
        </linearGradient>
        <radialGradient id="ush-face" cx="50%" cy="96%" r="105%">
          <stop offset="0%" stop-color="oklch(0.80 0.075 70)"/>
          <stop offset="45%" stop-color="oklch(0.52 0.055 55)"/>
          <stop offset="100%" stop-color="oklch(0.24 0.03 353)"/>
        </radialGradient>
      </defs>
      <path d="M12 100 Q17 76 28 68 Q37 62 43 59 L43 51 L57 51 L57 59 Q63 62 72 68 Q83 76 88 100 Z" fill="url(#ush-coat)"/>
      <path d="M42 57 L47 66 L50 62 L53 66 L58 57 L54 53.5 L46 53.5 Z" fill="oklch(0.80 0.035 85)"/>
      <path d="M46.5 60 L50 64.5 L53.5 60 L50 57.5 Z" fill="oklch(0.32 0.1 353)"/>
      <ellipse cx="50" cy="34" rx="13" ry="16.5" fill="url(#ush-face)"/>
      <path d="M38.5 38 Q41 44.5 45 47.5 Q40 46 37.8 40.5 Z" fill="oklch(0.22 0.03 353)" opacity="0.6" filter="url(#ush-soft)"/>
      <path d="M61.5 38 Q59 44.5 55 47.5 Q60 46 62.2 40.5 Z" fill="oklch(0.22 0.03 353)" opacity="0.6" filter="url(#ush-soft)"/>
      <ellipse cx="50" cy="26.5" rx="11.5" ry="6.5" fill="oklch(0.16 0.022 353)" opacity="0.55" filter="url(#ush-soft)"/>
      <path d="M36.6 32 Q36 14.5 50 14 Q64 14.5 63.4 32 Q62 22 50 21 Q38 22 36.6 32 Z" fill="oklch(0.10 0.015 353)"/>
      <path d="M38.5 27 Q40.5 20.5 46 18.3" stroke="oklch(0.35 0.05 60)" stroke-width="0.7" fill="none" opacity="0.6"/>
      <ellipse cx="44.2" cy="32.6" rx="3.1" ry="2.5" fill="oklch(0.12 0.018 353)" filter="url(#ush-soft)"/>
      <ellipse cx="56" cy="32.6" rx="3.1" ry="2.5" fill="oklch(0.12 0.018 353)" filter="url(#ush-soft)"/>
      <circle cx="44.4" cy="32.9" r="0.95" fill="oklch(0.9 0.1 85)"/>
      <circle cx="56.2" cy="32.9" r="0.95" fill="oklch(0.9 0.1 85)"/>
      <path d="M47.6 39.8 Q50 38.4 52.4 39.8 L50 33.5 Z" fill="oklch(0.22 0.03 353)" opacity="0.5" filter="url(#ush-soft)"/>
      <path d="M48 40.5 L50 42.8 L52 40.5 L50 38.6 Z" fill="oklch(0.85 0.085 70)" opacity="0.9"/>
      <path d="M45 45.8 Q50 46.9 55 45.8" stroke="oklch(0.15 0.02 353)" stroke-width="1.1" fill="none"/>
      <circle cx="56" cy="32.8" r="5.7" fill="none" stroke="oklch(0.8 0.13 85)" stroke-width="1.7" filter="url(#ush-halo)" opacity="0.9"/>
      <circle cx="56" cy="32.8" r="5.7" fill="none" stroke="oklch(0.87 0.12 85)" stroke-width="0.9"/>
      <path d="M60.6 36.4 Q65.5 46 63 57.5" stroke="oklch(0.6 0.09 85)" stroke-width="0.7" fill="none" opacity="0.85"/>
      <circle cx="62.8" cy="59" r="1.2" fill="oklch(0.78 0.13 85)"/>`,
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
      <defs>
        <linearGradient id="cro-metal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.68 0.10 75)"/>
          <stop offset="40%" stop-color="oklch(0.42 0.07 65)"/>
          <stop offset="100%" stop-color="oklch(0.19 0.035 50)"/>
        </linearGradient>
        <linearGradient id="cro-coat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.31 0.05 40)"/>
          <stop offset="100%" stop-color="oklch(0.09 0.015 353)"/>
        </linearGradient>
      </defs>
      <path d="M6 100 Q12 76 26 66 Q36 59.5 44 57.5 L56 57.5 Q64 59.5 74 66 Q88 76 94 100 Z" fill="url(#cro-coat)"/>
      <path d="M43.5 50 L45 59 M56.5 50 L55 59" stroke="oklch(0.5 0.07 65)" stroke-width="2.6"/>
      <path d="M43.5 50 L45 59 M56.5 50 L55 59" stroke="oklch(0.26 0.04 50)" stroke-width="0.9"/>
      <path d="M35 20 Q35 13 42 12.5 L58 12.5 Q65 13 65 20 L65 40 Q65 50 56 52 L44 52 Q35 50 35 40 Z" fill="url(#cro-metal)"/>
      <path d="M35 22 L65 22 M50 12.5 L50 22" stroke="oklch(0.20 0.035 50)" stroke-width="0.8"/>
      <path d="M38 22 Q37.4 30 38.4 38 M62 22 Q62.8 31 61.8 40 M50 22 Q49.5 27 50.2 31" stroke="oklch(0.33 0.09 40)" stroke-width="1.5" fill="none" opacity="0.75"/>
      <path d="M44.5 52 Q45 58 44.2 64" stroke="oklch(0.33 0.09 40)" stroke-width="1.3" fill="none" opacity="0.6"/>
      <circle cx="43" cy="31" r="4.6" fill="oklch(0.10 0.015 353)"/>
      <circle cx="43" cy="31" r="4.6" fill="none" stroke="oklch(0.30 0.05 50)" stroke-width="0.9"/>
      <circle cx="43" cy="31.6" r="1.3" fill="oklch(0.52 0.15 35)" filter="url(#cro-soft)"/>
      <circle cx="58" cy="31" r="6.1" fill="oklch(0.13 0.02 60)"/>
      <circle cx="58" cy="31" r="6.1" fill="none" stroke="oklch(0.72 0.11 80)" stroke-width="1"/>
      <g stroke="oklch(0.6 0.09 75)" stroke-width="0.7" opacity="0.85">
        <path d="M58 25.5 L58 27.1 M58 34.9 L58 36.5 M52.5 31 L54.1 31 M61.9 31 L63.5 31 M54.1 27.1 L55.2 28.2 M60.8 33.8 L61.9 34.9"/>
      </g>
      <path d="M58 31 L61 27.2" stroke="oklch(0.85 0.14 80)" stroke-width="0.9"/>
      <circle cx="58" cy="31" r="1.5" fill="oklch(0.85 0.14 80)" filter="url(#cro-halo)"/>
      <circle cx="58" cy="31" r="1.1" fill="oklch(0.9 0.13 85)"/>
      <path d="M43 43.5 L57 43.5 L56 47.5 L44 47.5 Z" fill="oklch(0.15 0.025 50)"/>
      <path d="M45.5 43.5 L45.5 47.5 M48.5 43.5 L48.5 47.5 M51.5 43.5 L51.5 47.5 M54.5 43.5 L54.5 47.5" stroke="oklch(0.5 0.08 70)" stroke-width="0.7"/>
      <path d="M65 26 L70 26" stroke="oklch(0.55 0.09 85)" stroke-width="1.6"/>
      <circle cx="72.6" cy="26" r="3" fill="none" stroke="oklch(0.64 0.10 80)" stroke-width="1.4"/>
      <path d="M44 52 L56 52" stroke="oklch(0.8 0.12 80)" stroke-width="0.8" opacity="0.8"/>`,
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
      <defs>
        <linearGradient id="wee-hood" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.30 0.085 353)"/>
          <stop offset="50%" stop-color="oklch(0.17 0.05 353)"/>
          <stop offset="100%" stop-color="oklch(0.09 0.02 353)"/>
        </linearGradient>
        <radialGradient id="wee-face" cx="50%" cy="92%" r="100%">
          <stop offset="0%" stop-color="oklch(0.78 0.05 20)"/>
          <stop offset="50%" stop-color="oklch(0.54 0.05 353)"/>
          <stop offset="100%" stop-color="oklch(0.27 0.035 353)"/>
        </radialGradient>
      </defs>
      <path d="M4 100 Q8 62 22 42 Q34 24 50 23 Q66 24 78 42 Q92 62 96 100 Z" fill="url(#wee-hood)"/>
      <path d="M28 100 Q28 56 38 44 Q44 37 50 37 Q56 37 62 44 Q72 56 72 100 Z" fill="oklch(0.06 0.012 353)"/>
      <path d="M28 100 Q28 56 38 44 Q44 37 50 37 Q56 37 62 44 Q72 56 72 100" fill="none" stroke="oklch(0.52 0.13 353)" stroke-width="0.9" opacity="0.5"/>
      <ellipse cx="50" cy="45" rx="10.5" ry="13" fill="url(#wee-face)"/>
      <ellipse cx="45.6" cy="42.5" rx="2.6" ry="3.3" fill="oklch(0.10 0.015 353)"/>
      <ellipse cx="54.4" cy="42.5" rx="2.6" ry="3.3" fill="oklch(0.10 0.015 353)"/>
      <path d="M45.6 44.5 Q45 52 44.5 57.5" stroke="oklch(0.62 0.16 353)" stroke-width="2.4" fill="none" opacity="0.7" filter="url(#wee-halo)"/>
      <path d="M54.4 44.5 Q55 52 55.5 57.5" stroke="oklch(0.62 0.16 353)" stroke-width="2.4" fill="none" opacity="0.7" filter="url(#wee-halo)"/>
      <path d="M45.6 44.5 Q45 52 44.5 57.5" stroke="oklch(0.84 0.11 353)" stroke-width="1.1" fill="none"/>
      <path d="M54.4 44.5 Q55 52 55.5 57.5" stroke="oklch(0.84 0.11 353)" stroke-width="1.1" fill="none"/>
      <path d="M44.5 57.5 Q43.6 70 42.8 79 M55.5 57.5 Q56.4 70 57.2 79" stroke="oklch(0.72 0.13 353)" stroke-width="0.7" fill="none" opacity="0.6"/>
      <path d="M46.8 51.5 Q50 53.4 53.2 51.5" stroke="oklch(0.30 0.05 353)" stroke-width="1" fill="none"/>
      <path d="M43.5 100 Q43 90 46.5 84.5 Q48.5 81.5 50 81.5 Q51.5 81.5 53.5 84.5 Q57 90 56.5 100 Z" fill="oklch(0.68 0.05 20)"/>
      <path d="M50 82.5 L50 100" stroke="oklch(0.36 0.05 353)" stroke-width="0.9"/>
      <path d="M46.9 87 Q46.2 93 46.4 100 M53.1 87 Q53.8 93 53.6 100" stroke="oklch(0.44 0.05 353)" stroke-width="0.7" fill="none" opacity="0.8"/>
      <circle cx="42.9" cy="82" r="0.9" fill="oklch(0.85 0.12 353)" filter="url(#wee-soft)"/>
      <circle cx="57.3" cy="84.5" r="0.8" fill="oklch(0.85 0.12 353)" filter="url(#wee-soft)"/>`,
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
      <defs>
        <linearGradient id="pit-hide" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.40 0.12 32)"/>
          <stop offset="45%" stop-color="oklch(0.22 0.07 25)"/>
          <stop offset="100%" stop-color="oklch(0.10 0.03 20)"/>
        </linearGradient>
        <linearGradient id="pit-horn" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.56 0.06 60)"/>
          <stop offset="100%" stop-color="oklch(0.13 0.02 20)"/>
        </linearGradient>
      </defs>
      <path d="M-2 100 Q4 74 20 64 Q32 56 42 54 L58 54 Q68 56 80 64 Q96 74 102 100 Z" fill="url(#pit-hide)"/>
      <path d="M30 23 Q18 16 14 -4 L26 -4 Q27 8 39 17 Z" fill="url(#pit-horn)"/>
      <path d="M70 23 Q82 16 86 -4 L74 -4 Q73 8 61 17 Z" fill="url(#pit-horn)"/>
      <path d="M21 6 Q25 8 28 6 M18.5 -1 Q22.5 1 25.5 -1" stroke="oklch(0.10 0.02 20)" stroke-width="0.8" fill="none" opacity="0.6"/>
      <path d="M79 6 Q75 8 72 6 M81.5 -1 Q77.5 1 74.5 -1" stroke="oklch(0.10 0.02 20)" stroke-width="0.8" fill="none" opacity="0.6"/>
      <path d="M32 22 Q32 12 50 12 Q68 12 68 22 L68 36 Q68 50 50 52 Q32 50 32 36 Z" fill="url(#pit-hide)"/>
      <path d="M33 27 Q41 23.5 49 26 L49 33 Q41 29.5 33 32 Z" fill="oklch(0.08 0.02 20)"/>
      <path d="M67 27 Q59 23.5 51 26 L51 33 Q59 29.5 67 32 Z" fill="oklch(0.08 0.02 20)"/>
      <path d="M36 30.5 L44.5 28.3 L44.5 32.6 Z" fill="oklch(0.72 0.19 35)" filter="url(#pit-halo)"/>
      <path d="M64 30.5 L55.5 28.3 L55.5 32.6 Z" fill="oklch(0.72 0.19 35)" filter="url(#pit-halo)"/>
      <path d="M36 30.5 L44.5 28.3 L44.5 32.6 Z" fill="oklch(0.80 0.19 40)"/>
      <path d="M64 30.5 L55.5 28.3 L55.5 32.6 Z" fill="oklch(0.80 0.19 40)"/>
      <circle cx="43" cy="30.6" r="0.8" fill="oklch(0.97 0.03 85)"/>
      <circle cx="57" cy="30.6" r="0.8" fill="oklch(0.97 0.03 85)"/>
      <path d="M46.5 39.5 Q47.5 41.5 49 42 M53.5 39.5 Q52.5 41.5 51 42" stroke="oklch(0.55 0.16 30)" stroke-width="1" fill="none" opacity="0.85"/>
      <path d="M35 44 Q50 48.5 65 44 L65 48 Q50 53.5 35 48 Z" fill="oklch(0.06 0.015 20)"/>
      <path d="M37 44.6 L39.6 48.9 L42 45.4 L44.6 49.6 L47.2 45.8 L49.8 49.8 L52.4 45.8 L55 49.6 L57.6 45.4 L60 48.9 L62.6 44.6 Q50 48.6 37 44.6 Z" fill="oklch(0.86 0.05 80)"/>
      <path d="M40 51.5 L42.4 49.2 L44.8 51.8 L47.2 49.6 L49.6 52 L52 49.6 L54.4 51.8 L56.8 49.2 L59.2 51.5" stroke="oklch(0.55 0.04 60)" stroke-width="1" fill="none" opacity="0.7"/>
      <circle cx="30" cy="14" r="0.8" fill="oklch(0.75 0.17 40)" filter="url(#pit-soft)" opacity="0.8"/>
      <circle cx="72" cy="9" r="0.7" fill="oklch(0.75 0.17 40)" filter="url(#pit-soft)" opacity="0.7"/>
      <circle cx="66" cy="18" r="0.5" fill="oklch(0.8 0.15 50)" opacity="0.7"/>`,
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
      <defs>
        <linearGradient id="cnt-card" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.92 0.02 85)"/>
          <stop offset="55%" stop-color="oklch(0.72 0.025 80)"/>
          <stop offset="100%" stop-color="oklch(0.42 0.03 70)"/>
        </linearGradient>
        <linearGradient id="cnt-coat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.30 0.05 353)"/>
          <stop offset="100%" stop-color="oklch(0.09 0.015 353)"/>
        </linearGradient>
      </defs>
      <path d="M16 100 Q22 78 32 71 Q40 66 45 64.5 L55 64.5 Q60 66 68 71 Q78 78 84 100 Z" fill="url(#cnt-coat)"/>
      <path d="M46.5 54 L46.8 66 L53.2 66 L53.5 54 Z" fill="oklch(0.46 0.05 55)"/>
      <g transform="rotate(-4 50 36)">
        <rect x="35" y="13" width="30" height="44" rx="3.5" fill="url(#cnt-card)"/>
        <rect x="35" y="13" width="30" height="44" rx="3.5" fill="none" stroke="oklch(0.35 0.03 70)" stroke-width="0.7" opacity="0.8"/>
        <path d="M38.6 17.5 L40.4 20.7 L36.8 20.7 Z" fill="oklch(0.3 0.04 353)"/>
        <path d="M61.4 52.5 L59.6 49.3 L63.2 49.3 Z" fill="oklch(0.3 0.04 353)"/>
        <ellipse cx="50" cy="34" rx="8.6" ry="5.4" fill="oklch(0.97 0.008 85)"/>
        <ellipse cx="50" cy="34" rx="8.6" ry="5.4" fill="none" stroke="oklch(0.35 0.03 70)" stroke-width="0.8"/>
        <circle cx="50" cy="34" r="3.6" fill="oklch(0.36 0.1 85)"/>
        <circle cx="50" cy="34" r="3.6" fill="none" stroke="oklch(0.6 0.1 85)" stroke-width="0.5"/>
        <circle cx="50" cy="34" r="1.7" fill="oklch(0.1 0.015 353)"/>
        <circle cx="48.9" cy="33" r="0.7" fill="oklch(0.98 0.005 85)"/>
        <path d="M41.5 31 Q50 26.5 58.5 31" stroke="oklch(0.45 0.03 70)" stroke-width="0.7" fill="none" opacity="0.8"/>
        <g stroke="oklch(0.5 0.035 70)" stroke-width="0.55" opacity="0.7">
          <path d="M50 25.5 L50 22.5 M42.5 28 L40.5 25.8 M57.5 28 L59.5 25.8 M40 34 L37 34 M60 34 L63 34 M42.5 40 L40.5 42.2 M57.5 40 L59.5 42.2 M50 42.5 L50 45.5"/>
        </g>
        <path d="M58 13.5 L65 21" stroke="oklch(0.5 0.03 70)" stroke-width="0.5" opacity="0.6"/>
        <path d="M35.3 47 Q40 46 42 49" stroke="oklch(0.55 0.03 70)" stroke-width="0.5" opacity="0.5"/>
      </g>
      <circle cx="49.6" cy="34.2" r="2.6" fill="oklch(0.75 0.13 85)" opacity="0.4" filter="url(#cnt-halo)"/>
      <path d="M40 76 L40 82 M43 76 L43 82 M46 76 L46 82 M49 76 L49 82 M37.5 78.8 L51 79.6" stroke="oklch(0.6 0.09 85)" stroke-width="0.7" opacity="0.75"/>
      <path d="M56 84 L56 89 M59 84 L59 89 M62 84 L62 89" stroke="oklch(0.6 0.09 85)" stroke-width="0.7" opacity="0.55"/>`,
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
      <defs>
        <radialGradient id="val-stone" cx="50%" cy="95%" r="110%">
          <stop offset="0%" stop-color="oklch(0.88 0.012 85)"/>
          <stop offset="45%" stop-color="oklch(0.62 0.012 80)"/>
          <stop offset="100%" stop-color="oklch(0.30 0.012 300)"/>
        </radialGradient>
        <linearGradient id="val-plinth" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.55 0.03 85)"/>
          <stop offset="100%" stop-color="oklch(0.18 0.015 300)"/>
        </linearGradient>
      </defs>
      <path d="M26 100 L28 88 L72 88 L74 100 Z" fill="url(#val-plinth)"/>
      <path d="M28 88 L72 88 L70 84 L30 84 Z" fill="oklch(0.42 0.02 85)"/>
      <path d="M30 84 Q30 70 38 64 Q43 60.5 46 59.5 L46 51 L54 51 L54 59.5 Q57 60.5 62 64 Q70 70 70 84 Z" fill="url(#val-stone)"/>
      <path d="M56 60.5 Q64 66 66 76 L60 84 Q62 72 54 63.5 Z" fill="oklch(0.5 0.012 80)" opacity="0.8"/>
      <ellipse cx="50" cy="35" rx="13.5" ry="16.5" fill="url(#val-stone)"/>
      <path d="M36.8 32 Q36 15.5 50 15 Q64 15.5 63.2 32 Q61 21.5 50 21 Q39 21.5 36.8 32 Z" fill="oklch(0.48 0.012 85)"/>
      <path d="M39 24 Q41.5 20 45 18.6 M57 18.3 Q60.5 20.5 62 25" stroke="oklch(0.3 0.012 300)" stroke-width="0.6" fill="none" opacity="0.6"/>
      <path d="M39.5 31.4 Q43.5 29.2 47.2 31 M52.8 31 Q56.5 29.2 60.5 31.4" stroke="oklch(0.3 0.012 300)" stroke-width="1.2" fill="none" opacity="0.55" filter="url(#val-soft)"/>
      <path d="M40.5 33.5 Q43.5 31.5 46.5 33.5 Q43.5 35.8 40.5 33.5 Z" fill="oklch(0.74 0.012 85)"/>
      <path d="M53.5 33.5 Q56.5 31.5 59.5 33.5 Q56.5 35.8 53.5 33.5 Z" fill="oklch(0.74 0.012 85)"/>
      <path d="M40.5 33.5 Q43.5 31.5 46.5 33.5 M53.5 33.5 Q56.5 31.5 59.5 33.5" stroke="oklch(0.35 0.012 300)" stroke-width="0.7" fill="none"/>
      <path d="M48.7 31 L48.4 41.5 Q50 43.2 51.6 41.5 L51.3 31 Z" fill="oklch(0.78 0.012 85)" opacity="0.9"/>
      <path d="M47.8 42.4 Q50 43.8 52.2 42.4" stroke="oklch(0.35 0.012 300)" stroke-width="0.7" fill="none" opacity="0.7"/>
      <path d="M45.5 47.5 L54.5 47.5" stroke="oklch(0.35 0.012 300)" stroke-width="1.1"/>
      <path d="M45.8 49.2 Q50 50.2 54.2 49.2" stroke="oklch(0.76 0.012 85)" stroke-width="0.6" fill="none" opacity="0.7"/>
      <path d="M55 15.5 L53.5 24 L56.5 30 L54.5 38 L57 44" stroke="oklch(0.25 0.012 300)" stroke-width="0.8" fill="none" opacity="0.85"/>
      <path d="M63.2 28 L66 30 L64 34 Q62.8 31 63.2 28 Z" fill="oklch(0.22 0.015 300)"/>
      <rect x="43" y="91" width="14" height="4.5" rx="0.8" fill="oklch(0.55 0.09 85)"/>
      <path d="M45 93.2 L55 93.2" stroke="oklch(0.3 0.05 85)" stroke-width="0.6"/>`,
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
      <defs>
        <radialGradient id="cha-wax" cx="50%" cy="18%" r="115%">
          <stop offset="0%" stop-color="oklch(0.92 0.06 85)"/>
          <stop offset="45%" stop-color="oklch(0.72 0.055 75)"/>
          <stop offset="100%" stop-color="oklch(0.38 0.04 60)"/>
        </radialGradient>
        <linearGradient id="cha-robe" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.42 0.06 75)"/>
          <stop offset="100%" stop-color="oklch(0.12 0.02 60)"/>
        </linearGradient>
      </defs>
      <path d="M14 100 Q19 78 30 70 Q39 64 45 62 L55 62 Q61 64 70 70 Q81 78 86 100 Z" fill="url(#cha-robe)"/>
      <path d="M42 62 Q41 70 42.5 76 Q43.8 70 43.5 62 Z M57 62 Q58.5 71 57 79 Q55.8 70 56 62 Z" fill="oklch(0.8 0.05 80)" opacity="0.85"/>
      <path d="M38 20 Q38 16 50 16 Q62 16 62 20 L62 24 Q63.5 30 62 36 L61.5 48 Q60 56 50 57 Q40 56 38.5 48 L38 36 Q36.5 30 38 24 Z" fill="url(#cha-wax)"/>
      <path d="M40 22 Q40.5 30 39.5 36 Q41.5 30 41.8 22 Z" fill="oklch(0.88 0.05 85)"/>
      <path d="M46 20.5 Q46.5 26 45.5 31.5 Q47.5 27 47.8 20.5 Z" fill="oklch(0.9 0.055 85)"/>
      <path d="M56 21 Q57 29 55.8 35 Q58.2 29 58.4 21 Z" fill="oklch(0.86 0.05 82)"/>
      <path d="M41.5 34 Q44.5 32.6 47 34.2 Q46 37.4 43.5 38.2 Q41.8 36.6 41.5 34 Z" fill="oklch(0.24 0.035 55)"/>
      <path d="M53 34.2 Q55.5 32.6 58.5 34 Q58.4 37.8 55.5 39.6 Q53.6 37 53 34.2 Z" fill="oklch(0.24 0.035 55)"/>
      <circle cx="44.2" cy="35.4" r="0.85" fill="oklch(0.9 0.13 80)"/>
      <circle cx="55.8" cy="36.4" r="0.85" fill="oklch(0.9 0.13 80)"/>
      <path d="M44.5 47 Q48 49 52 48.4 Q54.5 48 56.5 46" stroke="oklch(0.34 0.04 55)" stroke-width="1.1" fill="none"/>
      <path d="M55 47.5 Q55.5 51 54.5 54" stroke="oklch(0.34 0.04 55)" stroke-width="0.8" fill="none" opacity="0.7"/>
      <path d="M50 16 L50 10.5" stroke="oklch(0.2 0.02 60)" stroke-width="1.3"/>
      <ellipse cx="50" cy="6.5" rx="4.5" ry="7" fill="oklch(0.75 0.15 55)" filter="url(#cha-halo)" opacity="0.9"/>
      <path d="M50 12 Q46.8 7 50 0.5 Q53.2 7 50 12 Z" fill="oklch(0.88 0.15 75)"/>
      <path d="M50 11 Q48.4 8 50 4.5 Q51.6 8 50 11 Z" fill="oklch(0.97 0.06 90)"/>
      <ellipse cx="50" cy="17.5" rx="9" ry="2.6" fill="oklch(0.95 0.07 85)" opacity="0.55" filter="url(#cha-soft)"/>`,
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
      <defs>
        <linearGradient id="wid-gown" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.42 0.13 353)"/>
          <stop offset="100%" stop-color="oklch(0.12 0.04 353)"/>
        </linearGradient>
        <radialGradient id="wid-face" cx="50%" cy="100%" r="95%">
          <stop offset="0%" stop-color="oklch(0.83 0.04 20)"/>
          <stop offset="40%" stop-color="oklch(0.62 0.05 5)"/>
          <stop offset="100%" stop-color="oklch(0.28 0.04 353)"/>
        </radialGradient>
      </defs>
      <path d="M12 100 Q18 76 30 68 Q38 62.5 44 60.5 L44 53 L56 53 L56 60.5 Q62 62.5 70 68 Q82 76 88 100 Z" fill="url(#wid-gown)"/>
      <path d="M30 68 Q34 58 42 55 L42 60 Q36 62 32 70 Z M70 68 Q66 58 58 55 L58 60 Q64 62 68 70 Z" fill="oklch(0.5 0.14 353)" opacity="0.5"/>
      <ellipse cx="50" cy="36" rx="12" ry="14.5" fill="url(#wid-face)"/>
      <g transform="rotate(-3 50 22)">
        <ellipse cx="50" cy="22" rx="27" ry="6.5" fill="oklch(0.16 0.05 353)"/>
        <path d="M30 21 Q32 9 50 8.5 Q68 9 70 21 Q60 15.5 50 15.5 Q40 15.5 30 21 Z" fill="oklch(0.24 0.08 353)"/>
        <ellipse cx="50" cy="22" rx="27" ry="6.5" fill="none" stroke="oklch(0.4 0.11 353)" stroke-width="0.6" opacity="0.7"/>
        <circle cx="64" cy="17" r="3" fill="oklch(0.45 0.15 15)"/>
        <circle cx="64" cy="17" r="1.4" fill="oklch(0.3 0.1 15)"/>
      </g>
      <path d="M38.5 25 L61.5 25 Q62 34 58 40 L42 40 Q38 34 38.5 25 Z" fill="oklch(0.12 0.03 353)" opacity="0.75" filter="url(#wid-soft)"/>
      <g stroke="oklch(0.5 0.1 353)" stroke-width="0.35" opacity="0.5">
        <path d="M38 26 L62 38 M38 32 L56 41 M44 25 L62 32 M62 26 L38 38 M62 32 L44 41 M56 25 L38 32"/>
      </g>
      <circle cx="44.5" cy="33.5" r="0.8" fill="oklch(0.8 0.1 353)" opacity="0.9"/>
      <circle cx="55.5" cy="33.5" r="0.8" fill="oklch(0.8 0.1 353)" opacity="0.9"/>
      <path d="M47 42.5 Q50 44 53 42.5" stroke="oklch(0.4 0.05 5)" stroke-width="0.6" fill="none" opacity="0.6"/>
      <path d="M45.8 45.5 Q48 44.2 50 45.3 Q52 44.2 54.2 45.5 Q52 47.6 50 47.4 Q48 47.6 45.8 45.5 Z" fill="oklch(0.48 0.18 15)"/>
      <path d="M46.5 45.4 Q50 46.2 53.5 45.4" stroke="oklch(0.25 0.08 15)" stroke-width="0.5" opacity="0.8"/>
      <circle cx="56.8" cy="43.5" r="0.7" fill="oklch(0.2 0.03 353)"/>
      <path d="M44 52 Q50 54.5 56 52 L56 55 Q50 57.5 44 55 Z" fill="oklch(0.2 0.05 353)"/>
      <circle cx="50" cy="54" r="2" fill="oklch(0.78 0.13 85)"/>
      <circle cx="50" cy="54" r="0.9" fill="oklch(0.45 0.15 15)"/>`,
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
      <defs>
        <linearGradient id="aud-coat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.28 0.035 353)"/>
          <stop offset="100%" stop-color="oklch(0.09 0.015 353)"/>
        </linearGradient>
        <radialGradient id="aud-face" cx="50%" cy="96%" r="105%">
          <stop offset="0%" stop-color="oklch(0.76 0.06 70)"/>
          <stop offset="45%" stop-color="oklch(0.5 0.05 55)"/>
          <stop offset="100%" stop-color="oklch(0.22 0.03 353)"/>
        </radialGradient>
      </defs>
      <path d="M18 100 Q24 80 34 73 Q41 68 46 66.5 L46 57 L54 57 L54 66.5 Q59 68 66 73 Q76 80 82 100 Z" fill="url(#aud-coat)"/>
      <path d="M45 64 L47.5 70 L50 66 L52.5 70 L55 64 L52.5 61.5 L47.5 61.5 Z" fill="oklch(0.84 0.02 85)"/>
      <ellipse cx="50" cy="36" rx="11.5" ry="15" fill="url(#aud-face)"/>
      <path d="M60 26 Q66 18 71 15 Q67 22 63 29 Z" fill="oklch(0.78 0.02 85)" opacity="0.85"/>
      <path d="M61.5 26.5 Q66 20.5 69.5 16.5" stroke="oklch(0.5 0.03 70)" stroke-width="0.5" opacity="0.7"/>
      <path d="M38.5 29 Q50 25.5 61.5 29 L61.5 35 Q50 31.5 38.5 35 Z" fill="oklch(0.12 0.02 353)" opacity="0.6" filter="url(#aud-soft)"/>
      <path d="M36.5 28 Q38 18.5 50 18 Q62 18.5 63.5 28 Q57 24.5 50 24.5 Q43 24.5 36.5 28 Z" fill="oklch(0.35 0.09 155)" opacity="0.92"/>
      <path d="M36.5 28 Q43 24.5 50 24.5 Q57 24.5 63.5 28 L63 30.5 Q56.5 27 50 27 Q43.5 27 37 30.5 Z" fill="oklch(0.46 0.11 155)" opacity="0.75"/>
      <ellipse cx="44.3" cy="34" rx="3.6" ry="3" fill="oklch(0.85 0.07 110)" opacity="0.9"/>
      <ellipse cx="55.7" cy="34" rx="3.6" ry="3" fill="oklch(0.85 0.07 110)" opacity="0.9"/>
      <ellipse cx="44.3" cy="34" rx="3.6" ry="3" fill="none" stroke="oklch(0.6 0.09 85)" stroke-width="0.8"/>
      <ellipse cx="55.7" cy="34" rx="3.6" ry="3" fill="none" stroke="oklch(0.6 0.09 85)" stroke-width="0.8"/>
      <path d="M47.9 34 L52.1 34" stroke="oklch(0.6 0.09 85)" stroke-width="0.8"/>
      <path d="M42.6 32.6 L46 35.4 M54 32.6 L57.4 35.4" stroke="oklch(0.97 0.02 110)" stroke-width="0.7" opacity="0.9"/>
      <path d="M48.9 38 L50 41.8 L51.1 38" fill="none" stroke="oklch(0.3 0.03 353)" stroke-width="0.7" opacity="0.8"/>
      <path d="M46.5 46 L53.5 46" stroke="oklch(0.16 0.02 353)" stroke-width="1.2"/>
      <path d="M45 44 Q45.8 45.2 46.4 45.8 M55 44 Q54.2 45.2 53.6 45.8" stroke="oklch(0.28 0.03 353)" stroke-width="0.6" fill="none" opacity="0.8"/>
      <g transform="rotate(7 68 79)">
        <rect x="61" y="70" width="14" height="18" rx="1" fill="oklch(0.88 0.015 85)"/>
        <path d="M63.5 74.5 L72.5 74.5 M63.5 78 L72.5 78 M63.5 81.5 L70.5 81.5" stroke="oklch(0.35 0.03 353)" stroke-width="0.6"/>
        <path d="M62 85.5 L74 72.5" stroke="oklch(0.55 0.19 25)" stroke-width="1.8" opacity="0.9"/>
      </g>`,
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
      <defs>
        <linearGradient id="clk-wood" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.52 0.07 55)"/>
          <stop offset="45%" stop-color="oklch(0.33 0.05 45)"/>
          <stop offset="100%" stop-color="oklch(0.16 0.03 40)"/>
        </linearGradient>
        <linearGradient id="clk-coat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.30 0.05 300)"/>
          <stop offset="100%" stop-color="oklch(0.09 0.015 300)"/>
        </linearGradient>
      </defs>
      <path d="M16 100 Q22 80 32 73 Q40 68 45 66.5 L55 66.5 Q60 68 68 73 Q78 80 84 100 Z" fill="url(#clk-coat)"/>
      <path d="M45 66 L50 72 L55 66 L53 63.5 L47 63.5 Z" fill="oklch(0.82 0.015 85)"/>
      <path d="M41 10 L59 10 L64.5 26 L61.5 60 L38.5 60 L35.5 26 Z" fill="url(#clk-wood)"/>
      <path d="M41 10 L59 10 L64.5 26 L61.5 60 L38.5 60 L35.5 26 Z" fill="none" stroke="oklch(0.6 0.07 60)" stroke-width="0.7" opacity="0.6"/>
      <path d="M43 13 L57 13 L61.5 26.5 L59 56.5 L41 56.5 L38.5 26.5 Z" fill="none" stroke="oklch(0.18 0.03 40)" stroke-width="0.8" opacity="0.8"/>
      <path d="M44 14 Q43 30 44.5 52 M50 13 Q49.4 32 50.3 56 M56 14 Q57 30 55.5 52" stroke="oklch(0.24 0.04 45)" stroke-width="0.5" fill="none" opacity="0.7"/>
      <circle cx="41.5" cy="12.5" r="0.9" fill="oklch(0.8 0.12 85)"/>
      <circle cx="58.5" cy="12.5" r="0.9" fill="oklch(0.8 0.12 85)"/>
      <circle cx="63" cy="26.5" r="0.9" fill="oklch(0.8 0.12 85)"/>
      <circle cx="37" cy="26.5" r="0.9" fill="oklch(0.8 0.12 85)"/>
      <circle cx="60.8" cy="57.5" r="0.9" fill="oklch(0.75 0.11 85)"/>
      <circle cx="39.2" cy="57.5" r="0.9" fill="oklch(0.75 0.11 85)"/>
      <ellipse cx="44.5" cy="33" rx="3" ry="4" fill="oklch(0.10 0.015 300)"/>
      <ellipse cx="55.5" cy="33" rx="3" ry="4" fill="oklch(0.10 0.015 300)"/>
      <circle cx="44.5" cy="34" r="1" fill="oklch(0.68 0.12 300)" filter="url(#clk-soft)"/>
      <circle cx="55.5" cy="34" r="1" fill="oklch(0.68 0.12 300)" filter="url(#clk-soft)"/>
      <path d="M43 48 L57 48" stroke="oklch(0.14 0.02 40)" stroke-width="1.4"/>
      <path d="M45 46.6 L45 49.4 M48.3 46.6 L48.3 49.4 M51.6 46.6 L51.6 49.4 M55 46.6 L55 49.4" stroke="oklch(0.5 0.06 60)" stroke-width="0.8"/>
      <rect x="44" y="17" width="12" height="7" rx="1" fill="oklch(0.62 0.1 85)"/>
      <rect x="44" y="17" width="12" height="7" rx="1" fill="none" stroke="oklch(0.35 0.06 85)" stroke-width="0.5"/>
      <text x="50" y="22.4" font-family="Rozha One, serif" font-size="5.4" fill="oklch(0.22 0.04 60)" text-anchor="middle">10</text>`,
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
      <defs>
        <linearGradient id="bai-robe" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.34 0.08 305)"/>
          <stop offset="100%" stop-color="oklch(0.10 0.025 305)"/>
        </linearGradient>
        <radialGradient id="bai-face" cx="50%" cy="96%" r="105%">
          <stop offset="0%" stop-color="oklch(0.80 0.03 305)"/>
          <stop offset="45%" stop-color="oklch(0.56 0.035 305)"/>
          <stop offset="100%" stop-color="oklch(0.26 0.03 305)"/>
        </radialGradient>
      </defs>
      <path d="M8 100 Q14 74 28 65 Q38 58.5 45 56.5 L55 56.5 Q62 58.5 72 65 Q86 74 92 100 Z" fill="url(#bai-robe)"/>
      <path d="M32 64 Q50 74 68 64" fill="none" stroke="oklch(0.6 0.1 85)" stroke-width="1.2"/>
      <circle cx="36" cy="66.6" r="1.1" fill="none" stroke="oklch(0.66 0.1 85)" stroke-width="0.7"/>
      <circle cx="43" cy="69.4" r="1.1" fill="none" stroke="oklch(0.66 0.1 85)" stroke-width="0.7"/>
      <circle cx="57" cy="69.4" r="1.1" fill="none" stroke="oklch(0.66 0.1 85)" stroke-width="0.7"/>
      <circle cx="64" cy="66.6" r="1.1" fill="none" stroke="oklch(0.66 0.1 85)" stroke-width="0.7"/>
      <circle cx="50" cy="71.5" r="2.6" fill="oklch(0.7 0.11 85)"/>
      <path d="M50 69.5 L50 73.5 M48 71.5 L52 71.5" stroke="oklch(0.35 0.06 85)" stroke-width="0.6"/>
      <ellipse cx="50" cy="33" rx="13.5" ry="16" fill="url(#bai-face)"/>
      <path d="M36.5 30 Q36 12 50 11.5 Q64 12 63.5 30 Q61 17.5 50 17 Q39 17.5 36.5 30 Z" fill="oklch(0.14 0.03 305)"/>
      <path d="M50 11.5 Q64 12 63.5 30 L63.5 33 Q63.5 44 56 48.4 Q52.8 49.4 50 49 Z" fill="oklch(0.09 0.02 305)"/>
      <path d="M50 11 L50 49.5" stroke="oklch(0.55 0.12 305)" stroke-width="0.7" opacity="0.8"/>
      <ellipse cx="43.7" cy="32.5" rx="2.8" ry="3.2" fill="oklch(0.12 0.02 305)"/>
      <circle cx="43.9" cy="32.8" r="0.85" fill="oklch(0.85 0.05 305)"/>
      <path d="M39.5 29.5 Q43.5 27.8 47 29.3" stroke="oklch(0.3 0.03 305)" stroke-width="0.9" fill="none" opacity="0.8"/>
      <path d="M48.6 37 L49.6 40.5 Q48.4 41.4 47.4 40.6" stroke="oklch(0.34 0.03 305)" stroke-width="0.7" fill="none" opacity="0.8"/>
      <path d="M43 44.5 Q46.5 45.8 49.5 45.2" stroke="oklch(0.22 0.03 305)" stroke-width="1" fill="none"/>
      <circle cx="56.6" cy="32.8" r="1.6" fill="oklch(0.62 0.19 20)" filter="url(#bai-halo)"/>
      <circle cx="56.6" cy="32.8" r="0.9" fill="oklch(0.78 0.17 25)"/>
      <g transform="rotate(-10 26 80)">
        <rect x="19" y="70" width="14" height="19" rx="1.2" fill="oklch(0.9 0.012 85)"/>
        <path d="M22 75 L30 75 M22 78.5 L30 78.5 M22 82 L28 82" stroke="oklch(0.3 0.03 305)" stroke-width="0.7"/>
        <circle cx="29.5" cy="85" r="1.6" fill="oklch(0.5 0.15 15)"/>
      </g>
      <g transform="rotate(10 74 80)">
        <rect x="67" y="70" width="14" height="19" rx="1.2" fill="oklch(0.9 0.012 85)"/>
        <path d="M70 75 L78 75 M70 78.5 L78 78.5 M70 82 L76 82" stroke="oklch(0.45 0.16 20)" stroke-width="0.7"/>
        <circle cx="70.5" cy="85" r="1.6" fill="oklch(0.5 0.15 15)"/>
      </g>`,
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
      <defs>
        <radialGradient id="sai-disc" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stop-color="oklch(0.55 0.1 85)" stop-opacity="0.25"/>
          <stop offset="82%" stop-color="oklch(0.75 0.13 85)" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="oklch(0.55 0.1 85)" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="sai-robe" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.72 0.1 85)"/>
          <stop offset="55%" stop-color="oklch(0.45 0.07 85)"/>
          <stop offset="100%" stop-color="oklch(0.2 0.035 85)"/>
        </linearGradient>
        <radialGradient id="sai-face" cx="50%" cy="96%" r="100%">
          <stop offset="0%" stop-color="oklch(0.88 0.045 80)"/>
          <stop offset="50%" stop-color="oklch(0.68 0.05 70)"/>
          <stop offset="100%" stop-color="oklch(0.38 0.04 60)"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="30" r="26" fill="url(#sai-disc)"/>
      <circle cx="50" cy="30" r="22.5" fill="none" stroke="oklch(0.78 0.13 85)" stroke-width="1.1" opacity="0.9"/>
      <circle cx="50" cy="30" r="19" fill="none" stroke="oklch(0.6 0.1 85)" stroke-width="0.5" opacity="0.6"/>
      <g stroke="oklch(0.7 0.12 85)" stroke-width="0.6" opacity="0.7">
        <path d="M50 5 L50 9.5 M50 50.5 L50 55 M25 30 L29.5 30 M70.5 30 L75 30 M32.3 12.3 L35.5 15.5 M64.5 15.5 L67.7 12.3 M32.3 47.7 L35.5 44.5 M64.5 44.5 L67.7 47.7"/>
      </g>
      <path d="M20 100 Q25 78 35 70 Q42 64.5 47 63 L53 63 Q58 64.5 65 70 Q75 78 80 100 Z" fill="url(#sai-robe)"/>
      <path d="M35 46 Q34 20 50 19 Q66 20 65 46 Q62 58 50 59 Q38 58 35 46 Z" fill="oklch(0.92 0.02 85)"/>
      <path d="M38.5 44 Q38 25 50 24 Q62 25 61.5 44 Q59 53 50 54 Q41 53 38.5 44 Z" fill="oklch(0.2 0.035 85)"/>
      <ellipse cx="50" cy="38" rx="10" ry="12.5" fill="url(#sai-face)"/>
      <path d="M42.5 36.5 Q45.5 38.6 48 36.8" stroke="oklch(0.3 0.04 60)" stroke-width="1" fill="none"/>
      <path d="M52 36.8 Q54.5 38.6 57.5 36.5" stroke="oklch(0.3 0.04 60)" stroke-width="1" fill="none"/>
      <path d="M45.3 38.6 Q45 43 44.6 46.5" stroke="oklch(0.8 0.13 85)" stroke-width="0.8" fill="none" opacity="0.9"/>
      <path d="M54.7 38.6 Q55 43 55.4 46.5" stroke="oklch(0.8 0.13 85)" stroke-width="0.8" fill="none" opacity="0.9"/>
      <circle cx="44.5" cy="47.5" r="0.7" fill="oklch(0.85 0.14 85)"/>
      <circle cx="55.5" cy="47.5" r="0.7" fill="oklch(0.85 0.14 85)"/>
      <path d="M49.3 40 L50 43.4 L50.7 40" stroke="oklch(0.42 0.05 60)" stroke-width="0.6" fill="none" opacity="0.7"/>
      <path d="M47 48.6 Q50 49.8 53 48.6" stroke="oklch(0.42 0.06 40)" stroke-width="0.9" fill="none"/>
      <path d="M50 63 L54.4 71 L50 79 L45.6 71 Z" fill="oklch(0.5 0.17 15)"/>
      <path d="M50 61.5 L55.6 71 L50 80.5 L44.4 71 Z" fill="none" stroke="oklch(0.8 0.13 85)" stroke-width="0.9"/>
      <circle cx="50" cy="71" r="1" fill="oklch(0.9 0.06 85)"/>`,
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
      <defs>
        <linearGradient id="odd-coat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.32 0.06 353)"/>
          <stop offset="100%" stop-color="oklch(0.10 0.02 353)"/>
        </linearGradient>
        <radialGradient id="odd-lit" cx="50%" cy="96%" r="105%">
          <stop offset="0%" stop-color="oklch(0.78 0.065 70)"/>
          <stop offset="45%" stop-color="oklch(0.52 0.055 55)"/>
          <stop offset="100%" stop-color="oklch(0.24 0.03 353)"/>
        </radialGradient>
      </defs>
      <path d="M14 100 Q20 78 31 70 Q39 64.5 45 62.5 L45 53 L55 53 L55 62.5 Q61 64.5 69 70 Q80 78 86 100 Z" fill="url(#odd-coat)"/>
      <path d="M44 60 L50 68 L56 60 L54 57 L46 57 Z" fill="oklch(0.55 0.09 85)" opacity="0.9"/>
      <path d="M44 70 Q50 78 58 74" stroke="oklch(0.7 0.11 85)" stroke-width="0.8" fill="none" opacity="0.85"/>
      <circle cx="58.5" cy="74" r="1.5" fill="oklch(0.75 0.12 85)"/>
      <ellipse cx="50" cy="33" rx="13" ry="16" fill="url(#odd-lit)"/>
      <path d="M50 17 Q63 17.5 63 33 Q63 45 55.5 48.3 Q52.6 49.3 50 49 Z" fill="oklch(0.13 0.025 353)"/>
      <path d="M50 16.5 L50 49.5" stroke="oklch(0.6 0.1 85)" stroke-width="0.6" opacity="0.7"/>
      <path d="M34 22 Q34 10 50 9.5 Q66 10 66 22 L66 24 Q58 20.5 50 20.5 Q42 20.5 34 24 Z" fill="oklch(0.17 0.025 353)"/>
      <path d="M30 24 Q50 17.5 70 24 L70 26.5 Q50 20.5 30 26.5 Z" fill="oklch(0.22 0.03 353)"/>
      <path d="M34 22.6 Q42 19.6 50 19.6 Q58 19.6 66 22.6" stroke="oklch(0.5 0.08 85)" stroke-width="0.7" fill="none" opacity="0.6"/>
      <ellipse cx="43.6" cy="32.5" rx="2.9" ry="2.4" fill="oklch(0.13 0.02 353)" filter="url(#odd-soft)"/>
      <circle cx="43.8" cy="32.7" r="0.9" fill="oklch(0.88 0.08 85)"/>
      <path d="M56.2 30.4 L58.3 32.7 L56.2 35 L54.1 32.7 Z" fill="oklch(0.8 0.13 85)" filter="url(#odd-soft)"/>
      <path d="M48.6 39.6 L50 41.6 L51.2 39.9 L50 35.5 Z" fill="oklch(0.82 0.075 70)" opacity="0.85"/>
      <path d="M44.5 45 Q49 46.8 53 45.6 Q55 45 56.5 43.8" stroke="oklch(0.16 0.02 353)" stroke-width="1.1" fill="none"/>
      <circle cx="74" cy="46" r="6.2" fill="oklch(0.78 0.13 85)" filter="url(#odd-halo)" opacity="0.85"/>
      <ellipse cx="74" cy="46" rx="4.4" ry="6" fill="oklch(0.72 0.12 85)"/>
      <ellipse cx="74" cy="46" rx="4.4" ry="6" fill="none" stroke="oklch(0.45 0.07 85)" stroke-width="0.7"/>
      <ellipse cx="74" cy="46" rx="2.1" ry="6" fill="none" stroke="oklch(0.55 0.09 85)" stroke-width="0.5" opacity="0.8"/>
      <path d="M70 55 Q74 57.5 78 55" stroke="oklch(0.6 0.1 85)" stroke-width="0.6" fill="none" opacity="0.5"/>
      <path d="M71 58.5 Q74 60.3 77 58.5" stroke="oklch(0.6 0.1 85)" stroke-width="0.5" fill="none" opacity="0.35"/>`,
      { id: 'odd' }),
  },
];

export const BOSSES = {
  7: {
    id: 'bouncer', name: 'MR. DORSEY', role: 'The Door of the Magnolia', tier: 'boss',
    intro: "You're not on the list, Mr. Creel. You're in it.",
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
      <defs>
        <linearGradient id="bou-mass" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.38 0.09 353)"/>
          <stop offset="50%" stop-color="oklch(0.22 0.06 353)"/>
          <stop offset="100%" stop-color="oklch(0.10 0.025 353)"/>
        </linearGradient>
        <radialGradient id="bou-face" cx="50%" cy="98%" r="110%">
          <stop offset="0%" stop-color="oklch(0.66 0.06 55)"/>
          <stop offset="45%" stop-color="oklch(0.44 0.05 45)"/>
          <stop offset="100%" stop-color="oklch(0.18 0.03 353)"/>
        </radialGradient>
      </defs>
      <path d="M-6 100 L-4 76 Q0 56 16 48 Q28 41 40 39 L60 39 Q72 41 84 48 Q100 56 104 76 L106 100 Z" fill="url(#bou-mass)"/>
      <path d="M38 39 L39 30 L61 30 L62 39 Z" fill="oklch(0.5 0.055 50)"/>
      <path d="M37 30 Q36.5 12 50 11.5 Q63.5 12 63 30 Q62.5 40 50 41 Q37.5 40 37 30 Z" fill="url(#bou-face)"/>
      <path d="M35.5 20 Q37 9 50 8.5 Q63 9 64.5 20 Q57 16.5 50 16.5 Q43 16.5 35.5 20 Z" fill="oklch(0.20 0.04 353)"/>
      <path d="M33 21.5 Q50 15 67 21.5 L67 23.5 Q50 17.5 33 23.5 Z" fill="oklch(0.26 0.05 353)"/>
      <path d="M39 26 Q50 23 61 26 L61 30.5 Q50 27.5 39 30.5 Z" fill="oklch(0.10 0.02 353)"/>
      <circle cx="44" cy="29.4" r="1.5" fill="oklch(0.62 0.19 20)" filter="url(#bou-halo)"/>
      <circle cx="56" cy="29.4" r="1.5" fill="oklch(0.62 0.19 20)" filter="url(#bou-halo)"/>
      <circle cx="44" cy="29.4" r="0.9" fill="oklch(0.78 0.18 25)"/>
      <circle cx="56" cy="29.4" r="0.9" fill="oklch(0.78 0.18 25)"/>
      <path d="M49.4 30.5 L48 35.2 L50.6 37.6 L51.6 35.4 L50.4 30.5 Z" fill="oklch(0.58 0.06 50)" opacity="0.9"/>
      <path d="M48 35.2 L50.6 37.6" stroke="oklch(0.24 0.035 353)" stroke-width="0.6"/>
      <path d="M58.4 24 L57.2 30.5" stroke="oklch(0.66 0.07 55)" stroke-width="0.5" opacity="0.85"/>
      <path d="M45 38.6 L55 38.6" stroke="oklch(0.2 0.03 353)" stroke-width="1.3"/>
      <path d="M14 66 Q30 78 50 79 Q70 78 86 66" stroke="oklch(0.62 0.1 85)" stroke-width="1.6" fill="none"/>
      <circle cx="26" cy="72.6" r="1.3" fill="none" stroke="oklch(0.7 0.11 85)" stroke-width="0.8"/>
      <circle cx="50" cy="79" r="1.3" fill="none" stroke="oklch(0.7 0.11 85)" stroke-width="0.8"/>
      <circle cx="74" cy="72.6" r="1.3" fill="none" stroke="oklch(0.7 0.11 85)" stroke-width="0.8"/>
      <path d="M10 100 Q10 90 18 88 L38 88 Q44 90 44 100 Z" fill="oklch(0.42 0.05 45)"/>
      <g fill="oklch(0.78 0.12 85)">
        <circle cx="17" cy="89.5" r="2.4"/><circle cx="23.5" cy="88" r="2.4"/><circle cx="30" cy="88" r="2.4"/><circle cx="36.5" cy="89.5" r="2.4"/>
      </g>
      <g fill="oklch(0.5 0.08 85)">
        <circle cx="17" cy="89.5" r="1.1"/><circle cx="23.5" cy="88" r="1.1"/><circle cx="30" cy="88" r="1.1"/><circle cx="36.5" cy="89.5" r="1.1"/>
      </g>`,
      { id: 'bou', glow: 'oklch(0.55 0.16 20)' }),
  },
  14: {
    id: 'cardsharp', name: 'LEVI CREEL', role: 'The Cardsharp — Your Father', tier: 'boss',
    intro: 'Hello, boy. They kept my hands. Sit down — I dealt your wedding. I can deal your wake.',
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
      <defs>
        <linearGradient id="shp-coat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.30 0.07 305)"/>
          <stop offset="100%" stop-color="oklch(0.09 0.02 305)"/>
        </linearGradient>
        <radialGradient id="shp-face" cx="50%" cy="96%" r="105%">
          <stop offset="0%" stop-color="oklch(0.82 0.05 60)"/>
          <stop offset="45%" stop-color="oklch(0.56 0.05 45)"/>
          <stop offset="100%" stop-color="oklch(0.24 0.03 305)"/>
        </radialGradient>
      </defs>
      <path d="M12 100 Q18 76 30 68 Q38 62.5 44 60.5 L44 53 L56 53 L56 60.5 Q62 62.5 70 67 Q80 73 84 84 Q86 92 86 100 Z" fill="url(#shp-coat)"/>
      <path d="M43 58 L47 65 L50 61 L53 65 L57 58 L53.5 55 L46.5 55 Z" fill="oklch(0.9 0.012 85)"/>
      <path d="M46.8 62 L50 66.5 L53.2 62 L50 59.5 Z" fill="oklch(0.35 0.11 305)"/>
      <circle cx="50" cy="62.6" r="1" fill="oklch(0.78 0.13 85)"/>
      <ellipse cx="50" cy="33.5" rx="12.5" ry="16" fill="url(#shp-face)"/>
      <path d="M39 37 Q41.5 43.5 45.5 46.5 Q40.5 45.5 38.2 39.5 Z" fill="oklch(0.22 0.03 305)" opacity="0.6" filter="url(#shp-soft)"/>
      <path d="M61 37 Q58.5 43.5 54.5 46.5 Q59.5 45.5 61.8 39.5 Z" fill="oklch(0.22 0.03 305)" opacity="0.6" filter="url(#shp-soft)"/>
      <path d="M37 32 Q36 14.5 50 14 Q64 14.5 63 32 Q62 21 55.5 19.5 Q52.5 22.5 50 26 Q47.5 22.5 44.5 19.5 Q38 21 37 32 Z" fill="oklch(0.09 0.015 305)"/>
      <ellipse cx="44" cy="33" rx="3" ry="2.5" fill="oklch(0.12 0.02 305)" filter="url(#shp-soft)"/>
      <ellipse cx="56" cy="33" rx="3" ry="2.5" fill="oklch(0.12 0.02 305)" filter="url(#shp-soft)"/>
      <path d="M41 31.6 Q44 30.6 47 31.8 M53 31.8 Q56 30.6 59 31.6" stroke="oklch(0.16 0.02 305)" stroke-width="1.3" fill="none"/>
      <circle cx="44.3" cy="33.2" r="0.8" fill="oklch(0.72 0.17 20)"/>
      <circle cx="56.3" cy="33.2" r="0.8" fill="oklch(0.72 0.17 20)"/>
      <path d="M48.9 40.3 L50 42 L51.1 40.3 L50 34 Z" fill="oklch(0.86 0.055 60)" opacity="0.85"/>
      <path d="M45.5 43.6 Q48 42.8 50 43.4 Q52 42.8 54.5 43.6" stroke="oklch(0.14 0.02 305)" stroke-width="0.8" fill="none"/>
      <path d="M44 46.2 Q50 49 56 46 Q53 48.6 50 48.8 Q46.5 48.8 44 46.2 Z" fill="oklch(0.13 0.02 305)"/>
      <path d="M52.5 47.3 L53.6 49.3 L54.6 47.1 Z" fill="oklch(0.93 0.02 85)"/>
      <circle cx="76" cy="45" r="8" fill="oklch(0.78 0.13 85)" opacity="0.25" filter="url(#shp-halo)"/>
      <g>
        <rect x="64" y="38" width="13" height="18.5" rx="1.4" fill="oklch(0.86 0.012 85)" transform="rotate(-26 70.5 47)"/>
        <rect x="68" y="35.5" width="13" height="18.5" rx="1.4" fill="oklch(0.92 0.012 85)" transform="rotate(-13 74.5 44.5)"/>
        <rect x="72" y="34.5" width="13" height="18.5" rx="1.4" fill="oklch(0.96 0.008 85)" transform="rotate(0 78.5 43.5)"/>
        <path d="M78.5 38.5 L81.3 43.5 L78.5 48.5 L75.7 43.5 Z" fill="oklch(0.5 0.17 15)"/>
        <path d="M70 57 Q73 52.5 78 52.5 Q83 52.6 84.5 55.5 L83.5 61 Q77 63.5 71 61 Z" fill="oklch(0.93 0.01 85)"/>
        <path d="M74 54 L73.6 60.6 M77.6 53.2 L77.5 61.4 M81 53.6 L81.2 61" stroke="oklch(0.68 0.02 85)" stroke-width="0.6" opacity="0.8"/>
      </g>`,
      { id: 'shp', glow: 'oklch(0.5 0.12 305)' }),
  },
  21: {
    id: 'house', name: 'THE HOUSE', role: 'What Wears the Magnolia', tier: 'boss',
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
      <defs>
        <linearGradient id="hou-wall" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="oklch(0.26 0.06 353)"/>
          <stop offset="55%" stop-color="oklch(0.14 0.035 353)"/>
          <stop offset="100%" stop-color="oklch(0.07 0.015 353)"/>
        </linearGradient>
        <radialGradient id="hou-iris" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="oklch(0.68 0.19 25)"/>
          <stop offset="60%" stop-color="oklch(0.5 0.17 20)"/>
          <stop offset="100%" stop-color="oklch(0.3 0.1 15)"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#hou-wall)"/>
      <g fill="oklch(0.3 0.07 353)" opacity="0.5">
        <rect x="6" width="7" height="100"/><rect x="20" width="7" height="100"/><rect x="34" width="7" height="100"/><rect x="59" width="7" height="100"/><rect x="73" width="7" height="100"/><rect x="87" width="7" height="100"/>
      </g>
      <g fill="oklch(0.4 0.09 353)" opacity="0.35">
        <circle cx="9.5" cy="20" r="1"/><circle cx="23.5" cy="34" r="1"/><circle cx="37.5" cy="16" r="1"/><circle cx="62.5" cy="28" r="1"/><circle cx="76.5" cy="14" r="1"/><circle cx="90.5" cy="30" r="1"/>
        <circle cx="9.5" cy="72" r="1"/><circle cx="23.5" cy="86" r="1"/><circle cx="76.5" cy="80" r="1"/><circle cx="90.5" cy="68" r="1"/>
      </g>
      <path d="M6 6 Q14 10 12 20 Q8 16 6 16 Z" fill="oklch(0.35 0.05 60)" opacity="0.6"/>
      <path d="M50 14 L84 52 L50 90 L16 52 Z" fill="none" stroke="oklch(0.72 0.12 85)" stroke-width="1.8"/>
      <path d="M50 18 L80.5 52 L50 86 L19.5 52 Z" fill="none" stroke="oklch(0.5 0.08 85)" stroke-width="0.6" opacity="0.8"/>
      <circle cx="50" cy="14" r="1.6" fill="oklch(0.78 0.13 85)"/>
      <circle cx="84" cy="52" r="1.6" fill="oklch(0.78 0.13 85)"/>
      <circle cx="50" cy="90" r="1.6" fill="oklch(0.78 0.13 85)"/>
      <circle cx="16" cy="52" r="1.6" fill="oklch(0.78 0.13 85)"/>
      <path d="M50 20 L79 52 L50 84 L21 52 Z" fill="oklch(0.20 0.06 353)"/>
      <path d="M50 27 L72.5 52 L50 77 L27.5 52 Z" fill="oklch(0.28 0.09 353)"/>
      <path d="M50 27 L72.5 52 L50 77 Z" fill="oklch(0.24 0.075 353)"/>
      <circle cx="50" cy="52" r="10" fill="oklch(0.55 0.18 20)" opacity="0.35" filter="url(#hou-halo)"/>
      <path d="M36 52 Q50 41 64 52 Q50 63 36 52 Z" fill="oklch(0.88 0.025 85)"/>
      <path d="M36 52 Q50 41 64 52 M36 52 Q50 63 64 52" stroke="oklch(0.3 0.06 353)" stroke-width="0.8" fill="none"/>
      <path d="M38 50 Q42 51 44.5 50.2 M62 50 Q58 51 55.8 50.4 M39 54.5 Q43 53.6 45 54" stroke="oklch(0.55 0.15 20)" stroke-width="0.4" fill="none" opacity="0.7"/>
      <circle cx="50" cy="52" r="6.4" fill="url(#hou-iris)"/>
      <circle cx="50" cy="52" r="6.4" fill="none" stroke="oklch(0.35 0.1 20)" stroke-width="0.5"/>
      <ellipse cx="50" cy="52" rx="1.7" ry="5.6" fill="oklch(0.08 0.015 353)"/>
      <circle cx="47.8" cy="49.6" r="1" fill="oklch(0.97 0.02 85)"/>
      <path d="M36 52 Q50 41 64 52 L64 48.5 Q50 38.5 36 48.5 Z" fill="oklch(0.16 0.045 353)"/>`,
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
