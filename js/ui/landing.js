// landing.js — the door-choice screen between rooms.

import { actName, actNumber } from '../game/map.js';

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
    node.addEventListener('click', () => {
      const d = doors[+node.dataset.i];
      app.audio.cardSlide();
      app.enterDoor(d);
    });
  });

  app.show('landing');
  app.announce(`Floor ${upcoming}, ${actName(upcoming)}. ${isBoss ? 'A boss waits.' : 'Choose a door.'}`);
  const first = root.querySelector('.door');
  if (first) first.focus();
}
