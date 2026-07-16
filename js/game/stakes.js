// stakes.js — Table Stakes: per-hand modifiers flipped by the shoe (SPEC2 §A4).
//
// A stake is data: id, name, desc, flavor, weight, and a small set of effect flags
// the combat state machine reads directly (kept data-driven, no special-casing in
// scattered places). The mechanical hooks live in combat.js; this is the catalogue.
//
// Effect surface (read by combat.js):
//   heal:        winner heals this much                     (Blood)
//   glassHole:   deal the dealer's hole card face up        (Glass Table)
//   allDamageX2: all damage this hand ×2, both directions   (Double or Nothing)
//   longOdds:    a win with 5+ cards deals ×3 (supersedes Charlie)
//   sealCharms:  charms cannot be used this hand            (Dead Air)
//   markNext:    the player sees the next shoe card         (House Rules)
//   rake:        winner takes this many chips from the loser (The Rake)
//   frozenHeat:  Heat neither gained nor lost this hand     (Cold Room)

export const STAKES = [
  {
    id: 'blood', name: 'Blood Stakes',
    desc: 'The winner of this hand heals 6.',
    flavor: 'The winner drinks; the loser bleeds. An old house rule.',
    weight: 1, heal: 6,
  },
  {
    id: 'glass', name: 'Glass Table',
    desc: "The dealer's hole card is dealt face up.",
    flavor: 'Nothing hidden. The House felt generous, or cruel.',
    weight: 1, glassHole: true,
  },
  {
    id: 'double', name: 'Double or Nothing',
    desc: 'All damage this hand is doubled — both directions.',
    flavor: 'Twice the wound, whichever way you lean.',
    weight: 0.5, allDamageX2: true,
  },
  {
    id: 'long_odds', name: 'The Long Odds',
    desc: 'Win with 5 or more cards: damage ×3.',
    flavor: 'Five cards deep, the House pays like it is frightened.',
    weight: 1, longOdds: true,
  },
  {
    id: 'dead_air', name: 'Dead Air',
    desc: 'Your charms are sealed this hand.',
    flavor: 'No charms, no tricks. Just you and the count.',
    weight: 1, sealCharms: true,
  },
  {
    id: 'house_rules', name: 'House Rules',
    desc: 'You see the next card in the shoe this hand.',
    flavor: 'You may look. The House does not mind, tonight.',
    weight: 1, markNext: true,
  },
  {
    id: 'rake', name: 'The Rake',
    desc: 'The winner takes 12 chips from the loser.',
    flavor: 'The rake takes from the loser and calls it courtesy.',
    weight: 1, rake: 12,
  },
  {
    id: 'cold_room', name: 'Cold Room',
    desc: 'Heat is neither gained nor lost this hand.',
    flavor: 'No flame catches here. No flame dies.',
    weight: 1, frozenHeat: true,
  },
];

export const STAKE_BY_ID = Object.fromEntries(STAKES.map((s) => [s.id, s]));

// Bosses draw from a reduced pool (SPEC2 §A4).
export const BOSS_STAKE_IDS = ['blood', 'glass', 'double'];

// Weighted pick from a list of stake ids using a seeded rng.
export function pickStake(rng, ids = STAKES.map((s) => s.id)) {
  const items = ids.map((id) => ({ item: STAKE_BY_ID[id], weight: STAKE_BY_ID[id].weight }));
  return rng.weighted(items);
}

// A compact ornate mini-card face for the stake, drawn by the shoe.
export function stakeCardSVG() {
  return `<svg viewBox="0 0 60 84" aria-hidden="true">
    <rect x="1.5" y="1.5" width="57" height="81" rx="6" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="1.5"/>
    <rect x="6" y="6" width="48" height="72" rx="4" fill="none" stroke="var(--accent-deep)" stroke-width="0.8"/>
    <path d="M30 16 L40 30 L30 44 L20 30 Z" fill="none" stroke="var(--accent)" stroke-width="1.4"/>
    <path d="M30 22 L35 30 L30 38 L25 30 Z" fill="var(--primary)"/>
    <path d="M18 54 h24 M18 60 h24 M22 66 h16" stroke="var(--accent-deep)" stroke-width="1.2"/>
  </svg>`;
}
