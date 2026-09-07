// L'équipement de la race : ce que chaque individu porte, selon son RÔLE et son PALIER DE STADE.
//
// Design : un archétype se reconnaît à son arme, et cette arme évolue avec la civilisation.
// La même Brute porte un aiguillon quand tu es une cellule, des griffes quand tu es une bête,
// une hache de silex à la Meute, une épée à la Cité, une lame d'énergie chez les Galactiques.
// Ce n'est pas une autre unité : c'est la même lignée qui a appris.
//
// Tracé : même grammaire que le corps (render/style.js) — silhouettes fermées, trois épaisseurs,
// ombrage en aplats vers le haut-gauche. Une arme dessinée en traits fins à côté d'un corps
// ombré, c'est exactement ce qui donnait l'impression de croquis.
//
// Animation : `atk` = temps écoulé depuis la dernière frappe, normalisé sur l'intervalle
// d'attaque de l'unité (0 = vient de frapper, 1 = va frapper). On en tire trois temps —
// anticipation, frappe, récupération. `atk === null` : pas de cible, l'arme respire.
import { INK, shade, tones, weights, form, inner, orb, capsule } from './style.js';

// Paliers d'équipement. 5 paliers pour 10 stades.
export const GEAR_TIERS = [
  { id: 'organique', name: 'Organique', stages: [1, 2], metal: '#7FD9C0', wood: '#3E8C74', accent: '#C6F7E6' },
  { id: 'naturel', name: 'Naturel', stages: [3], metal: '#EFE4C8', wood: '#8A6A44', accent: '#FFF8E4' },
  { id: 'taille', name: 'Taillé', stages: [4, 5], metal: '#C2CAD6', wood: '#B07A46', accent: '#EEF3F9' },
  { id: 'forge', name: 'Forgé', stages: [6, 7], metal: '#DCE4EE', wood: '#5E4530', accent: '#FFFFFF' },
  { id: 'energie', name: 'Énergie', stages: [8, 9, 10], metal: '#8FE4FF', wood: '#2E4A66', accent: '#FFFFFF' }
];
export function tierForStage(stage) {
  for (let i = 0; i < GEAR_TIERS.length; i++) if (GEAR_TIERS[i].stages.includes(stage)) return i;
  return GEAR_TIERS.length - 1;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => v * v * (3 - 2 * v);
export function swingPhase(atk, t = 0) {
  if (atk === null || atk === undefined) return { wind: 0, strike: 0, idle: Math.sin(t * 2) * 0.08 };
  const a = clamp01(atk);
  return { wind: a > 0.7 ? smooth((a - 0.7) / 0.3) : 0, strike: a < 0.22 ? 1 - smooth(a / 0.22) : 0, idle: 0 };
}
export function armSwing(atk, t = 0, role = 'melee') {
  const p = swingPhase(atk, t);
  if (role === 'ranged') return -p.wind * 0.35 + p.strike * 0.15 + p.idle * 0.5;
  if (role === 'support') return -p.wind * 0.5 - p.strike * 0.7 + p.idle * 0.5;
  if (role === 'tank') return -p.wind * 0.25 + p.strike * 0.55 + p.idle * 0.3;
  return -p.wind * 1.0 + p.strike * 1.5 + p.idle;
}

// Traînée : un arc court calé sur la lame, jamais un croissant qui traverse l'image.
function trail(ctx, r, lw, strength) {
  if (strength <= 0.06) return;
  ctx.save(); ctx.globalAlpha = strength * 0.5;
  ctx.beginPath(); ctx.arc(0, -r * 0.35, r, -2.5, -1.0);
  ctx.lineWidth = lw * 1.1; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}
const poly = (pts) => (ctx) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };

// drawGear : dessine l'arme dans le repère de la MAIN (0,0 = poing, +x vers l'avant).
export function drawGear(A, opts = {}) {
  const { ctx } = A;
  const S = A.size;
  const W = A.W || weights(S);
  const role = opts.role || 'melee';
  const ti = Math.max(0, Math.min(GEAR_TIERS.length - 1, opts.tier ?? 2));
  const T = GEAR_TIERS[ti];
  const M = tones(T.metal, S);        // métal : quatre valeurs, même lumière que le corps
  const B = tones(T.wood, S);         // manche / cuir
  const p = swingPhase(opts.atk, opts.t || 0);
  ctx.save();
  if (role === 'ranged') ranged(ctx, S, W, T, M, B, ti, p, opts.t || 0);
  else if (role === 'support') support(ctx, S, W, T, M, B, ti, p, opts.t || 0);
  else if (role === 'tank') tank(ctx, S, W, T, M, B, ti, p);
  else melee(ctx, S, W, T, M, B, ti, p);
  ctx.restore();
}

