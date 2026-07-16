// relics.js — passive trinkets. Hooks consulted by combat.js in documented order.

function ic(body) { return `<svg viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`; }

// Each relic: id, name, rarity, desc, flavor, icon(), and any of these hooks:
//   flags:   dealerStandSoft17, doorsAlwaysThree, marked (see next card), shopMult, maxHpBonus, pushDamage
//   fns:     onFightStart(c), onFightEnd(c), onReshuffle(c), onWin(c,meta),
//            modDealt(c,dmg,meta)->dmg, modTaken(c,dmg,meta)->dmg
export const RELICS = [
  {
    id: 'loaded_die', name: 'Loaded Die', rarity: 'common',
    desc: 'First hand each fight, see the dealer\'s hole card.',
    flavor: 'It only ever lands one way.',
    icon: () => ic('<rect x="8" y="8" width="24" height="24" rx="4" fill="var(--card-face)"/><circle cx="14" cy="14" r="2.5" fill="var(--primary-hot)"/><circle cx="26" cy="26" r="2.5" fill="var(--primary-hot)"/><circle cx="20" cy="20" r="2.5" fill="var(--primary-hot)"/>'),
    onFightStart: (c) => { c._revealHoleFirstHand = true; },
  },
  {
    id: 'brass_knuckles', name: 'Brass Knuckles', rarity: 'common',
    desc: 'Your winning 20s deal +6 damage.',
    flavor: 'For when the cards aren\'t enough.',
    icon: () => ic('<g fill="var(--accent)"><circle cx="12" cy="16" r="5"/><circle cx="20" cy="14" r="5"/><circle cx="28" cy="16" r="5"/></g><rect x="10" y="22" width="20" height="8" rx="3" fill="var(--accent-deep)"/>'),
    modDealt: (c, dmg, m) => (m.win && m.playerTotal === 20 ? dmg + 6 : dmg),
  },
  {
    id: 'marked_deck', name: 'Marked Deck', rarity: 'rare',
    desc: 'You always see the next card in the shoe.',
    flavor: 'A pinprick in every back.',
    icon: () => ic('<rect x="10" y="8" width="20" height="26" rx="3" fill="var(--primary-deep)" stroke="var(--accent)"/><circle cx="20" cy="21" r="3" fill="var(--primary-hot)"/>'),
    flags: { marked: true },
  },
  {
    id: 'widows_ring', name: "Widow's Ring", rarity: 'rare',
    desc: 'Pushes deal 8 damage instead of nothing.',
    flavor: 'She never let a tie go quietly.',
    icon: () => ic('<circle cx="20" cy="22" r="10" fill="none" stroke="var(--accent)" stroke-width="3"/><path d="M20 6 L24 14 L16 14 Z" fill="var(--primary)"/>'),
    flags: { pushDamage: 8 },
  },
  {
    id: 'tourniquet', name: 'Tourniquet', rarity: 'common',
    desc: 'Busts cost 25% less HP.',
    flavor: 'Twist until the bleeding slows.',
    icon: () => ic('<path d="M8 20 Q20 8 32 20 Q20 32 8 20 Z" fill="none" stroke="var(--primary)" stroke-width="3"/><rect x="18" y="6" width="4" height="28" fill="var(--accent-deep)"/>'),
    modTaken: (c, dmg, m) => (m.bust ? dmg * 0.75 : dmg),
  },
  {
    id: 'velvet_rope', name: 'Velvet Rope', rarity: 'rare',
    desc: 'Dealers must stand on soft 17.',
    flavor: 'The line you were told not to cross.',
    icon: () => ic('<circle cx="10" cy="10" r="4" fill="var(--accent)"/><circle cx="30" cy="10" r="4" fill="var(--accent)"/><path d="M10 12 Q20 34 30 12" fill="none" stroke="var(--primary)" stroke-width="4"/>'),
    flags: { dealerStandSoft17: true },
  },
  {
    id: 'counterfeit_chip', name: 'Counterfeit Chip', rarity: 'common',
    desc: 'Shop prices are 20% lower.',
    flavor: 'Good enough for the dead.',
    icon: () => ic('<circle cx="20" cy="20" r="13" fill="var(--accent-deep)" stroke="var(--accent)" stroke-width="2"/><text x="20" y="25" font-size="12" fill="var(--surface)" text-anchor="middle" font-family="serif">$</text>'),
    flags: { shopMult: 0.8 },
  },
  {
    id: 'embalmers_thread', name: "Embalmer's Thread", rarity: 'common',
    desc: 'Heal 5 HP after each fight.',
    flavor: 'Stitched with something patient.',
    icon: () => ic('<path d="M10 30 Q20 6 30 30" fill="none" stroke="var(--win)" stroke-width="2"/><circle cx="10" cy="30" r="2.5" fill="var(--accent)"/><circle cx="30" cy="30" r="2.5" fill="var(--accent)"/>'),
    onFightEnd: (c) => { c.player.hp = Math.min(c.run.maxHp, c.player.hp + 5); },
  },
  {
    id: 'rabbits_foot', name: "Rabbit's Foot", rarity: 'common',
    desc: '+1 extra chip per point of winning margin.',
    flavor: 'Still warm. Still lucky.',
    icon: () => ic('<ellipse cx="20" cy="26" rx="7" ry="11" fill="var(--muted)"/><circle cx="20" cy="12" r="5" fill="var(--muted)"/><circle cx="20" cy="34" r="3" fill="var(--accent)"/>'),
    flags: { rabbitFoot: true },
  },
  {
    id: 'debt_collector', name: 'Debt Collector', rarity: 'rare',
    desc: 'Dealer-bust overflow bonus is +7 (instead of +5).',
    flavor: 'It always comes to collect.',
    icon: () => ic('<rect x="10" y="10" width="20" height="24" rx="2" fill="var(--surface-2)" stroke="var(--accent-deep)"/><path d="M14 16 H26 M14 22 H26 M14 28 H22" stroke="var(--primary)" stroke-width="2"/>'),
    modDealt: (c, dmg, m) => (m.dealerBust ? dmg + 2 : dmg), // base already +5; +2 -> +7 total
  },
  {
    id: 'candle_stub', name: 'Candle Stub', rarity: 'common',
    desc: '+10 max HP (applied immediately).',
    flavor: 'A little more light. A little more life.',
    icon: () => ic('<rect x="17" y="16" width="6" height="18" fill="var(--card-face)"/><ellipse cx="20" cy="12" rx="3" ry="6" fill="var(--accent)"/>'),
    onPickup: (run) => { run.maxHp += 10; run.hp = Math.min(run.maxHp, run.hp + 10); },
  },
  {
    id: 'house_key', name: 'House Key', rarity: 'rare',
    desc: 'Landings always offer 3 doors.',
    flavor: 'It fits every lock but the last.',
    icon: () => ic('<circle cx="14" cy="20" r="7" fill="none" stroke="var(--accent)" stroke-width="3"/><rect x="20" y="18" width="14" height="4" fill="var(--accent)"/><rect x="30" y="22" width="4" height="6" fill="var(--accent)"/>'),
    flags: { doorsAlwaysThree: true },
  },
  {
    id: 'cold_coffee', name: 'Cold Coffee', rarity: 'rare',
    desc: 'Once per fight, undo your last hit.',
    flavor: 'Bitter enough to reverse a mistake.',
    icon: () => ic('<path d="M12 14 H28 V26 A6 6 0 0 1 22 32 H18 A6 6 0 0 1 12 26 Z" fill="var(--surface-2)" stroke="var(--accent-deep)"/><path d="M28 16 H32 A4 4 0 0 1 32 24 H28" fill="none" stroke="var(--accent-deep)"/>'),
    onFightStart: (c) => { c._coldCoffee = true; },
    flags: { coldCoffee: true },
  },
  {
    id: 'iron_stomach', name: 'Iron Stomach', rarity: 'common',
    desc: 'Your first bust each fight deals no damage.',
    flavor: 'You can hold a lot of regret.',
    icon: () => ic('<ellipse cx="20" cy="22" rx="11" ry="12" fill="var(--muted)"/><path d="M14 20 Q20 26 26 20" stroke="var(--surface)" stroke-width="2" fill="none"/>'),
    onFightStart: (c) => { c._ironStomach = true; },
    modTaken: (c, dmg, m) => {
      if (m.bust && c._ironStomach) { c._ironStomach = false; c._events.push({ t: 'note', text: 'Iron Stomach — you swallow the bust.' }); return 0; }
      return dmg;
    },
  },
  {
    id: 'gilded_shoe', name: 'Gilded Shoe', rarity: 'common',
    desc: 'Each reshuffle pays you 10 chips.',
    flavor: 'It rattles with coin.',
    icon: () => ic('<path d="M8 26 Q8 14 20 14 Q32 14 32 26 L28 30 H12 Z" fill="var(--accent-deep)" stroke="var(--accent)"/><circle cx="20" cy="22" r="3" fill="var(--accent)"/>'),
    onReshuffle: (c) => { c.run.chips += 10; c._events.push({ t: 'chipGain', amount: 10, reason: 'gilded-shoe' }); },
  },
  {
    id: 'widows_veil', name: "Widow's Veil", rarity: 'legendary',
    desc: 'Enemy quirks are disabled on hands where you stand at 16 or less.',
    flavor: 'Grief makes you invisible to the table.',
    icon: () => ic('<path d="M20 8 Q8 12 10 32 L30 32 Q32 12 20 8 Z" fill="var(--curse)" opacity="0.7"/><path d="M12 20 H28 M14 26 H26" stroke="var(--surface)" stroke-width="1.5"/>'),
    flags: { widowsVeil: true },
  },
  {
    id: 'ledger', name: 'The Ledger', rarity: 'rare',
    desc: 'Natural blackjacks pay +15 chips.',
    flavor: 'Every soul, entered twice.',
    icon: () => ic('<rect x="9" y="8" width="22" height="26" rx="2" fill="var(--surface-2)" stroke="var(--accent-deep)"/><path d="M14 14 H26 M14 20 H26 M14 26 H20" stroke="var(--accent)" stroke-width="1.5"/>'),
    onWin: (c, m) => { if (m.blackjack) { c.run.chips += 15; c._events.push({ t: 'chipGain', amount: 15, reason: 'ledger' }); } },
  },
  {
    id: 'noose', name: 'The Noose', rarity: 'legendary',
    desc: 'Your winning 21s deal +9 damage.',
    flavor: 'Twenty-one knots. Tradition.',
    icon: () => ic('<circle cx="20" cy="26" r="8" fill="none" stroke="var(--accent-deep)" stroke-width="3"/><path d="M20 6 L20 18" stroke="var(--accent-deep)" stroke-width="3"/><path d="M14 24 L26 24" stroke="var(--accent-deep)" stroke-width="2"/>'),
    modDealt: (c, dmg, m) => (m.win && m.playerTotal === 21 ? dmg + 9 : dmg),
  },

  // ---- SPEC2 §D new relics (Heat / Split / Charlie / Stakes / Lounge aware) ----
  {
    id: 'asbestos_gloves', name: 'Asbestos Gloves', rarity: 'rare',
    desc: 'Your Heat cap is raised from 5 to 7.',
    flavor: 'The old croupier wore these to hold the candle to the felt.',
    icon: () => ic('<path d="M13 34 V16 a2 2 0 0 1 4 0 v6 m0 -4 a2 2 0 0 1 4 0 v4 m0 -3 a2 2 0 0 1 4 0 v4 m0 -2 a2 2 0 0 1 4 0 v8 a6 6 0 0 1 -6 6 h-4 a6 6 0 0 1 -6 -6 Z" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="1.3"/>'),
    flags: { heatCap: 7 },
  },
  {
    id: 'slow_burn', name: 'Slow Burn', rarity: 'rare',
    desc: 'A loss lowers your Heat by 1 instead of resetting it.',
    flavor: 'The best fires go down one coal at a time.',
    icon: () => ic('<path d="M20 8 C 14 16 12 20 12 26 a8 8 0 0 0 16 0 c 0 -6 -2 -10 -8 -18 Z" fill="var(--primary-deep)" stroke="var(--primary-hot)" stroke-width="1.5"/><path d="M20 20 c -3 3 -3 6 0 8 c 3 -2 3 -5 0 -8" fill="var(--accent)"/>'),
    flags: { slowBurn: true },
  },
  {
    id: 'splitting_headache', name: 'Splitting Headache', rarity: 'rare',
    desc: 'Each split hand deals +4 damage.',
    flavor: 'Two hands, twice the ache, twice the reach.',
    icon: () => ic('<rect x="8" y="12" width="12" height="18" rx="2" fill="var(--card-face)" transform="rotate(-10 14 21)"/><rect x="20" y="12" width="12" height="18" rx="2" fill="var(--card-face)" transform="rotate(10 26 21)"/><path d="M20 6 L20 34" stroke="var(--primary-hot)" stroke-width="1.5" stroke-dasharray="2 2"/>'),
    modDealt: (c, dmg, m) => (m.win && m.split ? dmg + 4 : dmg),
  },
  {
    id: 'charlies_watch', name: "Charlie's Watch", rarity: 'rare',
    desc: 'Winning hands of exactly four cards deal +6 damage.',
    flavor: 'It stopped at the hour a man named Charlie won five.',
    icon: () => ic('<circle cx="20" cy="22" r="11" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="1.5"/><rect x="16" y="4" width="8" height="5" rx="1" fill="var(--accent-deep)"/><path d="M20 22 V15 M20 22 L25 25" stroke="var(--accent)" stroke-width="1.5"/>'),
    modDealt: (c, dmg, m) => (m.win && m.cards === 4 ? dmg + 6 : dmg),
  },
  {
    id: 'stakeholder', name: 'Stakeholder', rarity: 'rare',
    desc: 'Once per fight, you may reroll a Table Stake.',
    flavor: 'A quiet word with the shoe, once a fight.',
    icon: () => ic('<rect x="9" y="10" width="22" height="14" rx="2" fill="var(--surface-2)" stroke="var(--accent)"/><path d="M20 24 v6 M14 30 h12" stroke="var(--accent-deep)" stroke-width="2"/><path d="M13 17 h14" stroke="var(--accent)" stroke-width="1.5"/>'),
    onFightStart: (c) => { c._stakeReroll = true; },
    flags: { stakeholder: true },
  },
  {
    id: 'concierges_key', name: "Concierge's Key", rarity: 'legendary',
    desc: 'Lounge songs last 5 fights instead of 3.',
    flavor: 'It opens the room where the music never stopped.',
    icon: () => ic('<circle cx="13" cy="20" r="6" fill="none" stroke="var(--accent)" stroke-width="2.5"/><circle cx="13" cy="20" r="2" fill="var(--accent)"/><rect x="18" y="18" width="15" height="4" fill="var(--accent)"/><rect x="29" y="22" width="4" height="5" fill="var(--accent)"/>'),
    flags: { songFights: 5 },
  },
  // Heirloom-only variant (Pawnbroker pool, §E): "Matchbox" — starts each fight with one Heat.
  {
    id: 'matchbox', name: 'Matchbox', rarity: 'common', heirloomOnly: true,
    desc: 'Begin every fight with one Heat already lit.',
    flavor: 'One strike, and the first flame is already yours.',
    icon: () => ic('<rect x="9" y="14" width="22" height="16" rx="2" fill="var(--surface-2)" stroke="var(--accent-deep)"/><rect x="18" y="6" width="4" height="12" fill="var(--card-face)"/><ellipse cx="20" cy="6" rx="3" ry="5" fill="var(--primary-hot)"/>'),
    onFightStart: (c) => { c.run.heat = Math.min(c.heatCap(), c.run.heat + 1); },
  },
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));

export function relicPrice(relic) {
  return { common: 45, rare: 75, legendary: 120 }[relic.rarity];
}

export const RARITY_WEIGHT = { common: 6, rare: 3, legendary: 1 };
