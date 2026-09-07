// Le Codex : verifie les declencheurs et debloque les entrees (toast + stockage). Chaque entree = 1 objet JSON.
//
// Depuis le 07/09 : chaque entree debloquee garde en exergue le "moment fort" que tu avais ecrit.
// C'est le seul endroit du jeu ou ta vie reelle devient la matiere de sa fiction, et ca n'utilise
// que des donnees deja collectees par le Rituel. La citation est figee au deblocage : elle date
// l'entree, comme une note de terrain.
import { config } from '../core/config.js';
import { state, save } from '../core/state.js';
import { fmtDay } from '../core/clock.js';
import { toast, modal, h, btn } from '../core/ui.js';

// Le moment fort le plus recent (14 jours glissants). Null si tu n'en as ecrit aucun.
function recentQuote() {
  const keys = Object.keys(state.days).filter(k => state.days[k].submittedAt).sort().reverse();
  for (const k of keys.slice(0, 14)) {
    const txt = String(state.days[k].entries?.moment_fort || '').trim();
    if (txt) return { date: k, text: txt.slice(0, 220) };
  }
  return null;
}
export function quoteFor(id) { return (state.codex.quotes || {})[id] || null; }
function quoteBlock(id) {
  const q = quoteFor(id);
  if (!q) return null;
  return h('div', { class: 'codex-quote' },
    h('p', {}, '« ' + q.text + ' »'),
    h('span', { class: 'small muted' }, 'consigné le ' + fmtDay(q.date, { day: 'numeric', month: 'long' })));
}

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
    if (triggered(e.trigger)) {
      state.codex.unlocked.push(e.id);
      const q = recentQuote();
      if (q) { if (!state.codex.quotes) state.codex.quotes = {}; state.codex.quotes[e.id] = q; }
      newly.push(e);
    }
  }
  if (newly.length) { save(); const e = newly[0]; setTimeout(() => showEntry(e, newly.length > 1 ? `+${newly.length - 1} autre(s) entrée(s)` : ''), 600); }
  return newly;
}
export function showEntry(e, extra = '') {
  const m = modal(h('div', { class: 'center-text' },
    h('div', { class: 'muted', style: { letterSpacing: '2px', textTransform: 'uppercase', fontSize: '11px' } }, '📜 Codex'),
    h('h2', { class: 'modal-title', style: { color: 'var(--gold)' } }, e.title),
    h('p', { class: 'modal-text', style: { fontStyle: 'italic', fontSize: '15px' } }, e.text),
    quoteBlock(e.id),
    extra ? h('p', { class: 'muted' }, extra) : null,
    btn('Fermer', { onClick: () => m.close() })));
}
export function renderCodexList() {
  const wrap = h('div');
  for (const e of config.codex.entries) {
    const ok = state.codex.unlocked.includes(e.id);
    wrap.append(h('div', { class: 'codex-entry' + (ok ? '' : ' locked') },
      h('h3', {}, ok ? e.title : '???'),
      h('p', {}, ok ? e.text : 'Entrée verrouillée — ' + hint(e.trigger)),
      ok ? quoteBlock(e.id) : null));
  }
  return wrap;
}
function hint(tr) {
  return { stage: `atteindre le stade ${tr.n}`, streak: `une série de ${tr.n} jours`, mutations: `${tr.n} mutations`, campaign_level: `finir le niveau ${tr.n} de Campagne`, defense_wave: `tenir ${tr.n} vagues en Défense`, perfect_days: `${tr.n} journée(s) parfaite(s)`, cycle: `le cycle ${tr.n}` }[tr.kind] || '';
}
