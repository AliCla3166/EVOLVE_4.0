// Le genome : axes + mutations + batiments speciaux + benedictions -> multiplicateurs de stats pour TOUTES les unites de la race.
import { config } from './config.js';
import { state } from './state.js';

export function mutationById(id) { return config.mutations.mutations.find(m => m.id === id); }

export function speciesMods() {
  const S = config.stages.axes; const sp = state.species;
  const pct = { hp: 0, damage: 0, speed: 0, power_charge: 0, production: 0, ration_rate: 0, turret_damage: 0, unit_hp: 0, unit_damage: 0, offline_bonus: 0 };
  for (const ax of S.order) {
    const a = S[ax]; const pts = sp.axes[ax] || 0;
    pct[a.stat] = (pct[a.stat] || 0) + pts * a.pct_per_point;
    if (a.malus_stat) pct[a.malus_stat] -= pts * a.malus_pct_per_point;
  }
  for (const m of sp.mutations) {
    const def = mutationById(m.id); if (!def) continue;
    for (const [k, v] of Object.entries(def.stats || {})) pct[k] = (pct[k] || 0) + v;
  }
  // Colonie : batiments speciaux
  for (const b of config.colony.buildings) {
    if (b.type !== 'special') continue;
    const lvl = state.colony.buildings[b.id]?.level || 0;
    if (lvl) pct[b.effect] = (pct[b.effect] || 0) + lvl * b.pct_per_level;
  }
  // Benedictions du Pantheon
  for (const bl of sp.blessings || []) pct[bl.stat] = (pct[bl.stat] || 0) + bl.pct;
  // Plancher : jamais sous -60 %
  for (const k of Object.keys(pct)) pct[k] = Math.max(-60, pct[k]);
  return pct;
}
export function mult(pct, key) { return 1 + ((pct[key] || 0) / 100); }

// Parametres visuels de la creature (fusion des mutations, la derniere par partie gagne)
export function speciesVisual(sp = state.species) {
  const v = { seed: sp.seed, stage: sp.stage, bodyplan: config.stages.stages[sp.stage - 1].bodyplan, eyes: 1, eye_size: 1, limbs: null, limb_count: 0, tail: null, back: null, skin: 'plain', aura: null, mouth: 'smile', horns: 0, spots: null, spot_count: 0, hands: false, third_eye: false, outline: 1, tint_shift: 0, limb_len: 1 };
  for (const m of sp.mutations) { const def = mutationById(m.id); if (def) Object.assign(v, def.visual || {}); }
  // Dominante d'axe : pour la teinte
  const S = config.stages.axes; let best = null, bestV = -1;
  for (const ax of S.order) if ((sp.axes[ax] || 0) > bestV) { bestV = sp.axes[ax] || 0; best = ax; }
  v.dominant = best; v.axes = sp.axes;
  return v;
}
