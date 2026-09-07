// L'equipement de la race : ce que chaque individu porte, selon son ROLE et son PALIER DE STADE.
//
// L'idee de design : un archetype se reconnait a son arme, et cette arme evolue avec la civilisation.
// Le meme "Brute" porte un aiguillon quand tu es une cellule, des griffes quand tu es une bete,
// une hache de silex a la Meute, une epee d'acier a la Cite, une lame d'energie chez les Galactiques.
// C'est la sensation Spore : ce n'est pas une autre unite, c'est la MEME lignee qui a appris.
//
// Anime par `atk` : temps ecoule depuis la derniere frappe, normalise sur l'intervalle d'attaque
// de l'unite (0 = vient de frapper, 1 = va frapper). On en tire trois temps — anticipation,
// frappe, recuperation — au lieu d'un balancement continu qui ne veut rien dire.
// `atk === null` = pas de cible : l'arme respire doucement.
const INK = '#171B23';

// Paliers d'equipement par stade. 5 paliers pour 10 stades.
export const GEAR_TIERS = [
  { id: 'organique', name: 'Organique', stages: [1, 2], metal: '#8FD4C1', wood: '#5FA88F', accent: '#B6F2E0' },
  { id: 'naturel', name: 'Naturel', stages: [3], metal: '#E8DCC0', wood: '#8A6A44', accent: '#FFF3D6' },
  { id: 'taille', name: 'Taillé', stages: [4, 5], metal: '#B8C0CC', wood: '#C99464', accent: '#E8EEF5' },
  { id: 'forge', name: 'Forgé', stages: [6, 7], metal: '#D6DEE8', wood: '#6E5138', accent: '#FFFFFF' },
  { id: 'energie', name: 'Énergie', stages: [8, 9, 10], metal: '#9FE8FF', wood: '#3C5A78', accent: '#FFFFFF' }
];
export function tierForStage(stage) {
  for (let i = 0; i < GEAR_TIERS.length; i++) if (GEAR_TIERS[i].stages.includes(stage)) return i;
  return GEAR_TIERS.length - 1;
}

// --- courbes d'animation -------------------------------------------------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => v * v * (3 - 2 * v);
// Trois temps a partir de `atk` (0..1, 0 = vient de frapper).
export function swingPhase(atk, t = 0) {
  if (atk === null || atk === undefined) return { wind: 0, strike: 0, idle: Math.sin(t * 2) * 0.08 };
  const a = clamp01(atk);
  const wind = a > 0.7 ? smooth((a - 0.7) / 0.3) : 0;          // anticipation : le bras recule
  const strike = a < 0.22 ? 1 - smooth(a / 0.22) : 0;           // frappe puis recuperation
  return { wind, strike, idle: 0 };
}
// Rotation du bras porteur, en radians (positif = vers l'avant).
export function armSwing(atk, t = 0, role = 'melee') {
  const p = swingPhase(atk, t);
  if (role === 'ranged') return -p.wind * 0.35 + p.strike * 0.15 + p.idle * 0.5;
  if (role === 'support') return -p.wind * 0.5 - p.strike * 0.7 + p.idle * 0.5;
  if (role === 'tank') return -p.wind * 0.25 + p.strike * 0.55 + p.idle * 0.3;
  return -p.wind * 1.0 + p.strike * 1.5 + p.idle;
}

function stroked(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }

// Traînee de frappe : l'arc blanc qui rend un coup lisible a 40 px de haut.
function trail(ctx, r, lw, strength) {
  if (strength <= 0.05) return;
  ctx.save();
  ctx.globalAlpha = strength * 0.55;
  // Arc court, cale sur la lame et oriente vers le haut-avant : une trainee, pas un croissant.
  ctx.beginPath(); ctx.arc(0, -r * 0.35, r, -2.5, -1.0);
  ctx.lineWidth = lw * 1.1; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}

// -------------------------------------------------------------------------
// drawGear : dessine l'arme dans le repere de la MAIN (0,0 = poing, +x vers l'avant).
// A = contexte de rendu de creature.js ; opts = { role, tier, atk, t }
// -------------------------------------------------------------------------
export function drawGear(A, opts = {}) {
  const { ctx, size, lw } = A;
  const role = opts.role || 'melee';
  const ti = Math.max(0, Math.min(GEAR_TIERS.length - 1, opts.tier ?? 2));
  const T = GEAR_TIERS[ti];
  const p = swingPhase(opts.atk, opts.t || 0);
  const S = size;
  ctx.save();
  if (role === 'ranged') drawRanged(ctx, S, lw, T, ti, p, opts.t || 0);
  else if (role === 'support') drawSupport(ctx, S, lw, T, ti, p, opts.t || 0);
  else if (role === 'tank') drawTank(ctx, S, lw, T, ti, p);
  else drawMelee(ctx, S, lw, T, ti, p);
  ctx.restore();
}

