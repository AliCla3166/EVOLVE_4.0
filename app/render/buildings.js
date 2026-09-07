// Les monuments de la Colonie. Un dessin par emplacement, pas deux pour douze.
//
// Avant le 07/09/2026, colony.js dessinait la MEME cabane (ou le meme dome en milieu aquatique)
// pour les douze batiments : la carte ne racontait rien, on ne pouvait pas lire sa colonie d'un
// coup d'oeil. Chaque batiment a maintenant une silhouette propre, liee a sa fonction — on
// reconnait la forge a sa cheminee, la vigie a sa hauteur, le silo a son toit conique.
//
// Chaque forme suit la charte : contour encre epais, aplats francs, un highlight, zero degrade.
// `shape` vient de data/colony.json (cle "shape"), donc ajouter un batiment = ajouter une forme ici
// et une ligne la-bas. Le moteur reste ignorant du contenu.
import { INK, shade, tones, weights, form, inner, gloss, groundShade } from './style.js';

// sf() garde sa signature d'origine (on remplit puis on contourne), mais passe par form() :
// les monuments recoivent donc exactement le meme ombrage en aplats et la meme direction de
// lumiere que les creatures. C'est ce qui fait qu'une colonie et ses habitants ont l'air
// d'appartenir au meme jeu.
// Un tracé canvas ne peut pas être rejoué : il est figé en espace écran dès sa construction.
// On ne peut donc pas décaler une copie de la silhouette comme on le fait pour les créatures.
// La technique qui marche ici : DÉCOUPER dans la forme (clip conserve le tracé courant) puis
// peindre trois bandes horizontales pleines. Résultat : même plan de lumière que les créatures
// — clair en haut, neutre au milieu, sombre en bas — sans un seul dégradé.
let CUR = { size: 40, hiY: -30, midY: -12 };
function sf(ctx, fill, lw) {
  const T = tones(fill, CUR.size);
  ctx.save();
  ctx.clip();                                   // clip ne vide pas le tracé courant
  ctx.fillStyle = T.hi;   ctx.fillRect(-9999, -9999, 19998, 19998);
  ctx.fillStyle = fill;   ctx.fillRect(-9999, CUR.hiY, 19998, 19998);
  ctx.fillStyle = T.mid;  ctx.fillRect(-9999, CUR.midY, 19998, 19998);
  ctx.restore();
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
}
function shine(ctx, x, y, rx, ry) { gloss(ctx, x, y, rx, ry, .26); }

