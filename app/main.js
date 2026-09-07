// Point d'entree EVOLVE 4.0 — coquille, navigation, boucle de tick, en-tete.
import { loadConfig, config, stageOf } from './core/config.js';
import { load, save, state } from './core/state.js';
import { setDeadline, dayKey } from './core/clock.js';
import { processMissedDays, recomputeStreak } from './core/economy.js';
import { bus } from './core/events.js';
import { h, fmt, toast } from './core/ui.js';
import { tickColony } from './modes/colony.js';
import { checkCodex } from './modes/codex.js';
import { showComeback } from './modes/comeback.js';
import { flushSync } from './core/sync.js';
import * as notify from './core/notify.js';
import { watch as watchIcons, iconify } from './core/icons.js';

const MODES = {};
let current = null; let currentMod = null;
const TABS = [
  { id: 'ritual', label: 'Rituel', icon: '☀️' },
  { id: 'species', label: 'Espèce', icon: '🧬' },
  { id: 'colony', label: 'Colonie', icon: '🏕️' },
  { id: 'battle', label: 'Bataille', icon: '⚔️' },
  { id: 'cards', label: 'Cartes', icon: '🃏' },
  { id: 'observatory', label: 'Stats', icon: '📊' }
];

export const ctx = {
  get state() { return state; }, config, save, bus, navigate, refreshWallet,
};

async function main() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('evolve4.save') || 'null'); } catch { return null; } })();
  await loadConfig({ habits: saved?.settings?.habitsOverride || null });
  load();
  setDeadline(config.habits.deadline_hour);
  const res = processMissedDays();
  recomputeStreak();
  tickColony();
  save();
  applyStagePalette();
  // Modes charges dynamiquement (un fichier par mode)
  const mods = await Promise.all(['ritual', 'species', 'colony', 'battle', 'cards', 'observatory', 'settings'].map(m => import(`./modes/${m}.js`)));
  ['ritual', 'species', 'colony', 'battle', 'cards', 'observatory', 'settings'].forEach((id, i) => MODES[id] = mods[i]);
  buildTabs();
  refreshWallet();
  document.getElementById('btn-settings').addEventListener('click', () => navigate('settings'));
  const start = state.settings.onboarded ? (location.hash.slice(1) || 'ritual') : 'settings';
  // Bible de Wallachie, §9 : « on ne dessine jamais un emoji ». Un seul observateur remplace
  // chaque glyphe par son icône, partout, sans qu'aucun mode ait à le savoir.
  watchIcons(document.body);
  navigate(start, { onboarding: !state.settings.onboarded });
  // Retour apres absence : un accueil qui raconte ce qui s'est passe, pas un toast rouge.
  // On ne fait pas remonter le Codex par-dessus : il attendra la prochaine recolte.
  const welcomed = state.settings.onboarded ? showComeback(res, ctx) : false;
  if (state.settings.onboarded && !welcomed) checkCodex();
  notify.init();
  setInterval(() => { tickColony(); refreshWallet(); }, 1000);
  setInterval(() => { save(); flushSync(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { tickColony(); refreshWallet(); notify.catchUp(); notify.schedule(); if (dayKey() !== _lastDay) { _lastDay = dayKey(); processMissedDays(); recomputeStreak(); navigate(current); } } else save(true); });
  // Service worker : on force une verification de mise a jour a chaque demarrage (et toutes les
  // heures si l'app reste ouverte). Sans ca, un appareil qui a deja installe l'app peut rester
  // bloque des jours sur une ancienne version. Quand le nouveau worker prend la main, on recharge
  // une seule fois pour que les modules deja importes soient remplaces.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 3600000);
    }).catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      save(true);
      location.reload();
    });
  }
  flushSync();
}
let _lastDay = dayKey();

function buildTabs() {
  const nav = document.getElementById('tabs'); nav.innerHTML = '';
  for (const t of TABS) {
    const b = h('button', { 'data-tab': t.id, onClick: () => navigate(t.id) }, h('span', { class: 'tab-ico' }, t.icon), t.label);
    nav.append(b);
  }
  updateTabDots();
}
export function updateTabDots() {
  const today = dayKey();
  const ritualDone = !!state.days[today]?.submittedAt;
  const draft = state.species.pendingDrafts.length > 0;
  document.querySelectorAll('#tabs button').forEach(b => {
    b.querySelector('.dot')?.remove();
    if ((b.dataset.tab === 'ritual' && !ritualDone) || (b.dataset.tab === 'species' && draft)) b.append(h('span', { class: 'dot' }));
  });
}
export function navigate(id, opts = {}) {
  if (!MODES[id]) return;
  if (currentMod?.unmount) currentMod.unmount();
  const screen = document.getElementById('screen');
  screen.innerHTML = ''; screen.className = ''; screen.scrollTop = 0;
  current = id; currentMod = MODES[id];
  if (id !== 'settings') location.hash = id;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  const el = h('div', { class: 'fade-in' });
  screen.append(el);
  currentMod.mount(el, { ...ctx, opts });
  updateTabDots();
}
export function refreshWallet() {
  const w = state.wallet; const el = document.getElementById('wallet'); if (!el) return;
  const items = [['elan', '⚡', w.elan, 'elan'], ['genes', '🧬', w.genes, ''], ['biomasse', '🍖', w.biomasse, ''], ['materiaux', '🧱', w.materiaux, ''], ['rubis', '💎', w.rubis, 'gold']];
  if (!el.childElementCount) { for (const [id, ico, , cls] of items) el.append(h('span', { class: 'pill ' + cls, id: 'w-' + id }, h('span', { class: 'ico-e' }, ico), h('span', { class: 'val' }, '0'))); }
  for (const [id, , v] of items) { const s = el.querySelector('#w-' + id + ' .val'); if (s && s.textContent !== fmt(Math.floor(v))) s.textContent = fmt(Math.floor(v)); }
}
export function applyStagePalette() {
  const st = stageOf(state.species.stage); const p = st.palette; const r = document.documentElement.style;
  r.setProperty('--tint', p.tint); r.setProperty('--shade', p.shade); r.setProperty('--bg', p.bg); r.setProperty('--bg2', p.bg2); r.setProperty('--ground', p.ground);
}
bus.on('wallet:changed', refreshWallet);
bus.on('stage:changed', () => { applyStagePalette(); });
bus.on('day:submitted', updateTabDots);
main().catch(e => { console.error(e); document.getElementById('screen').innerHTML = `<div class="panel"><h2>Erreur au démarrage</h2><p>${e.message}</p></div>`; });
