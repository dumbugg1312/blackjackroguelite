// pawnbroker.js — SPEC2 §E meta screen. After a profile's first death, every New Descent
// opens with a one-screen choice of 1-of-3 heirloom relics. Skippable ("Owe him nothing").
// The unlock (stats.diedOnce) is persisted; this screen only shows when it is set.

import { RELIC_BY_ID } from '../game/relics.js';
import { STORY_STUBS } from '../game/story-stubs.js';
import { bindTooltip } from './tooltip.js';

// Small starter pool (§E). Matchbox is the heirloom-only "Matchbook-as-relic" variant.
const HEIRLOOM_POOL = ['candle_stub', 'rabbits_foot', 'tourniquet', 'counterfeit_chip', 'matchbox'];

export function renderPawnbroker(app, onDone) {
  const run = app.run;
  const root = document.getElementById('screen-pawnbroker');

  // three distinct heirlooms, seeded off the run rng so ?seed= is reproducible
  const offered = run.rng.sample(HEIRLOOM_POOL, 3).map((id) => RELIC_BY_ID[id]).filter(Boolean);

  const cards = offered.map((r, i) => `
    <button class="reward-card ${r.rarity}" data-i="${i}">
      <div class="reward-rarity ${r.rarity === 'legendary' ? 'brass' : r.rarity === 'rare' ? 'rose' : 'muted'}">heirloom</div>
      <div class="reward-icon">${r.icon()}</div>
      <div class="reward-name">${r.name}</div>
      <div class="reward-desc">${r.desc}</div>
    </button>`).join('');

  root.innerHTML = `
  <div class="centered">
    <div class="hand-side-label">The Pawnbroker</div>
    <h1 class="landing-title">Something on credit?</h1>
    <p class="muted" style="max-width:560px;text-align:center">${STORY_STUBS.pawnbroker.intro}</p>
    <div class="reward-cards">${cards}</div>
    <button class="btn btn-ghost btn-sm" id="pb-skip">${STORY_STUBS.pawnbroker.skip}</button>
  </div>`;

  root.querySelectorAll('.reward-card').forEach((node) => {
    const r = offered[+node.dataset.i];
    bindTooltip(node, () => ({ title: r.name, body: r.desc, flavor: r.flavor, tone: r.rarity === 'legendary' ? 'brass' : 'rose' }));
    node.addEventListener('click', () => {
      run.addRelic(r.id);
      run.heirloom = r.id;
      app.audio.chip();
      app.toast(`You take the ${r.name} on credit.`);
      onDone();
    });
  });
  root.querySelector('#pb-skip').addEventListener('click', () => { run.heirloom = null; onDone(); });

  app.show('pawnbroker');
  app.announce('The Pawnbroker offers you a heirloom. Choose one, or owe him nothing.');
  const first = root.querySelector('.reward-card'); if (first) first.focus();
}
