import { drawPaintedUnit, whenPaintedReady } from './painted.js';
import { drawAnatomy, hasPaintedAnatomy, whenAnatomyReady } from './anatomy.js';
// Reliques vivantes. Un corps principal, une carapace, un foyer de détail.
// Les dix stades héritent du noyau fendu. Grille normalisée, aplats, aucun flou.
import { INK, shade, hueShift, groundShade } from './style.js';
import { genesFor, tintOf } from './genes.js';
import { swingPhase } from './gear.js';
import { plate, line, oval, nucleus, path, material } from './relic.js';
export { shade, hueShift };
export const ARCH = {
  eclaireur: { w: .85, h: 1, role: 'melee' },
  brute: { w: 1.18, h: 1.05, role: 'melee' },
  tireur: { w: .88, h: .96, role: 'ranged' },
  tank: { w: 1.22, h: .92, role: 'tank' },
  soigneur: { w: .92, h: 1.03, role: 'support' },
  boss: { w: 1.28, h: 1.15, role: 'melee' },
  enemy: { w: 1, h: 1, role: 'melee' }
};

function ornament(c, v, G, M, detail) {
  // Un motif de livrée au maximum, clippé dans la silhouette par l'appelant.
  if (G.pattern === 'bandes' || G.pattern === 'dorsale') {
    plate(c, 'M-38-78 L-20-80 -3-12 -17-10Z', M.dark, 0);
  } else if (G.pattern !== 'uni' && detail) {
    for (let i = 0; i < 3; i++) oval(c, -21 + i * 8, -55 + i * 9, 2.5, 4, M.dark);
  }
  if (v.skin === 'scales' && detail) line(c, 'M-20-58 l5 4 5-4 M-17-46 l5 4 5-4', M.dark, 1.5);
  if (v.skin === 'fur') plate(c, 'M-30-54 l8 5 -4 5 8 4 -4 6 8 3 -9 4Z', M.dark, 0);
  if (v.spots && detail) for (let i = 0; i < Math.min(6, v.spot_count || 4); i++) {
    oval(c, -20 + (i % 2) * 9, -62 + i * 7, 2.3, 2.8, v.spots === 'gold' ? '#FFC24B' : v.spots === 'green' ? '#8CBDA5' : M.dark);
  }
  if (G.marque && detail) plate(c, 'M17-64 l8 5 -4 13 -5-2Z', M.light, 0);
}

function appendages(c, v, M, stage, t, arch) {
  if (v.tail || v.traine) {
    c.save(); c.translate(-23, -30); c.rotate(Math.sin(t * 2) * .12);
    plate(c, 'M4-7 C-17-12-29 8-47-5 Q-34 17-14 6 L4 4Z', M.dark, 1.8);
    if (v.tail === 'club') plate(c, 'M-46-12 l9 3 3 10 -9 5 -9-8Z', M.bone, 2);
    c.restore();
  }
  if (v.back === 'wings') for (const side of [-1, 1]) {
    c.save(); c.scale(side, 1); c.rotate(Math.sin(t * 3) * .035);
    plate(c, 'M-8-49 Q-30-92-48-90 L-41-53 -28-58 -22-34Z', M.dark, 2);
    plate(c, 'M-19-53 L-43-81 -33-59Z', M.light, 0); c.restore();
  }
  if (v.back === 'spikes' || v.back === 'crystals' || arch === 'brute' || arch === 'boss') {
    const n = Math.min(7, v.spike_count || 3);
    for (let i = 0; i < n; i++) {
      c.save(); c.translate(-24 + i * 48 / Math.max(1, n - 1), stage <= 2 ? -68 : -65);
      plate(c, 'M-6 7 L-3-11 5-20 7 9Z', v.back === 'crystals' ? '#A76BD9' : M.bone, 2); c.restore();
    }
  }
  if (stage <= 2 && (v.limbs === 'cilia' || v.limbs === 'blobs')) {
    const n = Math.min(10, v.limb_count || 6);
    for (let i = 0; i < n; i++) {
      c.save(); c.translate(0, -43); c.rotate(i / n * Math.PI * 2 + Math.sin(t * 2 + i) * .03);
      plate(c, v.limbs === 'blobs' ? 'M-4-25 Q-14-48 0-49 Q13-47 5-25Z' : 'M-3-27 Q-8-40-4-48 Q-3-38 3-28Z', M.dark, 1.5); c.restore();
    }
  }
}