// ---------------------------------------------------------------- formes
// Repere commun : (0,0) = point de pose au sol, y negatif vers le haut, s = demi-largeur de base.
const SHAPES = {
  // Biomasse — bulbe nourricier : une poche molle qui pulse doucement.
  vacuole(ctx, s, lw, P, t) {
    const pulse = 1 + Math.sin(t * 1.6) * .04;
    ctx.beginPath(); ctx.ellipse(0, -s * .75 * pulse, s * .78, s * .78 * pulse, 0, 0, 6.28);
    sf(ctx, P.tint, lw);
    ctx.beginPath(); ctx.ellipse(0, -s * .75, s * .38, s * .34, 0, 0, 6.28);
    ctx.fillStyle = shade(P.tint, .28); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * .2, -s * 1.5); ctx.quadraticCurveTo(0, -s * 1.9, s * .2, -s * 1.5);
    ctx.lineWidth = lw * .8; ctx.strokeStyle = INK; ctx.stroke();
    shine(ctx, -s * .3, -s * 1.05, s * .18, s * .09);
  },
  // Biomasse — bassin : une vasque, de l'eau qui frissonne.
  bassin(ctx, s, lw, P, t) {
    ctx.beginPath(); ctx.ellipse(0, -s * .25, s, s * .42, 0, 0, 6.28); sf(ctx, shade(P.ground, .2), lw);
    ctx.beginPath(); ctx.ellipse(0, -s * .3, s * .72, s * .28, 0, 0, 6.28); sf(ctx, P.tint, lw * .7);
    for (let i = 0; i < 3; i++) {
      const w = .3 + i * .2 + (Math.sin(t * 1.4 + i) * .05);
      ctx.beginPath(); ctx.ellipse(0, -s * .3, s * .72 * w, s * .28 * w, 0, 0, 6.28);
      ctx.lineWidth = lw * .35; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    }
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * s * .85, -s * .35); ctx.lineTo(d * s * .95, -s * .95); ctx.lineWidth = lw * 1.1; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * .5; ctx.strokeStyle = shade(P.ground, .4); ctx.stroke(); }
  },
  // Materiaux — carriere : un bloc entaille, des eclats au sol.
  carriere(ctx, s, lw, P) {
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s * .78, -s * 1.05); ctx.lineTo(-s * .05, -s * 1.25);
    ctx.lineTo(s * .72, -s * .92); ctx.lineTo(s * .95, 0); ctx.closePath();
    sf(ctx, shade(P.ground, .35), lw);
    ctx.beginPath(); ctx.moveTo(-s * .05, -s * 1.25); ctx.lineTo(s * .05, -s * .45); ctx.lineTo(s * .72, -s * .92);
    ctx.fillStyle = shade(P.ground, .06); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * .5, -s * .55); ctx.lineTo(-s * .1, -s * .75);
    ctx.lineWidth = lw * .5; ctx.strokeStyle = INK; ctx.stroke();
    for (const [dx, dy] of [[-1.15, -.08], [1.18, -.12]]) { ctx.beginPath(); ctx.moveTo(s * dx, s * dy); ctx.lineTo(s * dx + s * .16, s * dy - s * .16); ctx.lineTo(s * dx + s * .26, s * dy); ctx.closePath(); sf(ctx, shade(P.ground, .2), lw * .6); }
  },
  // Materiaux — ossuaire : deux arches d'os, un fronton bas.
  ossuaire(ctx, s, lw, P) {
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(d * s * .8, 0);
      ctx.quadraticCurveTo(d * s * .95, -s * .95, d * s * .18, -s * 1.28);
      ctx.lineWidth = lw * 1.9; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
      ctx.lineWidth = lw * .95; ctx.strokeStyle = '#E8DCC0'; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, -s * 1.3, s * .3, s * .16, 0, 0, 6.28); sf(ctx, '#E8DCC0', lw * .8);
    ctx.beginPath(); ctx.rect(-s * .55, -s * .42, s * 1.1, s * .42); sf(ctx, shade(P.ground, .28), lw * .9);
  },
  // Genes — helice : une tour en spirale, qui tourne lentement.
  helice(ctx, s, lw, P, t) {
    ctx.beginPath(); ctx.moveTo(-s * .42, 0); ctx.lineTo(-s * .3, -s * 1.5); ctx.lineTo(s * .3, -s * 1.5); ctx.lineTo(s * .42, 0); ctx.closePath();
    sf(ctx, shade(P.tint, -.25), lw);
    for (let i = 0; i < 5; i++) {
      const y = -s * .2 - i * s * .28, a = t * .9 + i * .9;
      ctx.beginPath(); ctx.ellipse(0, y, s * .34, s * .1, 0, 0, 6.28);
      ctx.lineWidth = lw * .5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * .34, y, s * .09, 0, 6.28); sf(ctx, '#A76BD9', lw * .5);
    }
    ctx.beginPath(); ctx.arc(0, -s * 1.62, s * .16, 0, 6.28); sf(ctx, '#C89BF0', lw * .7);
  },
  // Biomasse — champ : des rangees de lamelles qui ondulent.
  champ(ctx, s, lw, P, t) {
    ctx.beginPath(); ctx.ellipse(0, -s * .1, s * 1.05, s * .34, 0, 0, 6.28); sf(ctx, shade(P.ground, .18), lw * .8);
    for (let i = 0; i < 7; i++) {
      const x = -s * .8 + i * s * .27, sway = Math.sin(t * 1.8 + i * .7) * s * .1;
      ctx.beginPath(); ctx.moveTo(x, -s * .12);
      ctx.quadraticCurveTo(x + sway * .5, -s * .55, x + sway, -s * .92);
      ctx.lineWidth = lw * 1.1; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
      ctx.lineWidth = lw * .5; ctx.strokeStyle = i % 2 ? P.tint : shade(P.tint, .25); ctx.stroke();
    }
  },
  // Ration — silo : cylindre trapu, toit conique, echelle.
  silo(ctx, s, lw, P) {
    ctx.beginPath(); ctx.rect(-s * .58, -s * 1.15, s * 1.16, s * 1.15); sf(ctx, shade(P.ground, .42), lw);
    ctx.beginPath(); ctx.moveTo(-s * .72, -s * 1.12); ctx.lineTo(0, -s * 1.72); ctx.lineTo(s * .72, -s * 1.12); ctx.closePath();
    sf(ctx, shade(P.tint, -.1), lw);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * .58, -s * (.28 + i * .28)); ctx.lineTo(s * .58, -s * (.28 + i * .28)); ctx.lineWidth = lw * .4; ctx.strokeStyle = INK; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(s * .38, 0); ctx.lineTo(s * .38, -s * 1.12); ctx.lineWidth = lw * .45; ctx.strokeStyle = INK; ctx.stroke();
    shine(ctx, -s * .3, -s * .85, s * .12, s * .3);
  },
  // PV des unites — caserne : basse, large, creneaux.
  caserne(ctx, s, lw, P) {
    ctx.beginPath(); ctx.rect(-s, -s * .82, s * 2, s * .82); sf(ctx, shade(P.ground, .3), lw);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.rect(-s + i * s * .42, -s * 1.02, s * .26, s * .22); sf(ctx, shade(P.ground, .42), lw * .6); }
    ctx.beginPath(); ctx.moveTo(-s * .22, 0); ctx.lineTo(-s * .22, -s * .5); ctx.quadraticCurveTo(0, -s * .68, s * .22, -s * .5); ctx.lineTo(s * .22, 0);
    sf(ctx, INK, lw * .5);
    shine(ctx, -s * .7, -s * .6, s * .16, s * .2);
  },
  // Degats des unites — forge : enclume, cheminee, fumee qui monte.
  forge(ctx, s, lw, P, t) {
    ctx.beginPath(); ctx.rect(-s * .9, -s * .78, s * 1.55, s * .78); sf(ctx, shade(P.ground, .26), lw);
    ctx.beginPath(); ctx.rect(s * .32, -s * 1.55, s * .42, s * .8); sf(ctx, shade(P.ground, .4), lw * .9);
    // gueule du four, braise pulsante
    const glow = .6 + Math.sin(t * 3.4) * .25;
    ctx.beginPath(); ctx.arc(-s * .25, -s * .35, s * .26, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = `rgba(255,140,40,${glow})`; ctx.fill(); ctx.lineWidth = lw * .7; ctx.strokeStyle = INK; ctx.stroke();
    // fumee
    for (let i = 0; i < 3; i++) {
      const p = ((t * .5 + i * .33) % 1);
      ctx.beginPath(); ctx.arc(s * .53 + Math.sin(p * 6 + i) * s * .16, -s * 1.6 - p * s * .9, s * .13 * (1 - p * .4), 0, 6.28);
      ctx.fillStyle = `rgba(200,200,205,${.35 * (1 - p)})`; ctx.fill();
    }
  },
  // Cumul hors-ligne — sanctuaire : colonnes + fronton, la seule forme symetrique et calme.
  sanctuaire(ctx, s, lw, P) {
    ctx.beginPath(); ctx.rect(-s * 1.02, -s * .22, s * 2.04, s * .22); sf(ctx, shade(P.ground, .34), lw * .8);
    for (const d of [-.72, -.24, .24, .72]) { ctx.beginPath(); ctx.rect(d * s - s * .1, -s * 1.06, s * .2, s * .84); sf(ctx, '#E8E2D0', lw * .7); }
    ctx.beginPath(); ctx.rect(-s * .96, -s * 1.24, s * 1.92, s * .2); sf(ctx, '#E8E2D0', lw * .8);
    ctx.beginPath(); ctx.moveTo(-s * 1.02, -s * 1.24); ctx.lineTo(0, -s * 1.75); ctx.lineTo(s * 1.02, -s * 1.24); ctx.closePath();
    sf(ctx, shade(P.tint, -.15), lw);
  },
  // Degats des tourelles — vigie : haute, fine, une plateforme et un fanion.
  vigie(ctx, s, lw, P, t) {
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * s * .48, 0); ctx.lineTo(d * s * .2, -s * 1.5); ctx.lineWidth = lw * 1.5; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = lw * .7; ctx.strokeStyle = shade(P.ground, .38); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-s * .38, -s * .75); ctx.lineTo(s * .38, -s * .75); ctx.lineWidth = lw * .55; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.rect(-s * .46, -s * 1.78, s * .92, s * .32); sf(ctx, shade(P.ground, .45), lw * .9);
    ctx.beginPath(); ctx.moveTo(0, -s * 1.78); ctx.lineTo(0, -s * 2.3); ctx.lineWidth = lw * .5; ctx.strokeStyle = INK; ctx.stroke();
    const w = Math.sin(t * 3) * s * .08;
    ctx.beginPath(); ctx.moveTo(0, -s * 2.3); ctx.lineTo(s * .5 + w, -s * 2.12); ctx.lineTo(0, -s * 1.95); ctx.closePath();
    sf(ctx, P.tint, lw * .6);
  },
  // Muraille — le segment de porte : deux tours basses et un linteau.
  porte(ctx, s, lw, P) {
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.rect(d * s * .72 - s * .26, -s * 1.05, s * .52, s * 1.05); sf(ctx, '#7A8598', lw); ctx.beginPath(); ctx.rect(d * s * .72 - s * .3, -s * 1.24, s * .6, s * .2); sf(ctx, '#94A0B0', lw * .7); }
    ctx.beginPath(); ctx.rect(-s * .48, -s * 1.05, s * .96, s * .2); sf(ctx, '#94A0B0', lw * .8);
    ctx.beginPath(); ctx.moveTo(-s * .34, 0); ctx.lineTo(-s * .34, -s * .55); ctx.quadraticCurveTo(0, -s * .88, s * .34, -s * .55); ctx.lineTo(s * .34, 0); ctx.closePath();
    sf(ctx, shade(P.ground, -.1), lw * .7);
  }
};

