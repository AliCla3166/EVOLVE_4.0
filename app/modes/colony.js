// La Colonie — incremental / gestion (Travian x Worldbox).
// 12 sockets autour du Coeur, chantiers a timers, cumul hors-ligne, contrats du jour.
// ZERO nombre en dur : toute l'economie vient de config.colony et config.stages.
import { config, stageOf } from '../core/config.js';
import { state, save } from '../core/state.js';
import { dayKey, fmtDuration } from '../core/clock.js';
import { makeRng } from '../core/rng.js';
import { speciesMods, mult, speciesVisual } from '../core/genome.js';
import { spend, canAfford, progressContract } from '../core/progress.js';
import { h, fmt, btn, panel, bar, toast, modal } from '../core/ui.js';
import { drawCreature, shade } from '../render/creature.js';
import { drawBuilding as drawBuildingArt } from '../render/buildings.js';

const INK = '#171B23';
const MS_H = 3600e3;               // millisecondes dans une heure
const OFFLINE_REPORT_MIN_MS = 5 * 60e3; // au-dela de 5 min d'absence, on montre un rapport
const MAP_HEIGHT = 230;            // hauteur de la carte de colonie, en px CSS
const RING_SLOTS = 12;             // 12 positions fixes autour du Coeur
const CORE_COST_REF_MULT = 3;      // le Coeur coute 3x le premier producteur (batiment de reference)

// ---------------------------------------------------------------- helpers data
function C() { return config.colony; }
function stage() { return stageOf(state.species.stage); }
function stageIndex() { return Math.min(state.species.stage, config.stages.stages.length) - 1; }
function skinName(names) { return names[Math.min(stageIndex(), names.length - 1)]; }
function defOf(id) { return C().buildings.find(b => b.id === id); }
function levelOf(id) { return state.colony.buildings[id]?.level || 0; }
function ratios() { return C().ratios; }

// Cout d'un niveau cible L (L = 1 : construction). Elan + biomasse.
function costFor(def, L) {
  const r = Math.pow(ratios().cost, L - 1);
  return { elan: Math.ceil(def.cost_elan * r), biomasse: Math.ceil(def.cost_bio * r) };
}
// Duree d'un niveau cible L, en millisecondes.
function durationFor(def, L) {
  return def.minutes * Math.pow(ratios().time, L - 1) * 60e3;
}
// Production horaire d'un producteur au niveau L (0 si non construit).
function prodFor(def, L) {
  if (!L || def.type !== 'producer') return 0;
  return def.rate_h * Math.pow(ratios().production, L - 1) * mult(speciesMods(), 'production');
}
function wallHp(def, L) { return L ? def.hp_base + def.hp_per_level * (L - 1) : 0; }
function coreHp(L) { const c = C().core; return c.hp_base + c.hp_per_level * (L - 1); }
// Le Coeur n'est pas dans buildings[] : on le tarife sur le premier producteur x CORE_COST_REF_MULT.
function coreCost(L) {
  const ref = C().buildings[0];
  const c = costFor(ref, L);
  return { elan: Math.ceil(c.elan * CORE_COST_REF_MULT), biomasse: Math.ceil(c.biomasse * CORE_COST_REF_MULT) };
}
function coreDuration(L) { return durationFor(C().buildings[0], L) * CORE_COST_REF_MULT; }
function isCore(id) { return id === C().core.id; }
function nameOf(id) { return isCore(id) ? skinName(C().core.names) : skinName(defOf(id).names); }
function currentLevel(id) { return isCore(id) ? state.colony.coreLevel : levelOf(id); }
function costOf(id, L) { return isCore(id) ? coreCost(L) : costFor(defOf(id), L); }
function durOf(id, L) { return isCore(id) ? coreDuration(L) : durationFor(defOf(id), L); }

function builtCount() { return C().buildings.filter(b => levelOf(b.id) > 0).length; }
function inQueue(id) { return state.colony.queue.some(q => q.id === id); }
function queueFull() { return state.colony.queue.length >= C().max_queue; }

// Production totale par heure, toutes ressources.
export function colonyRates() {
  const out = { biomasse: 0, materiaux: 0, genes: 0 };
  for (const b of C().buildings) {
    if (b.type !== 'producer') continue;
    out[b.resource] = (out[b.resource] || 0) + prodFor(b, levelOf(b.id));
  }
  return out;
}

