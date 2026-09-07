// LES GÈNES VISUELS — ce qui fait que deux créatures du même âge ne sont pas la même créature.
//
// Constat qui a motivé ce fichier (test du 07/09/2026) : pousser l'ombrage ne rapproche pas le
// rendu d'un dessin fait main, parce que le goulot n'est pas l'ombrage. Trois causes mesurées :
//   1. UNE seule teinte par stade — dix stades, dix couleurs, et c'est tout ;
//   2. une symétrie PARFAITE — l'œil lit « généré » en une demi-seconde ;
//   3. aucune texture — des aplats nus, là où tout ce qui vit porte une livrée.
//
// Ce module attaque les trois, sans le moindre asset : à partir de la seule graine de l'espèce,
// il dérive une palette propre, une livrée, et une poignée d'irrégularités. Tout est déterministe :
// une graine donnée redonne toujours exactement la même bête, à la session comme au pixel.
//
// Règles de style que ce fichier ne viole jamais (elles viennent de style.js) :
//   • un motif est un APLAT, jamais un trait — il ne porte pas d'encre ;
//   • un motif vit DANS le masque de sa silhouette — il ne déborde pas du contour ;
//   • l'asymétrie reste sous les 10 % — au-delà on ne lit plus « vivant » mais « cassé ».
import { makeRng } from '../core/rng.js';
import { hsl, shade, orb, inner, golden } from './style.js';

// Les livrées possibles. Poids : le uni reste fréquent, sinon tout le bestiaire devient bariolé.
const LIVREES = [
  ['uni', 26], ['taches', 18], ['bandes', 14], ['ocelles', 8],
  ['marbrures', 12], ['moucheture', 10], ['dorsale', 12]
];

// ---------------------------------------------------------------------------
// LES CINQ LIGNÉES RIVALES — bible de Wallachie, §7.
// Une faction ne doit pas être « le même moteur avec une autre teinte ». Chacune porte une
// RÈGLE DE FORME qui la rend reconnaissable en silhouette, avant même la couleur.
// ---------------------------------------------------------------------------
export const FACTIONS = {
  // « Ils ne construisent rien. Ils mangent. » Aucune fabrication : tout est corps.
  les_voraces: { asym: 2.2, sat: 1.15, lum: -0.02, pattern: 'marbrures', sansArme: true, gueule: true, tete: 'aucune' },
  // « Patients, nombreux, sans visage. » Seule lignée à qui la symétrie parfaite est autorisée —
  // l'interdit général devient ici leur caractère, et c'est ce qui les rend inquiétants.
  les_gris: { asym: 0, sat: 0.42, lum: 0.02, pattern: 'uni', sansYeux: true, clone: true, tete: 'aucune' },
  // « Ils arrivent avant qu'on les voie. » Ils empruntent au stade 9 ce qu'ils ne devraient pas avoir.
  les_luisants: { asym: 1.1, sat: 1.25, lum: 0.06, pattern: 'moucheture', translucide: 0.72, traine: true, trait: 0.62 },
  // « Chaque coup y laisse une trace, jamais une blessure. » La surface accumule les impacts.
  les_pierres: { asym: 0.8, sat: 0.62, lum: -0.05, pattern: 'impacts', epais: 1.22 },
  // « Ils répètent tes propres cris contre toi. » Leur livrée copie celle du joueur, avec un âge
  // de retard : battle.js leur passe littéralement la graine du joueur.
  les_echos: { asym: 1, sat: 0.88, lum: 0, pattern: null, echo: true }
};

const CACHE = new Map();

