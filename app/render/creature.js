// Rendu procédural de la race. Toute la grammaire visuelle vient de render/style.js :
// trois épaisseurs de trait, quatre valeurs par teinte, une direction de lumière, et chaque
// partie du corps tracée comme une SILHOUETTE FERMÉE (remplie, ombrée dans son masque,
// contournée une seule fois). Aucun trait superposé, aucun contour à l'intérieur d'une forme.
//
// Trois choses distinguent un archétype, et elles se lisent toutes à 40 px de haut :
//   1. la MASSE (largeur, hauteur, taille de tête) ;
//   2. la TÊTE — casque, crête, capuche, couronne de pétales, bandeau : le repère le moins cher
//      et le plus efficace du style ;
//   3. le GESTE — la brute frappe de haut en bas, l'éclaireur pique, le tank pousse du bouclier,
//      le tireur recule à la détente, le soigneur lève son bâton.
import { makeRng } from '../core/rng.js';
import {
  INK, shade, hueShift, tones, weights, form, inner, orb, capsule, membrane,
  groundShade, gloss, glossIn, golden
} from './style.js';
import { drawGear, armSwing, swingPhase, tierForStage } from './gear.js';

export { shade, hueShift };

// Masse, rôle, tête et geste de chaque archétype.
const ARCH = {
  eclaireur: { w: .74, h: .84, head: 1.00, role: 'melee', tete: 'bandeau', geste: { lunge: 1.5, lean: 1.1, rise: 0.1, wind: 0.5 } },
  brute:     { w: 1.30, h: 1.06, head: .90, role: 'melee', tete: 'crete',   bosses: 3, geste: { lunge: 1.0, lean: 1.5, rise: 0.9, wind: 1.4 } },
  tireur:    { w: .82, h: .90, head: 1.04, role: 'ranged', tete: 'capuche', geste: { lunge: -0.5, lean: -0.7, rise: 0.1, wind: 0.3 } },
  tank:      { w: 1.44, h: .92, head: .80, role: 'tank',   tete: 'casque',  plaques: true, geste: { lunge: 0.7, lean: 0.5, rise: 0.0, wind: 0.3 } },
  soigneur:  { w: .88, h: .96, head: 1.18, role: 'support', tete: 'petales', lumen: true, geste: { lunge: 0.0, lean: -0.3, rise: 0.7, wind: 0.6 } },
  boss:      { w: 1.58, h: 1.34, head: 1.08, role: 'melee', tete: 'couronne', bosses: 4, plaques: true, geste: { lunge: 1.1, lean: 1.4, rise: 1.0, wind: 1.5 } },
  enemy:     { w: 1, h: 1, head: 1, role: 'melee', tete: 'aucune', geste: { lunge: 1, lean: 1, rise: 0.3, wind: 0.8 } }
};
export { ARCH };