// ---------------------------------------------------------------- economie (tick)
export function tickColony() {
  const c = state.colony;
  const now = Date.now();
  if (!c.lastTick) c.lastTick = now;
  let elapsed = now - c.lastTick;
  if (elapsed < 0) elapsed = 0;

  // Plafond de cumul hors-ligne (bonus offline_bonus du genome + batiment special).
  // Il ne depend plus des Boucliers de serie : depenser un bouclier ne doit pas punir la Colonie.
  const capH = C().offline_hours * mult(speciesMods(), 'offline_bonus');
  const capMs = capH * MS_H;
  const longAbsence = elapsed > OFFLINE_REPORT_MIN_MS;
  const credited = Math.min(elapsed, capMs);

  const rates = colonyRates();
  const gains = {};
  for (const [k, v] of Object.entries(rates)) {
    const g = v * (credited / MS_H);
    gains[k] = g;
    state.wallet[k] = (state.wallet[k] || 0) + g; // fractions : l'affichage arrondit
  }
  c.lastTick = now;

  if (longAbsence) {
    c.offlineReport = { hours: credited / MS_H, gains };
  }

  // File de chantiers : ce qui est arrive a terme
  let finished = 0;
  for (let i = c.queue.length - 1; i >= 0; i--) {
    const q = c.queue[i];
    if (q.until > now) continue;
    c.queue.splice(i, 1);
    if (isCore(q.id)) { state.colony.coreLevel = q.lvl; }
    else {
      const b = c.buildings[q.id] || (c.buildings[q.id] = { level: 0 });
      b.level = q.lvl;
      delete b.upgradingUntil;
    }
    finished++;
    toast(`🏗️ ${nameOf(q.id)} — niveau ${q.lvl}`, 'green');
  }
  if (finished) { save(); notifyStructure(); }
  return { gains, finished };
}

// Lance un chantier (construction ou amelioration). Renvoie un message d'erreur ou null.
function startBuild(id) {
  const c = state.colony;
  if (queueFull()) return 'File de chantiers pleine.';
  if (inQueue(id)) return 'Ce chantier est déjà en cours.';
  const L = currentLevel(id) + 1;
  const cost = costOf(id, L);
  if (!canAfford(cost)) return 'Élan ou biomasse insuffisants.';
  if (!spend(cost)) return 'Élan ou biomasse insuffisants.';
  const dur = durOf(id, L);
  c.queue.push({ id, lvl: L, until: Date.now() + dur, dur });
  if (!isCore(id)) {
    const b = c.buildings[id] || (c.buildings[id] = { level: 0 });
    b.upgradingUntil = Date.now() + dur;
  }
  progressContract('build', 1); // la progression du contrat se fait au LANCEMENT
  save();
  toast(`⚒️ Chantier lancé : ${nameOf(id)}`, 'gold');
  notifyStructure();
  return null;
}

function rushCost(q) {
  const r = C().rush;
  return q.dur <= r.short_hours * MS_H ? r.rubis_short : r.rubis_long;
}
function rushBuild(q) {
  const cost = rushCost(q);
  if ((state.wallet.rubis || 0) < cost) { toast('Pas assez de 💎 Rubis', 'red'); return; }
  if (!spend({ rubis: cost })) return;
  q.until = Date.now() - 1;
  tickColony();
  save();
}

// ---------------------------------------------------------------- contrats du jour
function rollContracts() {
  const c = state.colony, key = dayKey();
  if (c.contractsDay === key) return;
  const rng = makeRng('contracts' + key);
  const pool = C().contracts.pool;
  const picks = rng.shuffle(pool).slice(0, C().contracts.daily_count);
  c.contracts = picks.map(p => {
    const n = rng.pick(p.n);
    return { id: p.id, kind: p.kind, n, text: p.text.replace('{n}', String(n)), reward: p.reward, progress: 0, done: false };
  });
  c.contractProgress = {};
  c.contractsDay = key;
  save();
}

// ---------------------------------------------------------------- ecran
let root = null, ctxRef = null;
let raf = 0, timer = 0, canvas = null, cctx = null, ro = null;
let walkers = [], startTime = 0;
let onStructure = null;
function notifyStructure() { if (onStructure) onStructure(); }

