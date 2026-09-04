// Shared controls, preset handling and URL-hash state.
// Visual language copied from apps/euler_demo.html — same classes, same palette.

/**
 * Labelled range slider inside a .card-like row.
 * Returns { el, get(), set(v) }; onInput fires with the numeric value.
 */
export function slider({ label, min, max, step, value, unit = '', decimals, onInput, id }) {
  const dec = decimals ?? Math.max(0, -Math.floor(Math.log10(step)));
  const el = document.createElement('div');
  el.className = 'sl-row';
  const sid = id || 'sl-' + Math.random().toString(36).slice(2, 8);
  el.innerHTML = `
    <label class="sl-head" for="${sid}">
      <span class="sl-lab"></span>
      <span class="sl-val"><span class="sl-num"></span> <span class="sl-unit"></span></span>
    </label>
    <input type="range" id="${sid}" min="${min}" max="${max}" step="${step}" value="${value}">`;
  el.querySelector('.sl-lab').innerHTML = label;
  el.querySelector('.sl-unit').innerHTML = unit;
  const input = el.querySelector('input');
  const num = el.querySelector('.sl-num');
  const show = () => { num.textContent = Number(input.value).toFixed(dec); };
  show();
  input.addEventListener('input', () => { show(); onInput?.(Number(input.value)); });
  return {
    el,
    input,
    get: () => Number(input.value),
    set: (v) => { input.value = v; show(); },
  };
}

/** Segmented button group (H / D / T, mode toggles). Returns { el, get, set }. */
export function segmented({ label, options, value, onChange, ariaLabel }) {
  const el = document.createElement('div');
  el.className = 'mode-row';
  el.innerHTML = `<span class="mode-lbl">${label}</span>
    <div class="mode-btns" role="group" aria-label="${ariaLabel || label}"></div>`;
  const box = el.querySelector('.mode-btns');
  let cur = value;
  const btns = options.map(([val, text, cls]) => {
    const b = document.createElement('button');
    b.className = 'mode-btn';
    b.type = 'button';
    b.innerHTML = text;
    b.dataset.val = val;
    if (cls) b.dataset.cls = cls;
    b.addEventListener('click', () => { set(val); onChange?.(val); });
    box.appendChild(b);
    return b;
  });
  function set(val) {
    cur = val;
    for (const b of btns) {
      const on = b.dataset.val === String(val);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.className = 'mode-btn' + (on ? ' active ' + (b.dataset.cls || '') : '');
    }
  }
  set(cur);
  return { el, get: () => cur, set };
}

/** Preset dropdown. presets: { key: {name, ...params} }. */
export function presetSelect(presets, onSelect, id = 'preset') {
  const el = document.createElement('div');
  el.className = 'sl-row';
  el.innerHTML = `<label class="sl-head" for="${id}"><span class="sl-lab">Preset</span></label>
    <select id="${id}" class="preset-sel"></select>`;
  const sel = el.querySelector('select');
  for (const [key, p] of Object.entries(presets)) {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = p.name;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => onSelect(sel.value, presets[sel.value]));
  return { el, sel, set: (k) => { sel.value = k; } };
}

/** Parameter state in the URL hash — no localStorage, links survive a reload. */
export const hashState = {
  read() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return null;
    const out = {};
    for (const kv of h.split('&')) {
      const [k, v] = kv.split('=');
      if (!k) continue;
      const d = decodeURIComponent(v ?? '');
      out[k] = d !== '' && !isNaN(Number(d)) ? Number(d) : d;
    }
    return Object.keys(out).length ? out : null;
  },
  write(obj) {
    const s = Object.entries(obj)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    history.replaceState(null, '', '#' + s);
  },
};

/** rAF-throttled recompute; skips the call when no parameter actually changed. */
export function scheduleRecompute(fn) {
  let pending = false, lastKey = null;
  return (key) => {
    if (key != null && key === lastKey) return;
    lastKey = key;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; fn(); });
  };
}

/** Redraw plots on resize, rAF-throttled. */
export function onResize(fn) {
  let t = false;
  addEventListener('resize', () => {
    if (t) return;
    t = true;
    requestAnimationFrame(() => { t = false; fn(); });
  });
}

/** H / D / T must differ by line style as well as colour (projector rule). */
export const ISOTOPE = {
  H: { label: 'H', color: '#58a6ff', dash: [],       cls: 'm-h' },
  D: { label: 'D', color: '#f0883e', dash: [11, 6],  cls: 'm-d' },
  T: { label: 'T', color: '#3fb950', dash: [3, 5],   cls: 'm-t' },
};
