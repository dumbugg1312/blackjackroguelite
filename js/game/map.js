// map.js — 21-floor descent, door generation & weighting.

export const BOSS_FLOORS = [7, 14, 21];
export const ELITE_FLOORS = [5, 11, 17];

export function actName(floor) {
  if (floor <= 7) return 'The Parlors';
  if (floor <= 14) return 'The Vaults';
  return 'The Pit';
}
export function actNumber(floor) { return floor <= 7 ? 'I' : floor <= 14 ? 'II' : 'III'; }

const WHISPERS = {
  table: ['Someone is already dealing.', 'The felt is still warm.', 'A chair scrapes back for you.', 'Cards whisper on the baize.'],
  elite: ['Something heavier waits here.', 'The stakes have teeth.', 'A high roller from the wrong century.', 'The air is thick with old money.'],
  shop: ['Coin changes hands in the dark.', 'Everything here has a price.', 'The Cage is open for business.', 'A vendor of dead men\'s things.'],
  shrine: ['A voice offers a bargain.', 'The candle gutters toward you.', 'Something wants to be asked.', 'A door that is not a door.'],
  parlor: ['A place to bind your wounds.', 'Quiet. For now.', 'Rest, and cut the deck.', 'The only mercy on this floor.'],
  lounge: ['A piano, somewhere, still in tune.', 'The Concierge is pouring.', 'One song, on the house.', 'Warm light, for the length of a record.'],
  boss: ['It has been waiting for you.', 'No other way down.', 'The rules end here.'],
};

const ICONS = {
  table: `<svg viewBox="0 0 40 40" fill="none"><ellipse cx="20" cy="22" rx="15" ry="9" fill="var(--primary-deep)" stroke="var(--accent-deep)"/><rect x="14" y="16" width="6" height="9" rx="1" fill="var(--card-face)" transform="rotate(-10 17 20)"/><rect x="20" y="16" width="6" height="9" rx="1" fill="var(--card-face)" transform="rotate(10 23 20)"/></svg>`,
  elite: `<svg viewBox="0 0 40 40" fill="none"><path d="M20 6 L26 16 L37 16 L28 23 L31 34 L20 27 L9 34 L12 23 L3 16 L14 16 Z" fill="var(--curse)" stroke="var(--accent-deep)"/></svg>`,
  shop: `<svg viewBox="0 0 40 40" fill="none"><rect x="8" y="14" width="24" height="20" fill="var(--surface-2)" stroke="var(--accent-deep)"/><path d="M6 14 L10 6 L30 6 L34 14 Z" fill="var(--accent-deep)"/><rect x="17" y="22" width="6" height="12" fill="var(--primary-deep)"/></svg>`,
  shrine: `<svg viewBox="0 0 40 40" fill="none"><rect x="16" y="20" width="8" height="16" fill="var(--card-face)"/><ellipse cx="20" cy="16" rx="3" ry="6" fill="var(--accent)"/><path d="M10 36 L30 36" stroke="var(--accent-deep)" stroke-width="2"/></svg>`,
  parlor: `<svg viewBox="0 0 40 40" fill="none"><path d="M20 32 C 8 22 8 12 15 12 C 18 12 20 15 20 15 C 20 15 22 12 25 12 C 32 12 32 22 20 32 Z" fill="var(--win)"/></svg>`,
  lounge: `<svg viewBox="0 0 40 40" fill="none"><rect x="10" y="10" width="20" height="14" rx="2" fill="var(--surface-2)" stroke="var(--accent)"/><path d="M14 14 v8 M18 14 v8 M22 14 v8 M26 14 v8" stroke="var(--accent-deep)" stroke-width="1.2"/><path d="M12 28 q8 6 16 0" stroke="var(--accent)" stroke-width="1.5" fill="none"/></svg>`,
  boss: `<svg viewBox="0 0 40 40" fill="none"><path d="M20 4 L34 20 L20 36 L6 20 Z" fill="none" stroke="var(--primary-hot)" stroke-width="2"/><circle cx="20" cy="20" r="5" fill="var(--primary-hot)"/></svg>`,
};

const LABELS = {
  table: 'Table', elite: 'High-Stakes Table', shop: 'The Cage', shrine: 'Shrine', parlor: 'Parlor', lounge: 'The Lounge', boss: 'The Only Door',
};

function makeDoor(type, rng) {
  return {
    type,
    label: LABELS[type],
    whisper: rng.pick(WHISPERS[type]),
    icon: ICONS[type],
    meta: type === 'elite' ? 'Elite · +Relic' : type === 'boss' ? 'Boss' : '',
  };
}

// Generate the door choices for the floor the player is about to enter.
export function generateDoors(run, rng) {
  const floor = run.floor + 1;
  if (BOSS_FLOORS.includes(floor)) {
    return [makeDoor('boss', rng)];
  }

  // teaching floors: only tables
  if (floor <= 2) {
    return [makeDoor('table', rng), makeDoor('table', rng)];
  }

  const alwaysThree = run.hasFlag('doorsAlwaysThree');
  const count = alwaysThree ? 3 : (rng.chance(0.6) ? 3 : 2);

  const doors = [];
  const usedSpecial = new Set();

  // guarantee an elite on elite floors
  if (ELITE_FLOORS.includes(floor)) {
    doors.push(makeDoor('elite', rng));
    usedSpecial.add('elite');
  }

  // The Lounge is rare and only Acts II–III, at most once per act (SPEC2 §C).
  const act = actNumber(floor);
  const loungeAvailable = floor >= 8 && floor <= 20 && !run.loungeActs.includes(act);

  const pool = () => {
    const items = [{ item: 'table', weight: 5 }];
    if (floor >= 4 && !usedSpecial.has('elite')) items.push({ item: 'elite', weight: 2 });
    if (!usedSpecial.has('shop')) items.push({ item: 'shop', weight: 2.4 });
    if (!usedSpecial.has('shrine')) items.push({ item: 'shrine', weight: 2.4 });
    if (!usedSpecial.has('parlor')) items.push({ item: 'parlor', weight: 2.4 });
    if (loungeAvailable && !usedSpecial.has('lounge')) items.push({ item: 'lounge', weight: 1.2 });
    return items;
  };

  while (doors.length < count) {
    const type = rng.weighted(pool());
    if (type !== 'table') usedSpecial.add(type);
    doors.push(makeDoor(type, rng));
  }

  return rng.shuffle(doors);
}
