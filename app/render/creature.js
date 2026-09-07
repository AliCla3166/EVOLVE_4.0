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
import { genesFor, tintOf, livree, wob } from './genes.js';

export { shade, hueShift };

// Masse, rôle, tête et geste de chaque archétype.
const ARCH = {
  eclaireur: { w: .74, h: .84, head: 1.00, role: 'melee', tete: 'bandeau', regard: [.18, .62], geste: { lunge: 1.5, lean: 1.1, rise: 0.1, wind: 0.5 } },
  brute:     { w: 1.30, h: 1.06, head: .90, role: 'melee', tete: 'crete',   bosses: 3, regard: [-.62, .95], geste: { lunge: 1.0, lean: 1.5, rise: 0.9, wind: 1.4 } },
  tireur:    { w: .82, h: .90, head: 1.04, role: 'ranged', tete: 'capuche', regard: [-.30, .70], geste: { lunge: -0.5, lean: -0.7, rise: 0.1, wind: 0.3 } },
  tank:      { w: 1.44, h: .92, head: .80, role: 'tank',   tete: 'casque',  plaques: true, regard: [0, 1.0], geste: { lunge: 0.7, lean: 0.5, rise: 0.0, wind: 0.3 } },
  soigneur:  { w: .88, h: .96, head: 1.18, role: 'support', tete: 'petales', lumen: true, regard: [.55, .42], geste: { lunge: 0.0, lean: -0.3, rise: 0.7, wind: 0.6 } },
  boss:      { w: 1.58, h: 1.34, head: 1.08, role: 'melee', tete: 'couronne', bosses: 4, plaques: true, regard: [-.78, 1.05], geste: { lunge: 1.1, lean: 1.4, rise: 1.0, wind: 1.5 } },
  enemy:     { w: 1, h: 1, head: 1, role: 'melee', tete: 'aucune', regard: [-.4, .8], geste: { lunge: 1, lean: 1, rise: 0.3, wind: 0.8 } }
};
export { ARCH };

