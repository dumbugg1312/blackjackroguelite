// parlor.js — rest: heal 18, OR excise a card, OR enchant a random card. (+cleanse curse option)

import { OFFERABLE_ENCHANTS, ENCHANT_INFO, enchantCard, cleanseCard } from '../game/enchants.js';
import { openDeckView } from './deckview.js';
import { conciergeGreeting } from '../game/story.js';

export function renderParlor(app) {
  const run = app.run;
  const root = document.getElementById('screen-parlor');
  const hasCurse = run.deck.some((c) => c.ench === 'cursed');
  const greeting = conciergeGreeting('parlor', run.floor + 1);

  function draw() {
    root.innerHTML = `
    <div class="centered">
      ${app.topControlsHTML()}
      <div class="hand-side-label">A Parlor</div>
      <h1 class="landing-title">Rest. Cut the deck. Descend.</h1>
      <p class="concierge-line">${greeting}</p>
      <div class="parlor-options">
        <button class="parlor-opt" id="p-heal">
          <div class="reward-icon"><svg viewBox="0 0 40 40"><path d="M20 32 C 8 22 8 12 15 12 C 18 12 20 15 20 15 C 20 15 22 12 25 12 C 32 12 32 22 20 32 Z" fill="var(--win)"/></svg></div>
          <div class="reward-name">Bind Wounds</div>
          <div class="reward-desc">Heal 22 HP.<br><span class="muted">${run.hp}/${run.maxHp} → ${Math.min(run.maxHp, run.hp + 22)}</span></div>
        </button>
        <button class="parlor-opt" id="p-excise">
          <div class="reward-icon"><svg viewBox="0 0 40 40"><path d="M11 11 L29 29 M29 11 L11 29" stroke="var(--primary-hot)" stroke-width="3"/></svg></div>
          <div class="reward-name">Excise a Card</div>
          <div class="reward-desc">Remove any card from your shoe.</div>
        </button>
        <button class="parlor-opt" id="p-enchant">
          <div class="reward-icon"><svg viewBox="0 0 40 40"><path d="M20 6 L23 16 L33 16 L25 22 L28 32 L20 26 L12 32 L15 22 L7 16 L17 16 Z" fill="var(--accent)"/></svg></div>
          <div class="reward-name">${hasCurse ? 'Cleanse or Enchant' : 'Enchant a Card'}</div>
          <div class="reward-desc">${hasCurse ? 'Lift a curse, or enchant a random card.' : 'Bless a random card with an enchantment.'}</div>
        </button>
      </div>
    </div>`;
    app.wireTopControls(root);
    root.querySelector('#p-heal').addEventListener('click', () => { run.heal(22); app.audio.win(); app.toast('You bind your wounds. +22 HP.'); done(); });
    root.querySelector('#p-excise').addEventListener('click', () => {
      openDeckView(run, { pickable: true, title: 'Excise which card?', onPick: (card) => { if (!card) return; run.removeCard(card.id); app.toast('The card leaves the shoe.'); done(); } });
    });
    root.querySelector('#p-enchant').addEventListener('click', () => {
      if (hasCurse) {
        openDeckView(run, {
          pickable: true, title: 'Cleanse a curse, or pick any card to enchant',
          filter: (c) => !c.dead,
          onPick: (card) => {
            if (!card) return;
            if (card.ench === 'cursed') { cleanseCard(card); app.toast('The curse lifts from the card.'); }
            else if (!card.ench) { const e = run.rng.pick(OFFERABLE_ENCHANTS); enchantCard(card, e); app.toast(`A card is now ${ENCHANT_INFO[e].name}.`); }
            else { app.toast('That card is already spoken for.'); return; }
            done();
          },
        });
      } else {
        const cands = run.deck.filter((c) => !c.dead && !c.ench);
        if (!cands.length) { app.toast('No card can take an enchantment.'); return; }
        const card = run.rng.pick(cands);
        const e = run.rng.pick(OFFERABLE_ENCHANTS);
        enchantCard(card, e);
        app.toast(`A ${card.rank} is now ${ENCHANT_INFO[e].name}.`);
        done();
      }
    });
  }

  function done() { run.save(); app.afterRoom(); }

  draw();
  app.show('parlor');
  app.announce('A Parlor. Rest, excise, or enchant.');
  const first = root.querySelector('.parlor-opt'); if (first) first.focus();
}