// --- MÊLÉE : aiguillon -> griffes -> hache de silex -> épée -> lame d'énergie
function drawMelee(ctx, S, lw, T, ti, p) {
  ctx.rotate(-0.35);
  trail(ctx, S * 0.2, lw, p.strike);
  if (ti === 0) {                                   // aiguillon organique, recourbe
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(S * 0.06, -S * 0.16, S * 0.02, -S * 0.3);
    ctx.quadraticCurveTo(-S * 0.03, -S * 0.16, 0, 0);
    stroked(ctx, T.metal, lw * 0.9);
    ctx.beginPath(); ctx.arc(S * 0.02, -S * 0.3, S * 0.018, 0, 6.28); ctx.fillStyle = T.accent; ctx.fill();
  } else if (ti === 1) {                            // trois griffes
    for (const d of [-1, 0, 1]) {
      ctx.beginPath(); ctx.moveTo(d * S * 0.05, 0);
      ctx.quadraticCurveTo(d * S * 0.11, -S * 0.14, d * S * 0.07, -S * 0.26);
      ctx.quadraticCurveTo(d * S * 0.02, -S * 0.13, d * S * 0.05, 0);
      stroked(ctx, T.metal, lw * 0.7);
    }
  } else if (ti === 2) {                            // hache de silex : manche + tete asymetrique
    ctx.beginPath(); ctx.moveTo(0, S * 0.05); ctx.lineTo(0, -S * 0.26);
    ctx.lineWidth = lw * 1.5; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = lw * 0.7; ctx.strokeStyle = T.wood; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-S * 0.02, -S * 0.19); ctx.lineTo(S * 0.13, -S * 0.28);
    ctx.lineTo(S * 0.09, -S * 0.36); ctx.lineTo(-S * 0.03, -S * 0.3); ctx.closePath();
    stroked(ctx, T.metal, lw * 0.8);
  } else if (ti === 3) {                            // epee : garde + lame + pommeau
    ctx.beginPath(); ctx.moveTo(0, S * 0.04); ctx.lineTo(0, -S * 0.1);
    ctx.lineWidth = lw * 1.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = lw * 0.65; ctx.strokeStyle = T.wood; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-S * 0.08, -S * 0.1); ctx.lineTo(S * 0.08, -S * 0.1);
    ctx.lineWidth = lw * 0.9; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-S * 0.045, -S * 0.11); ctx.lineTo(S * 0.045, -S * 0.11);
    ctx.lineTo(S * 0.02, -S * 0.38); ctx.lineTo(0, -S * 0.42); ctx.lineTo(-S * 0.02, -S * 0.38); ctx.closePath();
    stroked(ctx, T.metal, lw * 0.8);
    ctx.beginPath(); ctx.moveTo(0, -S * 0.13); ctx.lineTo(0, -S * 0.37);
    ctx.lineWidth = lw * 0.3; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
  } else {                                          // lame d'energie : halo + lame translucide
    ctx.save(); ctx.globalAlpha = 0.35 + p.strike * 0.4;
    ctx.beginPath(); ctx.moveTo(-S * 0.05, -S * 0.1); ctx.lineTo(S * 0.05, -S * 0.1); ctx.lineTo(0, -S * 0.48); ctx.closePath();
    ctx.fillStyle = T.metal; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-S * 0.025, -S * 0.11); ctx.lineTo(S * 0.025, -S * 0.11); ctx.lineTo(0, -S * 0.44); ctx.closePath();
    stroked(ctx, T.accent, lw * 0.5);
    ctx.beginPath(); ctx.arc(0, -S * 0.06, S * 0.035, 0, 6.28); stroked(ctx, T.wood, lw * 0.6);
  }
}

