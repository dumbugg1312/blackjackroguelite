// enchants.js — card enchantment definitions & the hooks combat reads.
// The visual (foil/vein/badge) lives in cards.js rendering; this is the rules layer.

export const ENCHANTS = ['gilded', 'bloodstained', 'sharp', 'heavy', 'cursed'];

export const ENCHANT_INFO = {
  gilded: { name: 'Gilded', desc: '+4 chips whenever you draw this card.', good: true },
  bloodstained: { name: 'Bloodstained', desc: '+5 damage when in your winning hand.', good: true },
  sharp: { name: 'Sharp', desc: 'Counts +1 or -1 — your choice on draw.', good: true },
  heavy: { name: 'Heavy', desc: 'A dealer drawing this must immediately stand.', good: true },
  cursed: { name: 'Cursed', desc: '-4 damage when in your winning hand. Cleanse at a Parlor.', good: false },
};

// enchant a card in place (won't overwrite a curse unless cleansing)
export function enchantCard(card, ench) {
  card.ench = ench;
  if (ench === 'sharp') card.sharpDelta = 0;
  return card;
}

export function cleanseCard(card) {
  if (card.ench === 'cursed') card.ench = null;
  return card;
}

// The pickable (non-curse) enchant types offered by services.
export const OFFERABLE_ENCHANTS = ['gilded', 'bloodstained', 'sharp', 'heavy'];

// ---- Damage contribution from enchantments in the player's winning hand ----
// Returns additive delta. Called by combat during damage assembly.
export function enchantDamageBonus(hand) {
  let delta = 0;
  for (const c of hand) {
    if (c.ench === 'bloodstained') delta += 5;
    else if (c.ench === 'cursed') delta -= 4;
    // The kept-and-upgraded Ring carries Bloodstained on top of its Gilded (SPEC2 §B).
    if (c.ringUp) delta += 4;
  }
  return delta;
}

// ---- Gilded chip payout when the player draws a card ----
export function gildedChipsOnDraw(card) {
  return card.ench === 'gilded' ? 4 : 0;
}
