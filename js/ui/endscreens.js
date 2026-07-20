// endscreens.js — death, the final choice (Escape vs. Inheritance), and its endings.

import { Run } from '../game/run.js';
import { epitaph, DEATH_STANDING, ENDINGS } from '../game/story.js';

export function renderDeath(app, enemy, cause) {
  const run = app.run;
  const root = document.getElementById('screen-death');
  const s = run.stats;
  const floorReached = run.floor + 1;
  const life = Run.recordRun(false, floorReached, run);
  Run.clearSave();

  // A narrative epitaph keyed to how you died (bust / dealer / specific boss).
  const line = epitaph(cause || 'dealer', () => run.rng.next());

  root.innerHTML = `
  <div class="death-screen centered">
    <div class="blood-glow"></div>
    <h1 class="death-title">${DEATH_STANDING}</h1>
    <p class="death-epitaph">${line}</p>
    <p class="muted">You fell to ${enemy ? enemy.name : 'the dark'} on Floor ${floorReached}.</p>
    <dl class="run-stats tabular">
      <dt>Floors descended</dt><dd>${floorReached}</dd>
      <dt>Damage dealt</dt><dd>${s.damageDealt}</dd>
      <dt>Hands won</dt><dd>${s.handsWon} / ${s.handsPlayed}</dd>
      <dt>Biggest hand</dt><dd>${s.biggestHand}</dd>
    </dl>
    <p class="brass" style="margin:4px 0 0">The Pawnbroker credits your account: +${life.creditEarned} · balance ${life.credit}</p>
    <div class="seed-line">seed ${run.seed} · lifetime: ${life.wins} escapes${life.inheritances ? `, ${life.inheritances} inheritances` : ''} in ${life.runs} descents · deepest Floor ${life.bestFloor} · ${life.handsWon} hands won · biggest hit ${life.biggestHit}</div>
    <button class="btn btn-primary btn-lg" id="d-again">New Descent</button>
  </div>`;

  app.audio.stopDrone();
  root.querySelector('#d-again').addEventListener('click', () => app.toTitle());
  app.show('death');
  app.announce(`You have died. ${line} ${DEATH_STANDING}`);
  root.querySelector('#d-again').focus();
}

// The House has fallen. A single choice: the candle, the chair, the Marker on the felt.
export function renderFinalChoice(app) {
  const run = app.run;
  const root = document.getElementById('screen-victory');

  root.innerHTML = `
  <div class="victory-screen centered">
    <div class="felt-warm"></div>
    <h1 class="victory-title">THE HOUSE FALLS SILENT.</h1>
    <p class="muted" style="max-width:560px">The walls hold no cards. On the felt: your Marker. Beside it, a candle. Behind it, the empty chair. The House waits to see which you take.</p>
    <div class="reward-cards">
      <button class="reward-card final-choice" id="fc-escape">
        <div class="reward-rarity rose">the candle</div>
        <div class="reward-icon">${candleIcon()}</div>
        <div class="reward-name">${ENDINGS.escape.label}</div>
        <div class="reward-desc">${ENDINGS.escape.sub} Burn the Marker in the candle and climb into a morning you have never seen.</div>
      </button>
      <button class="reward-card final-choice" id="fc-inherit">
        <div class="reward-rarity brass">the chair</div>
        <div class="reward-icon">${chairIcon()}</div>
        <div class="reward-name">${ENDINGS.inheritance.label}</div>
        <div class="reward-desc">${ENDINGS.inheritance.sub} Sit where the last winner sat. The House always needed a dealer.</div>
      </button>
    </div>
  </div>`;

  app.audio.stopDrone();
  app.audio.blackjack();
  app.show('victory');
  app.announce('The House falls silent. Take the Marker and escape, or take the chair.');
  root.querySelector('#fc-escape').addEventListener('click', () => renderEnding(app, 'escape'));
  root.querySelector('#fc-inherit').addEventListener('click', () => renderEnding(app, 'inheritance'));
  root.querySelector('#fc-escape').focus();
}

// Play a chosen ending, tally it (Escapes vs. Inheritances), and return to the title.
export function renderEnding(app, endingId) {
  const run = app.run;
  const root = document.getElementById('screen-victory');
  const ending = ENDINGS[endingId] || ENDINGS.escape;
  const s = run.stats;

  // Record exactly once, with the chosen ending. Then the run's save is cleared.
  const life = Run.recordRun(true, 21, run, ending.id);
  Run.clearSave();

  app.wipeTo(() => {
    root.innerHTML = `
    <div class="victory-screen centered ${ending.id}">
      <div class="felt-warm"></div>
      <h1 class="victory-title">${ending.banner}</h1>
      <p class="ending-text">${ending.text}</p>
      <dl class="run-stats tabular">
        <dt>Damage dealt</dt><dd>${s.damageDealt}</dd>
        <dt>Hands won</dt><dd>${s.handsWon} / ${s.handsPlayed}</dd>
        <dt>Biggest hand</dt><dd>${s.biggestHand}</dd>
        <dt>Relics carried</dt><dd>${run.relics.length}</dd>
      </dl>
      <p class="brass" style="margin:4px 0 0">The Pawnbroker credits your account: +${life.creditEarned} · balance ${life.credit}</p>
      <div class="seed-line">seed ${run.seed} · lifetime: ${life.wins} escapes · ${life.inheritances} inheritances · ${life.runs} descents · biggest hit ${life.biggestHit}</div>
      <button class="btn btn-brass btn-lg" id="v-again">Descend Again</button>
    </div>`;
    if (ending.id === 'escape') { app.audio.win(); app.fx && app.fx.candleFlare && app.fx.candleFlare(); }
    else { app.audio.bossSting && app.audio.bossSting(); }
    app.show('victory');
    app.announce(`${ending.banner}. ${ending.text}`);
    root.querySelector('#v-again').addEventListener('click', () => app.toTitle());
    root.querySelector('#v-again').focus();
  });
}

// Legacy single-outcome victory (kept for compatibility; default tallies an Escape).
export function renderVictory(app) { renderFinalChoice(app); }

function candleIcon() {
  return `<svg viewBox="0 0 72 72"><rect x="31" y="30" width="10" height="30" fill="var(--card-face)"/><ellipse cx="36" cy="22" rx="6" ry="12" fill="var(--accent)"/><ellipse cx="36" cy="18" rx="2.6" ry="6" fill="var(--card-face)"/><path d="M24 60 h24 l-3 6 h-18 Z" fill="var(--accent-deep)"/></svg>`;
}
function chairIcon() {
  return `<svg viewBox="0 0 72 72" fill="none" stroke="var(--accent)" stroke-width="3"><path d="M24 14 v30 M48 14 v44 M24 44 h24 M20 58 h32 M24 44 v14"/><path d="M24 16 h24" stroke-width="4"/></svg>`;
}