export function unmount() {
  if (raf) cancelAnimationFrame(raf); raf = 0;
  if (timer) clearInterval(timer); timer = 0;
  if (ro) { ro.disconnect(); ro = null; }
  window.removeEventListener('resize', sizeCanvas);
  onStructure = null; root = null; canvas = null; cctx = null; walkers = [];
}

export function mount(el, ctx) {
  root = el; ctxRef = ctx;
  tickColony();
  rollContracts();

  const map = h('div', { class: 'colony-map' });
  canvas = h('canvas', { style: { height: MAP_HEIGHT + 'px' } });
  map.append(canvas);
  const resPanel = panel(null, h('div', { class: 'res-grid', id: 'col-res' }));
  const queuePanel = panel('⚒️ Chantiers', h('div', { class: 'col gap', id: 'col-queue' }));
  const slotsPanel = panel('🏗️ Bâtiments', h('div', { id: 'col-core' }), h('div', { class: 'slot-grid', id: 'col-slots' }));
  const contractsPanel = panel('📜 Contrats du jour', h('div', { class: 'col gap', id: 'col-contracts' }));
  el.append(map, resPanel, queuePanel, slotsPanel, contractsPanel);

  renderRes(); renderQueue(); renderSlots(); renderContracts();
  onStructure = () => { renderSlots(); renderQueue(); renderRes(); renderContracts(); buildWalkers(); };

  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);
  if (window.ResizeObserver) { ro = new ResizeObserver(sizeCanvas); ro.observe(map); }
  buildWalkers();
  startTime = performance.now();
  cctx = canvas.getContext('2d');
  loop();

  // Rafraichissement leger : on met a jour des textes, jamais tout l'ecran.
  timer = setInterval(() => { renderRes(); tickQueueLabels(); }, 1000);

  showOfflineReport();
}

function showOfflineReport() {
  const rep = state.colony.offlineReport;
  if (!rep) return;
  delete state.colony.offlineReport; save();
  const total = Object.values(rep.gains).reduce((s, v) => s + v, 0);
  if (total < 1) return;
  const rs = C().resources;
  const m = modal(h('div', {},
    h('h2', { class: 'modal-title' }, '🌙 Rapport de la Colonie'),
    h('p', { class: 'modal-text' }, `Ta Colonie a produit pendant ${fmtDuration(rep.hours * MS_H)} d'absence.`),
    h('div', { class: 'res-grid' }, Object.entries(rep.gains).map(([k, v]) => h('div', { class: 'res' },
      h('div', { style: { fontSize: '20px' } }, rs[k]?.icon || ''),
      h('div', { class: 'r-val' }, '+' + fmt(Math.floor(v))),
      h('div', { class: 'r-rate' }, rs[k]?.label || k)))),
    h('div', { style: { height: '12px' } }),
    btn('Parfait', { kind: 'green', cls: 'block', onClick: () => m.close() })));
}

// ---- ressources
function renderRes() {
  const box = root?.querySelector('#col-res'); if (!box) return;
  const rates = colonyRates(); const rs = C().resources;
  const keys = Object.keys(rs);
  if (box.childElementCount !== keys.length) {
    box.innerHTML = '';
    for (const k of keys) box.append(h('div', { class: 'res', 'data-res': k },
      h('div', { style: { fontSize: '18px' } }, rs[k].icon),
      h('div', { class: 'r-val', style: { color: rs[k].color } }, '0'),
      h('div', { class: 'r-rate' }, '')));
  }
  for (const k of keys) {
    const cell = box.querySelector(`[data-res="${k}"]`);
    const v = fmt(Math.floor(state.wallet[k] || 0));
    const r = '+' + fmt(Math.round(rates[k] || 0)) + '/h';
    const vEl = cell.querySelector('.r-val'), rEl = cell.querySelector('.r-rate');
    if (vEl.textContent !== v) vEl.textContent = v;
    if (rEl.textContent !== r) rEl.textContent = r;
  }
  ctxRef?.refreshWallet?.();
}

