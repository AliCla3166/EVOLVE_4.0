// Composants UI "sticker + chunky" — helpers DOM sans framework.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const fmt = (n) => {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'G';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'k';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

export function btn(label, opts = {}) {
  const { kind = 'slate', size = '', icon = '', onClick, disabled = false, cls = '' } = opts;
  const b = h('button', { class: `btn btn-${kind} ${size} ${cls}`, disabled, onClick: (e) => { if (!disabled && onClick) { pop(b); onClick(e); } } },
    icon ? h('span', { class: 'btn-ico' }, icon) : null, h('span', { class: 'btn-label' }, label));
  return b;
}
export function pop(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
export function panel(title, ...children) {
  return h('section', { class: 'panel' }, title ? h('h2', { class: 'panel-title' }, title) : null, ...children);
}
export function bar(pct, opts = {}) {
  const { color = 'var(--green)', label = '', height = 18 } = opts;
  return h('div', { class: 'bar', style: { height: height + 'px' } },
    h('div', { class: 'bar-fill', style: { width: Math.max(0, Math.min(100, pct)) + '%', background: color } }),
    label ? h('div', { class: 'bar-label' }, label) : null);
}
export function chip(label, active, onClick) {
  return h('button', { class: 'chip' + (active ? ' active' : ''), onClick }, label);
}

let toastHost = null;
export function toast(msg, kind = '') {
  if (!toastHost) { toastHost = h('div', { class: 'toast-host' }); document.body.append(toastHost); }
  const t = h('div', { class: 'toast ' + kind }, msg);
  toastHost.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

export function modal(content, opts = {}) {
  const { closable = true, cls = '' } = opts;
  const overlay = h('div', { class: 'modal-overlay' });
  const box = h('div', { class: 'modal ' + cls }, content);
  overlay.append(box);
  const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 220); };
  if (closable) overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  return { close, el: box };
}
export function confirmModal(title, text, okLabel = 'Oui', kind = 'green') {
  return new Promise(res => {
    const m = modal(h('div', {}, h('h2', { class: 'modal-title' }, title), h('p', { class: 'modal-text' }, text),
      h('div', { class: 'row gap' }, btn('Annuler', { onClick: () => { m.close(); res(false); } }), btn(okLabel, { kind, onClick: () => { m.close(); res(true); } }))));
  });
}

// Bulle de points qui flotte puis file vers un compteur (id cible).
export function floatBubble(text, fromEl, targetSel, color = 'var(--green)') {
  const r = fromEl?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const b = h('div', { class: 'bubble', style: { left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', color } }, text);
  document.body.append(b);
  const t = document.querySelector(targetSel);
  requestAnimationFrame(() => {
    b.style.transform = 'translate(-50%, -140%) scale(1.15)';
    setTimeout(() => {
      if (t) { const tr = t.getBoundingClientRect(); b.style.transition = 'all .45s cubic-bezier(.5,-.2,.6,1)'; b.style.left = tr.left + tr.width / 2 + 'px'; b.style.top = tr.top + tr.height / 2 + 'px'; b.style.transform = 'translate(-50%,-50%) scale(.5)'; b.style.opacity = '0'; if (t) { t.classList.remove('bump'); void t.offsetWidth; setTimeout(() => t.classList.add('bump'), 400); } }
      else { b.style.opacity = '0'; }
      setTimeout(() => b.remove(), 600);
    }, 700);
  });
}
export function shake(el, intensity = 4) { el.style.setProperty('--shake', intensity + 'px'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
export function icon(name) { return h('img', { class: 'ico', src: `./assets/icons/${name}.svg`, alt: '' }); }