// --- MÊLÉE : aiguillon → griffes → hache de silex → épée → lame d'énergie
function melee(ctx, S, W, T, M, B, ti, p) {
  ctx.rotate(-0.35);
  trail(ctx, S * 0.2, W.hair, p.strike);
  if (ti === 0) {
    form(ctx, poly([[-S * .035, S * .02], [S * .045, -S * .12], [S * .015, -S * .32], [-S * .045, -S * .1]]), M, W.struct);
  } else if (ti === 1) {
    for (const d of [-1, 0, 1]) form(ctx, poly([[d * S * .052 - S * .022, 0], [d * S * .09, -S * .16], [d * S * .062, -S * .27], [d * S * .038, -S * .14]]), M, W.hair);
  } else if (ti === 2) {
    form(ctx, capsule(0, S * .05, 0, -S * .27, S * .028, S * .022), B, W.struct);
    form(ctx, poly([[-S * .03, -S * .18], [S * .14, -S * .27], [S * .1, -S * .38], [-S * .035, -S * .30]]), M, W.struct);
  } else if (ti === 3) {
    form(ctx, capsule(0, S * .05, 0, -S * .1, S * .026, S * .024), B, W.struct);
    form(ctx, capsule(-S * .085, -S * .11, S * .085, -S * .11, S * .022, S * .022), M, W.struct);
    form(ctx, poly([[-S * .046, -S * .12], [S * .046, -S * .12], [S * .022, -S * .38], [0, -S * .44], [-S * .022, -S * .38]]), M, W.struct);
  } else {
    ctx.save(); ctx.globalAlpha = 0.28 + p.strike * 0.35;
    inner(ctx, poly([[-S * .058, -S * .1], [S * .058, -S * .1], [0, -S * .5]]), T.metal);
    ctx.restore();
    form(ctx, poly([[-S * .026, -S * .11], [S * .026, -S * .11], [0, -S * .45]]), { ...M, base: T.accent, hi: '#FFFFFF', mid: T.metal }, W.hair);
    form(ctx, orb(0, -S * .06, S * .036), B, W.struct);
  }
}

// --- TANK : plaque → carapace → pavois → écu → barrière
function tank(ctx, S, W, T, M, B, ti, p) {
  ctx.translate(S * 0.03, -(p.wind * 0.25 + p.strike * 0.45) * S * 0.06);
  if (ti === 0) {
    form(ctx, orb(0, 0, S * .105, S * .175), M, W.hero);
    inner(ctx, orb(0, 0, S * .05, S * .095), T.accent);
  } else if (ti === 1) {
    form(ctx, orb(0, 0, S * .115, S * .165), B, W.hero);
    for (const d of [-.5, 0, .5]) { ctx.beginPath(); ctx.moveTo(-S * .085, d * S * .115); ctx.lineTo(S * .085, d * S * .115); ctx.lineWidth = W.hair; ctx.strokeStyle = 'rgba(23,27,35,.45)'; ctx.stroke(); }
  } else if (ti === 2) {
    form(ctx, (c) => { c.beginPath(); c.roundRect(-S * .105, -S * .175, S * .21, S * .35, S * .032); }, B, W.hero);
    for (const d of [-.052, .022]) { ctx.beginPath(); ctx.moveTo(d * S, -S * .165); ctx.lineTo(d * S, S * .165); ctx.lineWidth = W.hair; ctx.strokeStyle = 'rgba(23,27,35,.4)'; ctx.stroke(); }
    form(ctx, capsule(-S * .105, 0, S * .105, 0, S * .022, S * .022), M, W.hair);
  } else if (ti === 3) {
    form(ctx, (c) => { c.beginPath(); c.moveTo(-S * .105, -S * .17); c.lineTo(S * .105, -S * .17); c.quadraticCurveTo(S * .115, S * .06, 0, S * .21); c.quadraticCurveTo(-S * .115, S * .06, -S * .105, -S * .17); c.closePath(); }, M, W.hero);
    form(ctx, orb(0, -S * .02, S * .042), B, W.struct);
  } else {
    const hexa = (c) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; const px = Math.cos(a) * S * .115, py = Math.sin(a) * S * .19; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); };
    ctx.save(); ctx.globalAlpha = 0.5 + p.strike * 0.35; form(ctx, hexa, M, W.struct); ctx.restore();
    inner(ctx, orb(0, 0, S * .032), T.accent);
  }
}

