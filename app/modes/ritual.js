// Le Rituel — le brief journalier. Entierement pilote par data/habits.json : chaque champ y est defini (type, bareme, pilier, axe).
import { config, allFields } from '../core/config.js';
import { state, save } from '../core/state.js';
import { dayKey, addDays, daysBetween, fmtDay } from '../core/clock.js';
import { scoreField, scoreDay, submitDay, streakBonusPct, streakTier } from '../core/economy.js';
import { h, btn, panel, bar, chip, toast, modal, floatBubble, fmt } from '../core/ui.js';
import { progressContract } from '../core/progress.js';
import { checkDrafts } from './species.js';
import { checkCodex } from './codex.js';

let ctx, root, selectedKey, entries, scoreEl, pillarsEl, fieldPts = {};

export function mount(el, c) {
  ctx = c; root = el;
  const today = dayKey();
  selectedKey = c.opts?.day || today;
  render();
}
export function unmount() { persistDraft(); }

function loadEntries(key) {
  const d = state.days[key];
  if (d?.entries && Object.keys(d.entries).length) return JSON.parse(JSON.stringify(d.entries));
  if (state.ritualDrafts[key]) return JSON.parse(JSON.stringify(state.ritualDrafts[key]));
  return {};
}
function persistDraft() { if (!selectedKey || !entries) return; const d = state.days[selectedKey]; if (!d?.submittedAt) { state.ritualDrafts[selectedKey] = entries; save(); } }

function render() {
  root.innerHTML = '';
  entries = loadEntries(selectedKey);
  const H = config.habits; const today = dayKey();
  const rec = state.days[selectedKey];
  const isToday = selectedKey === today;
  // --- bandeau jours ---
  const strip = h('div', { class: 'day-strip' });
  for (let i = H.retro_days - 1; i >= 0; i--) {
    const k = addDays(today, -i); const d = state.days[k];
    const cls = ['', k === selectedKey ? 'active' : '', d?.submittedAt && !d.late ? 'done' : '', d?.late ? 'late' : '', d?.missed ? 'missed' : ''].join(' ');
    strip.append(h('button', { class: cls, onClick: () => { persistDraft(); selectedKey = k; render(); } }, h('span', {}, fmtDay(k, { weekday: 'short' }).replace('.', '')), h('b', {}, fmtDay(k, { day: 'numeric' })), h('span', {}, d?.submittedAt ? `${d.elan}⚡` : d?.missed ? '✕' : i === 0 ? 'auj.' : '·')));
  }
  root.append(strip);
  // --- hero ---
  const streak = state.streak.current; const bonus = streakBonusPct(streak);
  const tier = streakTier(streak); const next = H.streak.tiers.find(t => t > streak) || H.streak.tiers[H.streak.tiers.length - 1];
  const hero = panel(null,
    h('div', { class: 'row between' },
      h('div', {}, h('h1', {}, isToday ? 'Aujourd\'hui' : fmtDay(selectedKey, { weekday: 'long', day: 'numeric', month: 'long' })), h('div', { class: 'muted' }, rec?.submittedAt ? (rec.late ? 'Saisi en retard — payé, série non tenue' : `Récolté · ${rec.elan} ⚡`) : isToday ? 'Le brief du jour — 2 minutes' : 'Saisie rétroactive (7 jours) — sans série')),
      h('div', { class: 'center-text' }, h('div', { class: 'display', style: { fontSize: '30px', color: 'var(--gold)' } }, `🔥 ${streak}`), h('div', { class: 'small muted' }, bonus ? `+${bonus} % · palier ${tier + 1}` : `palier à ${next} j`))),
    h('div', { style: { marginTop: '8px' } }, bar(Math.min(100, (streak / next) * 100), { color: 'var(--gold)', label: `${streak} / ${next} jours`, height: 16 })),
    h('div', { class: 'row between', style: { marginTop: '10px' } }, h('span', { class: 'muted' }, 'Élan du jour'), scoreEl = h('span', { class: 'display', style: { fontSize: '24px', color: 'var(--green)' } }, '0 ⚡')),
    pillarsEl = h('div', { class: 'pillars', style: { marginTop: '8px' } })
  );
  root.append(hero);
  // --- sections ---
  for (const sec of H.sections) {
    const p = h('section', { class: 'panel' }, h('div', { class: 'section-head' }, h('span', {}, sec.icon), sec.title));
    for (const f of sec.fields) p.append(renderField(f));
    root.append(p);
  }
  // --- action ---
  const submitted = !!rec?.submittedAt;
  const act = btn(submitted ? 'Mettre à jour' : '🌱 Récolter', { kind: 'green', size: 'lg block', onClick: () => harvest(act) });
  root.append(h('div', { style: { padding: '4px 0 10px' } }, act));
  if (config.habitsOverridden) root.append(h('p', { class: 'muted center-text small' }, 'Brief personnalisé (Réglages → Éditer le brief)'));
  updateScore();
}

