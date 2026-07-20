// pawnbroker.js — SPEC2 §E meta screen. After a profile's first death, every New Descent
// opens with the Pawnbroker: a one-screen choice of 1-of-3 heirloom relics (skippable,
// "Owe him nothing"), plus the Standing Ledger — permanent perks bought with Credit,
// the meta-currency earned whenever a run ends. The unlock (stats.diedOnce) is persisted.

import { Run } from '../game/run.js';
import { RELIC_BY_ID } from '../game/relics.js';
import { PERKS, perkRank, perkNextCost, buyPerk } from '../game/perks.js';
import { STORY_STUBS } from '../game/story-stubs.js';
import { bindTooltip } from './tooltip.js';

// Small starter pool (§E). Matchbox is the heirloom-only "Matchbook-as-relic" variant.
const HEIRLOOM_POOL = ['candle_stub', 'rabbits_foot', 'tourniquet', 'counterfeit_chip', 'matchbox'];

function creditIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" style="width:1em;height:1em;vertical-align:-0.12em"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--accent)" stroke-width="2"/><path d="M12 6 v12 M8.5 9 h5 a2.5 2.5 0 0 1 0 5 h-3 a2.5 2.5 0 0 0 0 5 h5" fill="none" stroke="var(--accent)" stroke-width="1.6"/></svg>`;
}

export function renderPawnbroker(app, onDone) {
  const run = app.run;
  const root = document.getElementById('screen-pawnbroker');

  // three (four with the Favor perk) distinct heirlooms, seeded off the run rng
  const offerCount = perkRank('pawnbrokers_favor') ? 4 : 3;
  const offered = run.rng.sample(HEIRLOOM_POOL, offerCount).map((id) => RELIC_BY_ID[id]).filter(Boolean);
  let heirloomTaken = false;

  function draw() {
    const credit = Run.loadStats().credit || 0;

    const cards = heirloomTaken
      ? `<p class="muted">${STORY_STUBS.pawnbroker.afterTake}</p>`
      : offered.map((r, i) => `
        <button class="reward-card ${r.rarity}" data-i="${i}">
          <div class="reward-rarity ${r.rarity === 'legendary' ? 'brass' : r.rarity === 'rare' ? 'rose' : 'muted'}">heirloom</div>
          <div class="reward-icon">${r.icon()}</div>
          <div class="reward-name">${r.name}</div>
          <div class="reward-desc">${r.desc}</div>
        </button>`).join('');

    const ledger = PERKS.map((p) => {
      const rank = perkRank(p.id);
      const cost = perkNextCost(p.id);
      const maxed = cost == null;
      const pips = p.costs.map((_, i) => `<span class="ledger-pip${i < rank ? ' lit' : ''}"></span>`).join('');
      return `<div class="shop-item ledger-item${maxed ? ' owned' : ''}" data-perk="${p.id}">
        <div class="reward-rarity ${maxed ? 'brass' : 'muted'}">${maxed ? 'paid in full' : rank ? p.current(rank) : 'unwritten'}</div>
        <div class="shop-icon">${p.icon()}</div>
        <div class="reward-name">${p.name} <span class="ledger-pips">${pips}</span></div>
        <div class="reward-desc">${maxed ? p.current(rank) : p.desc(rank)}</div>
        ${maxed ? '' : `<button class="btn btn-brass btn-sm perk-buy" data-perk="${p.id}" ${credit < cost ? 'disabled' : ''}><span class="price">${creditIcon()}&nbsp;${cost}</span></button>`}
      </div>`;
    }).join('');

    root.innerHTML = `
    <div class="centered">
      <div class="hand-side-label">Abe Fisch · Pawnbroker · Point Cadet</div>
      <h1 class="landing-title">Something on credit?</h1>
      <p class="muted" style="max-width:560px;text-align:center">${STORY_STUBS.pawnbroker.intro}</p>
      <div class="reward-cards">${cards}</div>
      <div class="ledger-head">
        <span class="hand-side-label">The Standing Ledger</span>
        <span class="chip-counter tabular" title="Credit — earned when a descent ends">${creditIcon()}&nbsp;<span id="pb-credit">${credit}</span>&nbsp;credit</span>
      </div>
      <p class="muted" style="max-width:560px;text-align:center;margin-top:-6px">What you buy here is written in ink. It survives you.</p>
      <div class="shop-grid">${ledger}</div>
      <button class="btn ${heirloomTaken ? 'btn-primary' : 'btn-ghost btn-sm'}" id="pb-skip">${heirloomTaken ? 'Descend' : STORY_STUBS.pawnbroker.skip}</button>
    </div>`;

    root.querySelectorAll('.reward-card').forEach((node) => {
      const r = offered[+node.dataset.i];
      bindTooltip(node, () => ({ title: r.name, body: r.desc, flavor: r.flavor, tone: r.rarity === 'legendary' ? 'brass' : 'rose' }));
      node.addEventListener('click', () => {
        run.addRelic(r.id);
        run.heirloom = r.id;
        app.audio.chip();
        app.toast(`You take the ${r.name} on credit.`);
        heirloomTaken = true;
        draw(); // stay — the player may still want to shop the Ledger
      });
    });

    root.querySelectorAll('.ledger-item').forEach((node) => {
      const p = PERKS.find((x) => x.id === node.dataset.perk);
      bindTooltip(node, () => ({ title: p.name, body: perkNextCost(p.id) == null ? p.current(perkRank(p.id)) : p.desc(perkRank(p.id)), flavor: p.flavor, tone: 'brass' }));
    });
    root.querySelectorAll('.perk-buy').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.perk;
      const rank = buyPerk(id, () => Run.loadStats().credit || 0, (n) => Run.spendCredit(n));
      if (rank == null) return;
      app.audio.chip();
      const p = PERKS.find((x) => x.id === id);
      app.toast(`The Pawnbroker writes it down. ${p.name}, rank ${rank}.`);
      // Start-of-run perks bought right now should count for THIS descent too.
      if (id === 'candlefat') { run.maxHp += 5; run.hp = Math.min(run.maxHp, run.hp + 5); }
      if (id === 'walking_in_money') run.chips += 25;
      draw();
    }));

    root.querySelector('#pb-skip').addEventListener('click', () => { if (!heirloomTaken) run.heirloom = null; onDone(); });
  }

  draw();
  app.show('pawnbroker');
  app.announce('The Pawnbroker offers heirlooms on credit, and the Standing Ledger of permanent perks.');
  const first = root.querySelector('.reward-card, .perk-buy'); if (first) first.focus();
}