// Palette, livrée et irrégularités d'un individu. Mémoïsé : appelé à chaque frame par unité.
export function genesFor(visual = {}, archetype = 'eclaireur') {
  const ombre = Math.max(0, Math.min(1, (visual.axes?.ombre || 0) / 40));   // 40 points = nuit pleine
  const key = `${visual.seed || 0}|${visual.stage || 1}|${archetype}|${visual.tint_shift || 0}|${visual.faction || ''}|${ombre.toFixed(2)}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const r = makeRng('genes:' + key);

  // — Palette. Bornée exprès : ±26° garde l'identité chromatique du stade (une Cellule reste
  //   bleu-vert, une Meute reste ambre) tout en rendant deux individus distinguables au premier
  //   coup d'œil. Au-delà, chaque âge perdrait sa couleur, donc sa lisibilité.
  const hue = r.range(-26, 26);
  const sat = r.range(0.74, 1.26);
  const lum = r.range(-0.06, 0.08);
  // L'accent est pris à l'opposé de la teinte : c'est lui qui porte le motif et les membranes.
  const accent = hsl(visual.accent_base || '#3FB8C9', hue + r.range(140, 210), 1.15, 0.06);

  // — L'iris. Pris dans une palette d'yeux REELS (ambre, noisette, olive, glace, prune, jais).
  //   Le complement de la peau donnait des yeux fuchsia sur peau verte : generé, pas dessiné.
  const iris = r.weighted(
    ['#C08A34', '#7A4E24', '#4C7038', '#2E5E86', '#6A3E64', '#1C222C', '#A63E2E'],
    (c) => (c === '#1C222C' ? 3 : c === '#A63E2E' ? 1.5 : 2)
  );

  // — Livrée.
  const pattern = r.weighted(LIVREES, ([, w]) => w)[0];
  const patTone = r.range(0, 1) < 0.24 ? 'accent' : r.range(0, 1) < 0.45 ? 'clair' : 'sombre';

  // — Irrégularités. Faibles par construction : c'est ce qui doit se sentir sans se voir.
  const side = r.range(0, 1) < 0.5 ? -1 : 1;
  const g = {
    hue, sat, lum, accent, iris, pattern, patTone,
    patN: r.int(3, 7),
    patScale: r.range(0.72, 1.35),
    patAlpha: patTone === 'accent' ? r.range(0.16, 0.26) : r.range(0.10, 0.20),
    ventre: r.range(0.55, 1.15),      // force de la contre-ombre ventrale
    // asymétrie
    side,
    eyeR: r.range(0.90, 1.10),        // un œil un peu plus grand que l'autre
    eyeDy: r.range(-0.10, 0.10),      // et un peu plus haut
    limb: r.range(0.94, 1.07),        // un membre avant plus long
    tilt: r.range(-0.075, 0.075),     // inclinaison de tête
    jitter: r.range(0.10, 0.30),      // irrégularité des piquants et appendices
    marque: r.range(0, 1) < 0.42,     // tache unilatérale (le détail qu'on croit avoir dessiné)
    marqueR: r.range(0.13, 0.22),
    // hiérarchie du détail : 70 % du détail sur 20 % de la surface, c'est-à-dire la tête
    arcade: r.range(0, 1) < 0.62,     // arcade sourcilière — donne un regard
    joue: r.range(0, 1) < 0.40,       // plaque de joue
    oreille: r.weighted([['aucune', 30], ['pointue', 22], ['ronde', 16], ['frangee', 12]], ([, w]) => w)[0],
    // décalage temporel : deux créatures identiques ne doivent pas respirer en cadence
    phase: r.range(0, 6.28)
  };
  // — La règle de forme de la lignée, par-dessus le tirage individuel (bible §7).
  const F = FACTIONS[visual.faction];
  if (F) {
    g.sat *= F.sat; g.lum += F.lum;
    if (F.pattern) { g.pattern = F.pattern; g.patTone = F.pattern === 'impacts' ? 'sombre' : g.patTone; }
    // L'asymétrie est le curseur qui distingue le plus vite deux lignées : 0 chez les Gris,
    // poussé au double chez les Voraces.
    const k = F.asym;
    g.eyeR = 1 + (g.eyeR - 1) * k; g.eyeDy *= k; g.limb = 1 + (g.limb - 1) * k;
    g.tilt *= k; g.jitter *= k; if (k === 0) { g.marque = false; g.side = 1; }
    g.sansYeux = !!F.sansYeux; g.sansArme = !!F.sansArme; g.gueule = !!F.gueule;
    g.translucide = F.translucide || 0; g.traine = !!F.traine;
    g.trait = F.trait || 1; g.epais = F.epais || 1;
  }

  // — L'OMBRE (bible, loi VI). Elle ne rend pas une créature mauvaise, elle la rend NOCTURNE :
  //   la peau s'assombrit et se désature, les yeux grandissent pour capter la lumière, la livrée
  //   se ferme. Jamais de rouge, jamais de corruption.
  if (ombre > 0.02) {
    g.lum -= 0.16 * ombre;
    g.sat *= 1 - 0.42 * ombre;
    g.nuit = ombre;                       // creature.js agrandit l'œil et ferme la paupière
    g.patAlpha *= 1 - 0.35 * ombre;
  }

  if (CACHE.size > 500) CACHE.clear();
  CACHE.set(key, g);
  return g;
}

// La teinte effective d'un individu : la couleur de son stade, passée par ses gènes.
export function tintOf(baseTint, G) { return hsl(baseTint, G.hue, G.sat, G.lum); }

// Bruit déterministe, pour jitterer un index sans allouer de PRNG dans la boucle de rendu.
export function wob(G, i) {
  const n = Math.sin((i + 1) * 12.9898 + G.phase * 7.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

// ---------------------------------------------------------------------------
// LA LIVRÉE. Toujours appelée à l'intérieur d'un clip de silhouette, en aplats purs.
// box = { cx, cy, rx, ry, size } — la boîte de la partie qu'on habille.
// ---------------------------------------------------------------------------
export function livree(ctx, G, T, box) {
  const { cx, cy, rx, ry, size } = box;

  // 1. Contre-ombre : le ventre est toujours plus clair que le dos. C'est vrai de presque tout
  //    ce qui vit, et c'est ce qui donne du volume avant même le motif.
  inner(ctx, orb(cx + rx * 0.06, cy + ry * 0.46, rx * 0.76, ry * 0.62), shade(T.base, 0.13 * G.ventre));
  //    et une ombre de dos, dans l'autre sens.
  ctx.save(); ctx.globalAlpha = 0.34;
  inner(ctx, orb(cx - rx * 0.05, cy - ry * 1.15, rx * 0.95, ry * 0.80), shade(T.base, -0.16));
  ctx.restore();

  if (G.pattern === 'uni') { marque(ctx, G, T, box); return; }
  const col = G.patTone === 'accent' ? G.accent : G.patTone === 'clair' ? shade(T.base, 0.34) : shade(T.base, -0.34);
  ctx.save();
  ctx.globalAlpha = G.patAlpha;
  ctx.fillStyle = col;

  if (G.pattern === 'taches') {
    const n = G.patN + 2;
    for (let i = 0; i < n; i++) {
      const p = golden(i, n, rx * 0.86, ry * 0.80);
      const rr = size * 0.055 * G.patScale * (1 + wob(G, i) * 0.42);
      ctx.beginPath(); ctx.ellipse(cx + p.x, cy + p.y, rr, rr * (0.72 + wob(G, i + 30) * 0.2), wob(G, i + 7), 0, 6.28); ctx.fill();
    }
  } else if (G.pattern === 'bandes') {
    const n = G.patN;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const bx = cx + (u - 0.5) * rx * 2.1;
      const w = size * 0.030 * G.patScale * (1 + wob(G, i) * 0.35);
      ctx.beginPath();
      ctx.ellipse(bx, cy + wob(G, i + 11) * ry * 0.12, w, ry * (0.92 + wob(G, i + 3) * 0.18), wob(G, i + 5) * 0.22, 0, 6.28);
      ctx.fill();
    }
  } else if (G.pattern === 'ocelles') {
    const n = Math.max(3, G.patN - 1);
    for (let i = 0; i < n; i++) {
      const p = golden(i, n, rx * 0.78, ry * 0.70);
      const rr = size * 0.062 * G.patScale * (1 + wob(G, i) * 0.25);
      ctx.beginPath(); ctx.arc(cx + p.x, cy + p.y, rr, 0, 6.28); ctx.fill();
      ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = shade(T.base, 0.30);
      ctx.beginPath(); ctx.arc(cx + p.x, cy + p.y, rr * 0.46, 0, 6.28); ctx.fill(); ctx.restore();
    }
  } else if (G.pattern === 'marbrures') {
    for (let i = 0; i < 3; i++) {
      const p = golden(i, 3, rx * 0.62, ry * 0.55);
      ctx.beginPath();
      const R = size * 0.15 * G.patScale;
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * 6.28;
        const w = 1 + 0.42 * Math.sin(a * 3 + i * 2.1) + 0.22 * Math.sin(a * 5 - i);
        const px = cx + p.x + Math.cos(a) * R * w, py = cy + p.y + Math.sin(a) * R * w * 0.72;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
  } else if (G.pattern === 'moucheture') {
    const n = 16 + G.patN * 2;
    for (let i = 0; i < n; i++) {
      const p = golden(i, n, rx * 0.90, ry * 0.86, 0.86);
      ctx.beginPath(); ctx.arc(cx + p.x, cy + p.y, size * 0.016 * G.patScale * (1 + wob(G, i) * 0.4), 0, 6.28); ctx.fill();
    }
  } else if (G.pattern === 'impacts') {
    // Livrée d'ARCHIVE (bible §6) : la surface enregistre ce que la créature a encaissé.
    // Un impact = un éclat clair bordé d'une ombre — jamais une blessure, jamais du rouge.
    const n = G.patN + 4;
    for (let i = 0; i < n; i++) {
      const p = golden(i, n, rx * 0.88, ry * 0.82);
      const rr = size * 0.040 * G.patScale * (1 + wob(G, i) * 0.55);
      ctx.save(); ctx.globalAlpha = 1;
      ctx.fillStyle = shade(T.base, -0.34);
      ctx.beginPath(); ctx.ellipse(cx + p.x, cy + p.y, rr, rr * 0.8, wob(G, i + 4), 0, 6.28); ctx.fill();
      ctx.fillStyle = shade(T.base, 0.30);
      ctx.beginPath(); ctx.ellipse(cx + p.x - rr * 0.22, cy + p.y - rr * 0.22, rr * 0.55, rr * 0.44, wob(G, i + 4), 0, 6.28); ctx.fill();
      ctx.restore();
    }
  } else if (G.pattern === 'dorsale') {
    // Une selle sombre sur le dos : le motif le plus répandu du vivant, et le plus lisible en petit.
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.06, cy - ry * 0.78, rx * 0.84 * G.patScale, ry * 0.86, 0, 0, 6.28);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const u = (i - 1) * 0.5;
      ctx.beginPath();
      ctx.ellipse(cx + u * rx * 0.9, cy - ry * 0.1 + Math.abs(u) * ry * 0.2, rx * 0.13, ry * 0.34, u * 0.3, 0, 6.28);
      ctx.fill();
    }
  }
  ctx.restore();
  marque(ctx, G, T, box);
}

// La tache unilatérale. Un seul aplat, d'un seul côté : c'est elle qui fait dire « celle-là,
// je la reconnais ». Elle ne peut exister que parce que le reste est symétrique.
function marque(ctx, G, T, box) {
  if (!G.marque) return;
  const { cx, cy, rx, ry, size } = box;
  ctx.save(); ctx.globalAlpha = 0.19;
  ctx.fillStyle = G.patTone === 'clair' ? shade(T.base, -0.30) : shade(T.base, 0.32);
  ctx.beginPath();
  ctx.ellipse(cx + G.side * rx * 0.46, cy - ry * 0.18, rx * G.marqueR, ry * G.marqueR * 1.5, G.side * 0.5, 0, 6.28);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Créature SAUVAGE : une bête que le joueur n'a pas fait évoluer. Sa morphologie est tirée
// de sa graine au lieu de venir des mutations — c'est ce qui fait qu'une vague n'est plus
// six fois la même silhouette repeinte.
// ---------------------------------------------------------------------------
const BACKS = [null, null, 'spikes', 'shell', 'crystals', 'wings'];
const TAILS = [null, null, 'club'];
const MOUTHS = ['fangs', 'fangs', 'smile'];

export function wildVisual(base, seed, faction) {
  const r = makeRng('wild:' + seed);
  const F = FACTIONS[faction] || {};
  if (F.clone) seed = 0;                       // Les Gris : une seule silhouette, répétée
  const out = {
    ...base, seed, faction,
    eyes: r.weighted([1, 2, 3], (n) => (n === 2 ? 5 : n === 1 ? 3 : 2)),
    eye_size: r.range(0.82, 1.22),
    mouth: r.pick(MOUTHS),
    horns: r.range(0, 1) < 0.34 ? 1 : 0,
    back: r.pick(BACKS),
    tail: r.pick(TAILS),
    spike_count: r.int(4, 7),
    skin: r.range(0, 1) < 0.3 ? 'scales' : 'plain',
    limb_len: r.range(0.88, 1.14),
    spots: r.range(0, 1) < 0.25 ? 'dark' : null,
    spot_count: r.int(3, 5)
  };
  if (F.clone) { out.back = null; out.tail = null; out.horns = 0; out.eyes = 2; out.eye_size = 1; out.limb_len = 1; out.skin = 'plain'; out.spots = null; out.mouth = 'smile'; }
  if (F.gueule) { out.mouth = 'gueule'; out.horns = 0; out.back = out.back === 'wings' ? null : out.back; }
  if (F.epais) out.outline = (out.outline || 1) * 1.08;
  if (F.trait) out.outline = (out.outline || 1) * F.trait;
  return out;
}