// ---- file de chantiers
function renderQueue() {
  const box = root?.querySelector('#col-queue'); if (!box) return;
  box.innerHTML = '';
  const q = state.colony.queue;
  if (!q.length) { box.append(h('div', { class: 'muted' }, `Aucun chantier. ${C().max_queue} chantiers simultanés maximum.`)); return; }
  for (const it of q) {
    box.append(h('div', { class: 'queue-item', 'data-q': it.id },
      h('span', { style: { fontSize: '20px' } }, '⚒️'),
      h('div', { class: 'grow' },
        h('div', { style: { fontFamily: 'var(--display)', fontSize: '14px' } }, `${nameOf(it.id)} · niv. ${it.lvl}`),
        h('div', { class: 'muted small q-left' }, fmtDuration(it.until - Date.now()))),
      btn(`💎 ${rushCost(it)}`, { kind: 'gold', size: 'sm', onClick: () => rushBuild(it) })));
  }
  if (q.length < C().max_queue) box.append(h('div', { class: 'muted small' }, `${C().max_queue - q.length} emplacement(s) de chantier libre(s).`));
}
function tickQueueLabels() {
  const box = root?.querySelector('#col-queue'); if (!box) return;
  for (const it of state.colony.queue) {
    const row = box.querySelector(`[data-q="${it.id}"] .q-left`);
    if (row) row.textContent = fmtDuration(it.until - Date.now());
  }
}

// ---- grille des 12 sockets + Coeur
function renderSlots() {
  const grid = root?.querySelector('#col-slots'); if (!grid) return;
  // Coeur
  const coreBox = root.querySelector('#col-core');
  coreBox.innerHTML = '';
  const cid = C().core.id, cl = state.colony.coreLevel;
  coreBox.append(h('div', {
    class: 'card-soft row gap', style: { marginBottom: '10px', cursor: 'pointer' },
    onClick: () => openDetail(cid)
  },
    h('span', { style: { fontSize: '26px' } }, '💠'),
    h('div', { class: 'grow' },
      h('div', { style: { fontFamily: 'var(--display)', fontSize: '15px' } }, `${skinName(C().core.names)} · niv. ${cl}`),
      h('div', { class: 'muted small' }, `${coreHp(cl)} PV — cœur de la Colonie`)),
    h('span', { class: 'muted' }, '›')));

  grid.innerHTML = '';
  const slots = C().buildings.slice().sort((a, b) => a.slot - b.slot);
  for (const def of slots) {
    const lvl = levelOf(def.id);
    const busy = inQueue(def.id);
    const cls = 'slot' + (lvl ? '' : ' empty') + (busy ? ' busy' : '');
    const cost = costFor(def, lvl + 1);
    grid.append(h('div', { class: cls, onClick: () => openDetail(def.id) },
      lvl ? h('span', { class: 's-lvl' }, lvl) : null,
      h('div', { class: 's-name' }, skinName(def.names)),
      h('div', { class: 's-info' }, effectLabel(def, lvl)),
      h('div', { class: 's-info', style: { marginTop: 'auto' } }, busy ? '⚒️ en chantier' : `⚡${fmt(cost.elan)}${cost.biomasse ? ' 🍖' + fmt(cost.biomasse) : ''}`)));
  }
}
function effectLabel(def, lvl) {
  if (def.type === 'producer') {
    const rs = C().resources[def.resource];
    return lvl ? `${rs.icon} +${fmt(Math.round(prodFor(def, lvl)))}/h` : `${rs.icon} production`;
  }
  if (def.type === 'wall') return lvl ? `🛡️ ${fmt(wallHp(def, lvl))} PV` : '🛡️ défense';
  return lvl ? `+${lvl * def.pct_per_level} % ${statLabel(def.effect)}` : `+${def.pct_per_level} % ${statLabel(def.effect)}`;
}
function statLabel(k) {
  return {
    ration_rate: 'vitesse de ration', unit_hp: 'PV des unités', unit_damage: 'dégâts des unités',
    offline_bonus: 'cumul hors-ligne', turret_damage: 'dégâts des tourelles', production: 'production'
  }[k] || k;
}

