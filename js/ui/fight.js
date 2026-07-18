// fight.js — the table. Drives Combat, plays its event stream with timing + juice.
//
// SPEC2 additions: Heat candle-flame row, fanned Split hands, Five-Card Charlie staging,
// Table Stake flip card by the shoe, Space/click 4× fast-forward, Stand damage preview,
// and ~30% faster pacing.

import { Combat } from '../game/combat.js';
import { cardInnerHTML, cardClasses, totalDisplay, handTotal, miniCardHTML } from '../game/cards.js';
import { CHARM_BY_ID } from '../game/charms.js';
import { actName, actNumber, BOSS_FLOORS } from '../game/map.js';
import { stakeCardSVG, STAKE_BY_ID } from '../game/stakes.js';
import { introLine, deathLine, barkLine, bossSwapLine } from '../game/story.js';
import { chipCounter, renderRelicTray, renderCharmSlots, makeHpBar } from './hud.js';
import { bindTooltip } from './tooltip.js';
import { wait } from '../engine/tween.js';

const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function renderFight(app, enemy) {
  const run = app.run;
  const floor = run.floor + 1;
  const isBoss = enemy.tier === 'boss';
  const isElite = enemy.tier === 'elite';
  const root = document.getElementById('screen-fight');
  const c = new Combat(run, enemy);

  root.innerHTML = `
  <div class="table-stage">
    <div class="felt">
      <div class="dealer-alcove"></div>
      <div class="table-oval"></div>
      <div class="table-rail"></div>
      <div class="felt-glow"></div>
      <div class="candle" aria-hidden="true"><div class="halo"></div><div class="flame"></div><div class="wax"></div></div>
      <div class="env-frame" aria-hidden="true">
        ${chandelierSVG('left')}${chandelierSVG('right')}
        ${chairSVG('left')}${chairSVG('right')}
      </div>
    </div>
    <div class="hud-top">
      <div class="floor-tag"><span class="act">Act ${actNumber(floor)} — ${actName(floor)}</span>FLOOR ${floor}</div>
      <div class="hud-right">
        ${chipCounter(run)}
        ${app.topControlsHTML()}
      </div>
    </div>

    <div class="combatant enemy">
      <div class="portrait ${isBoss ? 'boss' : isElite ? 'elite' : ''}">${enemy.portrait()}</div>
      <div class="combatant-info">
        <div class="combatant-name">${enemy.name} <span class="atk">ATK ${enemy.atk}</span></div>
        <div class="rule-plaque" id="enemy-plaque">${enemy.plaque}</div>
        <div class="hpbar-slot" id="enemy-hp-slot"></div>
        <div class="hp-label" id="enemy-hp-label"></div>
      </div>
    </div>

    <div class="felt-center">
      <div class="hand-row dealer" id="dealer-row"></div>
      <div style="display:flex;align-items:center;justify-content:center;gap:24px">
        <div class="hand-wrap"><div class="hand-side-label">Dealer</div><div class="hand-total" id="dealer-total">—</div></div>
        <div class="hand-wrap"><div class="hand-side-label">You</div><div class="hand-total" id="player-total">—</div></div>
      </div>
      <div class="hand-row player" id="player-row"></div>
      <div class="shoe" id="shoe">
        <div class="stake-slot" id="stake-slot"></div>
        <div class="shoe-stack" id="shoe-stack"></div>
        <div class="shoe-count">shoe <b id="shoe-count">${c.shoe.count}</b></div>
        <div id="marked-slot"></div>
      </div>
    </div>

    <div class="combatant player">
      <div class="portrait">${playerSigil()}</div>
      <div class="combatant-info">
        <div class="combatant-name">You</div>
        <div class="heat-row" id="heat-row" aria-hidden="true"></div>
        <div class="hpbar-slot" id="player-hp-slot"></div>
        <div class="hp-label" id="player-hp-label"></div>
      </div>
    </div>

    <div class="action-zone">
      <div class="action-bar" id="action-bar">
        <button class="btn btn-primary" id="btn-hit" disabled>Hit <span class="hotkey">H</span></button>
        <button class="btn" id="btn-stand" disabled>Stand <span class="hotkey">S</span></button>
        <button class="btn" id="btn-double" disabled>Double <span class="hotkey">D</span></button>
        <button class="btn btn-brass" id="btn-split" hidden>Split <span class="hotkey">P</span></button>
        <button class="btn btn-ghost btn-sm" id="btn-undo" hidden>Undo Hit</button>
      </div>
      <div class="bottom-trays">
        <div class="charm-slots" id="charm-slots"></div>
        <div class="relic-tray" id="relic-tray"></div>
      </div>
    </div>

    <div class="ff-badge" id="ff-badge" hidden>▶▶ 4×</div>
    <div class="enemy-speech" id="enemy-speech" aria-hidden="true"></div>
    <div class="outcome-stamp" id="outcome-stamp"></div>
    <div id="win-banner" aria-hidden="true"></div>
  </div>`;

  // act-based grading + clear any leftover cinematic state from a previous fight
  const stageEl = document.getElementById('stage');
  stageEl.dataset.act = actNumber(floor);
  stageEl.classList.remove('lowhp', 'cine', 'lethal', 'hole-drama');

  app.wireTopControls(root);

  const stack = root.querySelector('#shoe-stack');
  stack.innerHTML = Array.from({ length: 4 }).map((_, i) => `<div class="sc" style="left:${i * 1.5}px;top:${i * 1.5}px"></div>`).join('');

  const enemyHp = makeHpBar('enemy', isBoss);
  const playerHp = makeHpBar('player');
  root.querySelector('#enemy-hp-slot').appendChild(enemyHp.el);
  root.querySelector('#player-hp-slot').appendChild(playerHp.el);
  const enemyHpLabel = root.querySelector('#enemy-hp-label');
  const playerHpLabel = root.querySelector('#player-hp-label');

  const dealerRow = root.querySelector('#dealer-row');
  const playerRow = root.querySelector('#player-row');
  const dealerTotalEl = root.querySelector('#dealer-total');
  const playerTotalEl = root.querySelector('#player-total');
  const shoeCountEl = root.querySelector('#shoe-count');
  const stampEl = root.querySelector('#outcome-stamp');
  const speechEl = root.querySelector('#enemy-speech');
  const relicTray = root.querySelector('#relic-tray');
  const charmSlots = root.querySelector('#charm-slots');
  const btnHit = root.querySelector('#btn-hit');
  const btnStand = root.querySelector('#btn-stand');
  const btnDouble = root.querySelector('#btn-double');
  const btnSplit = root.querySelector('#btn-split');
  const btnUndo = root.querySelector('#btn-undo');
  const markedSlot = root.querySelector('#marked-slot');
  const stakeSlot = root.querySelector('#stake-slot');
  const heatRow = root.querySelector('#heat-row');
  const ffBadge = root.querySelector('#ff-badge');

  const cardEls = new Map();
  let busy = true;
  let handActive = false;
  let fightOver = false;
  let ffActive = false;           // fast-forward (4×) for the current hand
  let playerHands = [];           // .phand container elements (1, or 2 when split)

  renderRelicTray(relicTray, run);

  // fast-forward-aware wait: divides animation gaps by 4 while engaged (never skips info)
  function fwait(ms) { return wait(ffActive ? Math.max(8, Math.round(ms * 0.25)) : ms); }
  function fastForward() {
    if (fightOver || !handActive && busy === false) { /* still allow */ }
    ffActive = true;
    ffBadge.hidden = REDUCED();
  }

  // ---- player hand containers (split-aware) ----
  function resetPlayerArea() {
    playerRow.innerHTML = '';
    playerHands = [makePhand()];
  }
  function makePhand() {
    const d = document.createElement('div');
    d.className = 'phand active';
    d.innerHTML = '<div class="phand-cards"></div><div class="phand-total" hidden></div>';
    playerRow.appendChild(d);
    return d;
  }
  function phandCards(i) { return playerHands[i].querySelector('.phand-cards'); }
  function setActiveHand(idx) {
    playerHands.forEach((h, i) => { h.classList.toggle('active', i === idx); h.classList.toggle('dim', i !== idx); });
  }

  function refreshHUD() {
    enemyHp.set(enemy.hp, enemy.maxHp);
    playerHp.set(c.player.hp, run.maxHp);
    enemyHpLabel.innerHTML = `<b>${enemy.hp}</b> / ${enemy.maxHp}`;
    playerHpLabel.innerHTML = `<b>${c.player.hp}</b> / ${run.maxHp}`;
    root.querySelector('#chip-amount').textContent = run.chips;
    shoeCountEl.textContent = c.shoe.count;
    renderCharmSlots(charmSlots, run, onCharm, () => charmsEnabled());
    renderMarked();
    renderHeat();
    updateTension();
  }

  // ---- tension states: low-HP heartbeat, wounded dealer, lethal camera lean ----
  function updateTension() {
    const lowP = c.player.hp > 0 && c.player.hp <= run.maxHp * 0.3;
    stageEl.classList.toggle('lowhp', lowP && !fightOver);
    app.audio.setHeartbeat(lowP && !fightOver);
    const eport = root.querySelector('.combatant.enemy .portrait');
    if (eport) eport.classList.toggle('wounded', enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.3);
    const lethal = !fightOver && (
      (c.player.hp > 0 && c.player.hp <= Math.round(enemy.atk * 1.25)) ||
      (enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.2));
    app.fx.setLethal(lethal);
  }

  function jolt(sel) {
    const p = root.querySelector(sel);
    if (!p || REDUCED()) return;
    p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit');
  }
  function hpHurt(bar) {
    if (REDUCED()) return;
    bar.el.classList.remove('hurt'); void bar.el.offsetWidth; bar.el.classList.add('hurt');
  }
  function charmsEnabled() { return handActive && !busy && !fightOver && c.state === 'playerTurn' && !(c.stake && c.stake.sealCharms); }

  function renderMarked() {
    const show = run.hasFlag('marked') || (c.stake && c.stake.markNext);
    if (show) {
      const next = c.shoe.peek(1)[0];
      markedSlot.innerHTML = next ? `<div class="hand-side-label" style="margin-top:6px">next</div>${miniCardHTML(next)}` : '';
    } else markedSlot.innerHTML = '';
  }

  // ---- Heat candle flames (A1) ----
  function renderHeat() {
    const cap = run.heatCap();
    const h = run.heat;
    let html = '';
    for (let i = 0; i < cap; i++) html += `<span class="flame ${i < h ? 'lit' : ''}"></span>`;
    heatRow.innerHTML = html;
    heatRow.classList.toggle('hot', h >= 3);
    heatRow.setAttribute('title', `Heat ${h} — damage ×${(1 + 0.15 * h).toFixed(2)}`);
  }

  function updateTotals() {
    // per-hand player totals
    const split = playerHands.length > 1;
    playerHands.forEach((h, i) => {
      const hand = c._hands[i];
      const badge = h.querySelector('.phand-total');
      if (!hand) { badge.hidden = true; return; }
      const pd = totalDisplay(hand.cards, c.playerTotalOpts());
      badge.hidden = !split;
      badge.textContent = pd.text;
      badge.className = 'phand-total' + (pd.bust ? ' bust' : pd.soft ? ' soft' : '') + (hand.charlie ? ' charlie' : '');
    });
    // central "You" total = active hand
    const active = c._hands[c._activeIdx];
    if (active && active.cards.length) {
      const pd = totalDisplay(active.cards, c.playerTotalOpts());
      if (playerTotalEl.textContent !== pd.text && !REDUCED()) {
        playerTotalEl.classList.remove('tick'); void playerTotalEl.offsetWidth; playerTotalEl.classList.add('tick');
        setTimeout(() => playerTotalEl.classList.remove('tick'), 180);
      }
      playerTotalEl.textContent = pd.text;
      playerTotalEl.className = 'hand-total' + (pd.bust ? ' bust' : pd.soft ? ' soft' : '') + (active.cards.length === 2 && pd.total === 21 && !active.split ? ' blackjack' : '');
    } else { playerTotalEl.textContent = '—'; playerTotalEl.className = 'hand-total'; }
    // dealer
    if (!c.dealer.hand.length) { dealerTotalEl.textContent = '—'; dealerTotalEl.className = 'hand-total'; }
    else if (c.dealer.holeRevealed) {
      const dd = totalDisplay(c.dealer.hand, c.dealerTotalOpts());
      dealerTotalEl.textContent = dd.text;
      dealerTotalEl.className = 'hand-total' + (dd.bust ? ' bust' : dd.soft ? ' soft' : '');
    } else {
      const up = c.dealer.up ? handTotal([c.dealer.up], c.dealerTotalOpts()).total : 0;
      dealerTotalEl.textContent = `${up} + ?`;
      dealerTotalEl.className = 'hand-total soft';
    }
    updateStandPreview();
  }

  // ---- Stand damage preview (A5) ----
  function updateStandPreview() {
    let label = 'Stand <span class="hotkey">S</span>';
    if (handActive && !busy && c.state === 'playerTurn') {
      const dmg = c.previewStandDamage();
      if (dmg != null) label = `Stand <b class="preview">~${dmg}</b> <span class="hotkey">S</span>`;
    }
    btnStand.innerHTML = label;
  }

  // ---- card element + fly-in ----
  function makeCardEl(card, faceUp, tiltable) {
    const el = document.createElement('div');
    el.className = cardClasses(card) + (tiltable ? ' tiltable' : '');
    el.dataset.id = card.id;
    el.innerHTML = cardInnerHTML(card);
    if (faceUp) el.classList.add('face-up');
    if (tiltable) attachTilt(el);
    cardEls.set(card.id, el);
    return el;
  }
  function attachTilt(el) {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', (px * 8).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
      el.classList.add('hovering');
    });
    el.addEventListener('mouseleave', () => { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); el.classList.remove('hovering'); });
  }
  async function dealCard(side, card, faceUp, handIdx) {
    const container = side === 'player' ? phandCards(handIdx != null ? handIdx : c._activeIdx) : dealerRow;
    const el = makeCardEl(card, false, side === 'player');
    container.appendChild(el);
    app.audio.cardSlide();
    if (!REDUCED()) {
      const shoeEl = root.querySelector('#shoe-stack');
      const cr = el.getBoundingClientRect();
      const sr = shoeEl.getBoundingClientRect();
      const dx = sr.left - cr.left, dy = sr.top - cr.top;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px,${dy}px) rotate(18deg) scale(.85)`;
      void el.offsetWidth;
      el.style.transition = 'transform .3s var(--ease)';
      el.style.transform = '';
      await fwait(70);
      if (faceUp) el.classList.add('face-up');
      await fwait(150);
    } else {
      if (faceUp) el.classList.add('face-up');
      await fwait(70);
    }
    updateTotals();
    shoeCountEl.textContent = c.shoe.count;
    renderMarked();
  }

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    const sr = document.getElementById('stage').getBoundingClientRect();
    return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
  }

  // ---- play a combat event stream ----
  async function play(events) {
    for (const ev of events) {
      switch (ev.t) {
        case 'stake': { await showStake(ev); break; }
        case 'heat': { renderHeat(); if (ev.delta > 0) app.audio.chip(); break; }
        case 'split': { doSplitLayout(ev); await fwait(180); break; }
        case 'activeHand': { setActiveHand(ev.idx); updateTotals(); await fwait(140); break; }
        case 'deal': {
          if (ev.hole && !ev.faceUp) {
            const el = makeCardEl(ev.card, false, false);
            dealerRow.appendChild(el);
            app.audio.cardSlide();
            if (!REDUCED()) {
              const shoeEl = root.querySelector('#shoe-stack');
              const cr = el.getBoundingClientRect(); const sr = shoeEl.getBoundingClientRect();
              el.style.transition = 'none';
              el.style.transform = `translate(${sr.left - cr.left}px,${sr.top - cr.top}px) rotate(18deg) scale(.85)`;
              void el.offsetWidth; el.style.transition = 'transform .3s var(--ease)'; el.style.transform = '';
            }
            await fwait(REDUCED() ? 50 : 160);
            shoeCountEl.textContent = c.shoe.count;
          } else if (ev.extraHole) {
            const el = makeCardEl(ev.card, false, false);
            el.style.marginLeft = '-70px';
            el.dataset.extra = '1';
            dealerRow.appendChild(el);
            app.audio.cardSlide();
            await fwait(REDUCED() ? 40 : 120);
          } else {
            await dealCard(ev.side, ev.card, ev.faceUp, ev.handIdx);
          }
          break;
        }
        case 'peekHole': {
          revealHoleCards();
          app.toast('The dealer\'s hole card shows through.');
          updateTotals();
          await fwait(220);
          break;
        }
        case 'revealHole': {
          // the dramatic beat of every hand: the room holds its breath, then the card turns
          const hole = c.dealer.hand.find((card) => {
            const el = cardEls.get(card.id);
            return el && !el.classList.contains('face-up');
          });
          if (hole && !REDUCED() && !ffActive) {
            const el = cardEls.get(hole.id);
            stageEl.classList.add('hole-drama');
            if (el) el.classList.add('hole-focus');
            app.audio.holeNote();
            await fwait(430);
            revealHoleCards();
            app.audio.cardSlide();
            updateTotals();
            await fwait(300);
            stageEl.classList.remove('hole-drama');
            if (el) el.classList.remove('hole-focus');
          } else {
            revealHoleCards();
            app.audio.cardSlide();
            updateTotals();
            await fwait(REDUCED() ? 60 : 220);
          }
          break;
        }
        case 'bailiffPick': {
          const keep = cardEls.get(ev.keepId);
          const drop = cardEls.get(ev.dropId);
          if (drop) { drop.style.transition = 'opacity .3s, transform .3s'; drop.style.opacity = '0'; drop.style.transform = 'translateY(-30px)'; setTimeout(() => drop.remove(), 320); cardEls.delete(ev.dropId); }
          if (keep) { keep.style.marginLeft = ''; keep.classList.add('face-up'); }
          app.toast('The Bailiff serves the crueler writ.');
          updateTotals();
          await fwait(300);
          break;
        }
        case 'sharpSwap': {
          const out = cardEls.get(ev.outCardId);
          if (out) {
            out.classList.add('face-up');
            if (!REDUCED()) { out.style.transition = 'transform .25s var(--ease), opacity .25s'; out.style.transform = 'translateY(-40px) rotate(-12deg)'; out.style.opacity = '0'; }
            app.audio.cardSlide();
            await fwait(REDUCED() ? 60 : 200);
            const parent = out.parentNode;
            const el = makeCardEl(ev.inCard, false, true);
            parent.replaceChild(el, out);
            cardEls.delete(ev.outCardId);
            if (!REDUCED()) { el.style.transition = 'none'; el.style.transform = 'translateY(-40px) rotate(12deg)'; void el.offsetWidth; el.style.transition = 'transform .3s var(--ease)'; el.style.transform = ''; }
            await fwait(100); el.classList.add('face-up'); await fwait(150);
          }
          app.toast('The Cardsharp\'s hands blur — a card is gone.');
          bark(bossSwapLine(enemy), { force: true }); // "Let me fix that for you."
          updateTotals();
          break;
        }
        case 'undo': {
          const el = cardEls.get(ev.cardId);
          if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); cardEls.delete(ev.cardId); }
          updateTotals();
          await fwait(140);
          break;
        }
        case 'addCard': { await dealCard(ev.side, ev.card, true, ev.handIdx); break; }
        case 'peek': { showPeek(ev.cards); await fwait(180); break; }
        case 'sleight': {
          const el = cardEls.get(ev.cardId);
          if (el) { el.style.transition = 'opacity .25s, transform .25s'; el.style.opacity = '0'; el.style.transform = 'translateY(-30px)'; setTimeout(() => el.remove(), 260); cardEls.delete(ev.cardId); }
          updateTotals(); shoeCountEl.textContent = c.shoe.count;
          await fwait(180);
          break;
        }
        case 'deadMans': { app.toast('Dead Man\'s Hand — your total is 20.'); await fwait(180); break; }
        case 'reshuffle': {
          app.toast('The shoe is reshuffled.');
          shoeCountEl.textContent = c.shoe.count;
          renderMarked();
          await fwait(180);
          break;
        }
        case 'enemyDamage': {
          const at = centerOf(root.querySelector('.combatant.enemy .portrait'));
          const hot = (ev.heat || 0) >= 3;
          const big = ev.crit || ev.amount >= 18;
          if (ev.crit) { app.fx.hitStop(0.15, 180); app.fx.flash(true); app.fx.impact(); app.audio.blackjack(); }
          else app.fx.hitStop(0.35, Math.min(120, 50 + ev.amount * 3));
          if (big) { app.fx.chroma(); app.fx.punchIn(0.9); }
          else app.fx.punchIn(0.4);
          app.fx.doShake(ev.amount);
          app.fx.flash(false);
          jolt('.combatant.enemy .portrait');
          hpHurt(enemyHp);
          const cls = 'dmg-enemy' + (hot ? ' ember' : '');
          app.fx.floatNumber(at.x, at.y, '-' + ev.amount, cls, (ev.crit ? 3.6 : 2.4 + Math.min(1.4, ev.amount / 24)) * (hot ? 1.2 : 1));
          app.fx.chipBurstAt(at.x, at.y, Math.min(30, 8 + ev.amount), false);
          app.audio.thud(ev.amount);
          enemyHp.set(enemy.hp, enemy.maxHp);
          enemyHpLabel.innerHTML = `<b>${enemy.hp}</b> / ${enemy.maxHp}`;
          updateTension();
          maybeLowBark();
          await fwait(ev.crit ? 200 : 120);
          break;
        }
        case 'playerDamage': {
          if (ev.silent) { playerHp.set(c.player.hp, run.maxHp); playerHpLabel.innerHTML = `<b>${c.player.hp}</b> / ${run.maxHp}`; break; }
          const at = centerOf(root.querySelector('.combatant.player .portrait'));
          app.fx.hitStop(0.35, Math.min(120, 50 + ev.amount * 3));
          app.fx.punchIn(ev.amount >= 14 ? 0.9 : 0.4);
          if (ev.amount >= 14) app.fx.chroma();
          app.fx.doShake(ev.amount);
          app.fx.flash(false);
          jolt('.combatant.player .portrait');
          hpHurt(playerHp);
          app.fx.floatNumber(at.x, at.y, '-' + ev.amount, 'dmg-player', 2.4 + Math.min(1.4, ev.amount / 24));
          app.fx.bloodAt(at.x, at.y, Math.min(24, 8 + ev.amount));
          app.audio.thud(ev.amount);
          playerHp.set(c.player.hp, run.maxHp);
          playerHpLabel.innerHTML = `<b>${c.player.hp}</b> / ${run.maxHp}`;
          updateTension();
          await fwait(140);
          break;
        }
        case 'playerHeal': case 'enemyHeal': {
          const isP = ev.t === 'playerHeal';
          const sel = isP ? '.combatant.player .portrait' : '.combatant.enemy .portrait';
          const at = centerOf(root.querySelector(sel));
          app.fx.floatNumber(at.x, at.y, '+' + ev.amount, 'heal', 2.2);
          refreshHUD();
          app.audio.win();
          await fwait(150);
          break;
        }
        case 'chipGain': {
          const at = centerOf(root.querySelector('#chip-counter'));
          app.fx.floatNumber(at.x, at.y + 24, '+' + ev.amount, 'chip', 1.6);
          app.fx.chipBurstAt(at.x, at.y, 8, false);
          app.audio.chip();
          root.querySelector('#chip-amount').textContent = run.chips;
          await fwait(70);
          break;
        }
        case 'chipLoss': {
          const at = centerOf(root.querySelector('#chip-counter'));
          app.fx.floatNumber(at.x, at.y + 24, '-' + ev.amount, 'dmg-player', 1.6);
          root.querySelector('#chip-amount').textContent = run.chips;
          await fwait(90);
          break;
        }
        case 'outcome': {
          showStamp(ev);
          // Bark triggers (STORY.md §4): player blackjack, or a dealer win / your bust.
          if (ev.kind === 'blackjack') tryBark('blackjack');
          else if (ev.kind === 'lose' || ev.kind === 'bust') tryBark('dealerWin');
          app.announce(outcomeAnnounce(ev));
          await fwait(ev.kind === 'blackjack' || ev.kind === 'charlie' ? 200 : 150);
          break;
        }
        case 'note': { app.toast(ev.text); await fwait(150); break; }
        case 'bossPhase': {
          root.querySelector('#enemy-plaque').textContent = ev.plaque;
          root.querySelector('.combatant.enemy .combatant-name .atk').textContent = 'ATK ' + enemy.atk;
          if (ev.houseFinePrint) { app.fx.candleFlare(); app.fx.flash(true); }
          app.audio.bossSting();
          c._suppressStake = true; // no stake flips during a phase-transition hand
          await bossPhaseBanner(ev.name, ev.plaque);
          // authored phase-2 line (Bouncer: "The list is getting shorter.")
          bark(barkLine(enemy, 'phase', () => Math.random(), barkSeen), { force: true });
          break;
        }
        case 'enemyDead': {
          fightOver = true;
          bark(deathLine(enemy), { force: true, hold: 6000 }); // the dealer's last line
          await killEnemy();
          await fwait(REDUCED() ? 200 : (enemy.tier === 'boss' ? 2400 : 1200));
          break;
        }
        case 'playerDead': { fightOver = true; await fwait(280); break; }
        default: break;
      }
    }
  }

  // ---- Table Stake flip card ----
  async function showStake(ev) {
    const s = STAKE_BY_ID[ev.id];
    c.run.activeStake = ev.id;
    stakeSlot.innerHTML = `<div class="stake-card ${ev.reroll ? '' : 'flip'}">${stakeCardSVG()}<div class="stake-name">${s.name}</div></div>`;
    const cardEl = stakeSlot.querySelector('.stake-card');
    bindTooltip(cardEl, () => ({ title: s.name, body: s.desc, flavor: s.flavor, tone: 'brass' }));
    // Stakeholder relic: offer one reroll per fight before the player acts
    maybeRenderStakeReroll();
    app.audio.cardSlide();
    app.announce(`Table Stake: ${s.name}. ${s.desc}`);
    app.toast(`Stake — ${s.name}`);
    await fwait(REDUCED() ? 80 : 360);
  }
  function maybeRenderStakeReroll() {
    const existing = stakeSlot.querySelector('.stake-reroll');
    if (existing) existing.remove();
    if (c.canRerollStake()) {
      const b = document.createElement('button');
      b.className = 'btn btn-sm stake-reroll';
      b.textContent = 'Reroll Stake';
      b.addEventListener('click', () => {
        if (!c.canRerollStake()) return;
        const r = c.rerollStake();
        refreshHUD();
        (async () => { busy = true; setControls(); await play(r.events); busy = false; setControls(); })();
      });
      stakeSlot.appendChild(b);
    }
  }
  function clearStake() { stakeSlot.innerHTML = ''; }

  // ---- Split layout ----
  function doSplitLayout(ev) {
    const [id0, id1] = ev.cards;
    const el0 = cardEls.get(id0), el1 = cardEls.get(id1);
    playerRow.innerHTML = '';
    playerHands = [makePhand(), makePhand()];
    playerHands.forEach((h) => h.classList.add('split'));
    if (el0) phandCards(0).appendChild(el0);
    if (el1) phandCards(1).appendChild(el1);
    setActiveHand(0);
    app.audio.cardSlide();
    app.toast('You split the pair.');
    app.announce('You split into two hands.');
    updateTotals();
  }

  function revealHoleCards() {
    for (const card of c.dealer.hand) {
      const el = cardEls.get(card.id);
      if (el && !el.classList.contains('face-up')) el.classList.add('face-up');
    }
  }

  function showStamp(ev) {
    stampEl.textContent = ev.label;
    stampEl.className = 'outcome-stamp ' + (ev.kind === 'blackjack' ? 'blackjack' : ev.kind === 'charlie' ? 'charlie' : ev.kind === 'bust' ? 'bust' : (ev.kind === 'win' || ev.kind === 'push') ? 'win' : 'lose');
    stampEl.classList.remove('show'); void stampEl.offsetWidth; stampEl.classList.add('show');
  }

  function outcomeAnnounce(ev) {
    const p = ev.playerTotal, d = ev.dealerTotal;
    if (ev.kind === 'blackjack') return 'Blackjack. You deal a critical blow.';
    if (ev.kind === 'charlie') return `Five-Card Charlie at ${p}. Automatic win.`;
    if (ev.kind === 'bust') return `Bust at ${p}. You take damage.`;
    if (ev.kind === 'win') return `You win, ${p} over ${d}.`;
    if (ev.kind === 'lose') return `You lose, ${p} against ${d}.`;
    if (ev.kind === 'push') return `Push at ${p}.`;
    return ev.label;
  }

  let peekEl = null;
  function showPeek(cards) {
    if (peekEl) peekEl.remove();
    peekEl = document.createElement('div');
    peekEl.style.cssText = 'position:absolute;right:24px;bottom:170px;display:flex;gap:6px;z-index:40;background:oklch(0.13 0.012 353 / .9);border:1px solid var(--accent-deep);padding:8px;border-radius:4px';
    peekEl.innerHTML = `<div style="align-self:center;font-size:.7rem;letter-spacing:.1em;color:var(--muted)">SHOE&nbsp;→</div>` + cards.map(miniCardHTML).join('');
    root.querySelector('.table-stage').appendChild(peekEl);
    setTimeout(() => { if (peekEl) { peekEl.style.transition = 'opacity .5s'; peekEl.style.opacity = '0'; setTimeout(() => peekEl && peekEl.remove(), 500); } }, 4000);
  }

  async function bossPhaseBanner(name, plaque) {
    const intro = document.getElementById('boss-intro');
    intro.innerHTML = `<div class="boss-ribbon"><div class="boss-role">Phase Two</div><div class="boss-name" style="font-size:2.4rem">${name}</div></div><div class="boss-voice">${plaque}</div>`;
    intro.hidden = false;
    await fwait(REDUCED() ? 400 : 1600);
    intro.hidden = true;
    refreshHUD();
  }

  async function killEnemy() {
    // the signature moment: impact frame, hit-stop, letterbox, the dealer burns out
    app.fx.impact();
    app.fx.hitStop(0.12, 260);
    app.fx.punchIn(1);
    const at = centerOf(root.querySelector('.combatant.enemy .portrait'));
    app.fx.chipBurstAt(at.x, at.y, 30, true);
    app.fx.cardShredsAt(at.x, at.y, 14);
    app.fx.doShake(30);
    app.audio.thud(30);
    app.fx.setLethal(false);
    stageEl.classList.add('cine');
    const portrait = root.querySelector('.combatant.enemy .portrait');
    portrait.classList.add('dying');
    await fwait(900);
    if (!REDUCED()) {
      const b = root.querySelector('#win-banner');
      b.innerHTML = `<div class="winb-rule"></div><div class="winb-name">${enemy.name} FOLDS</div><div class="winb-sub">The table is yours</div><div class="winb-rule"></div>`;
      b.classList.add('show');
      app.audio.win();
      await fwait(1500);
    }
    stageEl.classList.remove('cine');
  }

  // ---- Dealer barks (STORY.md §4) ----
  // One bark near the portrait, Archivo italic, fast type-in (instant under reduced
  // motion), auto-fade ~4s, at most one per hand. Triggers: player blackjack, dealer
  // win, dealer < 30% HP (once), plus scripted boss beats and death lines. The bark's
  // full text is mirrored to a polite aria-live region (#bark-live).
  let barkTimer = null, barkTypeTimer = null;
  let barkedThisHand = false, lowBarked = false;
  const barkSeen = new Set();
  function bark(line, { force = false, hold = 4000 } = {}) {
    if (!line) return;
    if (barkSeen.has(line)) return;          // never repeat a line within a fight
    if (!force && barkedThisHand) return;    // at most one bark per hand (low/scripted force through)
    barkedThisHand = true;
    barkSeen.add(line);
    const bl = document.getElementById('bark-live');
    if (bl) { bl.textContent = ''; setTimeout(() => { bl.textContent = line; }, 30); }
    clearTimeout(barkTimer); clearInterval(barkTypeTimer);
    speechEl.classList.add('show');
    if (REDUCED()) {
      speechEl.textContent = line;
    } else {
      speechEl.innerHTML = '<span class="bark-text"></span><span class="caret"></span>';
      const t = speechEl.querySelector('.bark-text');
      let i = 0;
      barkTypeTimer = setInterval(() => {
        i++; t.textContent = line.slice(0, i);
        if (i >= line.length) { clearInterval(barkTypeTimer); const car = speechEl.querySelector('.caret'); if (car) car.remove(); }
      }, 18);
    }
    barkTimer = setTimeout(() => speechEl.classList.remove('show'), hold);
  }
  // fire the trigger's registered line (regular dealers; bosses stay quiet here)
  function tryBark(trigger) { bark(barkLine(enemy, trigger, () => Math.random(), barkSeen)); }
  function maybeLowBark() {
    if (lowBarked || fightOver || enemy.hp <= 0) return;
    if (enemy.hp <= enemy.maxHp * 0.3) {
      lowBarked = true;
      bark(barkLine(enemy, 'low', () => Math.random(), barkSeen), { force: true });
    }
  }

  // ---- controls ----
  function setControls() {
    const active = handActive && !busy && !fightOver && c.state === 'playerTurn';
    btnHit.disabled = !active;
    btnStand.disabled = !active;
    btnDouble.disabled = !active || c.enemy.quirk.forbidDouble || c.activeHand().cards.length !== 2;
    btnDouble.title = c.enemy.quirk.forbidDouble ? 'Doubling is forbidden here.' : '';
    btnSplit.hidden = !(active && c.canSplit());
    btnUndo.hidden = !(active && c.canUndo());
    renderCharmSlots(charmSlots, run, onCharm, () => charmsEnabled());
    maybeRenderStakeReroll();
    updateStandPreview();
  }

  async function afterAction(res) {
    busy = true;
    setControls();
    await play(res.events);
    await processSharp();
    if (res.error) app.toast(res.error);
    if (c.state === 'won') { await endFight(true); return; }
    if (c.state === 'lost') { await endFight(false); return; }
    if (c.state === 'resolved') { await nextHandSoon(); return; }
    busy = false;
    setControls();
  }

  async function processSharp() {
    while (c._sharpQueue && c._sharpQueue.length && c.state === 'playerTurn') {
      const id = c._sharpQueue[0];
      const el = cardEls.get(id);
      const delta = await promptSharp(el);
      c.setSharp(id, delta);
      updateTotals();
    }
    if (c._sharpQueue) c._sharpQueue = c._sharpQueue.filter(() => false);
  }

  function promptSharp(el) {
    return new Promise((resolve) => {
      const menu = document.createElement('div');
      menu.style.cssText = 'position:absolute;z-index:50;display:flex;gap:4px;transform:translate(-50%,-140%)';
      menu.innerHTML = `<button class="btn btn-sm btn-brass" data-d="1">Sharp +1</button><button class="btn btn-sm" data-d="-1">Sharp −1</button>`;
      const stage = document.getElementById('stage');
      const r = (el || playerRow).getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      menu.style.left = (r.left - sr.left + r.width / 2) + 'px';
      menu.style.top = (r.top - sr.top) + 'px';
      stage.appendChild(menu);
      app.toast('Sharp card — choose its edge.');
      const pick = (d) => { menu.remove(); resolve(d); };
      menu.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => pick(+b.dataset.d)));
    });
  }

  function onCharm(i) {
    if (!charmsEnabled()) { if (c.stake && c.stake.sealCharms) app.toast('Dead Air — your charms are sealed this hand.'); return; }
    const cid = run.charms[i];
    if (!cid) return;
    const def = CHARM_BY_ID[cid];
    if (def.canUse && !def.canUse(c)) { app.toast('That charm can\'t be used right now.'); return; }
    const res = c.useCharm(i, def);
    if (res.failed) { app.toast('That charm can\'t be used right now.'); return; }
    app.audio.chip();
    refreshHUD();
    afterAction(res);
  }

  async function nextHandSoon() {
    refreshHUD();
    await fwait(850);
    if (fightOver) return;
    dealerRow.innerHTML = ''; cardEls.clear();
    dealerTotalEl.textContent = '—'; playerTotalEl.textContent = '—';
    dealerTotalEl.className = playerTotalEl.className = 'hand-total';
    clearStake();
    startHand();
  }

  async function startHand() {
    busy = true; handActive = false; ffActive = false; ffBadge.hidden = true;
    barkedThisHand = false; // one bark per hand
    resetPlayerArea();
    setControls();
    const res = c.startHand();
    await play(res.events);
    await processSharp();
    refreshHUD();
    if (c.state === 'won') { await endFight(true); return; }
    if (c.state === 'lost') { await endFight(false); return; }
    if (c.state === 'resolved') { await nextHandSoon(); return; }
    handActive = true; busy = false;
    setControls();
    if (!btnHit.disabled) btnHit.focus();
  }

  async function endFight(won) {
    handActive = false; busy = true; fightOver = true;
    setControls();
    stageEl.classList.remove('lowhp', 'hole-drama');
    app.audio.setHeartbeat(false);
    app.fx.setLethal(false);
    app.currentFight = null;
    await wait(450);
    if (won) {
      c.onFightEnd();
      run.stats.floorsCleared++;
      app.onFightWon(enemy);
    } else {
      app.onPlayerDead(enemy, c.deathCause);
    }
  }

  // input surface for keyboard (main.js routes)
  app.currentFight = {
    hit: () => { if (!btnHit.disabled) { const r = c.hit(); refreshHUD(); afterAction(r); } },
    stand: () => { if (!btnStand.disabled) { const r = c.stand(); refreshHUD(); afterAction(r); } },
    double: () => { if (!btnDouble.disabled) { const r = c.double(); if (r.error) { app.toast(r.error); return; } refreshHUD(); afterAction(r); } },
    split: () => { if (!btnSplit.hidden) { const r = c.split(); refreshHUD(); afterAction(r); } },
    charm: (i) => onCharm(i),
    undo: () => { if (!btnUndo.hidden) { const r = c.undoHit(); refreshHUD(); play(r.events).then(setControls); } },
    fastForward: () => fastForward(),
  };
  btnHit.addEventListener('click', app.currentFight.hit);
  btnStand.addEventListener('click', app.currentFight.stand);
  btnDouble.addEventListener('click', app.currentFight.double);
  btnSplit.addEventListener('click', app.currentFight.split);
  btnUndo.addEventListener('click', app.currentFight.undo);

  // click on empty felt fast-forwards (A5)
  root.querySelector('.table-stage').addEventListener('click', (e) => {
    if (e.target.closest('button, .card, .charm-slot, .relic-chip, .stake-card, .icon-btn, input')) return;
    fastForward();
  });

  if (app.debug) {
    app._activeCombat = c;
    app._debugFight = {
      refresh: refreshHUD,
      setEnemyHP: (n) => { enemy.hp = Math.max(0, Math.min(enemy.maxHp, n)); refreshHUD(); return enemy.hp; },
      forceWin: async () => {
        busy = true; fightOver = true; setControls();
        if (!c._over) { enemy.hp = 0; c.enemy.hp = 0; c._events.push({ t: 'enemyDead' }); c._over = 'won'; }
        await play(c.drain());
        await endFight(true);
      },
      forceLose: async () => {
        busy = true; fightOver = true; setControls();
        c.player.hp = 0; c._sync();
        c.deathCause = c.enemy.tier === 'boss' ? c.enemy.id : (c._lastLoss || 'dealer');
        await endFight(false);
      },
    };
  }

  refreshHUD();
  app.show('fight');

  (async () => {
    if (isBoss) await bossIntro(app, enemy);
    else bark(introLine(enemy), { force: true, hold: 4500 });
    if (isBoss) app.audio.startDrone();
    else app.audio.startMusic(actNumber(floor) >= 2 ? 2 : 1);
    await startHand();
  })();

  app._stopDrone = () => app.audio.stopDrone();
}

function playerSigil() {
  // the one who signed: a white-gloved hand holding its cards, signet catching the candle
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs>
      <radialGradient id="you-bg" cx="50%" cy="90%" r="90%">
        <stop offset="0%" stop-color="oklch(0.24 0.07 353)"/>
        <stop offset="60%" stop-color="oklch(0.12 0.03 353)"/>
        <stop offset="100%" stop-color="oklch(0.07 0.012 353)"/>
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="url(#you-bg)"/>
    <g>
      <rect x="30" y="18" width="26" height="38" rx="3" fill="oklch(0.94 0.008 85)" transform="rotate(-14 43 37)"/>
      <path d="M36 26 L41 26 M36 31 L41 31" stroke="var(--card-ink)" stroke-width="1.2" transform="rotate(-14 43 37)"/>
      <rect x="44" y="14" width="26" height="38" rx="3" fill="oklch(0.96 0.008 85)" transform="rotate(8 57 33)"/>
      <path d="M50 21 L54 25 L58 21 L56 18 L52 18 Z" fill="var(--card-red)" transform="rotate(8 57 33)"/>
    </g>
    <path d="M22 100 L24 78 Q26 62 40 60 L60 60 Q74 62 76 78 L78 100 Z" fill="oklch(0.9 0.012 85)"/>
    <path d="M40 60 Q36 50 40 44 L46 56 M60 60 Q64 50 60 44 L54 56" fill="oklch(0.9 0.012 85)"/>
    <path d="M30 78 Q50 86 70 78" stroke="oklch(0.7 0.02 85)" stroke-width="1" fill="none" opacity="0.7"/>
    <path d="M34 68 Q36 64 40 63 M66 68 Q64 64 60 63" stroke="oklch(0.72 0.02 85)" stroke-width="0.9" fill="none"/>
    <circle cx="63" cy="72" r="3.4" fill="var(--accent)"/>
    <circle cx="63" cy="72" r="1.6" fill="var(--primary)"/>
    <path d="M24 96 L76 96" stroke="oklch(0.55 0.09 85 / 0.5)" stroke-width="1"/>
  </svg>`;
}