// --- TANK : plaque -> carapace -> pavois -> écu -> barrière
function drawTank(ctx, S, lw, T, ti, p) {
  const raise = p.wind * 0.25 + p.strike * 0.45;
  ctx.translate(S * 0.02, -raise * S * 0.06);
  if (ti === 0) {                                   // plaque de membrane, molle
    ctx.beginPath(); ctx.ellipse(0, 0, S * 0.1, S * 0.17, 0.2, 0, 6.28); stroked(ctx, T.metal, lw);
    ctx.beginPath(); ctx.ellipse(0, 0, S * 0.05, S * 0.1, 0.2, 0, 6.28); ctx.fillStyle = T.accent + '99'; ctx.fill();
  } else if (ti === 1) {                            // carapace nervuree
    ctx.beginPath(); ctx.ellipse(0, 0, S * 0.11, S * 0.16, 0, 0, 6.28); stroked(ctx, T.wood, lw);
    for (const d of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(-S * 0.09, d * S * 0.11); ctx.lineTo(S * 0.09, d * S * 0.11); ctx.lineWidth = lw * 0.4; ctx.strokeStyle = INK; ctx.stroke(); }
  } else if (ti === 2) {                            // pavois de bois : planches + renfort
    ctx.beginPath(); ctx.roundRect(-S * 0.1, -S * 0.17, S * 0.2, S * 0.34, S * 0.03); stroked(ctx, T.wood, lw);
    for (const d of [-0.055, 0.02]) { ctx.beginPath(); ctx.moveTo(d * S, -S * 0.16); ctx.lineTo(d * S, S * 0.16); ctx.lineWidth = lw * 0.35; ctx.strokeStyle = INK; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-S * 0.1, 0); ctx.lineTo(S * 0.1, 0); ctx.lineWidth = lw * 0.5; ctx.strokeStyle = T.metal; ctx.stroke();
  } else if (ti === 3) {                            // ecu en goutte + umbo
    ctx.beginPath(); ctx.moveTo(-S * 0.1, -S * 0.16); ctx.lineTo(S * 0.1, -S * 0.16);
    ctx.quadraticCurveTo(S * 0.11, S * 0.06, 0, S * 0.2); ctx.quadraticCurveTo(-S * 0.11, S * 0.06, -S * 0.1, -S * 0.16); ctx.closePath();
    stroked(ctx, T.metal, lw);
    ctx.beginPath(); ctx.arc(0, -S * 0.02, S * 0.04, 0, 6.28); stroked(ctx, T.wood, lw * 0.6);
  } else {                                          // barriere hexagonale
    ctx.save(); ctx.globalAlpha = 0.55 + p.strike * 0.35;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; const px = Math.cos(a) * S * 0.11, py = Math.sin(a) * S * 0.18; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); stroked(ctx, T.metal, lw * 0.7); ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, S * 0.03, 0, 6.28); ctx.fillStyle = T.accent; ctx.fill();
  }
}

// --- DISTANCE : siphon -> dard -> fronde -> arc -> canon
function drawRanged(ctx, S, lw, T, ti, p, t) {
  const pull = p.wind;                              // la corde recule a l'anticipation
  const kick = p.strike;                            // recul a la detente
  ctx.translate(-kick * S * 0.05, 0);
  if (ti === 0) {                                   // siphon : tube organique qui gonfle
    ctx.beginPath(); ctx.moveTo(-S * 0.02, 0); ctx.quadraticCurveTo(S * 0.1, -S * 0.03, S * 0.19, 0);
    ctx.lineWidth = lw * (1.5 + pull * 0.9); ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = lw * (0.7 + pull * 0.6); ctx.strokeStyle = T.metal; ctx.stroke();
    if (kick > 0.2) { ctx.beginPath(); ctx.arc(S * 0.24, 0, S * 0.03 * kick, 0, 6.28); ctx.fillStyle = T.accent; ctx.fill(); }
  } else if (ti === 1) {                            // dard : aiguillon lanceur
    ctx.beginPath(); ctx.moveTo(0, S * 0.05); ctx.lineTo(S * 0.26 - pull * S * 0.04, 0); ctx.lineTo(0, -S * 0.05); ctx.closePath();
    stroked(ctx, T.wood, lw * 0.8);
    ctx.beginPath(); ctx.moveTo(S * 0.26, 0); ctx.lineTo(S * 0.38, 0); ctx.lineWidth = lw * 0.9; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = lw * 0.45; ctx.strokeStyle = T.metal; ctx.stroke();
  } else if (ti === 2) {                            // fronde : lanieres qui tournent
    const spin = t * 6 + pull * 3;
    const bx = Math.cos(spin) * S * 0.26, byy = Math.sin(spin) * S * 0.26;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx, byy);
    ctx.lineWidth = lw * 0.9; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = lw * 0.4; ctx.strokeStyle = T.wood; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, byy, S * 0.06, 0, 6.28); stroked(ctx, T.metal, lw * 0.7);
  } else if (ti === 3) {                            // arc : fut + corde qui se bande
    ctx.beginPath(); ctx.arc(S * 0.02, 0, S * 0.16, -1.35, 1.35);
    ctx.lineWidth = lw * 1.3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = lw * 0.6; ctx.strokeStyle = T.wood; ctx.stroke();
    const y0 = -Math.sin(1.35) * S * 0.16, x0 = S * 0.02 + Math.cos(1.35) * S * 0.16;
    const nock = -S * 0.02 - pull * S * 0.09;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(nock, 0); ctx.lineTo(x0, -y0);
    ctx.lineWidth = lw * 0.35; ctx.strokeStyle = '#F4F1E8'; ctx.stroke();
    if (pull > 0.15) { ctx.beginPath(); ctx.moveTo(nock, 0); ctx.lineTo(nock + S * 0.22, 0); ctx.lineWidth = lw * 0.4; ctx.strokeStyle = T.metal; ctx.stroke(); }
  } else {                                          // canon a plasma : bouche + eclair de tir
    ctx.beginPath(); ctx.roundRect(-S * 0.03, -S * 0.05, S * 0.24, S * 0.1, S * 0.02); stroked(ctx, T.wood, lw * 0.8);
    ctx.beginPath(); ctx.arc(S * 0.21, 0, S * 0.045, 0, 6.28); stroked(ctx, T.metal, lw * 0.6);
    if (kick > 0.15) { ctx.save(); ctx.globalAlpha = kick; ctx.beginPath(); ctx.arc(S * 0.26, 0, S * 0.07 * kick, 0, 6.28); ctx.fillStyle = T.accent; ctx.fill(); ctx.restore(); }
  }
}