// ---- modale de detail
function openDetail(id) {
  const core = isCore(id);
  const def = core ? null : defOf(id);
  const lvl = currentLevel(id);
  const L = lvl + 1;
  const cost = costOf(id, L);
  const dur = durOf(id, L);
  const busy = inQueue(id);
  const full = queueFull();
  const afford = canAfford(cost);

  const rows = [];
  if (core) rows.push(statRow('Points de vie', coreHp(lvl), coreHp(L)));
  else if (def.type === 'producer') {
    const rs = C().resources[def.resource];
    rows.push(statRow(`${rs.label} par heure`, Math.round(prodFor(def, lvl)), Math.round(prodFor(def, L))));
  } else if (def.type === 'wall') rows.push(statRow('Points de vie', wallHp(def, lvl), wallHp(def, L)));
  else rows.push(statRow(statLabel(def.effect), lvl * def.pct_per_level + ' %', L * def.pct_per_level + ' %'));

  let msg = '';
  if (busy) msg = 'Chantier déjà en cours sur ce bâtiment.';
  else if (full) msg = `File pleine (${C().max_queue} chantiers). Attends ou accélère.`;
  else if (!afford) msg = 'Il te manque de l\'Élan ou de la biomasse. L\'Élan vient du Rituel.';

  const m = modal(h('div', {},
    h('h2', { class: 'modal-title' }, nameOf(id)),
    h('p', { class: 'modal-text' }, describe(id, def, core)),
    h('div', { class: 'card-soft col gap' },
      h('div', { style: { fontFamily: 'var(--display)', fontSize: '15px' } }, lvl ? `Niveau ${lvl} → ${L}` : `Construction (niveau ${L})`),
      ...rows,
      statRow('Coût', '', `⚡ ${fmt(cost.elan)}${cost.biomasse ? '   🍖 ' + fmt(cost.biomasse) : ''}`),
      statRow('Durée', '', fmtDuration(dur))),
    msg ? h('p', { class: 'muted small', style: { marginTop: '10px' } }, msg) : null,
    h('div', { class: 'row gap', style: { marginTop: '12px' } },
      btn('Fermer', { onClick: () => m.close() }),
      btn(lvl ? 'Améliorer' : 'Construire', {
        kind: 'green', cls: 'grow', disabled: !!msg,
        onClick: () => { const err = startBuild(id); if (err) toast(err, 'red'); else m.close(); }
      }))));
}
function statRow(label, from, to) {
  const F = v => typeof v === 'number' ? fmt(v) : String(v); // ne pas passer les libelles dans fmt()
  return h('div', { class: 'row between' },
    h('span', { class: 'muted small' }, label),
    h('span', { style: { fontFamily: 'var(--display)', fontSize: '14px', textAlign: 'right' } },
      (from !== '' && from !== null && from !== undefined) ? `${F(from)} → ${F(to)}` : F(to)));
}
function describe(id, def, core) {
  if (core) return 'Le cœur de la Colonie. Son niveau porte les points de vie de ta base en Défense.';
  if (def.type === 'producer') return C().resources[def.resource].desc;
  if (def.type === 'wall') return 'La muraille du Bastion : elle encaisse avant que les ennemis n\'atteignent le Cœur.';
  return `Bâtiment spécial : +${def.pct_per_level} % de ${statLabel(def.effect)} par niveau, pour toutes les unités de la race.`;
}

// ---- contrats
function renderContracts() {
  const box = root?.querySelector('#col-contracts'); if (!box) return;
  box.innerHTML = '';
  for (const ct of state.colony.contracts) {
    const pct = Math.min(100, (ct.progress / ct.n) * 100);
    const rew = Object.entries(ct.reward).map(([k, v]) => `${{ genes: '🧬', rubis: '💎', biomasse: '🍖', materiaux: '🧱' }[k] || ''}${v}`).join('  ');
    box.append(h('div', { class: 'card-soft col gap' },
      h('div', { class: 'row between' },
        h('span', { style: { fontWeight: 900, fontSize: '13.5px' } }, (ct.done ? '✓ ' : '') + ct.text),
        h('span', { style: { fontFamily: 'var(--display)', color: 'var(--gold)', whiteSpace: 'nowrap' } }, rew)),
      bar(pct, { color: ct.done ? 'var(--green)' : 'var(--gold)', label: `${Math.min(ct.progress, ct.n)} / ${ct.n}`, height: 16 })));
  }
  if (!state.colony.contracts.length) box.append(h('div', { class: 'muted' }, 'Aucun contrat aujourd\'hui.'));
}

