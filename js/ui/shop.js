// shop.js — The Cage. 2 relics, 2 charms, enchant service, excise service, mystery card. Reroll.

import { RELICS, relicPrice, RARITY_WEIGHT } from '../game/relics.js';
import { CHARMS } from '../game/charms.js';
import { OFFERABLE_ENCHANTS, ENCHANT_INFO, enchantCard } from '../game/enchants.js';
import { makeCard } from '../game/cards.js';
import { chipCounter, chipIcon } from './hud.js';
import { bindTooltip } from './tooltip.js';
import { openDeckView } from './deckview.js';
import { conciergeGreeting } from '../game/story.js';

export function renderShop(app) {
  const run = app.run;
  const root = document.getElementById('screen-shop');
  const floor = run.floor + 1;
  const actMult = floor <= 7 ? 1 : floor <= 14 ? 1.2 : 1.4;
  const priceOf = (base) => Math.max(1, Math.round(base * actMult * run.shopMult()));

  if (!app.shopStock) app.shopStock = buildStock(app, run, priceOf);

  function draw() {
    const stock = app.shopStock;
    const itemsHTML = stock.map((it, i) => {
      if (it.sold) return `<div class="shop-item sold"><div class="reward-rarity muted">sold</div><div class="shop-icon">${it.icon}</div><div class="reward-name">${it.name}</div></div>`;
      const rc = it.rarity ? ' ' + it.rarity : '';
      return `<div class="shop-item${rc}" data-i="${i}">
        ${it.tag ? `<div class="reward-rarity ${it.tagTone || 'muted'}">${it.tag}</div>` : ''}
        <div class="shop-icon">${it.icon}</div>
        <div class="reward-name">${it.name}</div>
        <div class="reward-desc">${it.desc}</div>
        <button class="btn btn-brass btn-sm buy" data-i="${i}" ${run.chips < it.price ? 'disabled' : ''}><span class="price">${chipIcon()}${it.price}</span></button>
      </div>`;
    }).join('');

    root.innerHTML = `
    <div class="centered">
      ${app.topControlsHTML()}
      <div class="hand-side-label">The Cage</div>
      <h1 class="landing-title">Everything here has a price.</h1>
      <p class="concierge-line">${conciergeGreeting('shop', floor)}</p>
      <div>${chipCounter(run)}</div>
      <div class="shop-grid">${itemsHTML}</div>
      <div style="display:flex;gap:16px">
        <button class="btn btn-sm" id="shop-reroll" ${run.chips < 18 ? 'disabled' : ''}>Reroll (18)</button>
        <button class="btn btn-primary" id="shop-leave">Leave the Cage</button>
      </div>
    </div>`;

    app.wireTopControls(root);
    root.querySelectorAll('.shop-item[data-i]').forEach((node) => {
      const it = stock[+node.dataset.i];
      if (it.tooltip) bindTooltip(node, () => it.tooltip);
    });
    root.querySelectorAll('.buy').forEach((b) => b.addEventListener('click', () => buy(+b.dataset.i)));
    root.querySelector('#shop-reroll').addEventListener('click', () => {
      if (run.chips < 18) return;
      run.chips -= 18; app.audio.chip();
      app.shopStock = buildStock(app, run, priceOf);
      draw();
    });
    root.querySelector('#shop-leave').addEventListener('click', () => { app.shopStock = null; app.afterRoom(); });
  }

  function buy(i) {
    const it = app.shopStock[i];
    if (it.sold || run.chips < it.price) return;
    it.buy(() => { run.chips -= it.price; it.sold = true; app.audio.coin(); run.save(); draw(); });
  }

  app.refreshShop = draw; // used after modal picks
  draw();
  app.show('shop');
  app.announce('The Cage. Spend your chips.');
}

