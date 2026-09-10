// L'Espece — la Lignee : creature procedurale, genome a 6 axes, drafts de mutation, stades, Nouveau Cycle.
import { resetSettlement } from '../core/settlement.js';
import { config, stageOf } from '../core/config.js';
import { state, save } from '../core/state.js';
import { makeRng } from '../core/rng.js';
import { dayKey } from '../core/clock.js';
import { speciesVisual, speciesMods, mutationById } from '../core/genome.js';
import { drawCreature, renderToCanvas } from '../render/creature.js';
import { h, btn, panel, bar, toast, modal, fmt, confirmModal } from '../core/ui.js';
import * as audio from '../core/audio.js';
import { checkCodex } from './codex.js';

let ctx, root, raf = null, canvas;

export function mount(el, c) { ctx = c; root = el; render(); }
export function unmount() { if (raf) cancelAnimationFrame(raf); raf = null; }

// ---- Drafts de mutation ----
export function thresholdFor(axis) { const A = config.habits.axis_points; return A.mutation_threshold * Math.pow(A.threshold_growth, state.species.axisTaken[axis] || 0); }
export function checkDrafts() {
  const sp = state.species; const created = [];
  for (const ax of config.stages.axes.order) {
    let guard = 0;
    while ((sp.axes[ax] || 0) >= thresholdFor(ax) && guard++ < 5) {
      const seed = `draft:${dayKey()}:${sp.draftCounter++}`;
      const options = rollDraft(ax, seed);
      if (!options.length) { sp.axisTaken[ax] = (sp.axisTaken[ax] || 0) + 1; continue; }
      sp.pendingDrafts.push({ axis: ax, options, seed });
      sp.axisTaken[ax] = (sp.axisTaken[ax] || 0) + 1;
      created.push(ax);
    }
  }
  if (created.length) save();
  return created;
}
function rollDraft(axis, seed) {
  const rng = makeRng(seed); const M = config.mutations; const sp = state.species;
  const taken = new Set(sp.mutations.map(m => m.id)); const pending = new Set(sp.pendingDrafts.flatMap(d => d.options));
  const pool = M.mutations.filter(m => m.min_stage <= sp.stage && !taken.has(m.id) && !pending.has(m.id));
  const w = (m) => M.rarity_weights[m.rarity] || 1;
  const pick = (arr, n) => { const out = []; let rest = arr.slice(); while (out.length < n && rest.length) { const m = rng.weighted(rest, w); out.push(m.id); rest = rest.filter(x => x.id !== m.id); } return out; };
  const same = pool.filter(m => m.axis === axis), other = pool.filter(m => m.axis !== axis);
  const chosen = pick(same, 2); const more = pick(other.filter(m => !chosen.includes(m.id)), 3 - chosen.length);
  const all = [...chosen, ...more]; if (all.length < 3) all.push(...pick(pool.filter(m => !all.includes(m.id)), 3 - all.length));
  return all;
}
function takeMutation(draftIdx, id) {
  const sp = state.species; sp.pendingDrafts.splice(draftIdx, 1);
  sp.mutations.push({ id, date: dayKey() });
  audio.play('mutation', { force: true });
  const def = mutationById(id);
  save(); toast(`🧬 ${def.name} — la Lignée mute`, 'purple'); checkCodex(); render();
}

