// LA VIE DE LA COLONIE — ce qui sépare une illustration d'un monde.
//
// Constat du diagnostic : le jeu n'a pas un problème de qualité d'image, il a un problème de
// RÉACTION. Un jeu médiocrement dessiné qui répond à toi paraît vivant ; un jeu magnifique qui
// reste immobile paraît mort. Ce module fournit les quatre choses qui répondent :
//   1. l'heure RÉELLE — la colonie dort quand tu dors ;
//   2. la journée saisie — la scène change dans l'heure, sans un seul chiffre à lire ;
//   3. la faune qui ne t'appartient pas — elle passe, elle ne t'obéit pas ;
//   4. la parallaxe — le décor a une profondeur, donc une caméra.
//
// Rien ici ne coûte un asset : ce sont des aplats, des positions et du temps.
import { shade } from './style.js';

// ---------------------------------------------------------------------------
// 1. LA LUMIÈRE DU JOUR RÉEL
// Aube 6 h, plein jour 9 h → 17 h, crépuscule 21 h. On ne calcule pas la course du soleil à la
// latitude : ce qui compte, c'est qu'ouvrir l'app à 23 h montre une colonie endormie.
// ---------------------------------------------------------------------------
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (v) => v * v * (3 - 2 * v);

export function daylight(now = new Date()) {
  const hh = now.getHours() + now.getMinutes() / 60;
  let k;                                        // 0 = nuit noire, 1 = plein jour
  if (hh < 5 || hh >= 22.5) k = 0;
  else if (hh < 8) k = smooth((hh - 5) / 3);
  else if (hh < 18) k = 1;
  else if (hh < 22.5) k = 1 - smooth((hh - 18) / 4.5);
  else k = 0;
  const dusk = clamp(1 - Math.abs(hh - 19.5) / 2.5, 0, 1) + clamp(1 - Math.abs(hh - 6.8) / 2, 0, 1);
  return {
    k,                                          // intensité de la lumière
    dusk: clamp(dusk, 0, 1),                    // proximité d'un lever/coucher : la couleur chaude
    nuit: 1 - k,
    heure: hh,
    // Position de l'astre sur son arc, 0 (est) → 1 (ouest). Le soleil le jour, la lune la nuit.
    arc: k > 0.02 ? clamp((hh - 5.5) / 16.5, 0, 1) : clamp(((hh + 24 - 22) % 24) / 7.5, 0, 1)
  };
}

// ---------------------------------------------------------------------------
// 2. L'HUMEUR DU JOUR — la scène lit ta semaine
// -1 = plusieurs jours manqués, 0 = ordinaire, +1 = journée parfaite. Aucun texte : la lumière,
// la densité de passage et la brume disent tout.
// ---------------------------------------------------------------------------
export function humeur(state, config) {
  const days = state?.days || {};
  const keys = Object.keys(days).filter(k => days[k]?.submittedAt).sort();
  if (!keys.length) return { v: 0, jours: 0, parfait: false };
  const cap = config?.habits?.elan_perfect_day || 166;
  let v = 0, n = 0;
  const today = keys[keys.length - 1];
  // Les trois derniers jours saisis, le plus récent pesant le double.
  for (let i = 0; i < 3 && i < keys.length; i++) {
    const rec = days[keys[keys.length - 1 - i]];
    const part = clamp(((rec?.elan || 0) / cap) * 1.6 - 0.5, -0.6, 1);
    const w = i === 0 ? 2 : 1; v += part * w; n += w;
  }
  const manques = state?.streak?.missedRecent || 0;
  return {
    v: clamp(v / n - manques * 0.25, -1, 1),
    jours: keys.length,
    parfait: (days[today]?.elan || 0) >= cap * 0.95
  };
}

