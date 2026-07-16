// hud.js — shared HUD component builders (chip icon, relic tray, charm slots, hp bars).

import { RELIC_BY_ID } from '../game/relics.js';
import { CHARM_BY_ID } from '../game/charms.js';
import { bindTooltip } from './tooltip.js';

export function chipIcon() {
  return `<svg class="chip-ico" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="var(--accent-deep)" stroke="var(--accent)" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2 2"/>
    <g fill="var(--accent)"><rect x="11" y="1" width="2" height="3"/><rect x="11" y="20" width="2" height="3"/><rect x="1" y="11" width="3" height="2"/><rect x="20" y="11" width="3" height="2"/></g>
  </svg>`;
}

export function chipCounter(run) {
  return `<span class="chip-counter" id="chip-counter">${chipIcon()}<span class="tabular" id="chip-amount">${run.chips}</span></span>`;
}

// render relic tray into a container
export function renderRelicTray(container, run) {
  container.innerHTML = '';
  for (const id of run.relics) {
    const r = RELIC_BY_ID[id];
    if (!r) continue;
    const chip = document.createElement('div');
    chip.className = 'relic-chip ' + r.rarity;
    chip.tabIndex = 0;
    chip.setAttribute('aria-label', r.name + '. ' + r.desc);
    chip.innerHTML = r.icon();
    bindTooltip(chip, () => ({ title: r.name, body: r.desc, flavor: r.flavor, tone: r.rarity === 'legendary' ? 'brass' : 'rose' }));
    container.appendChild(chip);
  }
}

// render charm slots (3). onUse(index) called when a filled slot is activated.
export function renderCharmSlots(container, run, onUse, enabled) {
  container.innerHTML = '';
  run.charms.forEach((cid, i) => {
    const slot = document.createElement('button');
    slot.className = 'charm-slot ' + (cid ? 'filled' : 'empty');
    slot.type = 'button';
    const key = i + 1;
    if (cid) {
      const c = CHARM_BY_ID[cid];
      slot.innerHTML = c.icon() + `<span class="slot-key">${key}</span>`;
      slot.setAttribute('aria-label', `Charm ${key}: ${c.name}. ${c.desc}`);
      bindTooltip(slot, () => ({ title: c.name, body: c.desc, flavor: c.flavor, tone: 'brass' }));
      slot.disabled = !enabled || !enabled();
      slot.addEventListener('click', () => onUse(i));
    } else {
      slot.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="3 3"/></svg><span class="slot-key">${key}</span>`;
      slot.setAttribute('aria-label', `Charm slot ${key}: empty`);
      slot.disabled = true;
    }
    container.appendChild(slot);
  });
}

// HP bar element builder. side: 'player' | 'enemy'. returns {el, set(hp,max)}
export function makeHpBar(side, boss = false) {
  const wrap = document.createElement('div');
  wrap.className = `hpbar ${side}${boss ? ' boss' : ''}`;
  wrap.innerHTML = `<div class="ghost"></div><div class="fill"></div>`;
  const fill = wrap.querySelector('.fill');
  const ghost = wrap.querySelector('.ghost');
  let ghostTimer = null;
  return {
    el: wrap,
    set(hp, max, animateGhost = true) {
      const pct = Math.max(0, hp / max);
      if (animateGhost) {
        // ghost stays at old fill width, drains after delay
        const cur = parseFloat(fill.style.transform ? fill.style.transform.match(/scaleX\(([^)]+)\)/)?.[1] : 1) || 1;
        ghost.style.transform = `scaleX(${cur})`;
        fill.style.transform = `scaleX(${pct})`;
        clearTimeout(ghostTimer);
        ghostTimer = setTimeout(() => { ghost.style.transition = 'transform 0.5s var(--ease)'; ghost.style.transform = `scaleX(${pct})`; }, 400);
      } else {
        fill.style.transition = 'none';
        ghost.style.transition = 'none';
        fill.style.transform = `scaleX(${pct})`;
        ghost.style.transform = `scaleX(${pct})`;
        requestAnimationFrame(() => { fill.style.transition = ''; });
      }
    },
  };
}