function face(c, v, G, M, x, y, r, t) {
  const n = Math.min(3, v.eyes || 1);
  const er = r * Math.min(1.5, v.eye_size || 1) * (1 + (G.nuit || 0) * .2);
  const blink = ((t + G.phase) % 5.7) > 5.57;
  for (let i = 0; i < n; i++) {
    const ex = x + (n === 1 ? 0 : (i - (n - 1) / 2) * er * 1.7);
    const ey = y - (n === 3 && i === 1 ? er * 1.4 : 0);
    if (G.sansYeux || blink) line(c, `M${ex - er * .55} ${ey} h${er * 1.1}`, INK, 2);
    else nucleus(c, ex, ey, er * (n === 1 ? 1 : .65), v.third_eye && i === 1 ? '#A76BD9' : '#D8CFB8');
  }
  if (v.mouth === 'fangs' || v.mouth === 'gueule') {
    plate(c, `M${x - r} ${y + r * 1.5} q${r} ${r * 1.2} ${r * 2} 0Z`, INK, 0);
    for (const dx of [-.5, .5]) plate(c, `M${x + dx * r - 1.8} ${y + r * 1.5} l1.8 4 1.8-4Z`, M.bone, 0);
  }
}

function weapon(c, role, stage, M, arch, strike) {
  c.save(); c.translate(27, -35); c.rotate(strike * -.48);
  const metal = stage < 4 ? M.bone : stage < 8 ? '#C9C5B8' : M.light;
  if (role === 'tank') {
    plate(c, 'M-10-21 L6-27 21-19 18 9 6 19 -9 9Z', M.dark, 2.4);
    plate(c, 'M-6-18 L5-22 5 12 -5 6Z', metal, 0);
    line(c, 'M10-16 v17', M.light, 2);
  } else if (role === 'support') {
    plate(c, 'M-2 15 L-2-30 2-30 3 15Z', M.boneShade, 1.6);
    plate(c, 'M-9-33 L-6-44 -2-38 2-38 6-44 10-33 2-25 -2-25Z', metal, 2);
    oval(c, 0, -33, 3.5, 4, M.light);
  } else if (role === 'ranged') {
    plate(c, stage < 4 ? 'M-5 6 Q14-8 5-28 L17-18 19-7 3 10Z' : 'M-9-9 L-5-18 8-18 12-24 28-24 32-17 8-7 1 7 -6 5Z', metal, 2);
    if (stage >= 4) plate(c, 'M11-20 h16 v3 H11Z', M.dark, 0);
  } else if (arch === 'brute' || arch === 'boss') {
    plate(c, 'M-2 14 L-2-32 3-32 4 14Z', M.boneShade, 1.6);
    plate(c, 'M-10-33 L4-41 19-34 15-18 2-23 -10-21Z', metal, 2.2);
    plate(c, 'M4-37 L15-32 12-23 4-26Z', M.light, 0);
  } else {
    plate(c, 'M-2 12 L-2-34 1-47 5-33 3 12Z', metal, 2);
    plate(c, 'M1-44 L1-13 4-33Z', M.light, 0);
  }
  c.restore();
}