// --- SOUTIEN : bulbe -> fleur -> bâton à fétiche -> caducée -> orbe
function drawSupport(ctx, S, lw, T, ti, p, t) {
  const pulse = 1 + Math.sin(t * 4) * 0.08 + p.strike * 0.35;
  const glow = 0.4 + p.strike * 0.6;
  if (ti === 0) {                                   // bulbe lumineux au bout d'une tige molle
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(S * 0.03, -S * 0.12, 0, -S * 0.22);
    ctx.lineWidth = lw * 1.1; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = lw * 0.5; ctx.strokeStyle = T.wood; ctx.stroke();
  } else if (ti === 1) {                            // fleur symbiotique : petales
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -S * 0.2);
    ctx.lineWidth = lw * 1.1; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = lw * 0.5; ctx.strokeStyle = T.wood; ctx.stroke();
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + t * 0.4; ctx.beginPath(); ctx.ellipse(Math.cos(a) * S * 0.05, -S * 0.24 + Math.sin(a) * S * 0.05, S * 0.035, S * 0.022, a, 0, 6.28); stroked(ctx, '#F2A6C8', lw * 0.4); }
  } else if (ti === 2) {                            // baton a fetiche : os + plume
    ctx.beginPath(); ctx.moveTo(0, S * 0.04); ctx.lineTo(0, -S * 0.26);
    ctx.lineWidth = lw * 1.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = lw * 0.65; ctx.strokeStyle = T.wood; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-S * 0.06, -S * 0.24); ctx.lineTo(S * 0.06, -S * 0.28);
    ctx.lineWidth = lw * 0.8; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = lw * 0.4; ctx.strokeStyle = T.metal; ctx.stroke();
  } else if (ti === 3) {                            // caducee a gemme
    ctx.beginPath(); ctx.moveTo(0, S * 0.04); ctx.lineTo(0, -S * 0.24);
    ctx.lineWidth = lw * 1.4; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = lw * 0.65; ctx.strokeStyle = T.wood; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -S * 0.29, S * 0.05, 0, 6.28); ctx.lineWidth = lw * 0.7; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = lw * 0.35; ctx.strokeStyle = T.metal; ctx.stroke();
  }
  // gemme / halo commun (l'orbe du palier 4 flotte sans tige)
  const gy = ti === 4 ? -S * 0.24 : (ti === 0 ? -S * 0.26 : ti === 1 ? -S * 0.24 : -S * 0.31);
  ctx.save(); ctx.globalAlpha = glow;
  const g = ctx.createRadialGradient(0, gy, 1, 0, gy, S * 0.16 * pulse);
  g.addColorStop(0, '#45D95E'); g.addColorStop(1, '#45D95E00');
  ctx.beginPath(); ctx.arc(0, gy, S * 0.16 * pulse, 0, 6.28); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, gy, S * 0.045 * pulse, 0, 6.28); stroked(ctx, '#45D95E', lw * 0.55);
  ctx.beginPath(); ctx.arc(-S * 0.015, gy - S * 0.015, S * 0.015, 0, 6.28); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  // onde de soin a la frappe
  if (p.strike > 0.1) {
    ctx.save(); ctx.globalAlpha = p.strike * 0.7;
    ctx.beginPath(); ctx.arc(0, gy, S * 0.2 * (1.4 - p.strike), 0, 6.28);
    ctx.lineWidth = lw * 0.6; ctx.strokeStyle = '#45D95E'; ctx.stroke(); ctx.restore();
  }
}