// ---------------------------------------------------------------------------
// 3. LE CIEL : astre, étoiles, voile de nuit
// ---------------------------------------------------------------------------
export function drawCiel(ctx, g, p, t, L) {
  const hz = g.h * 0.34;
  // Étoiles : elles n'apparaissent qu'avec la nuit, et scintillent lentement.
  if (L.nuit > 0.15) {
    ctx.save(); ctx.globalAlpha = L.nuit * 0.9;
    for (let i = 0; i < 34; i++) {
      const sx = ((i * 137.5) % 100) / 100 * g.w;
      const sy = ((i * 71.3) % 100) / 100 * hz;
      const tw = 0.55 + 0.45 * Math.sin(t * 0.7 + i * 2.1);
      ctx.globalAlpha = L.nuit * 0.85 * tw;
      ctx.fillStyle = i % 9 === 0 ? '#FFE9B8' : '#F4F1E8';
      const r = i % 11 === 0 ? 1.9 : 1.1;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }
  // L'astre : un aplat franc, jamais un halo dégradé.
  const ax = g.w * (0.10 + L.arc * 0.80), ay = hz * (1.02 - Math.sin(L.arc * Math.PI) * 0.78);
  const jour = L.k > 0.06;
  const col = jour ? (L.dusk > 0.4 ? '#FF9C5B' : '#FFF0C0') : '#DDE6F2';
  const r = jour ? 13 : 10;
  ctx.save();
  for (let i = 3; i >= 1; i--) { ctx.globalAlpha = (jour ? 0.10 : 0.045) * i * (0.4 + L.k * 0.6); ctx.beginPath(); ctx.arc(ax, ay, r * (1 + i * 0.55), 0, 6.28); ctx.fillStyle = col; ctx.fill(); }
  ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(ax, ay, r, 0, 6.28); ctx.fillStyle = col; ctx.fill();
  if (!jour) { ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(ax - r * 0.42, ay - r * 0.22, r * 0.86, 0, 6.28); ctx.fill(); }
  ctx.restore();
}

// Le voile : une seule couche par-dessus toute la scène. Froide la nuit, chaude au crépuscule.
// C'est elle qui fait que la même colonie n'a pas la même tête à 8 h et à 23 h.
export function drawVoile(ctx, g, L, H) {
  // Les palettes des dix ages sont sombres par principe. Sans un leger relevement a midi, la
  // colonie a la meme tete a 9 h et a 23 h — et le cycle ne sert alors a rien.
  if (L.k > 0.35 && L.dusk < 0.5) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = (L.k - 0.35) / 0.65 * 0.22;
    ctx.fillStyle = '#FFE8B8'; ctx.fillRect(0, 0, g.w, g.h); ctx.restore();
  }
  if (L.nuit > 0.03) {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = L.nuit * 0.62;
    ctx.fillStyle = '#2A3A6B'; ctx.fillRect(0, 0, g.w, g.h); ctx.restore();
  }
  if (L.dusk > 0.05 && L.k > 0.04) {
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = L.dusk * 0.30;
    ctx.fillStyle = '#FF9C5B'; ctx.fillRect(0, 0, g.h > 0 ? g.w : 0, g.h); ctx.restore();
  }
  // La brume des jours manqués. Jamais un message, jamais un reproche : le monde attend.
  if (H && H.v < -0.15) {
    const b = clamp((-H.v - 0.15) / 0.85, 0, 1);
    ctx.save(); ctx.globalAlpha = b * 0.38;
    ctx.fillStyle = '#8FA3B8';
    for (let i = 0; i < 3; i++) {
      const y = g.h * (0.42 + i * 0.19);
      ctx.beginPath(); ctx.ellipse(g.w * 0.5, y, g.w * 0.75, g.h * (0.10 + i * 0.02), 0, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  }
}

// Les motes d'une journée parfaite : elles montent lentement, elles ne disent rien.
export function drawFete(ctx, g, t, H, p) {
  if (!H || H.v < 0.55) return;
  const n = Math.round(10 + H.v * 14);
  ctx.save(); ctx.globalAlpha = 0.55 * clamp((H.v - 0.55) / 0.45, 0, 1);
  for (let i = 0; i < n; i++) {
    const x = ((i * 53.7) % 100) / 100 * g.w + Math.sin(t * 0.6 + i) * 9;
    const y = g.h - ((t * (9 + i % 6) + i * 41) % (g.h * 1.05));
    ctx.fillStyle = i % 3 ? '#FFC24B' : p.tint;
    ctx.beginPath(); ctx.arc(x, y, 1.6 + (i % 3) * 0.7, 0, 6.28); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. LA FAUNE QUI NE T'APPARTIENT PAS
// Elle traverse, elle ne s'arrête pas, tu ne peux rien en faire. C'est exactement pour ça
// qu'elle fait monde : tout ce qui bouge à l'écran n'est pas à toi.
// ---------------------------------------------------------------------------
export function newFaune() { return { bancs: [], next: 2 }; }

export function stepFaune(F, g, dt, aquatic, L) {
  F.next -= dt;
  if (F.next <= 0) {
    F.next = 5 + Math.random() * 13;
    const nuit = L.nuit > 0.55;
    const dir = Math.random() < 0.5 ? 1 : -1;
    F.bancs.push({
      kind: aquatic ? 'banc' : (nuit ? 'chauve' : (Math.random() < 0.45 ? 'oiseaux' : 'insectes')),
      x: dir > 0 ? -40 : g.w + 40, dir,
      y: g.h * (aquatic ? 0.25 + Math.random() * 0.5 : (Math.random() < 0.5 ? 0.12 + Math.random() * 0.14 : 0.62 + Math.random() * 0.25)),
      v: 18 + Math.random() * 42, n: 3 + Math.floor(Math.random() * 6),
      seed: Math.random() * 100, life: 0
    });
    if (F.bancs.length > 4) F.bancs.shift();
  }
  for (const b of F.bancs) { b.x += b.dir * b.v * dt; b.life += dt; }
  F.bancs = F.bancs.filter(b => b.x > -90 && b.x < g.w + 90);
}

export function drawFaune(ctx, F, g, t, p, L) {
  for (const b of F.bancs) {
    ctx.save();
    const col = b.kind === 'chauve' ? '#1B2130' : b.kind === 'oiseaux' ? shade(p.bg, -0.35)
      : b.kind === 'insectes' ? '#FFD98A' : shade(p.tint, -0.18);
    ctx.globalAlpha = b.kind === 'insectes' ? 0.55 + 0.35 * Math.sin(t * 4 + b.seed) : (0.5 + 0.4 * L.k);
    ctx.fillStyle = col;
    for (let i = 0; i < b.n; i++) {
      const ox = -b.dir * i * (b.kind === 'banc' ? 11 : 15);
      const oy = Math.sin(t * (b.kind === 'insectes' ? 6 : 2.6) + i * 1.3 + b.seed) * (b.kind === 'banc' ? 4 : 7);
      const x = b.x + ox, y = b.y + oy;
      if (b.kind === 'banc') {                        // poisson : un chevron plein
        ctx.beginPath(); ctx.moveTo(x + b.dir * 5, y); ctx.lineTo(x - b.dir * 4, y - 2.6); ctx.lineTo(x - b.dir * 2, y); ctx.lineTo(x - b.dir * 4, y + 2.6); ctx.closePath(); ctx.fill();
      } else if (b.kind === 'insectes') {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 6.28); ctx.fill();
      } else {                                        // aile : deux traits, la silhouette suffit
        const f = Math.sin(t * 7 + i * 0.9 + b.seed) * 4;
        ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - 5, y + f * 0.4); ctx.lineTo(x, y - f * 0.5); ctx.lineTo(x + 5, y + f * 0.4); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// 5. LES PORTEURS — l'économie rendue visible
// Un porteur ne se promène pas : il va chercher une ressource dans un bâtiment et la rapporte
// au Cœur. Quand la production monte, la route se charge. C'est le plaisir d'OGame, en image.
// ---------------------------------------------------------------------------
export function stepPorteurs(list, g, dt, sites, rythme) {
  for (const w of list) {
    if (w.wait > 0) { w.wait -= dt; continue; }
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d < 4) {
      if (w.phase === 'aller') {
        // Arrivé au bâtiment : il charge, puis rentre au Cœur.
        w.phase = 'retour'; w.charge = w.site?.res || null;
        w.wait = 0.35 + Math.random() * 0.8;
        w.tx = g.cx + (Math.random() - 0.5) * g.rx * 0.30;
        w.ty = g.cy + (Math.random() - 0.5) * g.ry * 0.30;
      } else {
        // Arrivé au Cœur : il dépose, souffle, et repart vers un autre bâtiment.
        w.phase = 'aller'; w.charge = null;
        w.wait = 0.6 + Math.random() * 1.6;
        const s = sites.length ? sites[Math.floor(Math.random() * sites.length)] : null;
        w.site = s;
        w.tx = s ? s.x + (Math.random() - 0.5) * 16 : g.cx + (Math.random() - 0.5) * g.rx;
        w.ty = s ? s.y + (Math.random() - 0.5) * 10 : g.cy + (Math.random() - 0.5) * g.ry;
      }
      continue;
    }
    w.facing = dx >= 0 ? 1 : -1;
    const v = w.speed * (w.charge ? 0.78 : 1) * rythme;   // chargé, on avance moins vite
    w.x += (dx / d) * v * dt;
    w.y += (dy / d) * v * dt;
  }
}

// La cargaison : un petit bloc de la couleur de la ressource, posé au-dessus du porteur.
// C'est le seul détail qui transforme un promeneur en économie.
export function drawCharge(ctx, w, size, couleurs) {
  if (!w.charge) return;
  const c = couleurs[w.charge] || '#E0A045';
  const s = size * 0.24, y = w.y - size * 0.92 + Math.sin(w.x * 0.08) * 1.2;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(w.x - s / 2, y - s / 2, s, s, s * 0.24);
  ctx.fillStyle = c; ctx.fill();
  ctx.lineWidth = Math.max(1.4, size * 0.055); ctx.strokeStyle = '#171B23'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