function setEntry(id, v) { entries[id] = v; updateScore(); }
function updateScore() {
  const sc = scoreDay(entries);
  const bonus = streakBonusPct(state.streak.current);
  scoreEl.textContent = `${Math.round(sc.elan * (1 + bonus / 100))} ⚡`;
  const H = config.habits;
  pillarsEl.innerHTML = '';
  const icons = { nutrition: '🍖', mouvement: '👟', travail: '🔧', soin: '🧘' };
  for (const p of H.pillars.order) pillarsEl.append(h('div', { class: 'pillar' + (sc.pillars.includes(p) ? ' ok' : '') }, h('span', { class: 'p-ico' }, icons[p] || '•'), H.pillars.labels[p]));
  for (const [id, el] of Object.entries(fieldPts)) { const v = sc.breakdown[id] || 0; el.textContent = v > 0 ? `+${fmt(v)}` : v < 0 ? `${fmt(v)}` : '—'; el.className = 'f-pts' + (v < 0 ? ' neg' : v === 0 ? ' zero' : ''); }
}

function renderField(f) {
  const wrap = h('div', { class: 'field' });
  const pts = h('span', { class: 'f-pts zero' }, '—'); fieldPts[f.id] = pts;
  wrap.append(h('div', { class: 'field-head' }, h('span', { class: 'f-ico' }, f.icon || '•'), h('span', { class: 'f-label' }, f.label), pts));
  const v = entries[f.id];
  switch (f.type) {
    case 'toggle': { const c = chip(v ? '✓ Fait' : 'À faire', !!v, () => { setEntry(f.id, !entries[f.id]); c.textContent = entries[f.id] ? '✓ Fait' : 'À faire'; c.classList.toggle('active', !!entries[f.id]); }); wrap.append(c); break; }
    case 'number': case 'duration': case 'counter': {
      const step = f.step || (f.type === 'duration' ? 5 : 1);
      const input = h('input', { type: 'number', inputmode: 'decimal', step, min: 0, value: v ?? '', placeholder: '0' });
      const refresh = () => { input.value = entries[f.id] ?? ''; quicks.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', Number(c.dataset.v) === Number(entries[f.id]))); };
      input.addEventListener('input', () => { setEntry(f.id, input.value === '' ? undefined : Number(input.value)); quicks.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', Number(c.dataset.v) === Number(entries[f.id]))); });
      const minus = h('button', { class: 'stepbtn', onClick: () => { setEntry(f.id, Math.max(0, (Number(entries[f.id]) || 0) - step)); refresh(); } }, '−');
      const plus = h('button', { class: 'stepbtn', onClick: () => { setEntry(f.id, Math.min(f.max ?? Infinity, (Number(entries[f.id]) || 0) + step)); refresh(); } }, '+');
      wrap.append(h('div', { class: 'numfield' }, minus, input, f.unit ? h('span', { class: 'muted', style: { minWidth: '34px' } }, f.unit) : null, plus));
      const quicks = h('div', { class: 'quick' });
      for (const q of f.quick || []) quicks.append(h('button', { class: 'chip' + (Number(v) === q ? ' active' : ''), 'data-v': q, onClick: () => { setEntry(f.id, q); refresh(); } }, `${q}${f.unit ? ' ' + f.unit : f.type === 'duration' ? ' min' : ''}`));
      if (f.quick?.length) wrap.append(quicks);
      break;
    }
    case 'scale': {
      const row = h('div', { class: 'scale-row' });
      for (let i = 1; i <= f.max; i++) { const b = h('button', { class: v === i ? 'active' : '', onClick: () => { setEntry(f.id, i); row.querySelectorAll('button').forEach((x, j) => x.classList.toggle('active', j + 1 === i)); } }, (f.labels || [])[i - 1] || String(i)); row.append(b); }
      wrap.append(row); break;
    }
    case 'multi': {
      const row = h('div', { class: 'quick' }); const sel = new Set(Array.isArray(v) ? v : []);
      for (const c of f.choices) { const ch = chip(c, sel.has(c), () => { sel.has(c) ? sel.delete(c) : sel.add(c); ch.classList.toggle('active', sel.has(c)); setEntry(f.id, [...sel]); }); row.append(ch); }
      wrap.append(row); break;
    }
    case 'calories': {
      const cur = v || {};
      const mk = (k, ph) => { const i = h('input', { type: 'number', inputmode: 'numeric', placeholder: ph, value: cur[k] ?? '' }); i.addEventListener('input', () => { const o = { ...(entries[f.id] || {}) }; o[k] = i.value === '' ? undefined : Number(i.value); setEntry(f.id, o); }); return i; };
      wrap.append(h('div', { class: 'row gap' }, h('div', { class: 'numfield grow' }, mk('depense', 'dépensées')), h('span', { class: 'display' }, '/'), h('div', { class: 'numfield grow' }, mk('mange', 'mangées'))));
      wrap.append(h('div', { class: 'small muted', style: { marginTop: '4px' } }, `Déficit ou égalité +${f.deficit_points} · surplus ≤ ${f.small_surplus_max} +${f.small_surplus_points} · au-delà ${f.big_surplus_points}`));
      break;
    }
    case 'text': {
      const ta = h('textarea', { class: 'txt', rows: 2, placeholder: f.placeholder || '' }, v || '');
      ta.addEventListener('input', () => setEntry(f.id, ta.value));
      wrap.append(ta); break;
    }
    default: wrap.append(h('div', { class: 'muted' }, `type inconnu : ${f.type}`));
  }
  return wrap;
}

async function harvest(button) {
  const key = selectedKey; const wasDone = !!state.days[key]?.submittedAt;
  const { rec, diff, sc, spGranted } = submitDay(key, entries);
  delete state.ritualDrafts[key];
  if (!wasDone && key === dayKey()) progressContract('ritual', 1);
  save();
  ctx.refreshWallet();
  // Animation de recolte : bulles vers le compteur d'Elan
  const n = Math.min(8, Math.max(1, Math.round(Math.abs(diff) / 20)));
  for (let i = 0; i < n; i++) setTimeout(() => floatBubble(`+${Math.round(diff / n)}`, button, '#w-elan'), i * 90);
  const drafts = checkDrafts();
  setTimeout(() => showSummary(rec, diff, sc, drafts, wasDone, spGranted), 700);
  render();
}
function showSummary(rec, diff, sc, drafts, wasDone, spGranted = 0) {
  const H = config.habits; const A = config.stages.axes;
  const axes = h('div', { class: 'row wrap gap', style: { justifyContent: 'center' } });
  for (const ax of A.order) { const v = sc.axisPoints[ax] || 0; if (v > 0) axes.append(h('span', { class: 'mut-tag', style: { borderColor: A[ax].color } }, `${A[ax].icon} +${fmt(v)}`)); }
  const m = modal(h('div', { class: 'harvest-hero' },
    h('div', { class: 'muted', style: { letterSpacing: '2px', textTransform: 'uppercase', fontSize: '11px' } }, wasDone ? 'Journée mise à jour' : 'Récolte'),
    h('div', { class: 'big' }, `${diff >= 0 ? '+' : ''}${diff} ⚡`),
    h('p', { class: 'muted' }, rec.late ? 'Saisie en retard : payée, série non tenue.' : sc.perfect ? '🌟 Journée parfaite — les 4 piliers validés !' : `${sc.pillars.length}/4 piliers validés`),
    rec.streakBonusPct ? h('p', { class: 'small', style: { color: 'var(--gold)' } }, `Bonus de série +${rec.streakBonusPct} %`) : null,
    spGranted ? h('p', { class: 'small', style: { color: 'var(--purple)' } }, `+${spGranted} Point${spGranted > 1 ? 's' : ''} de Stade — la Métamorphose approche`) : null,
    h('p', { class: 'small muted' }, 'Points de génome'), axes,
    drafts.length ? h('p', { style: { color: 'var(--purple)', marginTop: '10px' } }, `🧬 ${drafts.length} mutation${drafts.length > 1 ? 's' : ''} à choisir dans Espèce !`) : null,
    h('div', { class: 'row gap center', style: { marginTop: '12px' } }, btn('Fermer', { onClick: () => m.close() }), drafts.length ? btn('Voir l\'Espèce', { kind: 'purple', onClick: () => { m.close(); ctx.navigate('species'); } }) : null)
  ), { cls: 'glow-green' });
  setTimeout(() => checkCodex(), 400);
}
