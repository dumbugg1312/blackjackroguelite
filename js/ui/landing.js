// landing.js — the door-choice screen between rooms.

import { actName, actNumber } from '../game/map.js';
import { bindTooltip } from './tooltip.js';

// What each door type actually does, mechanically — shown on hover/focus.
const DOOR_HELP = {
  table: 'A dealer\'s table. Beat the dealer at blackjack to clear the floor — pays chips and a reward.',
  elite: 'A high-stakes table. A crueler dealer with a harsher rule — but clearing it always offers a relic.',
  boss: 'A boss table. It breaks the rules of blackjack. Clearing it opens the next act.',
  shop: 'The Cage. Spend chips on relics, charms, enchantments, card removal, and a mystery card.',
  shrine: 'A shrine. A strange bargain, or someone with a request. Choices are remembered.',
  parlor: 'A parlor. Rest here: heal, remove a card from your shoe, or enchant one.',
  lounge: 'The Lounge. Choose one song — a buff that follows you for the next several fights.',
};

export function renderLanding(app) {
  const root = document.getElementById('screen-landing');
  const run = app.run;
  const upcoming = run.floor + 1;
  const doors = run.doors;

  const isBoss = doors.length === 1 && doors[0].type === 'boss';

  const doorsHTML = doors.map((d, i) => {
    const cls = d.type === 'boss' ? 'door boss-door' : d.type === 'elite' ? 'door elite-door' : 'door';
    return `<button class="${cls}" data-i="${i}">
      <div class="door-arch">${d.icon}</div>
      <div class="door-label">${d.label}</div>
      <div class="door-whisper">${d.whisper}</div>
      ${d.meta ? `<div class="door-meta">${d.meta}</div>` : ''}
    </button>`;
  }).join('');

  root.innerHTML = `
  <div class="landing centered">
    ${app.topControlsHTML()}
    <div>
      <div class="hand-side-label">Floor ${upcoming} · Act ${actNumber(upcoming)} — ${actName(upcoming)}</div>
      <h1 class="landing-title">${isBoss ? 'One door remains.' : 'Choose your descent.'}</h1>
      ${run.houseWhisper ? `<p class="house-whisper" aria-live="polite">${run.houseWhisper}</p>` : ''}
    </div>
    <div class="doors">${doorsHTML}</div>
  </div>`;

  app.wireTopControls(root);

  root.querySelectorAll('.door').forEach((node) => {
    const d = doors[+node.dataset.i];
    bindTooltip(node, () => ({ title: d.label, body: DOOR_HELP[d.type] || '', flavor: d.whisper, tone: d.type === 'boss' || d.type === 'elite' ? 'rose' : 'brass' }));
    node.addEventListener('click', () => {
      app.audio.cardSlide();
      app.enterDoor(d);
    });
  });

  app.show('landing');
  app.announce(`Floor ${upcoming}, ${actName(upcoming)}. ${isBoss ? 'A boss waits.' : 'Choose a door.'}`);
  const first = root.querySelector('.door');
  if (first) first.focus();
}
