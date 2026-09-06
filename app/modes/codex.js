// Le Codex : verifie les declencheurs et debloque les entrees (toast + stockage). Chaque entree = 1 objet JSON.
import { config } from '../core/config.js';
import { state, save } from '../core/state.js';
import { toast, modal, h, btn } from '../core/ui.js';

function triggered(tr) {
  const s = state;
  switch (tr.kind) {
    case 'stage': return s.species.stage >= tr.n;
    case 'streak': return s.streak.best >= tr.n;
    case 'mutations': return s.species.mutations.length >= tr.n;
    case 'campaign_level': return s.battle.campaignLevel > tr.n;
    case 'defense_wave': return s.battle.records.defenseWave >= tr.n;
    case 'perfect_days': return s.stats.perfectDays >= tr.n;
    case 'cycle': return s.species.cycle >= tr.n;
    default: return false;
  }
}
export function checkCodex() {
  const newly = [];
  for (const e of config.codex.entries) {
    if (state.codex.unlocked.includes(e.id)) continue;
    if (triggered(e.trigger)) { state.codex.unlocked.push(e.id); newly.push(e); }
  }
  if (newly.length) { save(); const e = newly[0]; setTimeout(() => showEntry(e, newly.length > 1 ? `+${newly.length - 1} autre(s) entrée(s)` : ''), 600); }
  return newly;
}
export function showEntry(e, extra = '') {
  const m = modal(h('div', { class: 'center-text' }, h('div', { class: 'muted', style: { letterSpacing: '2px', textTransform: 'uppercase', fontSize: '11px' } }, '📜 Codex'), h('h2', { class: 'modal-title', style: { color: 'var(--gold)' } }, e.title), h('p', { class: 'modal-text', style: { fontStyle: 'italic', fontSize: '15px' } }, e.text), extra ? h('p', { class: 'muted' }, extra) : null, btn('Fermer', { onClick: () => m.close() })));
}
export function renderCodexList() {
  const wrap = h('div');
  for (const e of config.codex.entries) {
    const ok = state.codex.unlocked.includes(e.id);
    wrap.append(h('div', { class: 'codex-entry' + (ok ? '' : ' locked') }, h('h3', {}, ok ? e.title : '???'), h('p', {}, ok ? e.text : 'Entrée verrouillée — ' + hint(e.trigger))));
  }
  return wrap;
}
function hint(tr) {
  return { stage: `atteindre le stade ${tr.n}`, streak: `une série de ${tr.n} jours`, mutations: `${tr.n} mutations`, campaign_level: `finir le niveau ${tr.n} de Campagne`, defense_wave: `tenir ${tr.n} vagues en Défense`, perfect_days: `${tr.n} journée(s) parfaite(s)`, cycle: `le cycle ${tr.n}` }[tr.kind] || '';
}
