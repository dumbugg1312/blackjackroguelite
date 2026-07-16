// charms.js — one-use consumables, usable mid-hand during the player's turn.
// use(c) mutates combat, pushes events, and may return { endTurn } / { stand }.

import { makeCard, handTotal } from './cards.js';

function ic(body) { return `<svg viewBox="0 0 40 40" aria-hidden="true">${body}</svg>`; }

export const CHARMS = [
  {
    id: 'glass_eye', name: 'Glass Eye', price: 30,
    desc: 'Peek at the next 3 cards in the shoe.',
    flavor: 'It sees what the shoe intends.',
    icon: () => ic('<ellipse cx="20" cy="20" rx="14" ry="9" fill="var(--card-face)" stroke="var(--accent-deep)"/><circle cx="20" cy="20" r="5" fill="var(--primary)"/><circle cx="20" cy="20" r="2" fill="var(--card-ink)"/>'),
    use: (c) => {
      const peek = c.shoe.peek(3);
      c._events.push({ t: 'peek', cards: peek });
      return {};
    },
  },
  {
    id: 'sleight', name: 'Sleight', price: 34,
    desc: 'Discard the last card you drew this hand.',
    flavor: 'Now you see it.',
    icon: () => ic('<rect x="9" y="12" width="14" height="19" rx="2" fill="var(--card-face)" transform="rotate(-12 16 21)"/><rect x="18" y="10" width="14" height="19" rx="2" fill="var(--card-face)" transform="rotate(10 25 19)"/><path d="M6 8 L14 4" stroke="var(--accent)" stroke-width="2"/>'),
    canUse: (c) => c.player.hand.length > 2,
    use: (c) => {
      if (c.player.hand.length <= 2) return { failed: true };
      const removed = c.player.hand.pop();
      c.shoe.discardPile.push(removed);
      c._events.push({ t: 'sleight', cardId: removed.id });
      return {};
    },
  },
  {
    id: 'dead_mans_hand', name: "Dead Man's Hand", price: 55,
    desc: 'Your total becomes 20. Your turn ends.',
    flavor: 'Aces and eights. It ends every turn eventually.',
    icon: () => ic('<rect x="8" y="9" width="13" height="18" rx="2" fill="var(--card-face)"/><rect x="20" y="9" width="13" height="18" rx="2" fill="var(--card-face)"/><text x="14" y="22" font-size="9" fill="var(--card-ink)" text-anchor="middle" font-family="serif">A</text><text x="26" y="22" font-size="9" fill="var(--card-ink)" text-anchor="middle" font-family="serif">8</text><path d="M10 31 h20" stroke="var(--primary-hot)" stroke-width="2"/>'),
    use: (c) => {
      c._forcePlayerTotal = 20;
      c._events.push({ t: 'deadMans' });
      return { stand: true };
    },
  },
  {
    id: 'transfusion', name: 'Transfusion', price: 40,
    desc: 'Heal 12 HP.',
    flavor: 'Someone else\'s, probably.',
    icon: () => ic('<rect x="16" y="6" width="8" height="20" rx="4" fill="var(--card-face)" stroke="var(--primary-hot)"/><path d="M20 12 v10" stroke="var(--primary-hot)" stroke-width="2"/><path d="M20 26 l-4 6 h8 Z" fill="var(--primary-hot)"/><path d="M20 30 c 3 3 3 5 0 5 c -3 0 -3 -2 0 -5" fill="var(--primary)"/>'),
    use: (c) => {
      const before = c.player.hp;
      c.player.hp = Math.min(c.run.maxHp, c.player.hp + 12);
      c._events.push({ t: 'playerHeal', amount: c.player.hp - before });
      return {};
    },
  },
  {
    id: 'loaded_spring', name: 'Loaded Spring', price: 45,
    desc: "The dealer's next draw is its worst possible card.",
    flavor: 'Rigged to spring the wrong way.',
    icon: () => ic('<path d="M12 8 q8 4 0 8 q-8 4 0 8 q8 4 0 8" fill="none" stroke="var(--accent)" stroke-width="2.5"/><rect x="8" y="6" width="10" height="3" fill="var(--accent-deep)"/><rect x="8" y="31" width="18" height="3" fill="var(--accent-deep)"/>'),
    use: (c) => {
      c._loadedSpring = true;
      c._events.push({ t: 'note', text: 'The shoe is rigged against the dealer.' });
      return {};
    },
  },
  {
    id: 'insurance_slip', name: 'Insurance Slip', price: 50,
    desc: 'Negate the next damage you would take.',
    flavor: 'The House insures against itself.',
    icon: () => ic('<path d="M20 6 L32 11 V22 C32 29 26 33 20 35 C14 33 8 29 8 22 V11 Z" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="1.5"/><path d="M14 20 l4 4 l8 -9" fill="none" stroke="var(--win)" stroke-width="2.5"/>'),
    use: (c) => {
      c._insurance = true;
      c._events.push({ t: 'note', text: 'Insured against the next wound.' });
      return {};
    },
  },
  {
    id: 'pocket_ace', name: 'Pocket Ace', price: 48,
    desc: 'Add an Ace to your hand right now.',
    flavor: 'It was up your sleeve the whole time.',
    icon: () => ic('<rect x="12" y="7" width="16" height="24" rx="2" fill="var(--card-face)" transform="rotate(6 20 19)"/><text x="20" y="24" font-size="14" fill="var(--card-ink)" text-anchor="middle" font-family="serif" transform="rotate(6 20 19)">A</text><path d="M6 34 q6 -4 12 -2" fill="none" stroke="var(--accent)" stroke-width="1.5"/>'),
    use: (c) => {
      const ace = makeCard('A', 'S');
      c.player.hand.push(ace);
      c._events.push({ t: 'addCard', side: 'player', card: ace });
      const ht = handTotal(c.player.hand, c.playerTotalOpts());
      if (ht.bust) c._events.push({ t: 'bustPending' });
      return {};
    },
  },
  {
    id: 'cigarette', name: 'Cigarette', price: 28,
    desc: 'Your next bust deals no damage (expires end of fight).',
    flavor: 'Steadies the hands. Ends the fear.',
    icon: () => ic('<rect x="6" y="20" width="24" height="6" rx="1" fill="var(--card-face)"/><rect x="26" y="20" width="4" height="6" fill="var(--accent-deep)"/><circle cx="8" cy="23" r="2.5" fill="var(--primary-hot)"/><path d="M8 16 q2 -3 0 -6 M12 16 q2 -3 0 -6" fill="none" stroke="var(--muted)" stroke-width="1.5"/>'),
    use: (c) => {
      c._cigarette = true;
      c._events.push({ t: 'note', text: 'The fear burns away.' });
      return {};
    },
  },
  // ---- SPEC2 §D new charms ----
  {
    id: 'matchbook', name: 'Matchbook', price: 26,
    desc: 'Light one Heat immediately.',
    flavor: 'Struck against the felt. The fire remembers.',
    icon: () => ic('<rect x="10" y="12" width="20" height="20" rx="2" fill="var(--surface-2)" stroke="var(--accent-deep)"/><rect x="18" y="6" width="4" height="12" fill="var(--card-face)"/><ellipse cx="20" cy="6" rx="3" ry="5" fill="var(--primary-hot)"/>'),
    use: (c) => {
      const before = c.run.heat;
      c.run.heat = Math.min(c.heatCap(), before + 1);
      c._events.push({ t: 'heat', value: c.run.heat, delta: c.run.heat - before });
      c._events.push({ t: 'note', text: 'A flame catches. Heat rises.' });
      return {};
    },
  },
  {
    id: 'second_opinion', name: 'Second Opinion', price: 38,
    desc: 'Redraw the last card you drew this hand.',
    flavor: 'Ask the shoe again. It may lie differently.',
    icon: () => ic('<path d="M12 20 a8 8 0 1 1 3 6" fill="none" stroke="var(--accent)" stroke-width="2.5"/><path d="M9 14 v6 h6" fill="none" stroke="var(--accent)" stroke-width="2.5"/>'),
    canUse: (c) => c.player.hand.length > (c.activeHand().split ? 1 : 2),
    use: (c) => {
      const min = c.activeHand().split ? 1 : 2;
      if (c.player.hand.length <= min) return { failed: true };
      const removed = c.player.hand.pop();
      c.shoe.discardPile.push(removed);
      c._events.push({ t: 'sleight', cardId: removed.id });
      const nu = c._drawFor('player');
      c.player.hand.push(nu);
      c._events.push({ t: 'deal', side: 'player', card: nu, faceUp: true, handIdx: c._activeIdx });
      if (nu.ench === 'sharp') c._sharpQueue.push(nu.id);
      return {};
    },
  },
  {
    id: 'velvet_glove', name: 'Velvet Glove', price: 46,
    desc: 'This hand, your next bust becomes a stand at 21 — once.',
    flavor: 'Soft enough to catch a fall from twenty-two.',
    icon: () => ic('<path d="M14 34 V18 a2 2 0 0 1 4 0 v8 m0 -2 a2 2 0 0 1 4 0 v2 m0 -2 a2 2 0 0 1 4 0 v3 m0 -1 a2 2 0 0 1 4 0 v6 a6 6 0 0 1 -6 6 h-2 a8 8 0 0 1 -8 -8 Z" fill="var(--primary-deep)" stroke="var(--primary)" stroke-width="1.2"/>'),
    use: (c) => {
      c._velvetGlove = true;
      c._events.push({ t: 'note', text: 'You pull on the velvet glove.' });
      return {};
    },
  },
  {
    id: 'bribe', name: 'Bribe', price: 52,
    desc: "Skip the dealer's turn; the hand resolves against the dealer's showing +10.",
    flavor: 'A coin the House still recognizes, if not honors.',
    icon: () => ic('<circle cx="15" cy="20" r="8" fill="var(--accent-deep)" stroke="var(--accent)"/><circle cx="24" cy="20" r="8" fill="var(--accent-deep)" stroke="var(--accent)"/><text x="24" y="24" font-size="9" fill="var(--surface)" text-anchor="middle" font-family="serif">$</text>'),
    use: (c) => {
      c._bribe = true;
      c._events.push({ t: 'note', text: 'A coin changes hands. The dealer stands down.' });
      return { stand: true };
    },
  },
];

export const CHARM_BY_ID = Object.fromEntries(CHARMS.map((c) => [c.id, c]));
