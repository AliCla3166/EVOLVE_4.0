// LE SYSTÈME DE DA — la grammaire commune à tout ce qui est dessiné dans EVOLVE.
//
// Pourquoi ce fichier existe (audit du 07/09/2026) : le rendu était propre en intention et
// brouillon à l'écran, pour quatre raisons mesurées dans l'ancien code —
//   1. 18 épaisseurs de trait différentes sur une seule créature (un style sticker en tient 2 ou 3) ;
//   2. 31 détails intérieurs portant chacun un contour noir, donc un intérieur aussi chargé
//      que la silhouette ;
//   3. des membres tracés en deux traits superposés (encre puis couleur), technique de croquis
//      qui laisse des jointures visibles là où le membre rejoint le corps ;
//   4. des aplats parfaitement plats, donc aucun volume, et des détails placés au hasard.
//
// La réponse est un système, pas des retouches :
//   • TROIS épaisseurs, jamais plus : silhouette, structure, accent.
//   • QUATRE valeurs par teinte et UNE direction de lumière (haut-gauche), en aplats francs —
//     l'ombrage « cel » donne le volume sans le moindre dégradé, ce que la charte exige.
//   • Chaque forme est une SILHOUETTE FERMÉE : on remplit, on ombre à l'intérieur du masque,
//     on contourne UNE fois. Aucun trait ne peut donc baver ni se dédoubler.
//   • Les membres sont des capsules fuselées fermées, pas des traits.
const INK = '#171B23';
export { INK };

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return '#' + ((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0');
}
// Conversion HSL aller-retour : la seule facon de decaler une teinte SANS perdre sa valeur.
// C'est le socle des genes de palette : deux especes du meme age partagent la meme lumiere,
// pas la meme couleur.
export function hsl(hex, dh = 0, ds = 1, dl = 0) {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, sa = 0; let l = (max + min) / 2;
  if (max !== min) { const d = max - min; sa = l > .5 ? d / (2 - max - min) : d / (max + min); h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  h = (h + dh / 360 + 1) % 1;
  sa = Math.max(0, Math.min(1, sa * ds));
  l = Math.max(0.04, Math.min(0.96, l + dl));
  const q = l < .5 ? l * (1 + sa) : l + sa - l * sa, p2 = 2 * l - q;
  const hue = (t) => { t = (t + 1) % 1; if (t < 1 / 6) return p2 + (q - p2) * 6 * t; if (t < .5) return q; if (t < 2 / 3) return p2 + (q - p2) * (2 / 3 - t) * 6; return p2; };
  const R = Math.round(hue(h + 1 / 3) * 255), G = Math.round(hue(h) * 255), B = Math.round(hue(h - 1 / 3) * 255);
  return '#' + ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
}
export function hueShift(hex, deg) { return hsl(hex, deg); }


// Quatre valeurs par teinte. Une seule direction de lumière pour tout le jeu : haut-gauche.
export const LIGHT = { x: -1, y: -1 };
export function tones(base, size) {
  return {
    hi: shade(base, 0.30),      // face éclairée
    base,                        // face neutre
    mid: shade(base, -0.16),     // face à l'ombre
    dark: shade(base, -0.38),    // parties arrière (membres du fond, dessous)
    band: size * 0.026,          // décalage d'un cran d'ombrage
    lod: size >= 26              // sous 26 px les bandes ne sont plus lisibles : on aplatit
  };
}

// TROIS épaisseurs. Toute autre valeur est un bug de style.
export function weights(size, outline = 1) {
  const k = size * (outline || 1);
  return {
    hero: Math.max(1.2, k * 0.044),   // contour de silhouette (torse, tête)
    limb: Math.max(1.0, k * 0.030),   // membres et pièces d'équipement : plus fin que la silhouette
    struct: Math.max(0.9, k * 0.022), // séparations internes réelles (bouche, visière)
    hair: Math.max(0.6, k * 0.013)    // accents fins (rainures, cordes)
  };
}

// ---------------------------------------------------------------------------
// form() — le cœur du système.
// On remplit la silhouette, on peint DANS son masque trois aplats décalés vers la lumière,
// puis on la contourne une seule fois. Zéro dégradé, zéro contour intérieur, zéro bavure.
// `path` doit pouvoir être rejoué : c'est une fonction qui trace, pas un Path2D consommé.
// ---------------------------------------------------------------------------
export function form(ctx, path, T, lw, opts = {}) {
  const fill = opts.fill || T.base;
  const midCol = opts.mid || T.mid;
  const hiCol = opts.hi || T.hi;
  const d = opts.band ?? T.band;
  if (!T.lod || opts.flat) {                 // petite taille : aplat simple, plus lisible
    path(ctx); ctx.fillStyle = fill; ctx.fill();
  } else {
    ctx.save();
    path(ctx); ctx.clip();
    ctx.fillStyle = midCol; ctx.fillRect(-9999, -9999, 19998, 19998);
    ctx.save(); ctx.translate(LIGHT.x * -d, LIGHT.y * -d); path(ctx); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
    if (opts.hi !== false) { ctx.save(); ctx.translate(LIGHT.x * -d * 2.7, LIGHT.y * -d * 2.7); path(ctx); ctx.fillStyle = hiCol; ctx.fill(); ctx.restore(); }
    ctx.restore();
  }
  if (opts.stroke !== false) {
    path(ctx); ctx.lineWidth = lw; ctx.strokeStyle = opts.ink || INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
}
// Aplat sans contour : pour tout ce qui vit À L'INTÉRIEUR d'une silhouette déjà contournée.
export function inner(ctx, path, color) { path(ctx); ctx.fillStyle = color; ctx.fill(); }

// ---------------------------------------------------------------------------
// Primitives de silhouette. Toutes renvoient une fonction rejouable.
// ---------------------------------------------------------------------------
export const orb = (x, y, r, ry) => (ctx) => { ctx.beginPath(); ctx.ellipse(x, y, r, ry ?? r, 0, 0, Math.PI * 2); };

// Capsule fuselée : un membre est une forme fermée, jamais un trait. C'est ce qui supprime
// les jointures doubles à l'épaule et à la hanche.
export const capsule = (x0, y0, x1, y1, r0, r1) => (ctx) => {
  const a = Math.atan2(y1 - y0, x1 - x0), p = a + Math.PI / 2;
  ctx.beginPath();
  ctx.arc(x0, y0, r0, p, p + Math.PI);
  ctx.arc(x1, y1, r1 ?? r0, p + Math.PI, p + Math.PI * 2);
  ctx.closePath();
};

// Membrane : une seule harmonique douce, amplitude faible. L'ancienne en cumulait deux
// à forte amplitude, ce qui donnait un bord grumeleux dès qu'on réduisait la taille.
export const membrane = (x, y, rx, ry, wob, t, seed) => (ctx) => {
  const N = 30;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const w = 1 + wob * Math.sin(a * 3 + t * 1.4 + seed);
    const px = x + Math.cos(a) * rx * w, py = y + Math.sin(a) * ry * w;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
};

// Ombre au sol : aplat franc à opacité fixe, jamais un flou. Elle ancre la figure.
export function groundShade(ctx, x, y, rx) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.26, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(11,14,20,.34)'; ctx.fill();
}

// Reflet spéculaire : une seule tache, toujours au même endroit relatif (haut-gauche).
export function gloss(ctx, x, y, rx, ry, alpha = 0.32) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
}

// Reflet CLIPPÉ dans sa silhouette : sans ça il bave par-dessus le contour et donne
// exactement l'effet « croquis » qu'on cherche à supprimer.
export function glossIn(ctx, path, x, y, rx, ry, alpha) {
  ctx.save(); path(ctx); ctx.clip(); gloss(ctx, x, y, rx, ry, alpha); ctx.restore();
}

// Placement déterministe en angle d'or : des taches réparties, jamais deux fois au hasard.
export function golden(i, n, rx, ry, spread = 0.62) {
  const a = i * 2.39996, r = Math.sqrt((i + 0.5) / n) * spread;
  return { x: Math.cos(a) * rx * r, y: Math.sin(a) * ry * r };
}
