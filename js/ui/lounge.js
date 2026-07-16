// lounge.js — The Lounge (SPEC2 §C): the Concierge pours; choose one of three "songs"
// (temporary buffs lasting the next 3 fights, or 5 with Concierge's Key). One visit per act.
//
// Song mechanics are read by combat.js by id; flavor comes from story.SONG_FLAVOR.

import { STORY_STUBS } from '../game/story-stubs.js';
import { actNumber } from '../game/map.js';
import { conciergeGreeting } from '../game/story.js';

export const SONGS = [
  {
    id: 'encore', name: 'Encore',
    desc: '+3 flat damage on every hand you win.',
    flavor: STORY_STUBS.songs.encore.line,
    icon: `<svg viewBox="0 0 40 40"><path d="M16 8 v18 a4 4 0 1 1 -2 -3.5 V12 l10 -2 v14 a4 4 0 1 1 -2 -3.5 V8 Z" fill="var(--accent)"/></svg>`,
  },
  {
    id: 'tell', name: "The Dealer's Tell",
    desc: 'Dealers reveal their hole card while below 30% HP.',
    flavor: STORY_STUBS.songs.tell.line,
    icon: `<svg viewBox="0 0 40 40"><ellipse cx="20" cy="20" rx="13" ry="8" fill="none" stroke="var(--accent)" stroke-width="1.6"/><circle cx="20" cy="20" r="4" fill="var(--primary)"/></svg>`,
  },
  {
    id: 'lullaby', name: 'Lullaby',
    desc: 'Heal 4 HP each time you win a hand.',
    flavor: STORY_STUBS.songs.lullaby.line,
    icon: `<svg viewBox="0 0 40 40"><path d="M20 30 C 10 22 10 13 16 13 C 19 13 20 16 20 16 C 20 16 21 13 24 13 C 30 13 30 22 20 30 Z" fill="var(--win)"/></svg>`,
  },
];

export function renderLounge(app) {
  const run = app.run;
  const root = document.getElementById('screen-lounge');
  const upcoming = run.floor + 1;
  const act = actNumber(upcoming);
  const fights = run.hasFlag('songFights') || 3;
  const greeting = conciergeGreeting('lounge', upcoming);

  const cards = SONGS.map((s, i) => `
    <button class="reward-card" data-i="${i}">
      <div class="reward-rarity brass">song · ${fights} fights</div>
      <div class="reward-icon">${s.icon}</div>
      <div class="reward-name">${s.name}</div>
      <div class="reward-desc">${s.desc}</div>
    </button>`).join('');

  root.innerHTML = `
  <div class="centered">
    ${app.topControlsHTML()}
    <div class="hand-side-label">The Lounge — Act ${act}</div>
    <h1 class="landing-title">${STORY_STUBS.lounge.title}</h1>
    <p class="concierge-line" style="max-width:560px;text-align:center">${greeting}</p>
    <div class="reward-cards">${cards}</div>
    <button class="btn btn-ghost btn-sm" id="lounge-skip">Leave the music playing, descend</button>
  </div>`;

  app.wireTopControls(root);

  root.querySelectorAll('.reward-card').forEach((node) => {
    node.addEventListener('click', () => {
      const s = SONGS[+node.dataset.i];
      run.addSong(s.id);
      run.loungeActs.push(act);
      app.audio.win();
      app.toast(`${s.name} — the song follows you down.`);
      run.save();
      app.afterRoom();
    });
  });
  root.querySelector('#lounge-skip').addEventListener('click', () => { run.save(); app.afterRoom(); });

  app.show('lounge');
  app.announce('The Lounge. The Concierge pours. Choose a song.');
  const first = root.querySelector('.reward-card'); if (first) first.focus();
}
