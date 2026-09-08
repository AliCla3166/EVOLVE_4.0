// L'Observatoire — stats de vie (cache local ; Notion reste la reference), heatmap de serie, courbes, frequences, Codex.
import { config, allFields } from '../core/config.js';
import { state } from '../core/state.js';
import { dayKey, addDays, fmtDay, keyToDate } from '../core/clock.js';
import { h, btn, panel, bar, fmt, toast } from '../core/ui.js';
import { renderCodexList, renderJournal } from './codex.js';
import { flushSync } from '../core/sync.js';

let root, ctx, tab = 'vie', range = 30;
export function mount(el, c) { root = el; ctx = c; render(); }
export function unmount() {}

function lastKeys(n) { const t = dayKey(); const out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(t, -i)); return out; }
function numericValue(f, v) { if (v === undefined || v === null || v === '') return null; if (f.type === 'calories') return (Number(v.mange) || 0) - (Number(v.depense) || 0) || null; if (f.type === 'multi') return v.length; if (f.type === 'toggle') return v ? 1 : 0; if (f.type === 'text') return v.trim() ? 1 : 0; return Number(v); }

function render() {
  root.innerHTML = '';
  root.append(h('div', { class: 'tabs-inline' }, ...[['vie', 'Vie'], ['activites', 'Activités'], ['codex', 'Codex'], ['memoire', 'Mémoire']].map(([id, l]) => h('button', { class: tab === id ? 'active' : '', onClick: () => { tab = id; render(); } }, l))));
  if (tab === 'vie') renderVie(); else if (tab === 'activites') renderActivites(); else if (tab === 'codex') { root.append(panel('📜 Journal de terrain', h('p', { class: 'muted small' }, 'Ce que la Lignée a observé de toi. Seulement ce qui sort de ton ordinaire — jamais un reproche.'), renderJournal())); root.append(panel('📖 Codex', h('p', { class: 'muted small' }, `${state.codex.unlocked.length} / ${config.codex.entries.length} entrées`), renderCodexList())); } else renderMemoire();
}