export function drawCreature(ctx, visual, opts = {}) {
  const {
    x = 0, y = 0, size = 80, t = 0, tint = '#3FB8C9', facing = 1,
    pose = 'idle', archetype = 'eclaireur', flash = 0, atk = null, dying = 0
  } = opts;
  const arch = ARCH[archetype] || ARCH.eclaireur;
  const role = opts.role || arch.role;
  const baseCol = visual.tint_shift ? hueShift(tint, visual.tint_shift) : tint;
  const T = tones(baseCol, size);
  const W = weights(size, visual.outline || 1);
  const tier = opts.tier ?? tierForStage(visual.stage || 1);
  const ph = swingPhase(pose === 'attack' ? atk : null, t);
  const g = arch.geste;

  ctx.save();
  ctx.translate(x, y);
  groundShade(ctx, 0, 0, size * .40 * arch.w);   // ancrage : posé AVANT la transformation
  ctx.scale(facing, 1);

  // Mouvement d'ensemble, propre à l'archétype.
  const walk = pose === 'walk' ? Math.sin(t * 9) : 0;
  const bob = pose === 'walk' ? Math.abs(walk) * size * .055 : Math.sin(t * 2.2) * size * .018;
  const rise = ph.wind * g.rise * size * .05;
  const lunge = (ph.strike * 11 * g.lunge - ph.wind * 4.5 * g.wind) * size / 100;
  const lean = pose === 'walk' ? walk * .02 : (ph.strike * .13 - ph.wind * .06) * g.lean;
  let squash = pose === 'walk' ? 1 + walk * .05 : 1 + Math.sin(t * 2.2) * .02;
  if (dying) { squash *= 1 - dying * .45; ctx.translate(0, dying * size * .12); ctx.rotate(dying * .3); }
  ctx.translate(lunge, -bob - rise);
  ctx.transform(1, 0, -lean, 1, 0, 0);
  ctx.scale((1 / squash) * (1 + dying * .35), squash);
  if (flash) ctx.filter = `brightness(${1 + flash * 1.7}) saturate(${1 - flash * .5})`;

  const A = { ctx, T, W, size, t, visual, arch, pose, role, atk, tier, ph, walk, archetype, lw: W.hero };
  if (visual.aura) drawAura(A, -size * .45);
  switch (visual.bodyplan || 'cell') {
    case 'cell': drawCell(A); break;
    case 'cluster': drawCluster(A); break;
    case 'beast': drawBeast(A); break;
    case 'astral': case 'spirit': case 'god': drawBiped(A, visual.bodyplan); break;
    default: drawBiped(A, 'biped');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- éléments partagés
function drawAura(A, cy) {
  const { ctx, size, t, visual, W } = A; const c = visual.aura_color || '#45D95E';
  ctx.save(); ctx.globalAlpha = .55 + Math.sin(t * 3) * .12;
  if (visual.aura === 'halo') {
    ctx.beginPath(); ctx.ellipse(0, cy - size * .55, size * .34, size * .1, 0, 0, 6.28);
    ctx.lineWidth = W.hero * 1.1; ctx.strokeStyle = c; ctx.stroke();
  } else if (visual.aura === 'rings') {
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(0, cy + size * .1, size * (.55 + i * .15 + Math.sin(t * 2 + i) * .03), size * (.2 + i * .06), 0, 0, 6.28); ctx.lineWidth = W.struct; ctx.strokeStyle = c; ctx.stroke(); }
  } else if (visual.aura === 'stars') {
    for (let i = 0; i < 9; i++) { const p = golden(i, 9, size * .7, size * .45, 1); const a = t * .5; ctx.beginPath(); ctx.arc(p.x * Math.cos(a) - p.y * Math.sin(a), cy + p.x * Math.sin(a) + p.y * Math.cos(a), size * .022, 0, 6.28); ctx.fillStyle = c; ctx.fill(); }
  } else {
    // Halo en trois anneaux d'aplat : le dégradé radial d'avant était le seul de la créature.
    for (let i = 3; i >= 1; i--) { ctx.save(); ctx.globalAlpha = .1 * i; ctx.beginPath(); ctx.arc(0, cy, size * (.32 + i * .12), 0, 6.28); ctx.fillStyle = c; ctx.fill(); ctx.restore(); }
  }
  ctx.restore();
}
// Taches : placement déterministe (angle d'or) et SANS contour — un détail intérieur ne
// s'entoure jamais d'encre, c'est ce qui chargeait l'ancien rendu.
function spotsClean(A, cx, cy, rx, ry) {
  const { ctx, visual, T, size } = A; if (!visual.spots) return;
  const col = visual.spots === 'gold' ? '#FFC24B' : visual.spots === 'green' ? '#45D95E' : T.dark;
  const n = visual.spot_count || 4;
  for (let i = 0; i < n; i++) { const p = golden(i, n, rx, ry); inner(ctx, orb(cx + p.x, cy + p.y, size * .042), col); }
}
function drawLumen(A, cx, cy, r) {
  const { ctx, t } = A; const pulse = 1 + Math.sin(t * 3.2) * .1;
  ctx.save();
  for (let i = 3; i >= 1; i--) { ctx.globalAlpha = .085 * i; ctx.beginPath(); ctx.arc(cx, cy, r * pulse * (.4 + i * .22), 0, 6.28); ctx.fillStyle = '#8CF5A6'; ctx.fill(); }
  ctx.restore();
}
function drawEyes(A, cx, cy, r) {
  const { ctx, visual, t, ph, W, T } = A;
  const n = visual.eyes || 1, es = r * (visual.eye_size || 1) * (1 + ph.strike * .1);
  const blink = (((t * .9 + (visual.seed || 0) % 3) % 4.6) > 4.48) ? .12 : 1;
  const look = ph.wind ? -.55 : ph.strike ? 1 : Math.sin(t * .7) * .55;
  const white = { ...T, base: '#FFFFFF', hi: '#FFFFFF', mid: '#DED9CC', band: T.band * .4 };
  const one = (ex, ey, er, pupil) => {
    form(ctx, orb(ex, ey, er, er * blink), white, W.struct, { hi: false });
    if (blink > .3) {
      inner(ctx, orb(ex + look * er * .32, ey + er * .04, er * .5), pupil || INK);
      inner(ctx, orb(ex + look * er * .32 - er * .19, ey - er * .19, er * .17), '#FFFFFF');
    }
  };
  if (n === 1) one(cx, cy, es);
  else if (n === 2) { one(cx - es * .92, cy, es * .8); one(cx + es * .92, cy, es * .8); }
  else { one(cx - es * .92, cy + es * .2, es * .64); one(cx + es * .92, cy + es * .2, es * .64); one(cx, cy - es * .82, es * (visual.third_eye ? .58 : .44), visual.third_eye ? '#A76BD9' : null); }
}
function drawMouth(A, cx, cy, w) {
  const { ctx, visual, W, T, ph } = A;
  const open = .22 + ph.strike * .5;
  if (visual.mouth === 'fangs') {
    form(ctx, (c) => { c.beginPath(); c.moveTo(cx - w, cy); c.quadraticCurveTo(cx, cy + w * (1 + open), cx + w, cy); c.closePath(); },
      { ...T, base: '#3A1A22', mid: '#2A1018', hi: '#4A222C', band: T.band * .5 }, W.struct);
    for (const s of [-.52, .52]) inner(ctx, (c) => { c.beginPath(); c.moveTo(cx + w * s - w * .16, cy); c.lineTo(cx + w * s, cy + w * .52); c.lineTo(cx + w * s + w * .16, cy); c.closePath(); }, '#FFFFFF');
  } else {
    ctx.beginPath(); ctx.moveTo(cx - w * .78, cy); ctx.quadraticCurveTo(cx, cy + w * (.6 + open), cx + w * .78, cy);
    ctx.lineWidth = W.struct; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  }
}

// La TÊTE : un crâne rond pour tout le monde, plus une coiffe qui dit le rôle.
// La coiffe est de l'ARMURE — elle se lit en valeur sombre sur le crâne clair, à toutes les
// palettes de stade. Le métal du palier ne sert qu'aux liserés : un casque crème sur un corps
// vert lisait comme un bonnet.
function drawHead(A, hx, hy, hr) {
  const { ctx, T, W, visual, arch, tier } = A;
  const M = ['#8FD4C1', '#EFE4C8', '#C2CAD6', '#DCE4EE', '#8FE4FF'][Math.min(tier, 4)];
  const armor = { ...T, base: T.dark, hi: T.mid, mid: shade(T.dark, -0.24) };
  const headPath = orb(hx, hy, hr);
  if (arch.tete === 'capuche') {   // capuche : épouse le crâne, dessinée DERRIÈRE lui
    form(ctx, (c) => { c.beginPath(); c.arc(hx - hr * .04, hy, hr * 1.07, Math.PI * .66, Math.PI * 2.26); c.closePath(); }, { ...T, base: T.mid, hi: T.base, mid: T.dark }, W.hero);
  }
  if (visual.horns) for (const s of [-1, 1]) form(ctx, (c) => { c.beginPath(); c.moveTo(hx + s * hr * .5, hy - hr * .58); c.lineTo(hx + s * hr * .86, hy - hr * 1.42); c.lineTo(hx + s * hr * .14, hy - hr * .82); c.closePath(); }, { ...T, base: '#F4F1E8', hi: '#FFFFFF', mid: '#CFC9B8' }, W.struct);
  form(ctx, headPath, T, W.hero);
  if (arch.tete === 'casque') {
    form(ctx, (c) => { c.beginPath(); c.arc(hx, hy, hr * 1.03, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); }, armor, W.hero);
    form(ctx, (c) => { c.beginPath(); c.ellipse(hx + hr * .1, hy - hr * .2, hr * 1.2, hr * .14, 0, 0, 6.28); }, { ...T, base: M, hi: shade(M, .3), mid: shade(M, -.3) }, W.struct);
  } else if (arch.tete === 'crete') {
    for (let i = 0; i < 3; i++) { const dx = (i - 1) * hr * .42, h = hr * (.9 - Math.abs(i - 1) * .26); form(ctx, (c) => { c.beginPath(); c.moveTo(hx + dx - hr * .19, hy - hr * .78); c.lineTo(hx + dx, hy - hr * .78 - h); c.lineTo(hx + dx + hr * .19, hy - hr * .78); c.closePath(); }, armor, W.struct); }
  } else if (arch.tete === 'petales') {
    for (let i = 0; i < 5; i++) { const a = Math.PI + (i / 4) * Math.PI; form(ctx, (c) => { c.beginPath(); c.ellipse(hx + Math.cos(a) * hr * .86, hy + Math.sin(a) * hr * .86, hr * .3, hr * .17, a, 0, 6.28); }, { ...T, base: '#8CF5A6', hi: '#C6FFD6', mid: '#4FB86B' }, W.hair); }
  } else if (arch.tete === 'bandeau') {
    form(ctx, (c) => { c.beginPath(); c.ellipse(hx, hy - hr * .44, hr * 1.0, hr * .19, 0, 0, 6.28); }, { ...T, base: M, hi: shade(M, .3), mid: shade(M, -.32) }, W.hair);
  } else if (arch.tete === 'couronne') {
    for (let i = 0; i < 5; i++) { const dx = (i - 2) * hr * .38; form(ctx, (c) => { c.beginPath(); c.moveTo(hx + dx - hr * .16, hy - hr * .82); c.lineTo(hx + dx, hy - hr * 1.34); c.lineTo(hx + dx + hr * .16, hy - hr * .82); c.closePath(); }, { ...T, base: '#FFC24B', hi: '#FFE0A0', mid: '#C98F1E' }, W.hair); }
  }
  glossIn(ctx, headPath, hx - hr * .36, hy - hr * .42, hr * .28, hr * .15);
}

// ---------------------------------------------------------------- stade 1 : cellule
function drawCell(A) {
  const { ctx, T, W, size, t, visual, arch } = A;
  const rx = size * .40 * arch.w, ry = size * .37 * arch.h, cy = -size * .42;
  const body = membrane(0, cy, rx, ry, .05, t, (visual.seed || 1) % 7);
  if (visual.tail === 'flagellum') {
    const fx = -rx * .95, wob = Math.sin(t * 7) * size * .07;
    form(ctx, capsule(fx, cy, fx - size * .46, cy + wob, size * .035, size * .012), { ...T, base: T.mid }, W.struct, { hi: false });
  }
  if (visual.limbs === 'cilia') for (let i = 0; i < (visual.limb_count || 8); i++) { const a = (i / (visual.limb_count || 8)) * 6.28, sw = Math.sin(t * 5 + i) * .35; const bx = Math.cos(a) * rx * .98, by = cy + Math.sin(a) * ry * .98; form(ctx, capsule(bx, by, bx + Math.cos(a + sw) * size * .13, by + Math.sin(a + sw) * size * .13, size * .022, size * .008), { ...T, base: T.mid }, W.hair, { hi: false }); }
  if (visual.limbs === 'blobs') for (let i = 0; i < (visual.limb_count || 4); i++) { const a = -.5 + i * .52 + Math.sin(t * 2 + i) * .12; form(ctx, orb(Math.cos(a) * rx * 1.02, cy + Math.sin(a) * ry * 1.02, size * .11, size * .095), T, W.hero); }
  if (visual.back === 'spikes') spikes(A, 0, cy, rx, ry, visual.spike_count || 6, -2.6, -.5, size * .16);
  if (arch.plaques) form(ctx, (c) => { c.beginPath(); c.ellipse(0, cy, rx * 1.16, ry * 1.18, 0, Math.PI * .96, Math.PI * .04); c.closePath(); }, { ...T, base: T.dark, hi: T.mid, mid: shade(T.dark, -.22) }, W.hero);
  form(ctx, body, T, W.hero);
  // La brute porte une CRÊTE, pas des pastilles : trois cercles sur le dos passaient pour des yeux.
  if (arch.bosses) for (let i = 0; i < arch.bosses; i++) {
    const a = -2.5 + i * (1.6 / arch.bosses);
    const bx = Math.cos(a) * rx * .96, byy = cy + Math.sin(a) * ry * .96;
    const h = size * (.13 - Math.abs(i - (arch.bosses - 1) / 2) * .022);
    form(ctx, (c) => { c.beginPath(); c.moveTo(bx + Math.cos(a + 1.4) * h * .34, byy + Math.sin(a + 1.4) * h * .34); c.lineTo(bx + Math.cos(a) * h, byy + Math.sin(a) * h); c.lineTo(bx + Math.cos(a - 1.4) * h * .34, byy + Math.sin(a - 1.4) * h * .34); c.closePath(); }, { ...T, base: T.dark, hi: T.mid, mid: shade(T.dark, -.2) }, W.struct);
  }
  ctx.save(); body(ctx); ctx.clip();
  inner(ctx, orb(0, cy + ry * .12, rx * .62, ry * .58), shade(T.base, .16));
  spotsClean(A, 0, cy, rx, ry);
  if (arch.lumen) drawLumen(A, 0, cy, size * .3);
  ctx.restore();
  glossIn(ctx, body, -rx * .38, cy - ry * .48, rx * .2, ry * .11);
  drawEyes(A, 0, cy - ry * .12, size * .125);
  drawMouth(A, 0, cy + ry * .40, size * .115);
  gearAt(A, rx * 1.12, cy + ry * .3, .34);
}

// ---------------------------------------------------------------- stade 2 : colonie
function drawCluster(A) {
  const { ctx, T, W, size, t, visual, arch } = A;
  const cy = -size * .42;
  const n = arch.bosses ? 6 : arch.w < .85 ? 3 : 5;
  const sat = [[-.32, .16, .62], [.34, .13, .64], [-.15, -.33, .56], [.21, -.32, .52], [-.36, -.06, .46], [.37, -.09, .44]].slice(0, n - 1);
  if (visual.back === 'spikes') spikes(A, 0, cy, size * .48, size * .43, visual.spike_count || 6, -2.7, -.4, size * .15);
  if (arch.plaques) form(ctx, (c) => { c.beginPath(); c.ellipse(0, cy, size * .47, size * .41, 0, 0, 6.28); }, { ...T, base: T.dark, hi: T.mid, mid: shade(T.dark, -.22) }, W.hero);
  for (const [dx, dy, s] of sat) form(ctx, membrane(dx * size, cy + dy * size, size * .19 * s * 1.35, size * .17 * s * 1.35, .04, t, dx * 9), { ...T, base: T.mid, hi: T.base, mid: T.dark }, W.hero);
  const core = membrane(0, cy, size * .29, size * .26, .04, t, 1);
  form(ctx, core, T, W.hero);
  ctx.save(); core(ctx); ctx.clip();
  inner(ctx, orb(0, cy + size * .08, size * .19, size * .15), shade(T.base, .16));
  spotsClean(A, 0, cy, size * .29, size * .26);
  if (arch.lumen) drawLumen(A, 0, cy, size * .28);
  ctx.restore();
  glossIn(ctx, core, -size * .11, cy - size * .13, size * .075, size * .04);
  drawEyes(A, 0, cy - size * .04, size * .115);
  drawMouth(A, 0, cy + size * .11, size * .095);
  gearAt(A, size * .5, cy + size * .2, .34);
}

// ---------------------------------------------------------------- stade 3 : bête
function drawBeast(A) {
  const { ctx, T, W, size, t, visual, arch, pose, walk, ph } = A;
  const bw = size * .36 * arch.w, bh = size * .25 * arch.h, by = -size * .48;
  const legLen = size * .27 * (visual.limb_len || 1);
  const step = pose === 'walk' ? walk * .5 : 0;
  const dark = { ...T, base: T.dark, hi: T.mid, mid: shade(T.dark, -.2) };
  const tw = Math.sin(t * 3) * size * .04;
  if (visual.tail === 'club') {
    form(ctx, capsule(-bw * .82, by, -bw * 1.42, by - size * .2 + tw, size * .05, size * .03), dark, W.hero, { hi: false });
    form(ctx, orb(-bw * 1.42, by - size * .2 + tw, size * .095), { ...T, base: T.mid }, W.hero);
  } else form(ctx, capsule(-bw * .84, by, -bw * 1.28, by - size * .17 + tw, size * .05, size * .018), dark, W.hero, { hi: false });
  const leg = (lx, phse, back) => { const sw = step * phse * size * .12; const T2 = back ? dark : T; form(ctx, capsule(lx, by + bh * .45, lx + sw, by + bh * .45 + legLen, size * .062, size * .048), T2, W.hero, { hi: !back }); form(ctx, orb(lx + sw + size * .012, by + bh * .45 + legLen, size * .072, size * .05), T2, W.struct, { hi: !back }); };
  leg(-bw * .58, 1, true); leg(bw * .46, -1, true);
  if (visual.back === 'spikes') spikes(A, 0, by, bw, bh, visual.spike_count || 6, -2.7, -.4, size * .15);
  if (visual.back === 'crystals') spikes(A, 0, by, bw, bh, 5, -2.6, -.5, size * .2, '#A76BD9');
  if (visual.back === 'shell' || arch.plaques) form(ctx, (c) => { c.beginPath(); c.ellipse(-bw * .06, by - bh * .18, bw * .88, bh * 1.1, 0, Math.PI, 0); c.closePath(); }, dark, W.hero);
  if (visual.back === 'wings') for (const s of [-1, 1]) form(ctx, (c) => { c.beginPath(); c.moveTo(-bw * .1, by - bh * .5); c.quadraticCurveTo(-bw * .2 + s * bw * .22, by - size * .5 - Math.sin(t * 8) * size * .05, -bw * .92 + s * bw * .1, by - size * .34); c.quadraticCurveTo(-bw * .5, by - bh * .3, -bw * .1, by - bh * .5); c.closePath(); }, { ...T, base: T.mid }, W.struct);
  const body = (c) => { c.beginPath(); c.ellipse(0, by, bw, bh, 0, 0, 6.28); };
  form(ctx, body, T, W.hero);
  ctx.save(); body(ctx); ctx.clip();
  inner(ctx, orb(bw * .05, by + bh * .34, bw * .58, bh * .42), shade(T.base, .16));
  if (arch.bosses) for (let i = 0; i < 2; i++) inner(ctx, orb(bw * (.3 - i * .5), by - bh * .3, bw * .3, bh * .42), shade(T.base, -.09));
  spotsClean(A, 0, by, bw, bh);
  if (visual.skin === 'scales') for (let i = 0; i < 6; i++) { const p = golden(i, 6, bw * .8, bh * .7); ctx.beginPath(); ctx.arc(p.x, by + p.y, size * .045, 0, Math.PI); ctx.lineWidth = W.hair; ctx.strokeStyle = 'rgba(23,27,35,.5)'; ctx.stroke(); }
  if (arch.lumen) drawLumen(A, 0, by, bw * .8);
  ctx.restore();
  glossIn(ctx, body, -bw * .3, by - bh * .52, bw * .24, bh * .16);
  leg(-bw * .42, -1, false); leg(bw * .6, 1, false);
  // cou + tête : c'est le cou qui fait lire un animal plutôt qu'une chenille
  const hr = size * .265 * arch.head;
  const hx = bw * .92 + ph.strike * size * .05, hy = by - bh * 1.2 + (pose === 'walk' ? walk * size * .02 : 0);
  form(ctx, capsule(bw * .48, by - bh * .25, hx - hr * .2, hy + hr * .5, size * .075, size * .062), T, W.hero);
  drawHead(A, hx, hy, hr);
  drawEyes(A, hx + hr * .16, hy - hr * .1, hr * .36);
  drawMouth(A, hx + hr * .26, hy + hr * .44, hr * .38);
  gearAt(A, bw * .98, by + bh * .5, .34);
}

// ---------------------------------------------------------------- stades 4+ : bipède
function drawBiped(A, kind) {
  const { ctx, T, W, size, t, visual, arch, pose, role, atk, tier, ph, walk } = A;
  const bw = size * .245 * arch.w, bh = size * .25 * arch.h, by = -size * .47;
  const legLen = size * .25 * (visual.limb_len || 1);
  const step = pose === 'walk' ? walk : 0;
  const spirit = kind === 'spirit' || kind === 'god';
  const skin = kind === 'god' ? { ...T, base: '#F0E4B8', hi: '#FFF8DC', mid: '#D6C48C', dark: '#B39C5E' } : T;
  const dark = { ...skin, base: skin.dark, hi: skin.mid, mid: shade(skin.dark, -.2) };

  const leg = (lx, phse, back) => { const sw = step * phse * size * .1; const TT = back ? dark : skin; form(ctx, capsule(lx, by + bh * .55, lx + sw, by + bh * .55 + legLen, size * .062, size * .05), TT, W.hero, { hi: !back }); form(ctx, orb(lx + sw + size * .015, by + bh * .55 + legLen, size * .075, size * .048), TT, W.struct, { hi: !back }); };
  const arm = (ax, ay, ang, back, gear) => {
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
    const TT = back ? dark : skin;
    const L = size * .25;
    form(ctx, capsule(0, 0, L, 0, size * .055, size * .042), TT, W.hero, { hi: !back });
    form(ctx, orb(L, 0, size * .058), visual.hands ? { ...TT, base: shade(TT.base, .18) } : TT, W.struct, { hi: !back });
    if (gear) { ctx.translate(L, 0); drawGear({ ...A, lw: W.hero }, { role, tier, atk: pose === 'attack' ? atk : null, t }); }
    ctx.restore();
  };
  const swing = pose === 'attack' ? armSwing(atk, t, role) : pose === 'walk' ? step * .45 : Math.sin(t * 2) * .09;

  if (!spirit) leg(-bw * .42, 1, true);
  arm(-bw * .62, by - bh * .12, 2.78 - swing * .35, true, false);
  if (visual.limbs === 'arms' && (visual.limb_count || 2) >= 4) arm(-bw * .52, by + bh * .16, 2.62, true, false);
  if (visual.back === 'spikes') spikes(A, 0, by, bw, bh, visual.spike_count || 5, -2.8, -1.6, size * .14);
  if (visual.back === 'crystals') spikes(A, 0, by, bw, bh, 4, -2.8, -1.7, size * .19, '#A76BD9');
  if (visual.back === 'wings') for (const s of [0, 1]) form(ctx, (c) => { c.beginPath(); c.moveTo(-bw * .5, by - bh * .3); c.quadraticCurveTo(-bw * 1.2 - s * bw * .3, by - size * .5 - Math.sin(t * 8) * size * .05, -bw * 1.85, by - size * .2 + s * size * .15); c.quadraticCurveTo(-bw * 1.1, by - bh * .1, -bw * .5, by - bh * .3); c.closePath(); }, { ...skin, base: skin.mid }, W.struct);
  if (visual.back === 'shell' || arch.plaques) form(ctx, orb(-bw * .28, by - bh * .05, bw * .82, bh * 1.0), dark, W.hero);
  if (visual.tail === 'club') { const tw = Math.sin(t * 3) * size * .035; form(ctx, capsule(-bw * .68, by + bh * .3, -bw * 1.5, by - size * .04 + tw, size * .05, size * .03), dark, W.hero, { hi: false }); form(ctx, orb(-bw * 1.5, by - size * .04 + tw, size * .085), { ...skin, base: skin.mid }, W.hero); }

  const body = (c) => { c.beginPath(); c.moveTo(-bw, by - bh * .5); c.bezierCurveTo(-bw * 1.08, by + bh * 1.06, bw * 1.08, by + bh * 1.06, bw, by - bh * .5); c.bezierCurveTo(bw * .88, by - bh * 1.16, -bw * .88, by - bh * 1.16, -bw, by - bh * .5); c.closePath(); };
  form(ctx, body, skin, W.hero);
  ctx.save(); body(ctx); ctx.clip();
  inner(ctx, orb(bw * .1, by + bh * .3, bw * .56, bh * .46), kind === 'astral' ? '#4EA8E8' : shade(skin.base, .17));
  if (arch.bosses) for (const s of [-1, 1]) inner(ctx, orb(s * bw * .5, by - bh * .52, bw * .36, bh * .3), shade(skin.base, -.1));
  if (arch.plaques) inner(ctx, (c) => { c.beginPath(); c.rect(-bw, by - bh * .2, bw * 2, bh * .16); }, shade(skin.base, -.12));
  spotsClean(A, 0, by, bw, bh);
  if (arch.lumen) drawLumen(A, 0, by, bw * 1.1);
  ctx.restore();
  glossIn(ctx, body, -bw * .44, by - bh * .58, bw * .22, bh * .15);

  if (!spirit) leg(bw * .36, -1, false);
  else form(ctx, (c) => { c.beginPath(); c.moveTo(-bw * .58, by + bh * .78); c.quadraticCurveTo(0, by + bh * 1.6 + Math.sin(t * 3) * size * .04, bw * .58, by + bh * .78); c.closePath(); }, { ...skin, base: skin.mid }, W.struct, { stroke: false });

  const hr = size * .235 * arch.head, hx = bw * .1, hy = by - bh * 1.0 + (pose === 'walk' ? Math.abs(step) * size * .018 : 0);
  form(ctx, capsule(bw * .03, by - bh * .55, hx, hy + hr * .55, size * .075, size * .065), skin, W.hero, { hi: false });
  drawHead(A, hx, hy, hr);
  if (kind === 'god') { ctx.beginPath(); ctx.ellipse(hx, hy - hr * 1.35, hr * .62, hr * .18, 0, 0, 6.28); ctx.lineWidth = W.struct; ctx.strokeStyle = '#FFC24B'; ctx.stroke(); }
  drawEyes(A, hx + hr * .1, hy - hr * .04, hr * .35);
  drawMouth(A, hx + hr * .14, hy + hr * .5, hr * .36);
  // Un tank tient son bouclier DEVANT, pas dans le dos : arme toujours au bras avant.
  arm(bw * .55, by - bh * .12, (role === 'tank' ? .05 : .28) + swing, false, true);
  if (visual.limbs === 'arms' && (visual.limb_count || 2) >= 4) arm(bw * .5, by + bh * .3, .5 + swing * .4, false, false);
}

// Piquants : formes fermées, une seule épaisseur.
function spikes(A, cx, cy, rx, ry, count, fromA, toA, len, col) {
  const { ctx, T, W } = A;
  const tone = col ? { ...T, base: col, hi: shade(col, .25), mid: shade(col, -.25) } : { ...T, base: T.dark, hi: T.mid, mid: shade(T.dark, -.2) };
  for (let i = 0; i < count; i++) {
    const a = fromA + (toA - fromA) * (i / (count - 1 || 1));
    const bx = cx + Math.cos(a) * rx * .94, by = cy + Math.sin(a) * ry * .94;
    form(ctx, (c) => { c.beginPath(); c.moveTo(bx + Math.cos(a + 1.35) * len * .26, by + Math.sin(a + 1.35) * len * .26); c.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len); c.lineTo(bx + Math.cos(a - 1.35) * len * .26, by + Math.sin(a - 1.35) * len * .26); c.closePath(); }, tone, W.struct);
  }
}

// Ancrage de l'arme pour les morphologies sans bras.
function gearAt(A, x, y, scale) {
  const { ctx, size, role, atk, tier, pose, t, W } = A;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(armSwing(pose === 'attack' ? atk : null, t, role) * .8);
  drawGear({ ...A, size: size * (scale / .25) * .9, W: weights(size * (scale / .25) * .9), lw: W.hero * .9 }, { role, tier, atk: pose === 'attack' ? atk : null, t });
  ctx.restore();
}

export function renderToCanvas(canvas, visual, opts = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 100, hgt = canvas.clientHeight || 100;
  canvas.width = w * dpr; canvas.height = hgt * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, hgt);
  drawCreature(ctx, visual, { x: w / 2, y: hgt * .88, size: Math.min(w, hgt) * (opts.scale || .9), ...opts });
}