// --- DISTANCE : siphon → dard → fronde → arc → canon
function ranged(ctx, S, W, T, M, B, ti, p, t) {
  const pull = p.wind, kick = p.strike;
  ctx.translate(-kick * S * 0.05, 0);
  if (ti === 0) {
    form(ctx, capsule(-S * .02, 0, S * .2, 0, S * .034 * (1 + pull * .5), S * .05 * (1 + pull * .6)), M, W.struct);
    if (kick > 0.2) inner(ctx, orb(S * .26, 0, S * .035 * kick), T.accent);
  } else if (ti === 1) {
    form(ctx, poly([[0, S * .05], [S * .26 - pull * S * .04, 0], [0, -S * .05]]), B, W.struct);
    form(ctx, capsule(S * .24, 0, S * .38, 0, S * .018, S * .008), M, W.hair);
  } else if (ti === 2) {
    const spin = t * 6 + pull * 3, bx = Math.cos(spin) * S * .26, by = Math.sin(spin) * S * .26;
    form(ctx, capsule(0, 0, bx, by, S * .014, S * .012), B, W.hair, { hi: false });
    form(ctx, orb(bx, by, S * .058), M, W.struct);
  } else if (ti === 3) {
    // arc : croissant fermé (arc externe + arc interne), corde et flèche par-dessus
    form(ctx, (c) => { c.beginPath(); c.arc(S * .02, 0, S * .175, -1.35, 1.35); c.arc(S * .02, 0, S * .142, 1.35, -1.35, true); c.closePath(); }, B, W.struct);
    const y0 = -Math.sin(1.35) * S * .16, x0 = S * .02 + Math.cos(1.35) * S * .16;
    const nock = -S * .02 - pull * S * .1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(nock, 0); ctx.lineTo(x0, -y0);
    ctx.lineWidth = W.hair; ctx.strokeStyle = '#F4F1E8'; ctx.stroke();
    if (pull > 0.12) form(ctx, capsule(nock, 0, nock + S * .24, 0, S * .012, S * .006), M, W.hair, { hi: false });
  } else {
    form(ctx, (c) => { c.beginPath(); c.roundRect(-S * .04, -S * .058, S * .26, S * .116, S * .028); }, B, W.struct);
    form(ctx, orb(S * .215, 0, S * .05), M, W.struct);
    if (kick > 0.15) { ctx.save(); ctx.globalAlpha = kick; inner(ctx, orb(S * .27, 0, S * .075 * kick), T.accent); ctx.restore(); }
  }
}

// --- SOUTIEN : bulbe → fleur → bâton à fétiche → caducée → orbe
function support(ctx, S, W, T, M, B, ti, p, t) {
  const pulse = 1 + Math.sin(t * 4) * 0.07 + p.strike * 0.3;
  const GEM = tones('#45D95E', S);
  let gy = -S * .3;
  if (ti === 0) { form(ctx, capsule(0, S * .02, 0, -S * .22, S * .022, S * .016), B, W.struct, { hi: false }); gy = -S * .27; }
  else if (ti === 1) {
    form(ctx, capsule(0, S * .02, 0, -S * .2, S * .02, S * .015), B, W.struct, { hi: false });
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + t * .35; form(ctx, orb(Math.cos(a) * S * .055, -S * .24 + Math.sin(a) * S * .055, S * .038, S * .024), tones('#F2A6C8', S), W.hair); }
    gy = -S * .24;
  } else if (ti === 2) {
    form(ctx, capsule(0, S * .05, 0, -S * .27, S * .026, S * .02), B, W.struct);
    form(ctx, capsule(-S * .06, -S * .24, S * .07, -S * .29, S * .014, S * .01), M, W.hair);
  } else if (ti === 3) {
    form(ctx, capsule(0, S * .05, 0, -S * .25, S * .026, S * .02), B, W.struct);
    form(ctx, (c) => { c.beginPath(); c.arc(0, -S * .3, S * .06, 0, 6.28); c.arc(0, -S * .3, S * .042, 0, 6.28, true); c.closePath(); }, M, W.hair);
  } else { gy = -S * .24; }
  // halo en anneaux d'aplat + gemme : jamais de dégradé
  ctx.save();
  for (let i = 3; i >= 1; i--) { ctx.globalAlpha = (0.09 + p.strike * 0.06) * i; ctx.beginPath(); ctx.arc(0, gy, S * .05 * i * pulse, 0, 6.28); ctx.fillStyle = '#45D95E'; ctx.fill(); }
  ctx.restore();
  form(ctx, orb(0, gy, S * .048 * pulse), GEM, W.struct);
  inner(ctx, orb(-S * .016, gy - S * .016, S * .016), '#FFFFFF');
  if (p.strike > 0.1) { ctx.save(); ctx.globalAlpha = p.strike * 0.6; ctx.beginPath(); ctx.arc(0, gy, S * .21 * (1.4 - p.strike), 0, 6.28); ctx.lineWidth = W.hair; ctx.strokeStyle = '#45D95E'; ctx.stroke(); ctx.restore(); }
}