// ---- Stade ----
export function canMetamorph() { const st = stageOf(state.species.stage + 1); if (!st || state.species.stage >= config.stages.stages.length) return { ok: false, next: null }; return { ok: state.species.stagePoints >= st.stage_points_required && state.wallet.elan >= st.elan_cost, next: st }; }
async function metamorph() {
  const { ok, next } = canMetamorph(); if (!ok) return;
  const sure = await confirmModal(`Métamorphose → ${next.icon} ${next.name}`, `Dépenser ${fmt(next.elan_cost)} ⚡ et ${next.stage_points_required} Points de Stade. La Lignée change de corps, la Colonie change de visage, un chapitre du Codex s'ouvre.`, 'Évoluer', 'purple');
  if (!sure) return;
  state.wallet.elan -= next.elan_cost; state.species.stagePoints -= next.stage_points_required; state.species.stage = next.n;
  resetSettlement(state);
  save(); ctx.bus.emit('stage:changed'); ctx.refreshWallet();
  cinematic(next); checkCodex();
}
function cinematic(st) {
  const cv = h('canvas', { style: { width: '100%', height: '220px', borderRadius: '14px', background: st.palette.bg } });
  const m = modal(h('div', { class: 'center-text' }, h('div', { class: 'muted', style: { letterSpacing: '2px', textTransform: 'uppercase', fontSize: '11px' } }, 'Métamorphose'), h('h1', { style: { color: st.palette.tint } }, `${st.icon} ${st.name}`), cv, h('p', { class: 'modal-text', style: { marginTop: '10px' } }, st.tagline), btn('Continuer', { kind: 'purple', onClick: () => { m.close(); render(); } })), { closable: false });
  let t0 = performance.now();
  const loop = (now) => { const t = (now - t0) / 1000; const c = cv.getContext('2d'); const dpr = 2; cv.width = cv.clientWidth * dpr; cv.height = 220 * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cv.clientWidth, 220);
    c.save(); c.globalAlpha = .6; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + t; c.beginPath(); c.arc(cv.clientWidth / 2 + Math.cos(a) * (60 + t * 30), 130 + Math.sin(a) * (30 + t * 15), 4, 0, 6.28); c.fillStyle = st.palette.tint; c.fill(); } c.restore();
    drawCreature(c, speciesVisual(), { x: cv.clientWidth / 2, y: 200, size: 130 + Math.sin(t * 3) * 6, t, tint: st.palette.tint, pose: 'idle' });
    if (document.body.contains(cv)) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
async function newCycle() {
  const sp = state.species; const C = config.stages.cycle; const A = config.stages.axes;
  const sorted = A.order.slice().sort((a, b) => (sp.axes[b] || 0) - (sp.axes[a] || 0)).slice(0, 2);
  const sure = await confirmModal('Nouveau Cycle', `La Lignée devient dieu et crée l'univers suivant. Elle repart à la Cellule avec ${sorted.map(a => A[a].label).join(' et ')} en bénédictions permanentes (+${C.blessing_pct_per_essence * (sp.cycle)} %). Colonie, cartes et progression de Bataille repartent aussi ; la Chronique des Jours et les stats sont intactes.`, 'Refermer la boucle', 'gold');
  if (!sure) return;
  sp.pantheon.push({ name: sp.name, axes: { ...sp.axes }, cycle: sp.cycle, mutations: sp.mutations.length });
  state.wallet.essence += C.essence_per_cycle;
  for (const ax of sorted) sp.blessings.push({ axis: ax, stat: A[ax].stat, pct: C.blessing_pct_per_essence * state.wallet.essence });
  sp.cycle++; sp.stage = 1; sp.stagePoints = 0; sp.mutations = []; sp.pendingDrafts = []; sp.seed = Math.floor(Math.random() * 1e9);
  for (const ax of A.order) { sp.axes[ax] = 0; sp.axisTaken[ax] = 0; }
  state.colony.buildings = {}; state.colony.queue = []; state.colony.coreLevel = 1;
  resetSettlement(state);
  state.battle.campaignLevel = 1; state.battle.defenseWave = 1; state.battle.turrets = [];
  state.wallet.elan = 0; state.wallet.biomasse = 60; state.wallet.materiaux = 40;
  save(); ctx.bus.emit('stage:changed'); ctx.refreshWallet(); checkCodex(); render();
}