function renderVie() {
  const days = Object.values(state.days).filter(d => d.submittedAt);
  const tiles = h('div', { class: 'tiles' },
    tile(`🔥 ${state.streak.current}`, 'série en cours'), tile(`🏆 ${state.streak.best}`, 'meilleure série'),
    tile(`🌟 ${state.stats.perfectDays}`, 'journées parfaites'), tile(`⚡ ${fmt(state.stats.totalElan)}`, 'Élan total gagné'),
    tile(`📅 ${state.stats.ritualsDone}`, 'rituels remplis'), tile(`🛡️ ${state.streak.shields}`, 'boucliers de série'));
  root.append(panel('Vue d\'ensemble', tiles));
  // heatmap 8 semaines
  const keys = lastKeys(56); const grid = h('div', { class: 'heatmap' });
  for (const k of keys) { const d = state.days[k]; let cls = 'heat'; if (d?.missed) cls += ' missed'; else if (d?.late) cls += ' late'; else if (d?.submittedAt) { const e = d.elan || 0; cls += e >= 200 ? ' l4' : e >= 120 ? ' l3' : e >= 60 ? ' l2' : ' l1'; } if (k === dayKey()) cls += ' today'; grid.append(h('div', { class: cls, title: `${k} · ${d?.elan ?? '—'} ⚡` })); }
  root.append(panel('8 dernières semaines', grid, h('div', { class: 'row gap small muted', style: { marginTop: '6px' } }, h('span', { class: 'heat l1', style: { width: '12px' } }), 'faible', h('span', { class: 'heat l4', style: { width: '12px' } }), 'journée forte', h('span', { class: 'heat late', style: { width: '12px' } }), 'retard', h('span', { class: 'heat missed', style: { width: '12px' } }), 'manqué')));
  // courbes
  const sel = h('div', { class: 'row gap', style: { marginBottom: '8px' } }, ...[7, 30, 365].map(n => h('button', { class: 'chip' + (range === n ? ' active' : ''), onClick: () => { range = n; render(); } }, `${n} j`)));
  const chartsPanel = panel('Courbes', sel);
  const keysR = lastKeys(range);
  const elanSeries = keysR.map(k => state.days[k]?.elan ?? null);
  chartsPanel.append(chart('⚡ Élan', elanSeries, 'var(--green)', keysR));
  for (const f of allFields()) {
    if (['text', 'scale', 'toggle'].includes(f.type) && f.type !== 'scale') continue;
    const series = keysR.map(k => numericValue(f, state.days[k]?.entries?.[f.id]));
    if (series.every(v => v === null)) continue;
    chartsPanel.append(chart(`${f.icon} ${f.label}${f.type === 'calories' ? ' (surplus)' : f.unit ? ' (' + f.unit + ')' : ''}`, series, f.type === 'calories' ? 'var(--orange)' : 'var(--blue)', keysR));
  }
  root.append(chartsPanel);
  // insights
  root.append(panel('Ce que tes jours racontent', ...insights()));
}
function tile(v, l) { return h('div', { class: 'stat-tile' }, h('div', { class: 'st-val' }, v), h('div', { class: 'st-lbl' }, l)); }
function chart(title, series, color, keys) {
  const cv = h('canvas', { class: 'chart' });
  const vals = series.filter(v => v !== null); const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const wrap = h('div', { style: { marginBottom: '10px' } }, h('div', { class: 'row between small' }, h('b', {}, title), h('span', { class: 'muted' }, vals.length ? `moy. ${fmt(Math.round(avg * 10) / 10)} · max ${fmt(Math.max(...vals))}` : 'aucune donnée')), cv);
  requestAnimationFrame(() => {
    const dpr = Math.min(2, devicePixelRatio || 1); const W = cv.clientWidth, H = 140; cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#171B23'; c.beginPath(); c.roundRect(0, 0, W, H, 10); c.fill();
    if (!vals.length) return;
    const min = Math.min(0, ...vals), max = Math.max(...vals) || 1; const pad = 14, bw = (W - pad * 2) / series.length;
    const y = (v) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(pad, pad + i * (H - pad * 2) / 4); c.lineTo(W - pad, pad + i * (H - pad * 2) / 4); c.stroke(); }
    const colr = getComputedStyle(document.documentElement).getPropertyValue(color.replace('var(', '').replace(')', '')).trim() || '#45D95E';
    if (series.length <= 60) { series.forEach((v, i) => { if (v === null) return; const x = pad + i * bw + bw * .15; c.fillStyle = colr; c.beginPath(); c.roundRect(x, y(v), Math.max(2, bw * .7), y(min) - y(v), 3); c.fill(); c.strokeStyle = '#171B23'; c.lineWidth = 1.5; c.stroke(); }); }
    else { c.beginPath(); let started = false; series.forEach((v, i) => { if (v === null) return; const x = pad + i * bw; if (!started) { c.moveTo(x, y(v)); started = true; } else c.lineTo(x, y(v)); }); c.strokeStyle = colr; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke(); }
    c.fillStyle = '#C9C5B8'; c.font = '700 10px Nunito'; c.fillText(fmtDay(keys[0], { day: 'numeric', month: 'short' }), pad, H - 2); const lbl = fmtDay(keys[keys.length - 1], { day: 'numeric', month: 'short' }); c.fillText(lbl, W - pad - c.measureText(lbl).width, H - 2);
  });
  return wrap;
}
function insights() {
  const out = []; const keys = Object.keys(state.days).filter(k => state.days[k].submittedAt).sort();
  if (keys.length < 3) return [h('div', { class: 'insight' }, 'Remplis quelques jours de Rituel : les corrélations apparaîtront ici en phrases simples.')];
  const fields = allFields();
  // jours forts vs faibles
  const byDow = {}; for (const k of keys) { const d = keyToDate(k).getDay(); byDow[d] = byDow[d] || []; byDow[d].push(state.days[k].elan || 0); }
  const dows = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const avgs = Object.entries(byDow).map(([d, arr]) => [d, arr.reduce((a, b) => a + b, 0) / arr.length]).sort((a, b) => b[1] - a[1]);
  if (avgs.length >= 2) out.push(h('div', { class: 'insight' }, `Ton meilleur jour est le ${dows[avgs[0][0]]} (${Math.round(avgs[0][1])} ⚡ en moyenne), le plus difficile le ${dows[avgs[avgs.length - 1][0]]} (${Math.round(avgs[avgs.length - 1][1])} ⚡).`));
  // frequence d'un champ 'multi'
  for (const f of fields.filter(f => f.type === 'multi')) {
    const counts = {}; let n = 0; for (const k of keys) { const v = state.days[k].entries?.[f.id]; if (Array.isArray(v)) { n++; for (const c of v) counts[c] = (counts[c] || 0) + 1; } }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) out.push(h('div', { class: 'insight' }, `${f.icon} ${f.label} : « ${top[0]} » revient le plus souvent (${top[1]} fois sur ${keys.length} jours).`));
  }
  // correlation simple : pilier soin vs elan
  const withSoin = keys.filter(k => state.days[k].pillars?.includes('soin')), without = keys.filter(k => !state.days[k].pillars?.includes('soin'));
  if (withSoin.length >= 2 && without.length >= 2) { const m = arr => arr.reduce((a, k) => a + (state.days[k].elan || 0), 0) / arr.length; const a = m(withSoin), b = m(without); out.push(h('div', { class: 'insight' }, `Les jours où tu prends soin de toi (méditation, rituels) sont ${a > b ? 'plus' : 'moins'} riches : ${Math.round(a)} ⚡ contre ${Math.round(b)} ⚡.`)); }
  const perfectRate = Math.round(keys.filter(k => state.days[k].perfect).length / keys.length * 100);
  out.push(h('div', { class: 'insight' }, `${perfectRate} % de journées parfaites sur ${keys.length} jours saisis.`));
  return out;
}
function renderActivites() {
  const keys = lastKeys(range); const fields = allFields();
  root.append(h('div', { class: 'row gap', style: { marginBottom: '8px' } }, ...[7, 30, 365].map(n => h('button', { class: 'chip' + (range === n ? ' active' : ''), onClick: () => { range = n; render(); } }, `${n} j`))));
  const p = panel('Fréquence des activités', h('p', { class: 'muted small' }, 'Combien de jours chaque activité apparaît sur la période.'));
  for (const f of fields) {
    let n = 0; const sub = {};
    for (const k of keys) { const v = state.days[k]?.entries?.[f.id]; if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || v === 0) continue; if (f.type === 'calories' && !(v.depense || v.mange)) continue; n++; if (Array.isArray(v)) for (const c of v) sub[c] = (sub[c] || 0) + 1; }
    p.append(h('div', { style: { marginBottom: '8px' } }, h('div', { class: 'row between small' }, h('span', {}, `${f.icon} ${f.label}`), h('b', {}, `${n} j`)), bar(n / keys.length * 100, { color: 'var(--blue)', height: 10 })));
    for (const [c, m] of Object.entries(sub).sort((a, b) => b[1] - a[1])) p.append(h('div', { class: 'row between small muted', style: { paddingLeft: '20px' } }, h('span', {}, c), h('span', {}, `${m} j`)));
  }
  root.append(p);
}
function renderMemoire() {
  const s = state.sync;
  const p = panel('Chronique des Jours (Notion)', h('p', { class: 'muted small' }, 'Chaque jour récolté est poussé vers ta base Notion. Le jeu peut mourir, la mémoire survit.'),
    h('div', { class: 'row between' }, h('span', {}, s.enabled ? '🟢 Synchronisation activée' : '⚪ Non configurée (Réglages)'), h('span', { class: 'muted small' }, `${s.queue.length} en attente`)),
    s.lastSync ? h('p', { class: 'small muted' }, `Dernière sync : ${new Date(s.lastSync).toLocaleString('fr-FR')}`) : null,
    s.lastError ? h('p', { class: 'small', style: { color: 'var(--red)' } }, `Erreur : ${s.lastError}`) : null,
    h('div', { class: 'row gap', style: { marginTop: '8px' } }, btn('Synchroniser', { kind: 'blue', size: 'sm', onClick: async () => { await flushSync(true); toast(state.sync.lastError ? 'Échec : ' + state.sync.lastError : 'Synchronisé', state.sync.lastError ? 'red' : 'green'); render(); } }), btn('Exporter CSV', { size: 'sm', onClick: exportCSV })));
  root.append(p);
  const keys = Object.keys(state.days).filter(k => state.days[k].submittedAt).sort().reverse().slice(0, 30);
  const j = panel('Journal', ...keys.map(k => { const d = state.days[k]; return h('div', { class: 'codex-entry' }, h('div', { class: 'row between' }, h('b', {}, fmtDay(k, { weekday: 'short', day: 'numeric', month: 'short' })), h('span', { style: { color: 'var(--green)' } }, `${d.elan} ⚡${d.perfect ? ' 🌟' : ''}${d.synced ? '' : ' ⏳'}`)), d.entries?.commentaire ? h('p', {}, d.entries.commentaire) : null, d.entries?.moment_fort ? h('p', { style: { color: 'var(--gold)' } }, `⭐ ${d.entries.moment_fort}`) : null); }));
  if (!keys.length) j.append(h('p', { class: 'muted' }, 'Aucun jour récolté pour l\'instant.'));
  root.append(j);
}
function exportCSV() {
  const fields = allFields(); const keys = Object.keys(state.days).sort();
  const head = ['date', 'elan', 'serie', 'piliers', 'parfait', 'retard', ...fields.map(f => f.id)];
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = keys.map(k => { const d = state.days[k]; return [k, d.elan || 0, d.streakAtSubmit ?? '', (d.pillars || []).join('|'), d.perfect ? 1 : 0, d.late ? 1 : 0, ...fields.map(f => { const v = d.entries?.[f.id]; if (v === undefined) return ''; if (f.type === 'calories') return `${v.depense || ''}/${v.mange || ''}`; if (Array.isArray(v)) return v.join('|'); return v; })].map(esc).join(','); });
  const blob = new Blob(['﻿' + [head.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `evolve-chronique-${dayKey()}.csv` }); document.body.append(a); a.click(); a.remove();
}