// blurred chandelier silhouette hanging into the top corners of the hall
function chandelierSVG(side) {
  return `<svg class="env-chandelier ${side}" viewBox="0 0 190 170">
    <path d="M95 0 L95 34" stroke="oklch(0.3 0.04 85)" stroke-width="3"/>
    <g class="crystal">
      <path d="M40 60 Q95 30 150 60" stroke="oklch(0.42 0.06 85)" stroke-width="3" fill="none"/>
      <path d="M30 62 Q95 96 160 62" stroke="oklch(0.36 0.05 85)" stroke-width="2.4" fill="none"/>
      <ellipse cx="95" cy="42" rx="12" ry="9" fill="oklch(0.4 0.06 85)"/>
      ${[40, 62, 84, 106, 128, 150].map((x, i) => `
        <path d="M${x} ${60 + Math.abs(i - 2.5) * -3 + 8} l0 ${14 + (i % 3) * 5}" stroke="oklch(0.5 0.07 85)" stroke-width="1.4"/>
        <path d="M${x} ${74 + Math.abs(i - 2.5) * -3 + 8 + (i % 3) * 5} l-3 7 l3 8 l3 -8 Z" fill="oklch(0.62 0.08 85)" opacity="0.9"/>`).join('')}
      ${[52, 95, 138].map((x) => `<ellipse cx="${x}" cy="56" rx="4" ry="6" fill="oklch(0.8 0.12 80)" opacity="0.75"/>`).join('')}
    </g>
  </svg>`;
}

