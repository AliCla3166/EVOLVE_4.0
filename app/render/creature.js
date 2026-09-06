// Rendu procedural de la race — style "sticker" : contour encre epais, aplats francs, un highlight, gros yeux.
// drawCreature(ctx, visual, opts) ; visual vient de genome.speciesVisual() (ou d'une faction ennemie : {seed, bodyplan, ...}).
import { makeRng } from '../core/rng.js';

const INK = '#171B23';
function shade(hex, amt) { // amt -1..1
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return '#' + ((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0');
}
function hueShift(hex, deg) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) { const d = max - min; s = l > .5 ? d / (2 - max - min) : d / (max + min); h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  h = (h + deg / 360 + 1) % 1;
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const hue = (t) => { t = (t + 1) % 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < .5) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  const R = Math.round(hue(h + 1 / 3) * 255), G = Math.round(hue(h) * 255), B = Math.round(hue(h - 1 / 3) * 255);
  return '#' + ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
}
export { shade, hueShift };

function blob(ctx, x, y, rx, ry, wob, t, seed) {
  // ellipse ondulante (membrane)
  ctx.beginPath();
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const w = 1 + wob * Math.sin(a * 3 + t * 2 + seed) * .5 + wob * Math.sin(a * 5 - t * 1.3 + seed * 2) * .3;
    const px = x + Math.cos(a) * rx * w, py = y + Math.sin(a) * ry * w;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
function strokeFill(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }
function eye(ctx, x, y, r, look = 0, blink = 1, pupilColor = INK) {
  ctx.beginPath(); ctx.ellipse(x, y, r, r * blink, 0, 0, Math.PI * 2); strokeFill(ctx, '#FFFFFF', r * .28);
  if (blink > .3) {
    ctx.beginPath(); ctx.arc(x + look * r * .3, y + r * .05, r * .5, 0, Math.PI * 2); ctx.fillStyle = pupilColor; ctx.fill();
    ctx.beginPath(); ctx.arc(x + look * r * .3 - r * .18, y - r * .18, r * .17, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  }
}
function highlight(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill(); }

// ------------------------------------------------------------
export function drawCreature(ctx, visual, opts = {}) {
  const { x = 0, y = 0, size = 80, t = 0, tint = '#3FB8C9', shadeColor = null, facing = 1, pose = 'idle', archetype = 'eclaireur', hpPct = 1, flash = 0 } = opts;
  const rng = makeRng((visual.seed || 1) + ':' + archetype);
  const S = size / 100;
  const base = visual.tint_shift ? hueShift(tint, visual.tint_shift) : tint;
  const dark = shadeColor || shade(base, -0.35);
  const lw = 6 * S * (visual.outline || 1);
  const bp = visual.bodyplan || 'cell';
  const arch = ARCH[archetype] || ARCH.eclaireur;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  // animation
  const bob = pose === 'walk' ? Math.abs(Math.sin(t * 9)) * 6 * S : Math.sin(t * 2.2) * 2 * S;
  const squash = pose === 'walk' ? 1 + Math.sin(t * 9) * .06 : 1 + Math.sin(t * 2.2) * .025;
  const lunge = pose === 'attack' ? Math.max(0, Math.sin(t * 14)) * 10 * S : 0;
  ctx.translate(lunge, -bob);
  ctx.scale(1 / squash, squash);
  if (flash) { ctx.filter = `brightness(${1 + flash * 1.5})`; }
  // ombre au sol
  ctx.save(); ctx.scale(squash, 1 / squash); ctx.translate(-lunge, bob);
  ctx.beginPath(); ctx.ellipse(0, size * .02, size * .42 * arch.w, size * .1, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
  ctx.restore();

  const A = { ctx, rng, S, size, t, base, dark, lw, visual, arch, pose, _role: opts.role || 'melee' };
  if (visual.aura) drawAura(A, -size * .45);
  switch (bp) {
    case 'cell': drawCell(A); break;
    case 'cluster': drawCluster(A); break;
    case 'beast': drawBeast(A); break;
    case 'astral': case 'spirit': case 'god': drawBiped(A, bp); break;
    default: drawBiped(A, 'biped');
  }
  ctx.restore();
}

const ARCH = { // proportions par archetype
  eclaireur: { w: .8, h: .85, head: 1.0 }, brute: { w: 1.25, h: 1.05, head: .95 }, tireur: { w: .85, h: .9, head: 1.05 }, tank: { w: 1.4, h: .95, head: .8 }, soigneur: { w: .9, h: .95, head: 1.15 }, boss: { w: 1.5, h: 1.3, head: 1.1 }, enemy: { w: 1, h: 1, head: 1 }
};

function drawAura(A, cy) {
  const { ctx, size, t, visual } = A; const c = visual.aura_color || '#45D95E';
  ctx.save(); ctx.globalAlpha = .5 + Math.sin(t * 3) * .15;
  if (visual.aura === 'halo') { ctx.beginPath(); ctx.ellipse(0, cy - size * .55, size * .34, size * .1, 0, 0, Math.PI * 2); ctx.lineWidth = size * .06; ctx.strokeStyle = c; ctx.stroke(); ctx.lineWidth = size * .02; ctx.strokeStyle = INK; ctx.stroke(); }
  else if (visual.aura === 'rings') { for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(0, cy + size * .1, size * (.55 + i * .15 + Math.sin(t * 2 + i) * .03), size * (.2 + i * .06), 0, 0, Math.PI * 2); ctx.lineWidth = size * .03; ctx.strokeStyle = c; ctx.stroke(); } }
  else if (visual.aura === 'stars') { const r = makeRng(visual.seed + 7); for (let i = 0; i < 9; i++) { const a = r() * 6.28 + t * .6, d = size * (.5 + r() * .3); ctx.beginPath(); ctx.arc(Math.cos(a) * d, cy + Math.sin(a) * d * .6, size * .025, 0, 6.28); ctx.fillStyle = c; ctx.fill(); } }
  else { const g = ctx.createRadialGradient(0, cy, size * .1, 0, cy, size * .7); g.addColorStop(0, c + 'AA'); g.addColorStop(1, c + '00'); ctx.beginPath(); ctx.arc(0, cy, size * .7, 0, 6.28); ctx.fillStyle = g; ctx.fill(); }
  ctx.restore();
}

function drawSpots(A, cx, cy, rx, ry) {
  const { ctx, rng, visual, S } = A; if (!visual.spots) return;
  const col = visual.spots === 'gold' ? '#FFC24B' : visual.spots === 'green' ? '#45D95E' : A.dark;
  for (let i = 0; i < (visual.spot_count || 4); i++) { const a = rng() * 6.28, d = rng() * .6; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (3 + rng() * 4) * S, 0, 6.28); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2 * S; ctx.strokeStyle = INK; ctx.stroke(); }
}
function drawSpikes(A, cx, cy, rx, ry, count, fromA, toA, len) {
  const { ctx, base, dark, lw } = A;
  for (let i = 0; i < count; i++) { const a = fromA + (toA - fromA) * (i / (count - 1 || 1)); const bx = cx + Math.cos(a) * rx * .95, by = cy + Math.sin(a) * ry * .95; ctx.beginPath(); ctx.moveTo(bx + Math.cos(a + 1.3) * len * .25, by + Math.sin(a + 1.3) * len * .25); ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len); ctx.lineTo(bx + Math.cos(a - 1.3) * len * .25, by + Math.sin(a - 1.3) * len * .25); ctx.closePath(); strokeFill(ctx, A.visual.back === 'crystals' ? '#A76BD9' : dark, lw * .7); }
}
function drawMouth(A, cx, cy, w) {
  const { ctx, visual, lw, pose } = A;
  const open = pose === 'attack' ? .6 : .2;
  if (visual.mouth === 'fangs') { ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.quadraticCurveTo(cx, cy + w * (1 + open), cx + w, cy); ctx.closePath(); strokeFill(ctx, '#3A1A22', lw * .6); for (const s of [-.5, .5]) { ctx.beginPath(); ctx.moveTo(cx + w * s - w * .15, cy); ctx.lineTo(cx + w * s, cy + w * .5); ctx.lineTo(cx + w * s + w * .15, cy); ctx.fillStyle = '#fff'; ctx.fill(); } }
  else { ctx.beginPath(); ctx.moveTo(cx - w * .8, cy); ctx.quadraticCurveTo(cx, cy + w * (.6 + open), cx + w * .8, cy); ctx.lineWidth = lw * .7; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); }
}
function drawEyes(A, cx, cy, r) {
  const { ctx, visual, t } = A;
  const n = visual.eyes || 1, es = r * (visual.eye_size || 1);
  const blink = (((t * 0.9 + (visual.seed || 0) % 3) % 4.5) > 4.35) ? .15 : 1; const look = Math.sin(t * .7) * .6;
  if (n === 1) eye(ctx, cx, cy, es, look, blink);
  else if (n === 2) { eye(ctx, cx - es * .9, cy, es * .8, look, blink); eye(ctx, cx + es * .9, cy, es * .8, look, blink); }
  else { eye(ctx, cx - es * .9, cy + es * .2, es * .65, look, blink); eye(ctx, cx + es * .9, cy + es * .2, es * .65, look, blink); eye(ctx, cx, cy - es * .8, es * (visual.third_eye ? .6 : .45), look, blink, visual.third_eye ? '#A76BD9' : INK); }
}