// ---------------------------------------------------------------- carte (canvas)
function sizeCanvas() {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 360;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(MAP_HEIGHT * dpr);
  cctx = canvas.getContext('2d');
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function mapGeom() {
  const w = canvas.clientWidth || 360, hh = MAP_HEIGHT;
  return { w, h: hh, cx: w / 2, cy: hh * 0.62, rx: w * 0.30, ry: hh * 0.20 };
}
function isAquatic() { const bp = stage().bodyplan; return bp === 'cell' || bp === 'cluster'; }

function buildWalkers() {
  const g = canvas ? mapGeom() : { cx: 180, cy: 138, rx: 122, ry: 55 };
  const n = Math.max(3, Math.min(6, 3 + Math.floor(builtCount() / 4)));
  const rng = makeRng('walkers' + state.species.seed);
  const next = () => ({ x: g.cx + rng.range(-1.25, 1.25) * g.rx, y: g.cy + rng.range(-0.8, 1.1) * g.ry });
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = next();
    out.push({ x: p.x, y: p.y, tx: next().x, ty: next().y, speed: rng.range(6, 14), facing: 1, wait: rng.range(0, 2) });
  }
  walkers = out;
}
function stepWalkers(dt) {
  const g = mapGeom();
  const rng = Math.random;
  for (const wk of walkers) {
    if (wk.wait > 0) { wk.wait -= dt; continue; }
    const dx = wk.tx - wk.x, dy = wk.ty - wk.y, d = Math.hypot(dx, dy);
    if (d < 3) {
      wk.tx = g.cx + (rng() * 2.5 - 1.25) * g.rx;
      wk.ty = g.cy + (rng() * 1.9 - 0.8) * g.ry;
      wk.wait = 0.5 + rng() * 2.5;
      continue;
    }
    wk.facing = dx >= 0 ? 1 : -1;
    wk.x += (dx / d) * wk.speed * dt;
    wk.y += (dy / d) * wk.speed * dt;
  }
}

function loop() {
  raf = requestAnimationFrame(loop);
  if (!cctx) return;
  const now = performance.now();
  const t = (now - startTime) / 1000;
  const dt = Math.min(0.05, (now - (loop._last || now)) / 1000); loop._last = now;
  stepWalkers(dt);
  drawMap(t);
}