export function drawCreature(ctx, visual, opts = {}) {
  const {
    x = 0, y = 0, size = 80, t: t0 = 0, tint = '#3FB8C9', facing = 1,
    pose = 'idle', archetype = 'eclaireur', flash = 0, atk = null, dying = 0
  } = opts;
  const arch = ARCH[archetype] || ARCH.eclaireur;
  const role = opts.role || arch.role;
  // Les genes : la palette, la livree et les irregularites propres a CET individu.
  const G = genesFor(visual, archetype);
  // Dephasage : deux cretaures cote a cote ne doivent pas respirer en cadence, sinon la scene
  // entiere pulse comme un seul objet. C'est le defaut le plus visible d'une foule generee.
  const t = t0 + G.phase * 0.13;
  const baseCol = tintOf(visual.tint_shift ? hueShift(tint, visual.tint_shift) : tint, G);
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

  const A = { ctx, T, W, size, t, visual, arch, pose, role, atk, tier, ph, walk, archetype, G, lw: W.hero };
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
// L'ŒIL — la pièce la plus chère du personnage, et celle qui coûtait le moins d'attention.
//
// Avant : deux disques blancs parfaits, cerclés d'encre, avec un point noir au centre. C'est la
// signature visuelle du jeu mobile bas de gamme, et aucune palette ne la rattrape.
// Maintenant, cinq couches, dans l'ordre où un illustrateur les poserait :
//   1. l'ORBITE — un aplat sombre dans le masque du crâne, pour que l'œil soit DANS la tête ;
//   2. le BLANC — jamais #FFF (le blanc pur est le tell), et un contour fin, pas un cerne ;
//   3. l'IRIS coloré + la PUPILLE + UN seul reflet ;
//   4. la PAUPIÈRE supérieure, dans la couleur de la peau : elle coupe le haut du globe, et
//      c'est elle, à elle seule, qui fait passer de « pastille » à « regard » ;
//   5. l'ARCADE, inclinée selon l'archétype : la brute fronce, le soigneur s'ouvre.
function drawEyes(A, cx, cy, r) {
  const { ctx, visual, t, ph, W, T, G, arch, size } = A;
  const n = visual.eyes || 1;
  const es = r * (visual.eye_size || 1) * (1 + ph.strike * .08);
  const blink = (((t * .9 + (visual.seed || 0) % 3) % 4.6) > 4.46) ? .10 : 1;
  const look = ph.wind ? -.5 : ph.strike ? .9 : Math.sin(t * .7) * .5;
  const [tilt, lourd] = arch.regard || [0, .7];
  const iris = G ? G.iris : shade(T.base, -.5);
  const SCLERA = '#F6F2E6';                      // ivoire, pas blanc pur
  const lid = T.lod ? .17 * lourd + ph.wind * .12 : 0;

  const eye = (ex, ey, er, dir) => {
    const globe = orb(ex, ey, er, er * .94 * blink);
    if (T.lod) { ctx.save(); ctx.globalAlpha = .5; inner(ctx, orb(ex, ey + er * .06, er * 1.34, er * 1.24), shade(T.base, -.32)); ctx.restore(); }
    inner(ctx, globe, SCLERA);
    if (blink > .3) {
      ctx.save(); globe(ctx); ctx.clip();
      inner(ctx, orb(ex + look * er * .34, ey + er * .06, er * .60), iris);
      inner(ctx, orb(ex + look * er * .34, ey + er * .06, er * .30), INK);
      inner(ctx, orb(ex + look * er * .34 - er * .22, ey - er * .20, er * .15), '#FFFFFF');
      // paupière : un aplat de peau qui mange le haut du globe
      if (lid > 0) inner(ctx, orb(ex, ey - er * (2.05 - lid * 2), er * 1.15, er * 1.05), T.base);
      ctx.restore();
    }
    ctx.lineWidth = W.hair; ctx.strokeStyle = 'rgba(23,27,35,.72)'; globe(ctx); ctx.stroke();
    // arcade : une virgule sombre au-dessus, inclinée. C'est l'expression.
    if (T.lod) {
      ctx.save(); ctx.translate(ex, ey - er * 1.06); ctx.rotate(dir * tilt * .5);
      inner(ctx, (c) => { c.beginPath(); c.ellipse(0, 0, er * 1.05, er * .30, 0, 0, 6.28); }, shade(T.base, -.42));
      ctx.restore();
    }
  };

  // Jamais deux yeux exactement identiques : c'est le tell le plus fort d'une image générée.
  const eR = G ? G.eyeR : 1, eDy = G ? G.eyeDy : 0;
  const sp = es * .80, er0 = es * .62;
  if (n === 1) eye(cx, cy, es * .78, 1);
  else if (n === 2) { eye(cx - sp, cy + er0 * eDy, er0 * eR, -1); eye(cx + sp * 1.02, cy - er0 * eDy * .6, er0 / eR, 1); }
  else {
    eye(cx - sp, cy + er0 * (.25 + eDy), er0 * .82 * eR, -1); eye(cx + sp * 1.02, cy + er0 * .25, er0 * .82 / eR, 1);
    eye(cx, cy - er0 * 1.05, er0 * (visual.third_eye ? .72 : .56), 0);
    if (visual.third_eye) inner(ctx, orb(cx, cy - er0 * 1.05, er0 * .26), '#A76BD9');
  }
}
// LA BOUCHE. Un grand sourire en U traversant la face, c'est du sticker. Ici : une bouche
// courte, posée dans un museau à peine plus clair, qui s'ouvre quand la créature frappe.
function drawMouth(A, cx, cy, w) {
  const { ctx, visual, W, T, ph } = A;
  const open = ph.strike * .8;
  if (T.lod) { ctx.save(); ctx.globalAlpha = .34; inner(ctx, orb(cx, cy - w * .12, w * 1.15, w * .85), shade(T.base, .24)); ctx.restore(); }
  if (visual.mouth === 'fangs') {
    const mw = w * .84;
    form(ctx, (c) => { c.beginPath(); c.moveTo(cx - mw, cy); c.quadraticCurveTo(cx, cy + mw * (.85 + open), cx + mw, cy); c.closePath(); },
      { ...T, base: '#3A1A22', mid: '#2A1018', hi: '#4A222C', band: T.band * .5 }, W.struct);
    for (const s2 of [-.5, .5]) inner(ctx, (c) => { c.beginPath(); c.moveTo(cx + mw * s2 - mw * .17, cy); c.lineTo(cx + mw * s2, cy + mw * .48); c.lineTo(cx + mw * s2 + mw * .17, cy); c.closePath(); }, '#F6F2E6');
  } else if (open > .12) {
    form(ctx, orb(cx, cy + w * .16, w * .46, w * (.26 + open * .5)), { ...T, base: '#3A1A22', mid: '#2A1018', hi: '#4A222C', band: T.band * .5 }, W.struct);
  } else {
    ctx.beginPath(); ctx.moveTo(cx - w * .46, cy); ctx.quadraticCurveTo(cx, cy + w * .46, cx + w * .46, cy);
    ctx.lineWidth = W.struct; ctx.strokeStyle = 'rgba(23,27,35,.85)'; ctx.lineCap = 'round'; ctx.stroke();
  }
}

// La TÊTE : un crâne rond pour tout le monde, plus une coiffe qui dit le rôle.
// La coiffe est de l'ARMURE — elle se lit en valeur sombre sur le crâne clair, à toutes les
// palettes de stade. Le métal du palier ne sert qu'aux liserés : un casque crème sur un corps
// vert lisait comme un bonnet.
function drawHead(A, hx, hy, hr) {
  const { ctx, T, W, visual, arch, tier, G } = A;
  const M = ['#8FD4C1', '#EFE4C8', '#C2CAD6', '#DCE4EE', '#8FE4FF'][Math.min(tier, 4)];
  const armor = { ...T, base: T.dark, hi: T.mid, mid: shade(T.dark, -0.24) };
  // Crâne rond en haut, mâchoire qui se resserre vers le menton : la différence entre une
  // tête et une bille tient dans ces quatre points de contrôle.
  const headPath = (c) => {
    c.beginPath();
    c.ellipse(hx, hy - hr * .05, hr, hr * .99, 0, Math.PI, 0);
    c.bezierCurveTo(hx + hr * .95, hy + hr * .58, hx + hr * .46, hy + hr * 1.04, hx, hy + hr * 1.04);
    c.bezierCurveTo(hx - hr * .46, hy + hr * 1.04, hx - hr * .95, hy + hr * .58, hx - hr, hy - hr * .05);
    c.closePath();
  };
  if (arch.tete === 'capuche') {   // capuche : épouse le crâne, dessinée DERRIÈRE lui
    form(ctx, (c) => { c.beginPath(); c.arc(hx - hr * .04, hy, hr * 1.07, Math.PI * .66, Math.PI * 2.26); c.closePath(); }, { ...T, base: T.mid, hi: T.base, mid: T.dark }, W.hero);
  }
  // Oreilles : dessinees DERRIERE le crane, tailles legerement inegales. Une paire d'oreilles
  // change la silhouette plus qu'un motif ne change la surface — c'est le detail le mieux place.
  if (G && G.oreille !== 'aucune') for (const s of [-1, 1]) {
    const k = s === G.side ? 1.06 : 0.92;      // jamais la meme des deux cotes
    const ox = hx + s * hr * .80, oy = hy - hr * .12;
    const tone = { ...T, base: T.mid, hi: T.base, mid: T.dark };
    if (G.oreille === 'ronde') { form(ctx, orb(ox, oy, hr * .30 * k, hr * .32 * k), tone, W.struct); inner(ctx, orb(ox + s * hr * .05, oy, hr * .15 * k, hr * .17 * k), shade(T.base, -.34)); }
    else {
      const tall = G.oreille === 'frangee' ? 1.35 : 1.0;
      form(ctx, (c) => { c.beginPath(); c.moveTo(ox - s * hr * .22, oy + hr * .26); c.lineTo(ox + s * hr * .52 * k, oy - hr * .48 * tall * k); c.lineTo(ox + s * hr * .04, oy - hr * .30); c.closePath(); }, tone, W.struct);
      inner(ctx, (c) => { c.beginPath(); c.moveTo(ox - s * hr * .10, oy + hr * .16); c.lineTo(ox + s * hr * .34 * k, oy - hr * .34 * tall * k); c.lineTo(ox + s * hr * .02, oy - hr * .20); c.closePath(); }, shade(T.base, -.34));
    }
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
  // Arcade et joue : deux aplats sans encre, DANS le masque du crane. Ils ne coutent aucun trait
  // et donnent au visage le relief que 31 contours interieurs ne donnaient pas.
  if (G && T.lod) {
    ctx.save(); headPath(ctx); ctx.clip(); ctx.globalAlpha = .45;
    if (G.arcade) inner(ctx, (c) => { c.beginPath(); c.ellipse(hx, hy - hr * .52, hr * .96, hr * .34, 0, 0, 6.28); }, shade(T.base, -.30));
    if (G.joue) inner(ctx, orb(hx + hr * .40 * G.side, hy + hr * .22, hr * .30, hr * .24), shade(T.base, .26));
    ctx.restore();
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
  livree(ctx, A.G, T, { cx: 0, cy, rx, ry, size });
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
  livree(ctx, A.G, T, { cx: 0, cy, rx: size * .29, ry: size * .26, size });
  spotsClean(A, 0, cy, size * .29, size * .26);
  if (arch.lumen) drawLumen(A, 0, cy, size * .28);
  ctx.restore();
  glossIn(ctx, core, -size * .11, cy - size * .13, size * .075, size * .04);
  drawEyes(A, 0, cy - size * .04, size * .115);
  drawMouth(A, 0, cy + size * .11, size * .095);
  gearAt(A, size * .5, cy + size * .2, .34);
}

// ---------------------------------------------------------------- stade 3 : bête
//
// Réécrite avec la même règle que le bipède : deux masses (poitrail + arrière-train) au lieu
// d'une ellipse, un cou visible, quatre pattes articulées, des pieds orientés. Une bête faite
// d'un seul œuf se lit comme une chenille, quelle que soit la tête qu'on lui pose.
function drawBeast(A) {
  const { ctx, T, W, size, t, visual, arch, pose, walk, ph, G } = A;
  const S = size;
  const spine = -S * .425 * (0.88 + arch.h * .14);
  const bw = S * .375 * arch.w, bh = S * .175 * arch.h;
  const dark = { ...T, base: shade(T.base, -.24), hi: T.mid, mid: shade(T.base, -.36) };
  const front = { ...T, base: shade(T.base, .09), hi: shade(T.hi, .09) };
  const step = pose === 'walk' ? walk : 0;

  // patte : cuisse + canon + pied, tous fuselés
  const leg = (lx, phse, back) => {
    const TT = back ? dark : front;
    const L = (spine + bh) * -1 + (back ? 0 : S * .012 * (G.limb - 1) * 10);
    const kx = lx + step * phse * S * .05, ky = spine + bh * .5 + L * .52;
    const fx = lx + step * phse * S * .10, fy = -S * .012;
    form(ctx, capsule(lx, spine + bh * .35, kx, ky, S * .074, S * .052), TT, W.limb, { hi: !back });
    form(ctx, capsule(kx, ky, fx, fy, S * .052, S * .040), TT, W.limb, { hi: !back });
    form(ctx, (c) => { c.beginPath(); c.ellipse(fx + S * .026, fy + S * .006, S * .062, S * .034, -.06, 0, 6.28); }, TT, W.limb, { hi: !back });
  };

  // queue
  const tw = Math.sin(t * 3 + G.phase) * S * .045;
  if (visual.tail === 'club') {
    form(ctx, capsule(-bw * .88, spine, -bw * 1.45, spine - S * .18 + tw, S * .048, S * .028), dark, W.limb, { hi: false });
    form(ctx, orb(-bw * 1.45, spine - S * .18 + tw, S * .09), { ...T, base: T.mid }, W.limb);
  } else form(ctx, capsule(-bw * .90, spine, -bw * 1.34, spine - S * .16 + tw, S * .046, S * .015), dark, W.limb, { hi: false });

  leg(-bw * .58, 1, true); leg(bw * .50, -1, true);
  if (visual.back === 'spikes') spikes(A, 0, spine, bw, bh, visual.spike_count || 6, -2.75, -.45, S * .15);
  if (visual.back === 'crystals') spikes(A, 0, spine, bw, bh, 5, -2.7, -.5, S * .20, '#A76BD9');
  if (visual.back === 'wings') for (const sg of [-1, 1]) form(ctx, (c) => { c.beginPath(); c.moveTo(-bw * .1, spine - bh * .5); c.quadraticCurveTo(-bw * .2 + sg * bw * .22, spine - S * .48 - Math.sin(t * 8) * S * .05, -bw * .92 + sg * bw * .1, spine - S * .32); c.quadraticCurveTo(-bw * .5, spine - bh * .3, -bw * .1, spine - bh * .5); c.closePath(); }, { ...T, base: T.mid }, W.struct);

  // TRONC : poitrail plus haut et plus large que l'arrière-train, dos qui plonge — la ligne
  // qui fait qu'on lit un quadrupède et pas un tube.
  const body = (c) => {
    c.beginPath();
    c.moveTo(bw * .96, spine - bh * .10);
    c.bezierCurveTo(bw * .70, spine - bh * 1.30, -bw * .55, spine - bh * 1.15, -bw * .95, spine - bh * .22);
    c.bezierCurveTo(-bw * 1.14, spine + bh * .70, -bw * .60, spine + bh * 1.05, 0, spine + bh * .98);
    c.bezierCurveTo(bw * .62, spine + bh * .92, bw * 1.10, spine + bh * .55, bw * .96, spine - bh * .10);
    c.closePath();
  };
  if (visual.back === 'shell' || arch.plaques) form(ctx, (c) => { c.beginPath(); c.ellipse(-bw * .10, spine - bh * .30, bw * .90, bh * 1.05, 0, Math.PI, 0); c.closePath(); }, dark, W.hero);
  form(ctx, body, T, W.hero);
  ctx.save(); body(ctx); ctx.clip();
  livree(ctx, G, T, { cx: 0, cy: spine, rx: bw, ry: bh, size: S });
  if (T.lod) { ctx.save(); ctx.globalAlpha = .34; inner(ctx, orb(bw * .60, spine - bh * .10, bw * .34, bh * .78), shade(T.base, .22)); ctx.restore(); }   // poitrail
  if (arch.bosses) for (let i = 0; i < 2; i++) inner(ctx, orb(bw * (.3 - i * .55), spine - bh * .35, bw * .28, bh * .40), shade(T.base, -.10));
  spotsClean(A, 0, spine, bw, bh);
  if (visual.skin === 'scales') for (let i = 0; i < 6; i++) { const p = golden(i, 6, bw * .8, bh * .7); ctx.beginPath(); ctx.arc(p.x, spine + p.y, S * .045, 0, Math.PI); ctx.lineWidth = W.hair; ctx.strokeStyle = 'rgba(23,27,35,.4)'; ctx.stroke(); }
  if (arch.lumen) drawLumen(A, 0, spine, bw * .8);
  ctx.restore();
  glossIn(ctx, body, -bw * .25, spine - bh * .78, bw * .28, bh * .18);

  leg(-bw * .44, -1, false); leg(bw * .62, 1, false);

  // cou et tête : le cou part du poitrail, en biais. C'est lui qui donne l'attitude.
  const hr = S * .178 * arch.head;
  const hx = bw * 1.00 + ph.strike * S * .05, hy = spine - bh * 1.30 + (pose === 'walk' ? walk * S * .018 : 0);
  form(ctx, capsule(bw * .62, spine - bh * .45, hx - hr * .18, hy + hr * .62, S * .078, S * .058), T, W.limb);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(G.tilt); ctx.translate(-hx, -hy);
  drawHead(A, hx, hy, hr);
  drawEyes(A, hx + hr * .18, hy - hr * .06, hr * .42);
  drawMouth(A, hx + hr * .30, hy + hr * .48, hr * .36);
  ctx.restore();
  // L'arme d'une bête est au bout de sa patte avant, pas devant son poitrail.
  gearAt(A, bw * .92, -S * .085, .26, .95);
}

// ---------------------------------------------------------------- stades 4+ : bipède
//
// Réécriture du 07/09/2026. L'ancienne construction était un œuf posé sur deux tiges, avec les
// bras en croix : la silhouette de figurine, pas de personnage. Quatre changements de fond :
//   1. PROPORTIONS — la tête passe de 2,1 à 2,8 têtes de haut. En dessous de 2,5, tout se lit
//      comme un jouet, quelles que soient les couleurs.
//   2. TORSE — épaules larges, taille marquée, bassin. Une ellipse n'a ni l'un ni l'autre.
//   3. POSE — bras au repos le long du corps, arme tenue vers le bas. Le bras à l'horizontale
//      était une pose en T, c'est-à-dire l'absence de pose.
//   4. PIEDS — orientés vers l'avant. Une bille sous une jambe ne se lit pas comme un appui.
function drawBiped(A, kind) {
  const { ctx, T, W, size, t, visual, arch, pose, role, atk, tier, ph, walk, G } = A;
  const S = size;
  const spirit = kind === 'spirit' || kind === 'god';
  const skin = kind === 'god' ? { ...T, base: '#F0E4B8', hi: '#FFF8DC', mid: '#D6C48C', dark: '#B39C5E' } : T;
  const dark = { ...skin, base: skin.dark, hi: skin.mid, mid: shade(skin.dark, -.2) };
  const front = { ...skin, base: shade(skin.base, .09), hi: shade(skin.hi, .09) };

  // Squelette : trois hauteurs, et tout s'y accroche.
  const sw = S * .205 * arch.w;                 // demi-largeur d'épaules
  const hw = S * .142 * arch.w;                 // demi-largeur de bassin
  const shY = -S * .615, hipY = -S * .335;
  const hr = S * .175 * arch.head;
  const hy = shY - S * .10 - hr * .78 + (pose === 'walk' ? Math.abs(walk) * S * .014 : 0);
  const hx = S * .045;
  const legLen = (S * .335) * (visual.limb_len || 1);
  const step = pose === 'walk' ? walk : 0;

  // --- jambe : cuisse fuselée + pied orienté vers l'avant
  const leg = (lx, phse, back) => {
    const L = legLen * (back ? 1 : G.limb);
    const sww = step * phse * S * .09;
    const TT = back ? dark : front;
    const ax = lx + sww, ay = hipY + L;
    form(ctx, capsule(lx, hipY - S * .02, ax, ay, S * .072, S * .050), TT, W.limb, { hi: !back });
    // pied : une semelle qui avance, pas une bille
    form(ctx, (c) => { c.beginPath(); c.ellipse(ax + S * .038, ay + S * .012, S * .088, S * .046, -.08, 0, 6.28); }, TT, W.limb, { hi: !back });
  };

  // --- bras : épaule fusionnée, main, puis l'arme dans le repère du poing
  const arm = (ax, ay, ang, back, gear) => {
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
    const TT = back ? dark : front;
    const L = S * .255 * (back ? 1 : G.limb);
    form(ctx, capsule(0, 0, L, 0, S * .062, S * .046), TT, W.limb, { hi: !back });
    form(ctx, orb(L, 0, S * .060), visual.hands ? { ...TT, base: shade(TT.base, .18) } : TT, W.limb, { hi: !back });
    form(ctx, orb(0, 0, S * .076, S * .072), TT, W.limb, { stroke: false });   // deltoïde, sans encre
    if (gear) { ctx.translate(L, 0); drawGear({ ...A, lw: W.hero }, { role, tier, atk: pose === 'attack' ? atk : null, t }); }
    ctx.restore();
  };
  const swing = pose === 'attack' ? armSwing(atk, t, role) : pose === 'walk' ? step * .40 : Math.sin(t * 2) * .08;
  // Au repos, un bras pend : l'angle de base est vers le BAS, pas à l'horizontale.
  // Le bras pend LE LONG du corps : plus l'angle est proche de pi/2, plus il reste collé au torse
  // et disparaît dedans. On l'écarte assez pour qu'il sorte de la silhouette.
  const restBack = 2.15, restFront = role === 'tank' ? 1.18 : role === 'ranged' ? 1.28 : 1.42;

  // --- arrière-plan (tout ce qui passe derrière le torse)
  // Le cou est posé AVANT le torse : dessiné après, sa capsule sombre faisait un plastron noir.
  form(ctx, capsule(hx * .5, shY + S * .03, hx, hy + hr * .70, S * .052, S * .046), dark, W.limb, { hi: false });
  if (!spirit) leg(-hw * .62, 1, true);
  arm(-sw * .96, shY + S * .010, restBack - swing * .30, true, false);
  if (visual.limbs === 'arms' && (visual.limb_count || 2) >= 4) arm(-sw * .86, shY + S * .11, restBack + .22, true, false);
  if (visual.back === 'spikes') spikes(A, 0, (shY + hipY) / 2, sw, (hipY - shY) / 2, visual.spike_count || 5, -2.9, -1.5, S * .15);
  if (visual.back === 'crystals') spikes(A, 0, (shY + hipY) / 2, sw, (hipY - shY) / 2, 4, -2.9, -1.6, S * .20, '#A76BD9');
  if (visual.back === 'wings') for (const sgn of [0, 1]) form(ctx, (c) => { c.beginPath(); c.moveTo(-sw * .5, shY + S * .04); c.quadraticCurveTo(-sw * 1.5 - sgn * sw * .35, shY - S * .30 - Math.sin(t * 8) * S * .05, -sw * 2.1, shY + S * .16 + sgn * S * .16); c.quadraticCurveTo(-sw * 1.2, shY + S * .18, -sw * .5, shY + S * .04); c.closePath(); }, { ...skin, base: skin.mid }, W.struct);
  if (visual.back === 'shell' || arch.plaques) form(ctx, orb(-sw * .30, (shY + hipY) / 2, sw * .86, (hipY - shY) * .62), dark, W.hero);
  if (visual.tail === 'club') { const tw = Math.sin(t * 3) * S * .035; form(ctx, capsule(-hw * .8, hipY - S * .02, -hw * 1.9, hipY - S * .18 + tw, S * .05, S * .03), dark, W.hero, { hi: false }); form(ctx, orb(-hw * 1.9, hipY - S * .18 + tw, S * .085), { ...skin, base: skin.mid }, W.hero); }

  // --- TORSE : épaules larges, taille prise, bassin. Silhouette fermée, un seul contour.
  const body = (c) => {
    c.beginPath();
    c.moveTo(-sw, shY + S * .03);
    c.bezierCurveTo(-sw * .97, shY + S * .13, -hw * 1.14, hipY - S * .10, -hw * 1.02, hipY + S * .01);
    c.bezierCurveTo(-hw * .70, hipY + S * .075, hw * .70, hipY + S * .075, hw * 1.02, hipY + S * .01);
    c.bezierCurveTo(hw * 1.14, hipY - S * .10, sw * .97, shY + S * .13, sw, shY + S * .03);
    c.bezierCurveTo(sw * .92, shY - S * .085, -sw * .92, shY - S * .085, -sw, shY + S * .03);
    c.closePath();
  };
  form(ctx, body, skin, W.hero);
  ctx.save(); body(ctx); ctx.clip();
  if (kind === 'astral') inner(ctx, orb(0, (shY + hipY) / 2, sw * .58, (hipY - shY) * .42), '#4EA8E8');
  else livree(ctx, G, skin, { cx: 0, cy: (shY + hipY) / 2 + S * .01, rx: sw, ry: (hipY - shY) / 2, size: S });
  // pectoraux : deux aplats sans encre. C'est ce qui distingue un torse d'un sac.
  if (T.lod) { ctx.save(); ctx.globalAlpha = .40; for (const sg of [-1, 1]) inner(ctx, orb(sg * sw * .42, shY + S * .085, sw * .40, S * .062), shade(skin.base, sg > 0 ? .22 : -.10)); ctx.restore(); }
  if (arch.bosses) for (const sg of [-1, 1]) inner(ctx, orb(sg * sw * .55, shY + S * .02, sw * .34, S * .05), shade(skin.base, -.12));
  if (arch.plaques) { inner(ctx, (c) => { c.beginPath(); c.rect(-sw, hipY - S * .085, sw * 2, S * .055); }, shade(skin.base, -.16)); inner(ctx, (c) => { c.beginPath(); c.rect(-sw, hipY - S * .03, sw * 2, S * .022); }, shade(skin.base, .24)); }
  spotsClean(A, 0, (shY + hipY) / 2, sw, (hipY - shY) / 2);
  if (arch.lumen) drawLumen(A, 0, (shY + hipY) / 2, sw * 1.1);
  ctx.restore();
  glossIn(ctx, body, -sw * .50, shY + S * .045, sw * .22, S * .045);

  // --- avant-plan
  if (!spirit) leg(hw * .52, -1, false);
  else {
    // Pas de jambes : une traîne. Trois voiles décalés qui descendent au sol — sans elle,
    // les stades 9 et 10 flottaient comme un buste coupé.
    for (let i = 2; i >= 0; i--) {
      const ph2 = t * 1.6 + i * 2.1 + G.phase, amp = S * .05 * (1 + i * .3);
      const w2 = hw * (1.05 - i * .16), drop = S * (.30 + i * .045);
      ctx.save(); ctx.globalAlpha = i === 0 ? 1 : .42 - i * .10;
      form(ctx, (c) => {
        c.beginPath();
        c.moveTo(-w2, hipY - S * .04);
        c.quadraticCurveTo(-w2 * .9 + Math.sin(ph2) * amp, hipY + drop * .6, Math.sin(ph2 + 1) * amp * 1.4, hipY + drop);
        c.quadraticCurveTo(w2 * .9 + Math.sin(ph2) * amp, hipY + drop * .6, w2, hipY - S * .04);
        c.closePath();
      }, { ...skin, base: i === 0 ? skin.mid : skin.base, hi: skin.hi, mid: skin.dark }, W.limb, { stroke: i === 0, hi: false });
      ctx.restore();
    }
  }

  // --- tête
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(G.tilt); ctx.translate(-hx, -hy);
  drawHead(A, hx, hy, hr);
  if (kind === 'god') { ctx.beginPath(); ctx.ellipse(hx, hy - hr * 1.45, hr * .66, hr * .19, 0, 0, 6.28); ctx.lineWidth = W.struct; ctx.strokeStyle = '#FFC24B'; ctx.stroke(); }
  drawEyes(A, hx + hr * .10, hy - hr * .02, hr * .40);
  drawMouth(A, hx + hr * .16, hy + hr * .52, hr * .34);
  ctx.restore();
  // Un tank tient son bouclier DEVANT, pas dans le dos : arme toujours au bras avant.
  arm(sw * .96, shY + S * .010, restFront + swing, false, true);
  if (visual.limbs === 'arms' && (visual.limb_count || 2) >= 4) arm(sw * .86, shY + S * .13, restFront - .28 + swing * .4, false, false);
}

// Piquants : formes fermées, une seule épaisseur.
function spikes(A, cx, cy, rx, ry, count, fromA, toA, len0, col) {
  const { ctx, T, W, G } = A;
  const tone = col ? { ...T, base: col, hi: shade(col, .25), mid: shade(col, -.25) } : { ...T, base: T.dark, hi: T.mid, mid: shade(T.dark, -.2) };
  for (let i = 0; i < count; i++) {
    // Une rangee de piquants tous identiques se lit comme un peigne. On jittere longueur ET angle.
    const j = G ? wob(G, i) : 0;
    const len = len0 * (1 + j * (G ? G.jitter : 0));
    const a = fromA + (toA - fromA) * (i / (count - 1 || 1)) + j * .07;
    const bx = cx + Math.cos(a) * rx * .94, by = cy + Math.sin(a) * ry * .94;
    form(ctx, (c) => { c.beginPath(); c.moveTo(bx + Math.cos(a + 1.35) * len * .26, by + Math.sin(a + 1.35) * len * .26); c.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len); c.lineTo(bx + Math.cos(a - 1.35) * len * .26, by + Math.sin(a - 1.35) * len * .26); c.closePath(); }, tone, W.struct);
  }
}

// Ancrage de l'arme pour les morphologies sans bras.
function gearAt(A, x, y, scale, base = 0) {
  const { ctx, size, role, atk, tier, pose, t, W } = A;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(base + armSwing(pose === 'attack' ? atk : null, t, role) * .8);
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
