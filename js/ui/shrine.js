// shrine.js — a single event vignette with mechanical choices.

import { RELICS, RELIC_BY_ID, RARITY_WEIGHT } from '../game/relics.js';
import { OFFERABLE_ENCHANTS, ENCHANT_INFO, enchantCard } from '../game/enchants.js';
import { openDeckView } from './deckview.js';

export function renderShrine(app, event) {
  const run = app.run;
  const root = document.getElementById('screen-shrine');

  function drawChoices() {
    const choicesHTML = event.choices.map((ch, i) => {
      const enabled = !ch.enabled || ch.enabled(run);
      return `<button class="btn ${i === 0 ? 'btn-primary' : ''}" data-i="${i}" ${enabled ? '' : 'disabled'}>
        ${ch.label}${ch.hint ? ` <span class="muted" style="font-weight:400">— ${ch.hint}</span>` : ''}
      </button>`;
    }).join('');

    root.innerHTML = `
    <div class="centered">
      ${app.topControlsHTML()}
      <div class="event-panel">
        <div class="event-name">${event.name}</div>
        <div class="event-body">${event.body}</div>
        <div class="rule"></div>
        <div class="event-choices">${choicesHTML}</div>
      </div>
    </div>`;
    app.wireTopControls(root);
    root.querySelectorAll('.event-choices .btn').forEach((b) => b.addEventListener('click', () => run_choice(+b.dataset.i)));
  }

  function showResult(text) {
    root.innerHTML = `
    <div class="centered">
      ${app.topControlsHTML()}
      <div class="event-panel">
        <div class="event-name">${event.name}</div>
        <div class="event-body">${text}</div>
        <div class="rule"></div>
        <button class="btn btn-primary" id="shrine-leave">Descend</button>
      </div>
    </div>`;
    app.wireTopControls(root);
    root.querySelector('#shrine-leave').focus();
    root.querySelector('#shrine-leave').addEventListener('click', () => app.afterRoom());
  }

  const api = {
    chips: (n) => { run.chips = Math.max(0, run.chips + n); if (n > 0) app.audio.coin(); },
    hp: (n) => { if (n < 0) run.damage(-n); else run.heal(n); },
    maxHp: (n) => { run.maxHp = Math.max(10, run.maxHp + n); run.hp = Math.min(run.hp, run.maxHp); },
    healFull: () => { run.hp = run.maxHp; app.audio.win(); },
    coinFlip: () => run.rng.chance(0.5),
    addDebt: () => run.addDebt(),
    giveRandomRelic: () => {
      const owned = new Set(run.relics);
      const pool = RELICS.filter((r) => !owned.has(r.id) && !r.heirloomOnly).map((r) => ({ item: r, weight: RARITY_WEIGHT[r.rarity] }));
      if (!pool.length) return null;
      const r = run.rng.weighted(pool);
      run.addRelic(r.id);
      app.audio.chip();
      return r;
    },
    // A rare-or-better relic (Weeping Bride part 2 reward).
    giveRareRelic: () => {
      const owned = new Set(run.relics);
      let pool = RELICS.filter((r) => !owned.has(r.id) && !r.heirloomOnly && (r.rarity === 'rare' || r.rarity === 'legendary'));
      if (!pool.length) pool = RELICS.filter((r) => !owned.has(r.id) && !r.heirloomOnly);
      if (!pool.length) return null;
      const items = pool.map((r) => ({ item: r, weight: RARITY_WEIGHT[r.rarity] }));
      const r = run.rng.weighted(items);
      run.addRelic(r.id);
      app.audio.chip();
      return r;
    },
    // ---- Story arc setters & the Weeping Bride's Ring ----
    setConciergeStage: (n) => { run.arc.conciergeStage = Math.max(run.arc.conciergeStage || 0, n); },
    setBrideStage: (n) => { run.arc.weepingBride = Math.max(run.arc.weepingBride || 0, n); },
    addRing: () => run.addRingCard(),
    hasRing: () => run.hasRingCard(),
    removeRing: () => run.removeRingCard(),
    upgradeRing: () => run.upgradeRingCard(),
    // The Concierge's drawer: peek and take one of three relics.
    relicPeek: (prompt) => new Promise((resolve) => {
      const owned = new Set(run.relics);
      const cands = RELICS.filter((r) => !owned.has(r.id) && !r.heirloomOnly);
      const three = run.rng.sample(cands, 3);
      if (!three.length) return resolve(null);
      const modal = document.getElementById('deckview');
      modal.innerHTML = `<div class="modal"><div class="modal-head"><h2>${prompt}</h2></div>
        <div class="reward-cards">${three.map((r) => `<button class="reward-card ${r.rarity}" data-id="${r.id}"><div class="reward-rarity ${r.rarity === 'legendary' ? 'brass' : r.rarity === 'rare' ? 'rose' : 'muted'}">${r.rarity} relic</div><div class="reward-icon">${r.icon()}</div><div class="reward-name">${r.name}</div><div class="reward-desc">${r.desc}</div></button>`).join('')}</div>
        <button class="btn btn-ghost btn-sm" id="peek-cancel" style="align-self:center">Take nothing</button></div>`;
      modal.hidden = false;
      const done = (r) => { modal.hidden = true; modal.innerHTML = ''; if (r) { run.addRelic(r.id); app.audio.chip(); } resolve(r || null); };
      modal.querySelectorAll('.reward-card').forEach((n) => n.addEventListener('click', () => done(RELIC_BY_ID[n.dataset.id])));
      modal.querySelector('#peek-cancel').addEventListener('click', () => done(null));
    }),
    enchantRandom: (specific) => {
      const candidates = run.deck.filter((c) => !c.dead && !c.ench);
      if (!candidates.length) return null;
      const card = run.rng.pick(candidates);
      const e = specific || run.rng.pick(OFFERABLE_ENCHANTS);
      enchantCard(card, e);
      return ENCHANT_INFO[e].name;
    },
    duplicateCard: (card) => run.duplicateCard(card),
    removeCard: (card) => run.removeCard(card.id),
    sellRelic: (relic) => run.removeRelic(relic.id),
    pickCard: (prompt) => new Promise((resolve) => {
      openDeckView(run, { pickable: true, title: prompt, filter: (c) => !c.dead, onPick: (card) => resolve(card) });
    }),
    pickRelic: (prompt) => new Promise((resolve) => {
      const modal = document.getElementById('deckview');
      const rels = run.relics.map((id) => RELIC_BY_ID[id]).filter(Boolean);
      modal.innerHTML = `<div class="modal"><div class="modal-head"><h2>${prompt}</h2></div><div class="reward-cards" style="flex-wrap:wrap">${rels.map((r) => `<button class="reward-card ${r.rarity}" data-id="${r.id}"><div class="reward-icon">${r.icon()}</div><div class="reward-name">${r.name}</div><div class="reward-desc">${r.desc}</div></button>`).join('')}</div><button class="btn btn-ghost btn-sm" id="rel-cancel" style="align-self:center">Cancel</button></div>`;
      modal.hidden = false;
      const close = (val) => { modal.hidden = true; modal.innerHTML = ''; resolve(val); };
      modal.querySelectorAll('.reward-card').forEach((n) => n.addEventListener('click', () => close(RELIC_BY_ID[n.dataset.id])));
      modal.querySelector('#rel-cancel').addEventListener('click', () => close(null));
    }),
    result: (text) => { app.audio.cardSlide(); run.save(); showResult(text); },
  };

  async function run_choice(i) {
    const ch = event.choices[i];
    if (ch.enabled && !ch.enabled(run)) return;
    await ch.run(api);
    app.refreshTopChips && app.refreshTopChips();
  }

  drawChoices();
  app.show('shrine');
  app.announce(`${event.name}. ${event.body}`);
  const first = root.querySelector('.event-choices .btn'); if (first) first.focus();
}