function buildStock(app, run, priceOf) {
  const owned = new Set(run.relics);
  const relicPool = RELICS.filter((r) => !owned.has(r.id) && !r.heirloomOnly).map((r) => ({ item: r, weight: RARITY_WEIGHT[r.rarity] }));
  const relics = [];
  for (let k = 0; k < 2 && relicPool.length; k++) {
    const r = run.rng.weighted(relicPool);
    relics.push(r);
    relicPool.splice(relicPool.findIndex((x) => x.item.id === r.id), 1);
  }
  const charms = run.rng.sample(CHARMS, 2);

  const stock = [];
  for (const r of relics) stock.push({
    name: r.name, desc: r.desc, price: priceOf(relicPrice(r)), rarity: r.rarity,
    icon: r.icon(), tag: r.rarity + ' relic', tagTone: r.rarity === 'legendary' ? 'brass' : r.rarity === 'rare' ? 'rose' : 'muted',
    tooltip: { title: r.name, body: r.desc, flavor: r.flavor, tone: r.rarity === 'legendary' ? 'brass' : 'rose' },
    buy: (commit) => { run.addRelic(r.id); commit(); },
  });
  for (const ch of charms) stock.push({
    name: ch.name, desc: ch.desc, price: priceOf(ch.price), icon: ch.icon(), tag: 'charm', tagTone: 'brass',
    tooltip: { title: ch.name, body: ch.desc, flavor: ch.flavor, tone: 'brass' },
    buy: (commit) => {
      if (run.freeCharmSlot() < 0) { app.replaceCharmPrompt(ch.id, () => commit()); return; }
      run.addCharm(ch.id); commit();
    },
  });
  stock.push({
    name: 'Enchant a Card', desc: 'Gild, bloodstain, sharpen, or weigh a card of your choosing.', price: priceOf(40),
    icon: svcIcon('ench'), tag: 'service', tagTone: 'muted',
    buy: (commit) => openDeckView(run, {
      pickable: true, title: 'Enchant which card?', filter: (c) => !c.dead && !c.ench,
      onPick: (card) => { if (!card) return; const e = run.rng.pick(OFFERABLE_ENCHANTS); enchantCard(card, e); app.toast(`A card is now ${ENCHANT_INFO[e].name}.`); commit(); },
    }),
  });
  stock.push({
    name: 'Excise a Card', desc: 'Remove any card from your shoe — forever.', price: priceOf(35),
    icon: svcIcon('excise'), tag: 'service', tagTone: 'muted',
    buy: (commit) => openDeckView(run, {
      pickable: true, title: 'Excise which card?',
      onPick: (card) => { if (!card) return; run.removeCard(card.id); app.toast('The card is gone from the shoe.'); commit(); },
    }),
  });
  const mysteryEnch = run.rng.pick(OFFERABLE_ENCHANTS);
  const ranks = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  const suits = ['S', 'H', 'D', 'C'];
  stock.push({
    name: 'Mystery Card', desc: 'A random enchanted card, added to your shoe.', price: priceOf(30),
    icon: svcIcon('mystery'), tag: 'add', tagTone: 'brass',
    buy: (commit) => { const card = makeCard(run.rng.pick(ranks), run.rng.pick(suits), mysteryEnch); run.addCard(card); app.toast(`A ${ENCHANT_INFO[mysteryEnch].name} ${card.rank} joins the shoe.`); commit(); },
  });
  return stock;
}

function svcIcon(kind) {
  if (kind === 'ench') return `<svg viewBox="0 0 40 40"><path d="M20 6 L23 16 L33 16 L25 22 L28 32 L20 26 L12 32 L15 22 L7 16 L17 16 Z" fill="var(--accent)"/></svg>`;
  if (kind === 'excise') return `<svg viewBox="0 0 40 40"><path d="M10 10 L30 30 M30 10 L10 30" stroke="var(--primary-hot)" stroke-width="3"/><rect x="14" y="14" width="12" height="16" rx="2" fill="none" stroke="var(--line)"/></svg>`;
  return `<svg viewBox="0 0 40 40"><rect x="12" y="8" width="16" height="24" rx="3" fill="var(--primary-deep)" stroke="var(--accent)"/><text x="20" y="26" font-size="16" fill="var(--accent)" text-anchor="middle" font-family="serif">?</text></svg>`;
}
