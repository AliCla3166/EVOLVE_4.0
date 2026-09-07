// Sauvegarde locale versionnee avec chaine de migrations — des la premiere ligne.
import { bus } from './events.js';
export const SAVE_VERSION = 1;
const KEY = 'evolve4.save';

export function defaultState() {
  const seed = Math.floor(Math.random() * 1e9);
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    seed,
    species: {
      name: '',
      seed,
      stage: 1,
      stagePoints: 0,
      cycle: 1,
      axes: { vigueur: 0, robustesse: 0, esprit: 0, ingeniosite: 0, lien: 0, ombre: 0 },
      axisTaken: { vigueur: 0, robustesse: 0, esprit: 0, ingeniosite: 0, lien: 0, ombre: 0 },
      mutations: [],          // [{id, date}]
      pendingDrafts: [],      // [{axis, options:[ids], seed}]
      draftCounter: 0,
      blessings: [],          // Nouveau Cycle
      pantheon: []            // [{name, axes, stage, cycle}]
    },
    wallet: { elan: 0, genes: 40, biomasse: 60, materiaux: 40, rubis: 0, essence: 0 },
    days: {},                 // dayKey -> { entries, elan, pillars, perfect, submittedAt, late, synced, axisPoints }
    ritualDrafts: {},         // dayKey -> entries en cours de saisie (non recoltees)
    streak: { current: 0, best: 0, shields: 1, lastDay: null },
    colony: { buildings: {}, queue: [], lastTick: Date.now(), coreLevel: 1, contracts: [], contractsDay: null, contractProgress: {} },
    battle: { campaignLevel: 1, defenseWave: 1, defenseDay: null, defenseWavesToday: 0, stagePointsDay: null, stagePointsToday: 0, raidsDay: null, raidsToday: 0, turrets: [], records: { defenseWave: 0, raidPeril: 0 }, kills: 0, cardsPlayed: 0 },
    cards: { collection: {}, deck: [], pity: 0, xp: {} },
    codex: { unlocked: [] },
    sync: { queue: [], endpoint: '', secret: '', enabled: false, lastSync: null, lastError: null },
    settings: { habitsOverride: null, sound: true, onboarded: false, dev: false },
    stats: { perfectDays: 0, totalElan: 0, ritualsDone: 0 }
  };
}

const MIGRATIONS = {
  // 1 -> 2 : exemple futur. Chaque migration recoit l'etat et le transforme en place.
};

export function migrate(s) {
  while (s.version < SAVE_VERSION) {
    const m = MIGRATIONS[s.version];
    if (!m) { s.version++; continue; }
    m(s); s.version++;
  }
  // Tolerance : cles manquantes -> valeurs par defaut (fusion superficielle par section)
  const d = defaultState();
  for (const k of Object.keys(d)) {
    if (s[k] === undefined) s[k] = d[k];
    else if (typeof d[k] === 'object' && !Array.isArray(d[k]) && d[k] !== null) {
      for (const kk of Object.keys(d[k])) if (s[k][kk] === undefined) s[k][kk] = d[k][kk];
    }
  }
  return s;
}

export let state = null;
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : defaultState();
  } catch (e) { console.error('save corrompue, reset', e); state = defaultState(); }
  return state;
}
let saveTimer = null;
export function save(immediate = false) {
  if (!state) return;
  const doSave = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); bus.emit('saved'); } catch (e) { console.error(e); } };
  if (immediate) { clearTimeout(saveTimer); doSave(); return; }
  clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 300);
}
export function exportJSON() { return JSON.stringify(state, null, 2); }
export function importJSON(txt) { const s = migrate(JSON.parse(txt)); state = s; save(true); return s; }
export function reset() { localStorage.removeItem(KEY); state = defaultState(); save(true); return state; }
