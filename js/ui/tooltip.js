// tooltip.js — portal tooltip, never clipped. Hover + focus.

let el, titleEl, bodyEl, flavorEl, current = null, hideTimer = null;

function ensure() {
  if (el) return;
  el = document.getElementById('tooltip');
  el.innerHTML = `<div class="tt-title"></div><div class="tt-body"></div><div class="tt-flavor"></div>`;
  titleEl = el.querySelector('.tt-title');
  bodyEl = el.querySelector('.tt-body');
  flavorEl = el.querySelector('.tt-flavor');
}

export function showTooltip(x, y, { title, body, flavor, tone } = {}) {
  ensure();
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  titleEl.textContent = title || '';
  titleEl.className = 'tt-title' + (tone ? ' ' + tone : '');
  bodyEl.textContent = body || '';
  flavorEl.textContent = flavor || '';
  flavorEl.style.display = flavor ? '' : 'none';
  el.hidden = false;
  // position: prefer above-right, clamp to viewport
  const rect = el.getBoundingClientRect();
  let px = x + 14, py = y + 14;
  if (px + rect.width > window.innerWidth - 8) px = x - rect.width - 14;
  if (py + rect.height > window.innerHeight - 8) py = y - rect.height - 14;
  el.style.left = Math.max(8, px) + 'px';
  el.style.top = Math.max(8, py) + 'px';
  requestAnimationFrame(() => { el.style.opacity = '1'; });
}

export function hideTooltip() {
  ensure();
  el.style.opacity = '0';
  current = null;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (el.style.opacity === '0') el.hidden = true; hideTimer = null; }, 130);
}

// bind a tooltip to an element via data
export function bindTooltip(node, dataFn) {
  const enter = (e) => {
    const data = typeof dataFn === 'function' ? dataFn() : dataFn;
    if (!data) return;
    const r = node.getBoundingClientRect();
    current = node;
    showTooltip(e.clientX ?? r.right, e.clientY ?? r.top, data);
  };
  const move = (e) => { if (current === node) { const data = typeof dataFn === 'function' ? dataFn() : dataFn; showTooltip(e.clientX, e.clientY, data); } };
  node.addEventListener('mouseenter', enter);
  node.addEventListener('mousemove', move);
  node.addEventListener('mouseleave', hideTooltip);
  node.addEventListener('focus', () => {
    // Only surface on keyboard focus. Programmatic focus() (e.g. autofocusing
    // the first reward card on screen entry) must not leave a tooltip stuck open.
    if (typeof node.matches === 'function' && !node.matches(':focus-visible')) return;
    const data = typeof dataFn === 'function' ? dataFn() : dataFn;
    if (!data) return;
    current = node;
    const r = node.getBoundingClientRect();
    showTooltip(r.right, r.top, data);
  });
  node.addEventListener('blur', () => { if (current === node) hideTooltip(); });
}
