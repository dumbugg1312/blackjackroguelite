// reward.js — post-fight: clear chips count-up + choose 1 of 3 (relic / charm / chips).

import { RELICS, RELIC_BY_ID, RARITY_WEIGHT } from '../game/relics.js';
import { CHARMS } from '../game/charms.js';
import { chipIcon } from './hud.js';
import { bindTooltip } from './tooltip.js';

function pickRelic(run, allowElite) {
  const owned = new Set(run.relics);
  const pool = RELICS.filter((r) => !owned.has(r.id) && !r.heirloomOnly).map((r) => ({ item: r, weight: RARITY_WEIGHT[r.rarity] * (allowElite && r.rarity !== 'common' ? 1.6 : 1) }));
  if (!pool.length) return null;
  return run.rng.weighted(pool);
}

export function renderReward(app, enemy) {
  const run = app.run;
  const root = document.getElementById('screen-reward');
  const isElite = enemy.tier === 'elite';
  const isBoss = enemy.tier === 'boss';

  const relic = pickRelic(run, isElite || isBoss);
  const charm = run.rng.pick(CHARMS);
  const chipAmt = (isBoss ? 90 : isElite ? 60 : run.rng.int(30, 45));

  const options = [];
  if (relic) options.push({ kind: 'relic', data: relic });
  options.push({ kind: 'charm', data: charm });
  options.push({ kind: 'chips', data: chipAmt });

  const panels = options.map((o, i) => {
    if (o.kind === 'relic') {
      const r = o.data;
      return `<button class="reward-card ${r.rarity}" data-i="${i}">
        <div class="reward-rarity ${r.rarity === 'legendary' ? 'brass' : r.rarity === 'rare' ? 'rose' : 'muted'}">${r.rarity} relic</div>
        <div class="reward-icon">${r.icon()}</div>
        <div class="reward-name">${r.name}</div>
        <div class="reward-desc">${r.desc}</div>
      </button>`;
    }
    if (o.kind === 'charm') {
      const ch = o.data;
      return `<button class="reward-card" data-i="${i}">
        <div class="reward-rarity brass">charm</div>
        <div class="reward-icon">${ch.icon()}</div>
        <div class="reward-name">${ch.name}</div>
        <div class="reward-desc">${ch.desc}${run.freeCharmSlot() < 0 ? ' <span class="muted">(slots full — replaces one)</span>' : ''}</div>
      </button>`;
    }
    return `<button class="reward-card" data-i="${i}">
      <div class="reward-rarity brass">coin</div>
      <div class="reward-icon">${chipIcon().replace('chip-ico', '').replace('<svg', '<svg width="64" height="64"')}</div>
      <div class="reward-name">${o.data} Chips</div>
      <div class="reward-desc">Straight to your account.</div>
    </button>`;
  }).join('');

  root.innerHTML = `
  <div class="centered">
    ${app.topControlsHTML()}
    <div class="hand-side-label">${enemy.name} is finished</div>
    <h1 class="landing-title">Spoils</h1>
    <div class="muted tabular">Cleared: <span class="brass">+${app._lastClearChips} chips</span> · Balance <span class="brass" id="rw-bal">${run.chips}</span></div>
    <div class="reward-cards">${panels}</div>
    <button class="btn btn-ghost btn-sm" id="rw-skip">Take nothing, descend</button>
  </div>`;

  app.wireTopControls(root);

  // tooltips for relic/charm
  root.querySelectorAll('.reward-card').forEach((node) => {
    const o = options[+node.dataset.i];
    if (o.kind === 'relic') bindTooltip(node, () => ({ title: o.data.name, body: o.data.desc, flavor: o.data.flavor, tone: o.data.rarity === 'legendary' ? 'brass' : 'rose' }));
    if (o.kind === 'charm') bindTooltip(node, () => ({ title: o.data.name, body: o.data.desc, flavor: o.data.flavor, tone: 'brass' }));
    node.addEventListener('click', () => choose(o));
  });
  root.querySelector('#rw-skip').addEventListener('click', () => app.afterReward());

  function choose(o) {
    if (o.kind === 'relic') { run.addRelic(o.data.id); app.audio.chip(); app.toast(`You take the ${o.data.name}.`); }
    else if (o.kind === 'charm') {
      if (run.freeCharmSlot() < 0) { app.replaceCharmPrompt(o.data.id); return; }
      run.addCharm(o.data.id); app.audio.chip(); app.toast(`${o.data.name} pocketed.`);
    } else { run.chips += o.data; app.audio.coin(); app.toast(`+${o.data} chips.`); }
    app.afterReward();
  }

  app.show('reward');
  app.announce('Choose your reward.');
  const first = root.querySelector('.reward-card'); if (first) first.focus();
}
