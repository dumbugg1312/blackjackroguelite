// perks.js — persistent meta-progression. Credit is earned when a run ends (death or
// victory) and spent at the Pawnbroker on permanent, ranked perks ("The Standing Ledger").
// Perk ranks live in their own localStorage key so save-schema bumps never touch them.

const PERKS_KEY = 'house.perks.v1';

function ic(body) { return `<svg viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`; }

// Each perk: id, name, desc(rank -> line for NEXT rank), current(rank -> owned-effect line),
// costs[] (one entry per rank; length = max rank), icon(), flavor.
// Effects are consulted at the integration points listed per perk.
export const PERKS = [
  {
    id: 'candlefat', name: 'Candlefat',
    costs: [30, 60, 90],
    desc: (r) => `+5 max HP on every descent (rank ${r + 1})`,
    current: (r) => `+${r * 5} max HP`,
    flavor: 'Rendered from candles that outlived their owners.',
    icon: () => ic('<rect x="15" y="14" width="10" height="20" rx="2" fill="var(--card-face)"/><ellipse cx="20" cy="10" rx="4" ry="7" fill="var(--accent)"/><path d="M13 34 h14" stroke="var(--accent-deep)" stroke-width="3"/>'),
    // applied in Run constructor: maxHp/hp += 5 * rank
  },
  {
    id: 'walking_in_money', name: 'Walking-In Money',
    costs: [25, 50, 75],
    desc: (r) => `Start every descent with +25 chips (rank ${r + 1})`,
    current: (r) => `+${r * 25} starting chips`,
    flavor: 'A little something the House never counted.',
    icon: () => ic('<circle cx="16" cy="22" r="9" fill="var(--accent-deep)" stroke="var(--accent)" stroke-width="1.5"/><circle cx="26" cy="18" r="9" fill="var(--accent-deep)" stroke="var(--accent)" stroke-width="1.5"/><text x="26" y="22" font-size="9" fill="var(--surface)" text-anchor="middle" font-family="serif">$</text>'),
    // applied in Run constructor: chips += 25 * rank
  },
  {
    id: 'needle_thread', name: 'Needle & Thread',
    costs: [40, 80],
    desc: (r) => `Heal +2 more after every cleared fight (rank ${r + 1})`,
    current: (r) => `+${r * 2} heal after fights`,
    flavor: 'You have learned to close your own accounts.',
    icon: () => ic('<path d="M10 30 Q20 8 30 28" fill="none" stroke="var(--win)" stroke-width="2"/><path d="M28 10 L34 16" stroke="var(--accent)" stroke-width="2.5"/><circle cx="33" cy="11" r="1.8" fill="none" stroke="var(--accent)" stroke-width="1.5"/>'),
    // applied in main.js onFightWon: heal(6 + 2 * rank)
  },
  {
    id: 'old_flame', name: 'Old Flame',
    costs: [100],
    desc: () => 'Your Heat cap is raised by 1, permanently',
    current: () => '+1 Heat cap',
    flavor: 'Some fires refuse the snuffer.',
    icon: () => ic('<path d="M20 6 C 14 15 11 20 11 26 a9 9 0 0 0 18 0 c 0 -6 -3 -11 -9 -20 Z" fill="var(--primary-deep)" stroke="var(--primary-hot)" stroke-width="1.5"/><path d="M20 19 c -3.5 3.5 -3.5 7 0 9.5 c 3.5 -2.5 3.5 -6 0 -9.5" fill="var(--accent)"/>'),
    // applied in run.heatCap()
  },
  {
    id: 'crooked_deal', name: 'Crooked Deal',
    costs: [50, 100],
    desc: (r) => `Shop prices 5% lower, permanently (rank ${r + 1})`,
    current: (r) => `−${r * 5}% shop prices`,
    flavor: 'The Concierge owes the Pawnbroker. Now you collect.',
    icon: () => ic('<rect x="9" y="10" width="22" height="16" rx="2" fill="var(--surface-2)" stroke="var(--accent-deep)"/><path d="M13 18 l5 -4 M13 14 l5 4" stroke="var(--primary-hot)" stroke-width="1.6"/><text x="26" y="22" font-size="10" fill="var(--accent)" text-anchor="middle" font-family="serif">$</text>'),
    // applied in run.shopMult(): × (1 - 0.05 * rank)
  },
  {
    id: 'pawnbrokers_favor', name: "Pawnbroker's Favor",
    costs: [60],
    desc: () => 'The Pawnbroker offers 4 heirlooms instead of 3',
    current: () => '4 heirlooms offered',
    flavor: 'He almost smiles. Almost.',
    icon: () => ic('<circle cx="14" cy="12" r="5" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="26" cy="12" r="5" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="20" cy="24" r="5" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="20" cy="24" r="1.6" fill="var(--accent)"/>'),
    // applied in ui/pawnbroker.js: sample size 3 -> 4
  },
];

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));

// ---- persistence ----
export function loadPerks() {
  try { return JSON.parse(localStorage.getItem(PERKS_KEY)) || {}; }
  catch (e) { return {}; }
}
export function savePerks(ranks) { try { localStorage.setItem(PERKS_KEY, JSON.stringify(ranks)); } catch (e) {} }

export function perkRank(id, ranks) {
  const r = (ranks || loadPerks())[id] || 0;
  const p = PERK_BY_ID[id];
  return p ? Math.min(r, p.costs.length) : 0;
}
export function perkMaxed(id, ranks) { const p = PERK_BY_ID[id]; return p && perkRank(id, ranks) >= p.costs.length; }
export function perkNextCost(id, ranks) {
  const p = PERK_BY_ID[id];
  if (!p) return null;
  const r = perkRank(id, ranks);
  return r < p.costs.length ? p.costs[r] : null;
}

// Buy the next rank of a perk. Deducts credit from lifetime stats via the callbacks the
// caller provides (Run owns the stats store). Returns the new rank or null if not affordable.
export function buyPerk(id, getCredit, spendCredit) {
  const cost = perkNextCost(id);
  if (cost == null || getCredit() < cost) return null;
  const ranks = loadPerks();
  ranks[id] = (ranks[id] || 0) + 1;
  spendCredit(cost);
  savePerks(ranks);
  return ranks[id];
}

// ---- credit earning ----
// Death pays for how deep you got and how well you played; victory pays a flat purse on top.
export function creditForRun(won, floorReached, run) {
  const hands = run && run.stats ? (run.stats.handsWon || 0) : 0;
  const base = Math.max(1, floorReached) * 2 + Math.floor(hands / 2);
  return won ? base + 50 : base;
}
