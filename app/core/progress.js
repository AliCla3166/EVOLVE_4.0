// Fonctions de progression partagees entre modes. Respecte le triple moteur :
// - addStagePoints : porte vers le moteur vertical, plafonnee/jour. Deux appelants : le Rituel
//   (economy.js, journee parfaite ou validee) et la Bataille mode Defense. Le Rituel passe en premier.
// - grant : monnaies horizontales (genes, biomasse, materiaux, rubis) — jamais d'Elan ici.
import { config } from './config.js';
import { state, save } from './state.js';
import { dayKey } from './clock.js';
import { bus } from './events.js';
import { toast } from './ui.js';

export function grant(res, opts = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(res)) {
    if (!v || k === 'elan') continue;
    state.wallet[k] = (state.wallet[k] || 0) + v;
    const ico = { genes: '🧬', biomasse: '🍖', materiaux: '🧱', rubis: '💎', essence: '✨' }[k] || '';
    parts.push(`+${Math.round(v)} ${ico}`);
  }
  bus.emit('wallet:changed');
  if (parts.length && !opts.silent) toast(parts.join('  '), 'gold');
  save();
  return parts;
}
export function spend(res) {
  for (const [k, v] of Object.entries(res)) if ((state.wallet[k] || 0) < v) return false;
  for (const [k, v] of Object.entries(res)) state.wallet[k] -= v;
  bus.emit('wallet:changed'); save(); return true;
}
export function canAfford(res) { return Object.entries(res).every(([k, v]) => (state.wallet[k] || 0) >= v); }

export function addStagePoints(n, opts = {}) {
  const today = dayKey(); const b = state.battle;
  if (b.stagePointsDay !== today) { b.stagePointsDay = today; b.stagePointsToday = 0; }
  const cap = config.stages.stage_points_daily_cap;
  const allowed = Math.max(0, Math.min(n, cap - b.stagePointsToday));
  b.stagePointsToday += allowed; state.species.stagePoints += allowed;
  // opts.silent : le Rituel annonce lui-meme ses Points de Stade dans la modale de recolte.
  if (opts.silent) { /* pas de toast */ }
  else if (allowed > 0) toast(`+${allowed} Points de Stade`, 'green');
  else if (n > 0) toast('Plafond de Points de Stade atteint pour aujourd\'hui', '');
  save(); bus.emit('stagepoints:changed');
  return allowed;
}
export function stagePointsRemainingToday() {
  const today = dayKey(); const b = state.battle;
  if (b.stagePointsDay !== today) return config.stages.stage_points_daily_cap;
  return Math.max(0, config.stages.stage_points_daily_cap - b.stagePointsToday);
}

// Contrats du jour : kind + increment
export function progressContract(kind, n = 1) {
  const c = state.colony;
  c.contractProgress[kind] = (c.contractProgress[kind] || 0) + n;
  for (const ct of c.contracts) {
    if (ct.kind !== kind || ct.done) continue;
    ct.progress = Math.min(ct.n, (ct.progress || 0) + n);
    if (ct.progress >= ct.n) { ct.done = true; toast(`📜 Contrat rempli : ${ct.text}`, 'gold'); grant(ct.reward, { silent: true }); }
  }
  save();
}
export function addCardXp(cardId, kills) {
  if (!kills) return;
  const x = state.cards.xp; x[cardId] = (x[cardId] || 0) + kills;
  const tiers = config.cards.xp_tiers; const before = tiers.filter(t => (x[cardId] - kills) >= t).length, after = tiers.filter(t => x[cardId] >= t).length;
  if (after > before) { const c = config.cards.cards.find(c => c.id === cardId); toast(`⭐ ${c?.name || cardId} atteint le palier ${after}`, 'purple'); }
}
export function cardXpTier(cardId) { const x = state.cards.xp[cardId] || 0; return config.cards.xp_tiers.filter(t => x >= t).length; }
export function unlockCard(id, edition = 'none') {
  const col = state.cards.collection; const prev = col[id]?.count || 0;
  col[id] = { count: prev + 1, edition: col[id]?.edition && col[id].edition !== 'none' ? col[id].edition : edition };
  save(); return col[id];
}
export function recordKills(n) { state.battle.kills += n; progressContract('kills', n); }
