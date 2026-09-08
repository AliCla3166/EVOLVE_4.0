// Reliques vivantes : silhouettes dessinées sur une grille de 100 unités.
// Les facettes sont placées intentionnellement, jamais par duplication du contour.
import { INK, shade } from './style.js';
const paths = new Map();
export function path(d) {
  if (!paths.has(d)) paths.set(d, new Path2D(d));
  return paths.get(d);
}
export function plate(ctx, d, color, stroke = 2.4) {
  const p = path(d);
  ctx.fillStyle = color; ctx.fill(p);
  if (stroke) { ctx.strokeStyle = INK; ctx.lineWidth = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(p); }
}
export function line(ctx, d, color, width = 1.5) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path(d));
}
export function oval(ctx, x, y, rx, ry, color, stroke = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  if (stroke) { ctx.strokeStyle = INK; ctx.lineWidth = stroke; ctx.stroke(); }
}
export function nucleus(ctx, x, y, r, color) {
  // Le noyau fendu : motif hérité par les yeux, les portes et les reliquaires.
  oval(ctx, x, y, r, r * 1.18, INK);
  oval(ctx, x, y, r * .69, r * .84, color);
  oval(ctx, x + r * .1, y, r * .19, r * .63, INK);
  oval(ctx, x - r * .28, y - r * .36, r * .14, r * .17, '#F4F1E8');
}
export function material(tint) {
  return { base: tint, light: shade(tint, .25), dark: shade(tint, -.35), bone: '#D8CFB8', boneShade: '#A29E90' };
}
