// deckview.js — always-available shoe inspector, grouped by rank with enchantments visible.

import { miniCardHTML, RANKS, cardEnchTooltip } from '../game/cards.js';
import { bindTooltip } from './tooltip.js';

const RANK_ORDER = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'X'];

export function openDeckView(run, { pickable = false, filter = null, onPick = null, title = 'The Shoe' } = {}) {
  const modal = document.getElementById('deckview');
  const cards = run.deck.slice();

  // group by rank
  const groups = {};
  for (const c of cards) {
    const key = c.dead ? 'X' : c.rank;
    (groups[key] ||= []).push(c);
  }

  const enchCount = cards.filter((c) => c.ench).length;
  const debtCount = cards.filter((c) => c.dead).length;

  let rowsHTML = '';
  for (const rank of RANK_ORDER) {
    const g = groups[rank];
    if (!g || !g.length) continue;
    const label = rank === 'X' ? '?' : rank;
    const cardsHTML = g.map((c) => {
      const pk = pickable && (!filter || filter(c));
      return `<div class="dv-card ${pk ? 'pickable' : ''}" data-id="${c.id}" ${pk ? 'tabindex="0" role="button"' : ''}>${miniCardHTML(c)}</div>`;
    }).join('');
    rowsHTML += `<div class="deck-rank-row"><div class="deck-rank-label">${label}</div><div class="deck-cards">${cardsHTML}</div></div>`;
  }

  modal.innerHTML = `<div class="modal">
    <div class="modal-head">
      <h2>${title}</h2>
      <button class="icon-btn" id="dv-close" aria-label="Close">${xIcon()}</button>
    </div>
    <div class="deck-summary">${cards.length} cards · ${enchCount} enchanted · ${debtCount} debt${pickable ? ' — <span class="brass">choose one</span>' : ''}</div>
    <div class="rule"></div>
    <div class="deck-groups scroll">${rowsHTML || '<p class="muted">The shoe is empty.</p>'}</div>
  </div>`;

  modal.hidden = false;

  // tooltips for enchanted / special cards (the Ring shows its combined enchant)
  modal.querySelectorAll('.dv-card').forEach((node) => {
    const card = run.findCard(+node.dataset.id);
    if (!card) return;
    const tip = cardEnchTooltip(card);
    if (tip) bindTooltip(node, () => tip);
  });

  const close = (result) => {
    modal.hidden = true;
    modal.innerHTML = '';
    if (pickable && onPick) onPick(result || null);
  };

  modal.querySelector('#dv-close').addEventListener('click', () => close(null));
  modal.addEventListener('click', (e) => { if (e.target === modal) close(null); }, { once: false });

  if (pickable) {
    modal.querySelectorAll('.dv-card.pickable').forEach((node) => {
      const act = () => { const id = +node.dataset.id; const card = run.findCard(id); close(card); };
      node.addEventListener('click', act);
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
  }

  return { close };
}

// small style injection for deck view card wrappers
const style = document.createElement('style');
style.textContent = `
.dv-card { border-radius: 8px; }
.dv-card.pickable { cursor: pointer; transition: transform .15s var(--ease); }
.dv-card.pickable:hover, .dv-card.pickable:focus-visible { transform: translateY(-4px) scale(1.05); outline-offset: 3px; }
`;
document.head.appendChild(style);

function xIcon() { return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg>`; }