// ---- Stade 1 : cellule ----
function drawCell(A) {
  const { ctx, rng, S, size, t, base, dark, lw, visual } = A;
  const rx = size * .42 * A.arch.w, ry = size * .38 * A.arch.h, cy = -size * .42;
  if (visual.tail === 'flagellum') { ctx.beginPath(); ctx.moveTo(-rx * .9, cy); for (let i = 1; i <= 8; i++) { const p = i / 8; ctx.lineTo(-rx * .9 - p * size * .5, cy + Math.sin(p * 6 - t * 8) * size * .08); } ctx.lineWidth = lw * 1.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * .6; ctx.strokeStyle = base; ctx.stroke(); }
  if (visual.limbs === 'cilia') { for (let i = 0; i < (visual.limb_count || 8); i++) { const a = (i / (visual.limb_count || 8)) * 6.28; const bx = Math.cos(a) * rx, by = cy + Math.sin(a) * ry; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + Math.sin(t * 6 + i) * .5) * size * .12, by + Math.sin(a + Math.sin(t * 6 + i) * .5) * size * .12); ctx.lineWidth = lw * .8; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); } }
  if (visual.limbs === 'blobs') { for (let i = 0; i < (visual.limb_count || 4); i++) { const a = -.4 + i * .5 + Math.sin(t * 2 + i) * .15; blob(ctx, Math.cos(a) * rx * 1.05, cy + Math.sin(a) * ry * 1.05, size * .12, size * .1, .2, t, i); strokeFill(ctx, base, lw); } }
  if (visual.back === 'spikes') drawSpikes(A, 0, cy, rx, ry, visual.spike_count || 6, -2.6, -0.5, size * .16);
  blob(ctx, 0, cy, rx, ry, .08, t, rng() * 10); strokeFill(ctx, base, lw);
  // membrane interne
  blob(ctx, 0, cy, rx * .78, ry * .78, .1, t + 1, 3); ctx.fillStyle = shade(base, .12); ctx.fill();
  drawSpots(A, 0, cy, rx, ry);
  highlight(ctx, -rx * .35, cy - ry * .45, rx * .22, ry * .12);
  // organites
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(rng.range(-.5, .5) * rx, cy + rng.range(-.2, .55) * ry, size * .05, 0, 6.28); ctx.fillStyle = dark; ctx.fill(); }
  drawEyes(A, 0, cy - ry * .1, size * .13);
  drawMouth(A, 0, cy + ry * .38, size * .12);
}
// ---- Stade 2 : colonie ----
function drawCluster(A) {
  const { ctx, rng, size, t, base, dark, lw, visual } = A;
  const cy = -size * .42;
  const cells = [[0, 0, 1], [-.32, .18, .6], [.34, .14, .62], [-.14, -.34, .55], [.2, -.33, .5]];
  if (visual.back === 'spikes') drawSpikes(A, 0, cy, size * .5, size * .45, visual.spike_count || 6, -2.7, -0.4, size * .15);
  for (const [dx, dy, s] of cells.slice(1)) { blob(ctx, dx * size, cy + dy * size, size * .2 * s * 1.3, size * .18 * s * 1.3, .1, t, dx * 10); strokeFill(ctx, shade(base, -0.12), lw); }
  blob(ctx, 0, cy, size * .3, size * .27, .08, t, 1); strokeFill(ctx, base, lw);
  drawSpots(A, 0, cy, size * .3, size * .27);
  highlight(ctx, -size * .1, cy - size * .12, size * .08, size * .04);
  for (const [dx, dy, s] of cells.slice(1)) { ctx.beginPath(); ctx.arc(dx * size, cy + dy * size, size * .04, 0, 6.28); ctx.fillStyle = dark; ctx.fill(); }
  drawEyes(A, 0, cy - size * .03, size * .12);
  drawMouth(A, 0, cy + size * .1, size * .1);
}
// ---- Stade 3 : bete a quatre pattes ----
function drawBeast(A) {
  const { ctx, rng, S, size, t, base, dark, lw, visual, pose } = A;
  const bw = size * .5 * A.arch.w, bh = size * .3 * A.arch.h, by = -size * .38;
  const legLen = size * .22 * (visual.limb_len || 1);
  const step = pose === 'walk' ? Math.sin(t * 9) * .5 : 0;
  // queue
  if (visual.tail === 'club') { ctx.beginPath(); ctx.moveTo(-bw * .8, by); ctx.quadraticCurveTo(-bw * 1.3, by - size * .1, -bw * 1.4, by - size * .25 + Math.sin(t * 3) * 3); ctx.lineWidth = lw * 2; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * .9; ctx.strokeStyle = base; ctx.stroke(); ctx.beginPath(); ctx.arc(-bw * 1.4, by - size * .25 + Math.sin(t * 3) * 3, size * .09, 0, 6.28); strokeFill(ctx, dark, lw * .8); }
  else { ctx.beginPath(); ctx.moveTo(-bw * .85, by); ctx.quadraticCurveTo(-bw * 1.2, by - size * .05, -bw * 1.25, by - size * .2 + Math.sin(t * 3) * 4); ctx.lineWidth = lw * 1.8; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * .7; ctx.strokeStyle = base; ctx.stroke(); }
  // pattes arriere (derriere)
  const legs = [[-bw * .55, 1], [bw * .45, -1], [-bw * .4, -1], [bw * .6, 1]];
  const drawLeg = (lx, ph, back) => { const sw = step * ph * size * .12; ctx.beginPath(); ctx.moveTo(lx, by + bh * .5); ctx.lineTo(lx + sw, by + bh * .5 + legLen); ctx.lineWidth = lw * 2.2; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * 1.1; ctx.strokeStyle = back ? dark : base; ctx.stroke(); ctx.beginPath(); ctx.ellipse(lx + sw, by + bh * .5 + legLen, size * .07, size * .045, 0, 0, 6.28); strokeFill(ctx, back ? dark : base, lw * .7); };
  drawLeg(legs[0][0], legs[0][1], true); drawLeg(legs[1][0], legs[1][1], true);
  // dos
  if (visual.back === 'spikes') drawSpikes(A, 0, by, bw, bh, visual.spike_count || 6, -2.7, -0.4, size * .15);
  if (visual.back === 'crystals') drawSpikes(A, 0, by, bw, bh, 5, -2.6, -0.5, size * .2);
  if (visual.back === 'shell') { ctx.beginPath(); ctx.ellipse(-bw * .1, by - bh * .15, bw * .85, bh * 1.05, 0, Math.PI, 0); ctx.closePath(); strokeFill(ctx, dark, lw); }
  if (visual.back === 'wings') { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-bw * .1, by - bh * .5); ctx.quadraticCurveTo(-bw * .2 + s * bw * .2, by - size * .5 - Math.sin(t * 8) * size * .06, -bw * .9 + s * bw * .1, by - size * .35); ctx.quadraticCurveTo(-bw * .5, by - bh * .3, -bw * .1, by - bh * .5); strokeFill(ctx, shade(base, -0.2), lw); } }
  // corps
  ctx.beginPath(); ctx.ellipse(0, by, bw, bh, 0, 0, 6.28); strokeFill(ctx, base, lw);
  if (visual.skin === 'fur') { for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-bw * .6 + i * bw * .3, by - bh * .9); ctx.lineTo(-bw * .55 + i * bw * .3, by - bh * 1.15); ctx.lineWidth = lw * .5; ctx.strokeStyle = INK; ctx.stroke(); } }
  if (visual.skin === 'scales') { for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-bw * .5 + (i % 3) * bw * .45, by - bh * .2 + Math.floor(i / 3) * bh * .5, size * .05, 0, Math.PI); ctx.lineWidth = lw * .45; ctx.strokeStyle = INK; ctx.stroke(); } }
  drawSpots(A, 0, by, bw, bh);
  highlight(ctx, -bw * .3, by - bh * .5, bw * .25, bh * .18);
  // ventre
  ctx.beginPath(); ctx.ellipse(bw * .05, by + bh * .35, bw * .55, bh * .4, 0, 0, 6.28); ctx.fillStyle = shade(base, .18); ctx.fill();
  drawLeg(legs[2][0], legs[2][1], false); drawLeg(legs[3][0], legs[3][1], false);
  // tete
  const hr = size * .2 * A.arch.head, hx = bw * .85, hy = by - bh * .55 + (pose === 'walk' ? Math.sin(t * 9) * 2 : 0);
  if (visual.horns) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * hr * .5, hy - hr * .6); ctx.lineTo(hx + s * hr * .8, hy - hr * 1.4); ctx.lineTo(hx + s * hr * .2, hy - hr * .75); ctx.closePath(); strokeFill(ctx, '#F4F1E8', lw * .7); } }
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 6.28); strokeFill(ctx, base, lw);
  highlight(ctx, hx - hr * .35, hy - hr * .4, hr * .25, hr * .15);
  drawEyes(A, hx + hr * .15, hy - hr * .1, hr * .38);
  drawMouth(A, hx + hr * .25, hy + hr * .45, hr * .4);
}
// ---- Stades 4+ : bipede (WAW-like) — astral/spirit/god = variantes ----
function drawBiped(A, kind) {
  const { ctx, rng, S, size, t, base, dark, lw, visual, pose, arch } = A;
  const bw = size * .3 * arch.w, bh = size * .32 * arch.h, by = -size * .42;
  const legLen = size * .2 * (visual.limb_len || 1);
  const step = pose === 'walk' ? Math.sin(t * 9) : 0;
  const skinCol = kind === 'spirit' ? base + 'CC' : base;
  // jambes
  const leg = (lx, ph, back) => { const sw = step * ph * size * .1; ctx.beginPath(); ctx.moveTo(lx, by + bh * .6); ctx.lineTo(lx + sw, by + bh * .6 + legLen); ctx.lineWidth = lw * 2.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * 1.2; ctx.strokeStyle = back ? dark : base; ctx.stroke(); ctx.beginPath(); ctx.ellipse(lx + sw + size * .02, by + bh * .6 + legLen, size * .085, size * .05, 0, 0, 6.28); strokeFill(ctx, back ? dark : base, lw * .7); };
  if (kind !== 'spirit' && kind !== 'god') { leg(-bw * .4, 1, true); }
  // bras arriere
  const armLen = size * .22;
  const arm = (ax, ay, ang, back, weapon) => { ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(armLen, 0); ctx.lineWidth = lw * 2.2; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = back ? dark : base; ctx.stroke(); ctx.beginPath(); ctx.arc(armLen, 0, size * .06, 0, 6.28); strokeFill(ctx, visual.hands ? shade(base, .2) : (back ? dark : base), lw * .7); if (weapon) drawWeapon(A, armLen, 0); ctx.restore(); };
  const swing = pose === 'attack' ? -1.2 + Math.max(0, Math.sin(t * 14)) * 1.6 : pose === 'walk' ? step * .4 : Math.sin(t * 2) * .1;
  arm(-bw * .6, by - bh * .2, 2.4 - swing * .5, true, false);
  if (visual.limbs === 'arms' && (visual.limb_count || 2) >= 4) arm(-bw * .5, by + bh * .1, 2.6, true, false);
  // dos
  if (visual.back === 'spikes') drawSpikes(A, 0, by, bw, bh, visual.spike_count || 5, -2.8, -1.6, size * .14);
  if (visual.back === 'crystals') drawSpikes(A, 0, by, bw, bh, 4, -2.8, -1.7, size * .2);
  if (visual.back === 'wings') { for (const s of [0, 1]) { ctx.beginPath(); ctx.moveTo(-bw * .5, by - bh * .3); ctx.quadraticCurveTo(-bw * 1.2 - s * bw * .3, by - size * .5 - Math.sin(t * 8) * size * .05, -bw * 1.9, by - size * .2 + s * size * .15); ctx.quadraticCurveTo(-bw * 1.1, by - bh * .1, -bw * .5, by - bh * .3); strokeFill(ctx, shade(base, -0.2), lw); } }
  if (visual.back === 'shell') { ctx.beginPath(); ctx.ellipse(-bw * .25, by, bw * .9, bh * 1.05, 0, 0, 6.28); strokeFill(ctx, dark, lw); }
  if (visual.tail === 'club') { ctx.beginPath(); ctx.moveTo(-bw * .7, by + bh * .3); ctx.quadraticCurveTo(-bw * 1.5, by + bh * .3, -bw * 1.6, by - size * .05 + Math.sin(t * 3) * 3); ctx.lineWidth = lw * 2; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * .9; ctx.strokeStyle = base; ctx.stroke(); ctx.beginPath(); ctx.arc(-bw * 1.6, by - size * .05 + Math.sin(t * 3) * 3, size * .08, 0, 6.28); strokeFill(ctx, dark, lw * .8); }
  // corps "bean"
  ctx.beginPath(); ctx.moveTo(-bw, by - bh * .5); ctx.bezierCurveTo(-bw * 1.1, by + bh * 1.1, bw * 1.1, by + bh * 1.1, bw, by - bh * .5); ctx.bezierCurveTo(bw * .9, by - bh * 1.2, -bw * .9, by - bh * 1.2, -bw, by - bh * .5); ctx.closePath();
  strokeFill(ctx, kind === 'god' ? '#F0E4B8' : skinCol, lw);
  if (kind === 'astral') { ctx.beginPath(); ctx.ellipse(0, by + bh * .1, bw * .55, bh * .5, 0, 0, 6.28); strokeFill(ctx, '#4EA8E8', lw * .6); highlight(ctx, -bw * .2, by - bh * .1, bw * .18, bh * .12); }
  else { ctx.beginPath(); ctx.ellipse(bw * .1, by + bh * .3, bw * .55, bh * .45, 0, 0, 6.28); ctx.fillStyle = shade(base, .18); ctx.fill(); }
  if (visual.skin === 'scales') { for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-bw * .4 + (i % 2) * bw * .5, by - bh * .3 + Math.floor(i / 2) * bh * .5, size * .05, 0, Math.PI); ctx.lineWidth = lw * .45; ctx.strokeStyle = INK; ctx.stroke(); } }
  drawSpots(A, 0, by, bw, bh);
  highlight(ctx, -bw * .45, by - bh * .6, bw * .22, bh * .14);
  if (kind !== 'spirit' && kind !== 'god') leg(bw * .35, -1, false);
  else { ctx.beginPath(); ctx.moveTo(-bw * .6, by + bh * .8); ctx.quadraticCurveTo(0, by + bh * 1.6 + Math.sin(t * 3) * 4, bw * .6, by + bh * .8); ctx.fillStyle = base + '99'; ctx.fill(); }
  // tete
  const hr = size * .21 * arch.head, hx = bw * .15, hy = by - bh * .95 + (pose === 'walk' ? Math.abs(step) * 2 : 0);
  if (visual.horns) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * hr * .5, hy - hr * .6); ctx.lineTo(hx + s * hr * .85, hy - hr * 1.4); ctx.lineTo(hx + s * hr * .15, hy - hr * .8); ctx.closePath(); strokeFill(ctx, '#F4F1E8', lw * .7); } }
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 6.28); strokeFill(ctx, kind === 'god' ? '#F0E4B8' : skinCol, lw);
  if (kind === 'god') { ctx.beginPath(); ctx.arc(hx, hy - hr * 1.2, hr * .5, 0, 6.28); ctx.lineWidth = lw; ctx.strokeStyle = '#FFC24B'; ctx.stroke(); }
  highlight(ctx, hx - hr * .35, hy - hr * .4, hr * .25, hr * .15);
  drawEyes(A, hx + hr * .1, hy - hr * .05, hr * .36);
  drawMouth(A, hx + hr * .15, hy + hr * .5, hr * .38);
  // bras avant (avec arme)
  arm(bw * .55, by - bh * .2, -0.6 + swing, false, true);
  if (visual.limbs === 'arms' && (visual.limb_count || 2) >= 4) arm(bw * .5, by + bh * .1, -0.2 + swing * .5, false, false);
}
function drawWeapon(A, x, y) {
  const { ctx, size, lw, arch, visual } = A; const role = A._role || 'melee';
  ctx.save(); ctx.translate(x, y);
  if (role === 'ranged') { ctx.beginPath(); ctx.arc(0, 0, size * .09, -1.4, 1.4); ctx.lineWidth = lw * 1.2; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = lw * .5; ctx.strokeStyle = '#C99464'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -size * .09); ctx.lineTo(0, size * .09); ctx.lineWidth = lw * .5; ctx.strokeStyle = INK; ctx.stroke(); }
  else if (role === 'support') { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -size * .22); ctx.lineWidth = lw * 1.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * .6; ctx.strokeStyle = '#C99464'; ctx.stroke(); ctx.beginPath(); ctx.arc(0, -size * .25, size * .06, 0, 6.28); strokeFill(ctx, '#45D95E', lw * .6); }
  else if (role === 'tank') { ctx.beginPath(); ctx.ellipse(size * .02, 0, size * .1, size * .15, 0, 0, 6.28); strokeFill(ctx, '#7A8598', lw); ctx.beginPath(); ctx.arc(size * .02, 0, size * .04, 0, 6.28); ctx.fillStyle = INK; ctx.fill(); }
  else { ctx.rotate(-0.9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -size * .24); ctx.lineWidth = lw * 1.6; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * .7; ctx.strokeStyle = '#C99464'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size * .07, -size * .22); ctx.lineTo(size * .07, -size * .22); ctx.lineTo(size * .03, -size * .36); ctx.lineTo(-size * .05, -size * .34); ctx.closePath(); strokeFill(ctx, '#B8C0CC', lw * .8); }
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
