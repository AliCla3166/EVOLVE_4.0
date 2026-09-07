// L'ecran de retour. Remplace le toast rouge "3 jours manques" par un accueil.
// Regle de ton : on ne reproche rien, on ne parle pas de la serie, on raconte ce qui s'est passe
// pendant l'absence — et on explique l'Ombre, qui est la mecanique la plus indulgente du jeu et
// la plus invisible : un jour manque nourrit un axe, donc finit par donner une mutation.
import { config, stageOf } from '../core/config.js';
import { state, save } from '../core/state.js';
import { dayKey, daysBetween, fmtDay, fmtDuration } from '../core/clock.js';
import { speciesVisual } from '../core/genome.js';
import { renderToCanvas } from '../render/creature.js';
import { h, btn, modal, fmt } from '../core/ui.js';

const MS_H = 3600e3;

// Depuis combien de jours la Lignee n'a pas eu de nouvelles ?
export function daysSinceLastEntry() {
  const keys = Object.keys(state.days).filter(k => state.days[k].submittedAt).sort();
  if (!keys.length) return 0;
  return Math.max(0, daysBetween(keys[keys.length - 1], dayKey()));
}

function greeting(gap, shielded) {
  if (shielded) return 'Un jour est passé sans toi. La Lignée ne s\'en est pas aperçue.';
  if (gap <= 2) return 'Un jour sans nouvelles. Le monde a continué de tourner, plus lentement.';
  if (gap <= 6) return 'Plusieurs marées sont passées. Elle a tenu, sans savoir pourquoi.';
  if (gap <= 20) return 'Une saison entière sans un mot. Ce qui vit ici a appris à attendre.';
  return 'Le temps a passé au-dessus de l\'eau. Elle est toujours là.';
}

// res = retour de processMissedDays() ; on l'affiche une seule fois, au demarrage.
export function showComeback(res, ctx) {
  const missed = (res?.missed || []).filter(k => !state.days[k]?.shieldUsed);
  const shielded = res?.shielded || [];
  const gap = daysSinceLastEntry();
  if (!missed.length && !shielded.length) return false;

  const st = stageOf(state.species.stage);
  const cv = h('canvas', { style: { width: '100%', height: '150px' } });

  // Ce qui s'est passe pendant l'absence
  const facts = [];
  const rep = state.colony.offlineReport;
  if (rep) {
    delete state.colony.offlineReport; save();   // consomme ici : pas deux fois le meme rapport
    const rs = config.colony.resources;
    const parts = Object.entries(rep.gains).filter(([, v]) => v >= 1)
      .map(([k, v]) => `${rs[k]?.icon || ''} ${fmt(Math.floor(v))}`);
    if (parts.length) facts.push(`La Colonie a produit ${parts.join('  ')} en ${fmtDuration(rep.hours * MS_H)}.`);
  }
  if (shielded.length) {
    facts.push(`🛡️ ${shielded.length === 1 ? 'Un Bouclier de série a absorbé l\'absence' : `${shielded.length} Boucliers de série ont absorbé l'absence`} — il t'en reste ${state.streak.shields}.`);
  }
  const shadow = missed.length * (config.habits.axis_points.missed_day_shadow || 0);
  if (shadow > 0) {
    facts.push(`🌑 La Lignée a gagné ${fmt(shadow)} en Ombre. Ce n'est pas une punition : l'Ombre est un axe comme les autres — elle donne des dégâts, coûte un peu de robustesse, et déclenche ses propres mutations.`);
  }
  const drafts = state.species.pendingDrafts.length;
  if (drafts) facts.push(`🧬 ${drafts} mutation${drafts > 1 ? 's' : ''} t'attend${drafts > 1 ? 'ent' : ''} dans Espèce.`);

  // Les jours qu'on peut encore saisir (fenetre retroactive)
  const retro = config.habits.retro_days || 7;
  const openDays = missed.filter(k => daysBetween(k, dayKey()) <= retro);

  const m = modal(h('div', { class: 'center-text' },
    h('div', { class: 'muted', style: { letterSpacing: '2px', textTransform: 'uppercase', fontSize: '11px' } }, 'Retour'),
    h('div', { class: 'creature-stage', style: { height: '150px', marginTop: '8px' } }, cv),
    h('p', { class: 'modal-text', style: { fontStyle: 'italic', fontSize: '15px', marginTop: '10px' } }, greeting(gap, shielded.length && !missed.length)),
    facts.length ? h('div', { class: 'card-soft col gap', style: { textAlign: 'left', marginTop: '4px' } },
      ...facts.map(f => h('div', { class: 'small' }, f))) : null,
    openDays.length ? h('p', { class: 'small muted', style: { marginTop: '10px' } },
      `${openDays.length} journée${openDays.length > 1 ? 's' : ''} reste${openDays.length > 1 ? 'nt' : ''} ouverte${openDays.length > 1 ? 's' : ''} à la saisie (fenêtre de ${retro} jours). Elles paient leur Élan et leurs Points de Stade.`) : null,
    h('div', { class: 'row gap center', style: { marginTop: '12px' } },
      btn('Reprendre', { kind: openDays.length ? 'slate' : 'green', onClick: () => m.close() }),
      openDays.length ? btn(`Saisir le ${fmtDay(openDays[0], { day: 'numeric', month: 'short' })}`, {
        kind: 'green', onClick: () => { m.close(); ctx.navigate('ritual', { day: openDays[0] }); }
      }) : null)
  ), { closable: false, cls: '' });

  // La creature respire pendant qu'on lit.
  let t0 = performance.now();
  const loop = (now) => {
    if (!document.body.contains(cv)) return;
    renderToCanvas(cv, speciesVisual(), { tint: st.palette.tint, t: (now - t0) / 1000, scale: .8 });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return true;
}