// Variante aquatique : les memes fonctions sous une cloche, pour les stades 1-2.
function aquaticDome(ctx, s, lw, P, t) {
  ctx.beginPath(); ctx.ellipse(0, -s * .12, s * .95, s * .95, 0, Math.PI, 0); ctx.closePath();
  sf(ctx, shade(P.tint, -.18), lw);
  ctx.save(); ctx.globalAlpha = .5;
  ctx.beginPath(); ctx.ellipse(-s * .3, -s * .55, s * .2, s * .12, -.5, 0, 6.28); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  for (let i = 0; i < 2; i++) {
    const p = ((t * .35 + i * .5) % 1);
    ctx.beginPath(); ctx.arc(s * .3, -s * 1.05 - p * s * .8, s * .07 * (1 - p * .5), 0, 6.28);
    ctx.fillStyle = `rgba(255,255,255,${.4 * (1 - p)})`; ctx.fill();
  }
}

export const SHAPE_IDS = Object.keys(SHAPES);

// drawBuilding : point de pose (x, y), demi-largeur s, forme, niveau, chantier en cours.
export function drawBuilding(ctx, opts) {
  const { x, y, s, shape, level = 0, busy = false, t = 0, palette, aquatic = false } = opts;
  ctx.save();
  ctx.translate(x, y);
  // ombre portee au sol
  groundShade(ctx, 0, 0, s * 1.05);
  CUR = { size: s * 2, hiY: -s * 1.05, midY: -s * 0.42 };
  const W = weights(s * 2);
  const lw = W.hero;
  // Un batiment en chantier n'est pas encore bati : on montre des fondations et des etais.
  if (!level && busy) {
    ctx.beginPath(); ctx.rect(-s * .8, -s * .28, s * 1.6, s * .28); sf(ctx, shade(palette.ground, .12), lw * .8);
    for (const d of [-.6, 0, .6]) { ctx.beginPath(); ctx.moveTo(d * s, -s * .28); ctx.lineTo(d * s + s * .12, -s * .95); ctx.lineWidth = lw * .8; ctx.strokeStyle = '#C99464'; ctx.lineCap = 'round'; ctx.stroke(); }
  } else {
    const fn = SHAPES[shape] || SHAPES.vacuole;
    if (aquatic) { aquaticDome(ctx, s, lw, palette, t); ctx.save(); ctx.scale(.6, .6); ctx.translate(0, -s * .25); fn(ctx, s, lw, palette, t); ctx.restore(); }
    else fn(ctx, s, lw, palette, t);
  }
  // pastille de niveau
  if (level) {
    ctx.beginPath(); ctx.arc(s * .92, -s * .1, s * .38, 0, 6.28);
    ctx.fillStyle = '#FFC24B'; ctx.fill(); ctx.lineWidth = lw * .55; ctx.strokeStyle = INK; ctx.stroke();
    ctx.font = `400 ${Math.round(s * .52)}px "Lilita One", Arial Black, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3A2600';
    ctx.fillText(String(level), s * .92, -s * .06);
  }
  // Marteau du chantier (amelioration d'un batiment deja construit). Dessine, pas ecrit :
  // c'etait le dernier emoji du jeu rendu au canvas (bible §9).
  if (busy && level) {
    const bob = Math.sin(t * 4) * s * .12, y0 = -s * 2.1 + bob, k = s * .34;
    ctx.save(); ctx.translate(0, y0); ctx.rotate(-.5 + Math.sin(t * 4) * .35);
    ctx.lineJoin = 'round'; ctx.lineWidth = lw * .7; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.roundRect(-k * .30, -k * .1, k * .6, k * 2.0, k * .16);
    ctx.fillStyle = '#C97A3E'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-k * 1.05, -k * .85, k * 2.1, k * .8, k * .2);
    ctx.fillStyle = '#8B8C86'; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
