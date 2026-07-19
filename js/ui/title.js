// title.js — title screen: New Descent / Continue / stats / seed / mute / how-to.

import { Run } from '../game/run.js';
import { randomSeed } from '../engine/rng.js';
import { makeCard, cardInnerHTML } from '../game/cards.js';

// a decorative playing card, scattered at an ornate angle behind the wordmark
function deco(rank, suit, faceUp, x, y, rot, scale) {
  const c = makeCard(rank, suit);
  return `<div class="deco-slot" style="left:${x}%;top:${y}%;transform:translate(-50%,-50%) rotate(${rot}deg) scale(${scale})">
    <div class="card deco-card${faceUp ? ' face-up' : ''}">${cardInnerHTML(c)}</div></div>`;
}

// small brass flourish drawn under the wordmark
function flourish() {
  return `<svg class="title-flourish" viewBox="0 0 240 20" aria-hidden="true">
    <path d="M4 10 H96" stroke="var(--accent-deep)" stroke-width="1"/>
    <path d="M144 10 H236" stroke="var(--accent-deep)" stroke-width="1"/>
    <path d="M120 3 L128 10 L120 17 L112 10 Z" fill="none" stroke="var(--accent)" stroke-width="1.2"/>
    <path d="M120 6.5 L124.5 10 L120 13.5 L115.5 10 Z" fill="var(--primary)"/>
    <circle cx="103" cy="10" r="1.5" fill="var(--accent)"/>
    <circle cx="137" cy="10" r="1.5" fill="var(--accent)"/>
  </svg>`;
}

export function renderTitle(app) {
  const root = document.getElementById('screen-title');
  const stats = Run.loadStats();
  // A save from an incompatible older schema is cleared here; lifetime stats survive.
  const rearranged = Run.hasStaleSave();
  if (rearranged) Run.clearSave();
  const hasSave = Run.hasSave();
  // Inheritance subtly alters the subtitle for a profile that has taken the Chair.
  const inherited = stats.inheritances > 0;

  root.innerHTML = `
  <div class="title-screen">
    <div class="title-decor" aria-hidden="true">
      ${deco('A', 'S', false, 9, 22, -18, 1.35)}
      ${deco('A', 'S', true, 15, 80, 11, 1.2)}
      ${deco('A', 'S', false, 91, 24, 17, 1.15)}
      ${deco('A', 'H', true, 87, 78, -13, 1.1)}
      ${deco('A', 'S', false, 50, 99, 4, 0.9)}
    </div>
    <div class="title-inner centered">
      <h1 class="title-name"><span class="the">THE</span>HOUSE</h1>
      ${flourish()}
      <p class="title-sub">${inherited
        ? 'Under new management. The dealers are dead but the game is not — and now it deals in your name. Win hands to wound them. Lose hands, and the House keeps your blood on account.'
        : 'A casino that deals for what you are, not what you have. It holds your soul twenty-one floors down. Win hands to wound its dealers. Lose, and the House keeps your blood on account.'}</p>
      ${rearranged ? '<p class="title-rearranged muted">The House has rearranged the furniture.</p>' : ''}
      <div class="title-menu">
        <button class="btn btn-primary btn-lg" id="btn-new">New Descent</button>
        <button class="btn" id="btn-continue" ${hasSave ? '' : 'disabled'}>Continue${hasSave ? '' : ' — no run on account'}</button>
        <button class="btn btn-ghost btn-sm" id="btn-howto">How to Play</button>
      </div>
      <div class="title-stats tabular">Descents: ${stats.runs} · Escapes: ${stats.wins}${stats.inheritances ? ` · Inheritances: ${stats.inheritances}` : ''} · Deepest: Floor ${stats.bestFloor}</div>
      <div class="title-foot">
        <button class="btn btn-ghost btn-sm" id="btn-mute">${app.audio.muted ? 'Sound: Off' : 'Sound: On'}</button>
        <span class="seed-entry">seed <input id="seed-input" type="text" maxlength="16" placeholder="random" aria-label="Run seed" value="${(new URLSearchParams(location.search).get('seed') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 16)}"></span>
      </div>
    </div>
  </div>`;

  root.querySelector('#btn-new').addEventListener('click', () => {
    app.audio.arm();
    const s = root.querySelector('#seed-input').value.trim();
    app.newRun(s || randomSeed());
  });
  const cont = root.querySelector('#btn-continue');
  if (hasSave) cont.addEventListener('click', () => { app.audio.arm(); app.continueRun(); });
  root.querySelector('#btn-howto').addEventListener('click', () => { app.audio.arm(); app.openHowto(); });
  root.querySelector('#btn-mute').addEventListener('click', (e) => {
    app.audio.arm();
    const m = app.audio.toggleMute();
    e.target.textContent = m ? 'Sound: Off' : 'Sound: On';
  });

  app.show('title');
  root.querySelector('#btn-new').focus();
}