function drawMap(t) {
  const g = mapGeom(); const p = stage().palette; const ctx = cctx;
  ctx.clearRect(0, 0, g.w, g.h);
  if (isAquatic()) drawWater(ctx, g, p, t); else drawLand(ctx, g, p, t);
  drawEnvelope(ctx, g, p);

  // Tout ce qui est pose au sol, trie par profondeur (y croissant = devant)
  const items = [];
  items.push({ y: g.cy, draw: () => drawCore(ctx, g, p, t) });
  for (const def of C().buildings) {
    const lvl = levelOf(def.id); const busy = inQueue(def.id);
    if (!lvl && !busy) continue;
    const a = -Math.PI / 2 + (def.slot / RING_SLOTS) * Math.PI * 2;
    const x = g.cx + Math.cos(a) * g.rx * 1.18, y = g.cy + Math.sin(a) * g.ry * 1.32;
    items.push({ y, draw: () => drawBuildingArt(ctx, { x, y, s: Math.min(g.w * 0.062, 24), shape: def.shape, level: lvl, busy, t, palette: p, aquatic: isAquatic() }) });
  }
  const visual = speciesVisual();
  for (const wk of walkers) items.push({ y: wk.y, draw: () => drawCreature(ctx, visual, { x: wk.x, y: wk.y, size: 34, t, tint: p.tint, facing: wk.facing, pose: wk.wait > 0 ? 'idle' : 'walk' }) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
}

function drawWater(ctx, g, p, t) {
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, g.w, g.h);
  // bandes d'eau en aplats
  ctx.fillStyle = p.bg2; ctx.fillRect(0, g.h * 0.30, g.w, g.h * 0.70);
  ctx.fillStyle = p.ground;
  ctx.beginPath(); ctx.moveTo(0, g.h);
  ctx.lineTo(0, g.h * 0.80);
  for (let x = 0; x <= g.w; x += g.w / 6) ctx.quadraticCurveTo(x + g.w / 12, g.h * 0.74, x + g.w / 6, g.h * 0.80);
  ctx.lineTo(g.w, g.h); ctx.closePath(); ctx.fill();
  // bulles
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  for (let i = 0; i < 14; i++) {
    const bx = ((i * 97) % 100) / 100 * g.w;
    const by = g.h - (((t * (12 + i % 5) + i * 30) % (g.h * 1.1)));
    ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, 6.28); ctx.fill();
  }
}
function drawLand(ctx, g, p, t) {
  const hz = g.h * 0.32; // ligne d'horizon
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, g.w, hz + 2);
  // collines en aplats derriere l'horizon
  ctx.fillStyle = shade(p.ground, -0.22);
  for (const [hx, hr] of [[g.w * 0.18, g.w * 0.22], [g.w * 0.55, g.w * 0.26], [g.w * 0.9, g.w * 0.2]]) {
    ctx.beginPath(); ctx.ellipse(hx, hz, hr, g.h * 0.12, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = p.ground;
  ctx.beginPath(); ctx.moveTo(0, g.h); ctx.lineTo(0, hz);
  for (let x = 0; x <= g.w; x += g.w / 5) ctx.quadraticCurveTo(x + g.w / 10, hz - g.h * 0.03, x + g.w / 5, hz);
  ctx.lineTo(g.w, g.h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  // clairiere plus claire au centre de la Colonie
  ctx.beginPath(); ctx.ellipse(g.cx, g.cy + g.ry * 0.2, g.rx * 1.6, g.ry * 1.5, 0, 0, 6.28);
  ctx.fillStyle = shade(p.ground, .1); ctx.fill();
}

// Enveloppe : rien / cercle de pierres / palissade / muraille / dome (contours simples)
function drawEnvelope(ctx, g, p) {
  const th = C().envelope_stages.thresholds;
  const n = builtCount();
  let tier = 0;
  for (let i = 0; i < th.length; i++) if (n >= th[i]) tier = i;
  if (!tier) return;
  const rx = Math.min(g.rx * 1.5, g.w / 2 - 10), ry = g.ry * 1.45;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (tier === 1) { // cercle de pierres
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(g.cx + Math.cos(a) * rx, g.cy + Math.sin(a) * ry, 5, 4, 0, 0, 6.28);
      ctx.fillStyle = shade(p.ground, .25); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
  } else if (tier === 2) { // palissade : rail + pieux
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy, rx, ry, 0, 0, 6.28);
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#8A5A1C'; ctx.stroke();
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const x = g.cx + Math.cos(a) * rx, y = g.cy + Math.sin(a) * ry;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 12);
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#8A5A1C'; ctx.stroke();
    }
  } else if (tier === 3) { // muraille : anneau epais + creneaux
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy, rx, ry, 0, 0, 6.28);
    ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = '#7A8598'; ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const x = g.cx + Math.cos(a) * rx, y = g.cy + Math.sin(a) * ry;
      ctx.beginPath(); ctx.rect(x - 4, y - 9, 8, 8);
      ctx.fillStyle = '#7A8598'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
  } else { // dome d'energie
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy, rx, ry * 1.55, 0, Math.PI, 0);
    ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = p.tint; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy, rx, ry, 0, 0, 6.28);
    ctx.lineWidth = 3; ctx.strokeStyle = p.tint + '99'; ctx.stroke();
  }
}

function drawCore(ctx, g, p, t) {
  const x = g.cx, y = g.cy, r = Math.min(g.w * 0.11, 40);
  // monticule
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.55, r * 1.25, r * 0.35, 0, 0, 6.28);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.9 + Math.sin(t * 1.6) * 1.5, 0, 0, 6.28);
  ctx.fillStyle = p.tint; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.55, 0, 0, 6.28);
  ctx.fillStyle = shade(p.tint, .25); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - r * .3, y - r * .4, r * .2, r * .1, -0.5, 0, 6.28);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
  // nom du Coeur
  const label = skinName(C().core.names);
  ctx.font = '700 12px Nunito, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText(label, x, y + r + 12);
  ctx.fillStyle = '#F4F1E8'; ctx.fillText(label, x, y + r + 12);
}