export function drawCreature(ctx, visual = {}, opts = {}) {
  if(opts.anatomy && drawAnatomy(ctx,visual,opts))return;
  if (opts.painted && drawPaintedUnit(ctx, visual, opts)) return;
  const { x = 0, y = 0, size = 80, tint = '#3FB8C9', facing = 1, pose = 'idle', archetype = 'eclaireur', flash = 0, dying = 0 } = opts;
  const arch = ARCH[archetype] || ARCH.eclaireur;
  const v = visual, G = genesFor(v, archetype);
  const stage = v.stage || ({ cell: 1, cluster: 2, beast: 3, biped: 4, astral: 7, spirit: 9, god: 10 }[v.bodyplan] || 1);
  const t = (opts.t || 0) + G.phase;
  const M = material(tintOf(hueShift(tint, v.tint_shift || 0), G));
  const phase = swingPhase(pose === 'attack' ? opts.atk : null, t);
  const stride = pose === 'walk' ? Math.sin(t * 8) : 0;
  const role = opts.role || arch.role;
  const c = ctx;
  c.save(); c.translate(x, y); groundShade(c, 0, 0, size * .34 * arch.w);
  c.scale(size / 100 * facing, size / 100);
  c.translate(phase.strike * 7, -Math.abs(stride) * 2 - Math.sin(t * 1.8) * 1.2);
  c.rotate(dying * .45); c.scale(arch.w * (1 + dying * .2), arch.h * (1 - dying * .45) * (1 + ((v.limb_len || 1) - 1) * .3));
  c.globalAlpha *= (v.translucide || G.translucide || 1) * (1 - dying * .65);
  if (flash) c.filter = `brightness(${1 + flash})`;
  // Anneaux de stade : ouverts et espacés pour laisser respirer la silhouette.
  if (stage >= 7 || v.aura) {
    const col = v.aura_color || M.light;
    c.save(); c.globalAlpha *= .65;
    if (stage >= 9 || v.aura === 'halo') line(c, 'M-27-81 A31 17 0 1 1 28-80', col, 2.4);
    else line(c, 'M-43-42 C-66-64 51-81 45-48 M-43-36 C-30-18 56-33 44-48', col, 1.5);
    if (stage === 8 || v.aura === 'stars') for (const side of [-1, 1]) plate(c, `M${side * 42}-72 l3 5 -3 5 -3-5Z`, col, 0);
    c.restore();
  }
  appendages(c, v, M, stage, t, archetype);
  let body;
  if (stage <= 2) {
    if (stage === 2) {
      plate(c, 'M-9-75 Q-42-86-40-53 L-31-29 Q-18-21-10-37Z', M.dark, 2.4);
      plate(c, 'M9-72 Q38-84 39-54 L31-29 Q17-19 10-37Z', M.dark, 2.4);
    }
    body = stage === 1 ? 'M-29-54 Q-31-75-10-79 Q14-85 28-67 Q39-51 28-22 Q21-10 3-9 Q-26-10-30-31Z' : 'M0-78 Q29-69 27-44 L18-17 Q0-3-20-18 L-27-45 Q-28-68 0-78Z';
    plate(c, body, M.base, 2.6 * (v.outline || 1));
    c.save(); c.clip(path(body));
    plate(c, 'M-35-70 Q-18-85 11-77 L-5-62 -20-28 -35-31Z', M.light, 0);
    plate(c, 'M27-73 Q17-40 27-15 L40-11 44-67Z', M.dark, 0);
    ornament(c, v, G, M, size >= 50); c.restore();
    // Une carène et un masque, aucun sourire humain.
    plate(c, 'M-13-63 Q0-72 15-61 L19-42 7-27 -8-30 -19-44Z', M.dark, 0);
    face(c, v, G, M, 0, -49, 8, t);
    if (archetype === 'tank' || v.back === 'shell' || v.skin === 'thick') {
      plate(c, 'M-30-31 L-33-58 -22-74 -10-78 -16-55 -10-20Z', M.bone, 2);
    }
    if (archetype === 'soigneur') line(c, 'M-15-76 Q0-90 15-76', M.bone, 3);
  } else if (stage === 3) {
    const leg = (lx, back, offset) => {
      c.save(); c.translate(lx + stride * offset, 0);
      c.scale(1, v.limb_len || 1);
      plate(c, 'M-8-32 L8-32 6-10 12-4 10 0 -8 0 -12-9Z', back ? M.dark : M.base, 2.2); c.restore();
    };
    leg(-19, true, 3); leg(20, true, -3);
    body = 'M-37-45 Q-27-62 8-62 L28-75 44-66 48-47 36-33 16-29 -25-27 -39-34Z';
    plate(c, body, M.base, 2.6 * (v.outline || 1));
    c.save(); c.clip(path(body));
    plate(c, 'M-39-48 Q-17-67 20-57 L4-46 -33-40Z', M.light, 0);
    ornament(c, v, G, M, size >= 50); c.restore();
    leg(-23, false, -3); leg(18, false, 3);
    plate(c, 'M19-68 L32-73 44-64 39-46 26-42 17-53Z', v.back === 'shell' ? M.bone : M.dark, 1.8);
    face(c, v, G, M, 32, -57, 5.5, t);
  } else {
    const floating = stage >= 7 || v.traine || G.traine;
    if (!floating) for (const side of [-1, 1]) {
      c.save(); c.translate(side * 11 + stride * side * 3, -3); c.scale(1, v.limb_len || 1);
      plate(c, 'M-8-33 L8-33 7-9 13-3 11 2 -9 2 -11-6Z', side < 0 ? M.dark : M.base, 2.2); c.restore();
    }
    else plate(c, stage >= 9 ? 'M-20-36 Q-26-10-10-5 L0 8 5-8 21-15 17-37Z' : 'M-18-35 L-12-14 -4-20 0-6 7-21 15-14 20-35Z', M.dark, 2);
    body = stage === 5 ? 'M-20-66 L-28-54 -25-32 -34-16 0-21 30-16 23-37 27-55 16-66Z' : stage === 6 ? 'M-17-68 L-32-56 -25-32 -17-23 18-23 29-39 29-59 15-68Z' : stage >= 9 ? 'M0-78 L22-58 13-39 25-22 0-13 -25-22 -13-39 -22-58Z' : 'M-17-67 L-27-56 -20-36 -17-24 18-24 23-41 27-58 14-67Z';
    plate(c, body, M.base, 2.6 * (v.outline || 1));
    c.save(); c.clip(path(body));
    plate(c, 'M-28-65 L-1-66 -7-29 -21-18 -37-21Z', M.light, 0);
    ornament(c, v, G, M, size >= 50); c.restore();
    if (stage >= 5) plate(c, 'M-24-61 L-5-64 -7-44 -18-37 -28-49Z', M.bone, 1.8);
    if (stage === 6 || stage === 8) plate(c, 'M18-65 L33-68 38-50 26-43Z', M.bone, 2);
    if (stage === 7) plate(c, 'M-19-65 L-32-85 -33-42 -23-28Z', M.bone, 2);
    if (stage === 8) for (const side of [-1, 1]) { c.save(); c.scale(side, 1); plate(c, 'M34-64 L40-77 48-56 41-37Z', M.bone, 2); c.restore(); }
    if (stage === 10) for (const side of [-1, 1]) { c.save(); c.scale(side, 1); plate(c, 'M25-68 L39-78 33-42 22-33Z', M.bone, 2); c.restore(); }
    // Bras continus, une seule jointure à l'épaule.
    plate(c, 'M-23-57 Q-35-50-31-30 L-25-23 -20-27 -21-43 -16-53Z', M.dark, 2);
    c.save(); c.translate(phase.strike * 4, -phase.wind * 3);
    plate(c, 'M19-56 Q32-53 32-38 L29-27 21-26 20-34 22-42 15-50Z', M.base, 2);
    if (v.hands) oval(c, 26, -27, 5, 5, M.bone, 1.5);
    c.restore();
    if (v.limbs === 'arms' && v.limb_count >= 4) for (const side of [-1, 1]) { c.save(); c.scale(side, 1); plate(c, 'M18-39 Q39-33 33-17 L25-14 22-20 26-26 16-29Z', M.dark, 1.8); c.restore(); }
    c.save(); c.rotate(G.tilt);
    plate(c, archetype === 'tireur' ? 'M-17-64 L-21-78 0-94 18-82 18-65 4-57Z' : 'M-16-67 L-17-83 -6-90 13-86 20-73 13-60 -4-58Z', M.dark, 2.4);
    plate(c, 'M-14-81 L-4-87 11-83 4-76 -13-70Z', M.bone, 0);
    face(c, v, G, M, 3, -73, 5.8, t);
    c.restore();
    if (archetype === 'soigneur') line(c, 'M-21-81 Q-25-99 0-101 Q25-98 21-81', M.bone, 2.8);
    if (archetype === 'brute' || archetype === 'boss') plate(c, 'M-11-86 L-10-97 0-91 9-97 14-84Z', M.bone, 2);
  }
  if (v.horns) for (const side of [-1, 1]) { c.save(); c.scale(side, 1); plate(c, 'M15-71 L19-94 27-83 24-69Z', M.bone, 2); c.restore(); }
  if (v.back === 'shell' && stage >= 3) plate(c, 'M-26-64 Q-42-47-26-28 L-18-32 -20-58Z', M.bone, 2.2);
  if (!G.sansArme) {
    c.save();
    if (stage <= 2) { c.translate(7, -5); c.scale(.8, .8); }
    if (stage === 3) { c.translate(17, 0); c.scale(.64, .64); }
    weapon(c, role, stage, M, archetype, phase.strike); c.restore();
  }
  c.restore();
}

export function renderToCanvas(canvas, visual, opts = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 100, height = canvas.clientHeight || 100;
  canvas.width = w * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, height);
  const arch = ARCH[opts.archetype] || ARCH.eclaireur;
  const length = 1 + ((visual.limb_len || 1) - 1) * .3;
  const painted = opts.painted !== false;
  const size = opts.anatomy && hasPaintedAnatomy(visual) ? Math.min(w,height)*.63 : painted ? Math.min(height*.8,w/1.5) : Math.min(Math.min(w, height) * (opts.scale || .78), w / (1.8 * arch.w), height * .74 / (arch.h * length));
  const draw = () => { ctx.clearRect(0, 0, w, height); drawCreature(ctx, visual, { x: w / 2, y: height * .88, painted, ...opts, size }); };
  draw();
  if(opts.anatomy&&hasPaintedAnatomy(visual))whenAnatomyReady(visual).then(ready=>{if(ready&&canvas.isConnected)draw();});
  else if (painted) whenPaintedReady('units', visual.stage || 1).then(ready => { if (ready && canvas.isConnected) draw(); });
}