// out-of-focus chair-back looming in the near foreground
function chairSVG(side) {
  return `<svg class="env-chair ${side}" viewBox="0 0 300 260">
    <path d="M40 260 L40 90 Q40 30 150 30 Q260 30 260 90 L260 260 Z" fill="oklch(0.1 0.03 353)"/>
    <path d="M60 260 L60 100 Q60 50 150 50 Q240 50 240 100 L240 260 Z" fill="oklch(0.14 0.045 353)"/>
    <path d="M60 140 Q150 120 240 140 M60 190 Q150 170 240 190" stroke="oklch(0.2 0.06 353)" stroke-width="7" fill="none"/>
    <path d="M40 92 Q40 34 150 34 Q260 34 260 92" stroke="oklch(0.32 0.06 85)" stroke-width="3" fill="none" opacity="0.7"/>
  </svg>`;
}

async function bossIntro(app, enemy) {
  const intro = document.getElementById('boss-intro');
  const stage = document.getElementById('stage');
  const line = introLine(enemy); // authored, verbatim
  intro.innerHTML = `<div class="boss-ribbon"><div class="boss-role">${enemy.def.role}</div><div class="boss-name">${enemy.name}</div></div><div class="boss-voice">"${line}"</div>`;
  intro.hidden = false;
  stage.classList.add('cine');
  app.audio.bossSting();
  app.announce(`Boss: ${enemy.name}. ${line}`);
  await wait(REDUCED() ? 600 : 3200);
  intro.hidden = true;
  stage.classList.remove('cine');
}
