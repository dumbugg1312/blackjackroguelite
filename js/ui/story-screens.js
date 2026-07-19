// story-screens.js — full-screen narrative beats (opening vignette, act interstitials,
// the Concierge's confession). Verbatim copy passed in from story.js.
//
// Behaviour (SPEC2 §B): full-screen, advance on click / Enter / Space, skippable, shown
// once per run (interstitials once per act — the caller owns the once-guards). Descent-wipe
// staging is applied by the caller via app.wipeTo(); within the beat, lines fade in with a
// stagger. Under reduced motion everything is an instant crossfade — no stagger, no drift.

const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// showStoryBeat(app, { kind, title, lines, cta, onDone })
//   kind: 'opening' | 'interstitial' | 'confession'
export function showStoryBeat(app, { kind = 'interstitial', title = '', lines = [], cta = 'Descend', onDone = () => {} }) {
  const overlay = document.getElementById('story-overlay');
  const reduced = REDUCED();

  const linesHTML = lines.map((l, i) =>
    `<p class="story-line" style="${reduced ? '' : `animation-delay:${0.15 + i * 0.9}s`}">${l}</p>`).join('');

  overlay.className = `story-beat ${kind}` + (reduced ? ' reduced' : '');
  overlay.innerHTML = `
    <div class="story-inner">
      <div class="story-sigil" aria-hidden="true">${sigil(kind)}</div>
      ${title ? `<div class="story-title">${title}</div>` : ''}
      <div class="story-lines">${linesHTML}</div>
      <button class="btn btn-ghost btn-sm story-advance" id="story-advance">${cta}<span class="story-hint"> — click, Enter, or Space</span></button>
    </div>`;
  overlay.hidden = false;

  // Reveal state: first advance snaps the stagger to complete; the next dismisses.
  let revealed = reduced || lines.length <= 1;
  let done = false;
  const revealTime = reduced ? 0 : 150 + lines.length * 900 + 200;
  const revealTimer = setTimeout(() => { revealed = true; }, revealTime);

  function snap() {
    overlay.querySelectorAll('.story-line').forEach((el) => { el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; });
    revealed = true;
  }
  function advance() {
    if (done) return;
    if (!revealed) { snap(); return; }
    done = true;
    clearTimeout(revealTimer);
    cleanup();
    overlay.hidden = true;
    overlay.innerHTML = '';
    onDone();
  }
  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space' || e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { snap(); done = true; clearTimeout(revealTimer); cleanup(); overlay.hidden = true; overlay.innerHTML = ''; onDone(); return; }
      advance();
    }
  }
  function onClick() { advance(); }
  function cleanup() {
    document.removeEventListener('keydown', onKey, true);
    overlay.removeEventListener('click', onClick);
  }

  document.addEventListener('keydown', onKey, true);
  overlay.addEventListener('click', onClick);

  app.announce(`${title ? title + '. ' : ''}${lines.join(' ')}`);
  overlay.scrollTop = 0;
  const btn = overlay.querySelector('#story-advance');
  if (btn) btn.focus({ preventScroll: true });
}

// small motif per beat kind
function sigil(kind) {
  if (kind === 'confession') {
    // a brass key — the Concierge
    return `<svg viewBox="0 0 80 40"><circle cx="18" cy="20" r="9" fill="none" stroke="var(--accent)" stroke-width="2.4"/><circle cx="18" cy="20" r="3" fill="var(--accent)"/><rect x="26" y="18" width="42" height="4" fill="var(--accent)"/><rect x="60" y="22" width="4" height="8" fill="var(--accent)"/><rect x="52" y="22" width="4" height="6" fill="var(--accent)"/></svg>`;
  }
  // a descending diamond flourish
  return `<svg viewBox="0 0 80 40"><path d="M4 20 H30" stroke="var(--accent-deep)" stroke-width="1"/><path d="M50 20 H76" stroke="var(--accent-deep)" stroke-width="1"/><path d="M40 8 L50 20 L40 32 L30 20 Z" fill="none" stroke="var(--accent)" stroke-width="1.4"/><path d="M40 13 L45 20 L40 27 L35 20 Z" fill="var(--primary)"/></svg>`;
}
