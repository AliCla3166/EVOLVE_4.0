// Synchronisation Notion differee : file d'attente locale -> POST /api/notion (fonction serveur, token hors app).
// Le jeu marche hors-ligne et pousse quand il peut. La Chronique des Jours (Notion) est la memoire ; le jeu n'est que l'incitation.
import { state, save } from './state.js';
import { config, allFields } from './config.js';
import { bus } from './events.js';

let busy = false;
export function endpoint() { return state.sync.endpoint || (location.pathname.startsWith('/') ? '/api/notion' : './api/notion'); }
export function buildPayload(key) {
  const d = state.days[key]; if (!d) return null;
  const fields = allFields().map(f => ({ id: f.id, label: f.label, type: f.type, section: f.section, unit: f.unit || null, choices: f.choices || null }));
  return {
    date: key, elan: d.elan || 0, streak: d.streakAtSubmit ?? state.streak.current, streakBonusPct: d.streakBonusPct || 0, pillars: d.pillars || [], perfect: !!d.perfect,
    late: !!d.late, missed: !!d.missed, shieldUsed: !!d.shieldUsed, submittedAt: d.submittedAt || null, updatedAt: d.updatedAt || null,
    stage: state.species.stage, stageName: config.stages.stages[state.species.stage - 1].name, cycle: state.species.cycle, mutations: state.species.mutations.length,
    axes: state.species.axes, axisPoints: d.axisPoints || {}, breakdown: d.breakdown || {}, entries: d.entries || {}, fields,
    speciesName: state.species.name || ''
  };
}
export async function flushSync(force = false) {
  if (busy || !navigator.onLine) return;
  const q = state.sync.queue.filter(k => state.days[k]);
  if (!q.length) return;
  if (!state.sync.enabled && !force) return;
  busy = true;
  try {
    for (const key of q.slice()) {
      const payload = buildPayload(key);
      const res = await fetch(endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(state.sync.secret ? { 'X-Evolve-Key': state.sync.secret } : {}) }, body: JSON.stringify(payload) });
      if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`); }
      state.days[key].synced = true;
      state.sync.queue = state.sync.queue.filter(k => k !== key);
      state.sync.lastSync = Date.now(); state.sync.lastError = null;
    }
  } catch (e) {
    state.sync.lastError = String(e.message || e);
  } finally { busy = false; save(); bus.emit('sync:changed'); }
}
// Remet TOUS les jours saisis dans la file d'attente. Sert a repousser une journee deja
// synchronisee : ligne Notion modifiee a la main, colonne ajoutee au brief, correction d'une saisie.
// L'ecriture cote Notion est un upsert (recherche par date), donc renvoyer un jour ne cree pas de doublon.
export function requeueAll() {
  const keys = Object.keys(state.days).filter(k => state.days[k].submittedAt).sort();
  state.sync.queue = keys;
  save();
  bus.emit('sync:changed');
  return keys.length;
}

export async function testSync() {
  const res = await fetch(endpoint(), { method: 'GET', headers: state.sync.secret ? { 'X-Evolve-Key': state.sync.secret } : {} });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}