// ---- Rendu ----
function render() {
  if (raf) cancelAnimationFrame(raf);
  root.innerHTML = '';
  const sp = state.species; const st = stageOf(sp.stage); const A = config.stages.axes; const mods = speciesMods();
  // scene
  const scene = h('div', { class: 'creature-stage' }, canvas = h('canvas'), h('div', { class: 'stage-badge' }, `${st.icon} Stade ${sp.stage} · ${st.name}`), sp.cycle > 1 ? h('div', { class: 'stage-badge', style: { left: 'auto', right: '10px', color: 'var(--gold)' } }, `Cycle ${sp.cycle}`) : null);
  root.append(scene);
  let t0 = performance.now();
  const loop = (now) => { const t = (now - t0) / 1000; const c = canvas.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1); const W = canvas.clientWidth, Hh = canvas.clientHeight; if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = Hh * dpr; } c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hh);
    drawBackdrop(c, W, Hh, st, t);
    drawCreature(c, speciesVisual(), { x: W / 2, y: Hh * .86, size: Math.min(W, Hh) * .78, t, tint: st.palette.tint, pose: 'idle' });
    raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  // nom
  const nameIn = h('input', { class: 'txt', placeholder: 'Nomme ta Lignée…', value: sp.name || '', style: { fontFamily: 'var(--display)', fontSize: '20px', textAlign: 'center' } });
  nameIn.addEventListener('change', () => { sp.name = nameIn.value.trim(); save(); });
  root.append(h('div', { style: { marginBottom: '12px' } }, nameIn, h('p', { class: 'muted center-text small', style: { marginTop: '6px' } }, st.tagline)));
  // drafts
  if (sp.pendingDrafts.length) {
    const d = sp.pendingDrafts[0]; const ax = A[d.axis];
    const p = panel(`🧬 Mutation — axe ${ax.icon} ${ax.label}`, h('p', { class: 'muted small' }, `Tes habitudes ont poussé cet axe au-delà de son seuil. Choisis une mutation (${sp.pendingDrafts.length} en attente).`));
    const grid = h('div', { class: 'draft' });
    d.options.forEach((id) => {
      const def = mutationById(id); if (!def) return;
      const cv = h('canvas');
      const card = h('div', { class: `draft-card rar-${def.rarity}`, onClick: () => takeMutation(0, id) }, cv, h('div', { class: 'dc-name' }, def.name), h('div', { class: 'dc-desc' }, def.desc), h('div', { class: 'small', style: { color: ax.color } }, Object.entries(def.stats).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}%`).join(' · ')));
      grid.append(card);
      requestAnimationFrame(() => { const preview = speciesVisual({ ...sp, mutations: [...sp.mutations, { id }] }); renderToCanvas(cv, preview, { tint: st.palette.tint, t: 1, scale: .85 }); });
    });
    p.append(grid); root.append(p);
  }
  // stade suivant
  const next = stageOf(sp.stage + 1); const last = sp.stage >= config.stages.stages.length;
  if (!last) {
    const { ok } = canMetamorph();
    root.append(panel(`Vers ${next.icon} ${next.name}`,
      h('p', { class: 'muted small' }, `Les Points de Stade viennent de ton Rituel (${config.habits.stage_points.perfect_day} par journée parfaite, ${config.habits.stage_points.valid_day} par journée validée) et de la Défense, dans la limite de ${config.stages.stage_points_daily_cap} par jour. L'Élan vient de ta vie réelle.`),
      bar(Math.min(100, sp.stagePoints / next.stage_points_required * 100), { color: 'var(--purple)', label: `${Math.floor(sp.stagePoints)} / ${next.stage_points_required} Points de Stade`, height: 20 }),
      h('div', { style: { height: '8px' } }),
      bar(Math.min(100, state.wallet.elan / next.elan_cost * 100), { color: 'var(--green)', label: `${fmt(Math.floor(state.wallet.elan))} / ${fmt(next.elan_cost)} ⚡`, height: 20 }),
      h('div', { style: { marginTop: '10px' } }, btn('Métamorphose', { kind: 'purple', size: 'block', disabled: !ok, onClick: metamorph }))));
  } else {
    root.append(panel('✨ Divinité', h('p', { class: 'muted' }, 'La Lignée a atteint le sommet. Elle peut créer l\'univers suivant et devenir le Panthéon de la Lignée qui naîtra.'), btn('Nouveau Cycle', { kind: 'gold', size: 'block', onClick: newCycle })));
  }
  // axes
  const axes = h('div', { class: 'axes' });
  for (const ax of A.order) {
    const a = A[ax]; const v = sp.axes[ax] || 0; const th = thresholdFor(ax);
    axes.append(h('div', { class: 'axis' }, h('div', { class: 'a-head' }, h('span', {}, `${a.icon} ${a.label}`), h('span', { style: { color: a.color } }, fmt(v))), bar(Math.min(100, v / th * 100), { color: a.color, height: 12 }), h('div', { class: 'small muted', style: { marginTop: '3px' } }, `${a.stat} ${mods[a.stat] >= 0 ? '+' : ''}${Math.round(mods[a.stat] || 0)} % · mutation à ${fmt(th)}`)));
  }
  root.append(panel('Génome', h('p', { class: 'muted small' }, 'Chaque famille d\'habitudes nourrit un axe. Un axe qui franchit son seuil déclenche une mutation.'), axes));
  // mutations
  const list = h('div', { class: 'mut-list' });
  if (!sp.mutations.length) list.append(h('span', { class: 'muted small' }, 'Aucune mutation encore — remplis ton Rituel.'));
  for (const m of sp.mutations) { const def = mutationById(m.id); if (def) list.append(h('span', { class: `mut-tag rar-${def.rarity}`, title: m.date }, `${def.name} · ${m.date.slice(5)}`)); }
  root.append(panel(`Arbre phylogénétique (${sp.mutations.length})`, list));
  if (sp.blessings.length) root.append(panel('🏛️ Bénédictions du Panthéon', h('div', { class: 'mut-list' }, ...sp.blessings.map(b => h('span', { class: 'mut-tag', style: { borderColor: 'var(--gold)' } }, `${A[b.axis].icon} ${b.stat} +${b.pct} %`)))));
  // stades
  const stages = h('div', { class: 'row wrap gap' });
  for (const s of config.stages.stages) stages.append(h('span', { class: 'mut-tag', style: { opacity: s.n <= sp.stage ? 1 : .4, borderColor: s.n === sp.stage ? s.palette.tint : undefined } }, `${s.icon} ${s.name}`));
  root.append(panel('Les 10 stades', stages));
}
function drawBackdrop(c, W, H, st, t) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, st.palette.bg); g.addColorStop(1, st.palette.bg2); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const aquatic = st.bodyplan === 'cell' || st.bodyplan === 'cluster';
  c.save(); c.globalAlpha = .35; c.strokeStyle = st.palette.tint; c.lineWidth = 2;
  for (let i = 0; i < 10; i++) { const x = ((i * 97 + t * (aquatic ? 12 : 6)) % (W + 40)) - 20, y = aquatic ? H - ((i * 53 + t * 25) % (H + 20)) : 30 + (i * 37) % (H * .5); c.beginPath(); if (aquatic) c.arc(x, y, 4 + (i % 3) * 3, 0, 6.28); else { c.moveTo(x, y); c.lineTo(x + 20, y); } c.stroke(); }
  c.restore();
  if (st.emissive) { const r = c.createRadialGradient(W / 2, H * .6, 10, W / 2, H * .6, W * .6); r.addColorStop(0, 'rgba(255,240,200,.5)'); r.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = r; c.fillRect(0, 0, W, H); }
  // sol
  c.fillStyle = st.palette.ground; c.beginPath(); c.ellipse(W / 2, H * .92, W * .6, H * .12, 0, 0, 6.28); c.fill();
}
