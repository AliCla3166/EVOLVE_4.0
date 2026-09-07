// Bareme du Rituel : calcule l'Elan d'une journee a partir des saisies + habits.json. Zero nombre en dur.
import { config, allFields } from './config.js';
import { state, save } from './state.js';
import { dayKey, addDays, daysBetween } from './clock.js';
import { bus } from './events.js';
import { addStagePoints } from './progress.js';

export function scoreField(f, v) {
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return 0;
  switch (f.type) {
    case 'toggle': return v ? (f.points || 0) : 0;
    case 'text': return (String(v).trim().length >= (f.min_length || 3)) ? (f.points || 0) : 0;
    case 'scale': return v > 0 ? (f.points || 0) : 0;
    case 'multi': return Math.min((v.length || 0) * (f.points_each || 0), f.cap_points ?? Infinity);
    case 'calories': {
      const dep = Number(v.depense || 0), man = Number(v.mange || 0);
      if (!dep && !man) return 0;
      const surplus = man - dep;
      if (surplus <= 0) return f.deficit_points;
      if (surplus <= f.small_surplus_max) return f.small_surplus_points;
      return f.big_surplus_points;
    }
    case 'number': case 'counter': case 'duration': {
      const n = Number(v) || 0;
      if (f.points_table) { const t = f.points_table; return (n >= t.min && n <= t.max) ? t.points : (t.else || 0); }
      if (!f.points_per) return 0;
      let units = n / (f.per_unit || 1);
      if (f.cap_units) units = Math.min(units, f.cap_units);
      let pts = units * f.points_per;
      if (f.cap_points !== undefined) pts = Math.min(pts, f.cap_points);
      return Math.round(pts * 10) / 10;
    }
    default: return 0;
  }
}

export function pillarMet(f, v) {
  if (!f.pillar) return false;
  if (v === undefined || v === null || v === '') return false;
  if (f.type === 'calories') return !!(Number(v.depense) && Number(v.mange));
  if (f.type === 'multi') return v.length > 0;
  if (f.type === 'toggle') return !!v;
  const n = Number(v) || 0;
  if (f.pillar_threshold !== undefined) return n >= f.pillar_threshold;
  return n > 0;
}

export function scoreDay(entries) {
  const H = config.habits;
  const fields = allFields();
  const breakdown = {}; const axisPts = {}; let total = 0;
  const pillars = new Set(); const workHours = {};
  for (const f of fields) {
    const v = entries[f.id];
    const pts = scoreField(f, v);
    breakdown[f.id] = pts; total += pts;
    if (f.axis) axisPts[f.axis] = (axisPts[f.axis] || 0) + Math.max(0, pts);
    if (f.shadow_on_malus && pts < 0) axisPts.ombre = (axisPts.ombre || 0) + f.shadow_on_malus * 4;
    if (f.pillar === 'travail') { workHours.sum = (workHours.sum || 0) + (Number(v) || 0); }
    else if (f.pillar && pillarMet(f, v)) pillars.add(f.pillar);
  }
  if ((workHours.sum || 0) >= H.pillars.work_hours_threshold) pillars.add('travail');
  total = Math.max(0, Math.min(total, H.daily_cap));
  const perfect = H.pillars.order.every(p => pillars.has(p));
  const A = H.axis_points;
  const axisPoints = {};
  for (const ax of config.stages.axes.order) axisPoints[ax] = Math.round(((axisPts[ax] || 0) / A.divisor + (perfect && ax !== 'ombre' ? A.perfect_day_bonus_all_axes : 0)) * 10) / 10;
  return { elan: Math.round(total), breakdown, pillars: [...pillars], perfect, axisPoints };
}

export function streakTier(days) {
  const S = config.habits.streak; let tier = -1;
  for (let i = 0; i < S.tiers.length; i++) if (days >= S.tiers[i]) tier = i;
  return tier;
}
export function streakBonusPct(days) { const t = streakTier(days); return t < 0 ? 0 : config.habits.streak.bonus_percent[t]; }

// Recalcule la serie a partir de l'historique (source de verite : days). Un jour saisi en retard paie mais ne tient pas la serie.
export function recomputeStreak() {
  const keys = Object.keys(state.days).filter(k => state.days[k].submittedAt && !state.days[k].late).sort();
  let cur = 0, best = 0, prev = null;
  for (const k of keys) {
    if (prev && daysBetween(prev, k) === 1) cur++; else cur = 1;
    best = Math.max(best, cur); prev = k;
  }
  // La serie court encore si le dernier jour valide est hier ou aujourd'hui
  const today = dayKey();
  if (prev && daysBetween(prev, today) > 1) cur = 0;
  state.streak.current = cur; state.streak.best = Math.max(state.streak.best, best); state.streak.lastDay = prev;
}

// Soumet (ou re-soumet) le Rituel d'un jour. Idempotent : on ne verse que la difference d'Elan.
export function submitDay(key, entries) {
  const today = dayKey();
  const late = daysBetween(key, today) >= 1 && !(state.days[key] && state.days[key].submittedAt && !state.days[key].late);
  const prev = state.days[key] || {};
  const sc = scoreDay(entries);
  let elan = sc.elan;
  // Serie : on l'evalue apres enregistrement
  const rec = { ...prev, entries, elan: 0, breakdown: sc.breakdown, pillars: sc.pillars, perfect: sc.perfect, axisPoints: sc.axisPoints, submittedAt: prev.submittedAt || Date.now(), updatedAt: Date.now(), late: prev.submittedAt ? prev.late : late, synced: false };
  state.days[key] = rec;
  recomputeStreak();
  const bonus = rec.late ? 0 : streakBonusPct(state.streak.current);
  elan = Math.round(elan * (1 + bonus / 100));
  rec.streakBonusPct = bonus; rec.streakAtSubmit = state.streak.current;
  const diff = elan - (prev.elan || 0);
  rec.elan = elan;
  state.wallet.elan += diff; state.stats.totalElan += Math.max(0, diff);
  if (!prev.submittedAt) state.stats.ritualsDone++;
  if (sc.perfect && !prev.perfect) state.stats.perfectDays++;
  if (prev.perfect && !sc.perfect) state.stats.perfectDays = Math.max(0, state.stats.perfectDays - 1);
  // Points d'axe : difference aussi
  const prevAx = prev.axisPoints || {};
  for (const ax of config.stages.axes.order) {
    const d = (sc.axisPoints[ax] || 0) - (prevAx[ax] || 0);
    state.species.axes[ax] = Math.max(0, Math.round((state.species.axes[ax] + d) * 10) / 10);
  }
  // Rubis a chaque palier de serie franchi
  const tier = streakTier(state.streak.current);
  if (!rec.late && tier >= 0 && tier > (prev.streakTierAwarded ?? -1) && (state.streak.current === config.habits.streak.tiers[tier])) {
    state.wallet.rubis += config.habits.streak.rubis_at_tier; rec.streakTierAwarded = tier;
  }
  // Points de Stade du Rituel : le moteur vertical est finance d'abord par la vie reelle.
  // Idempotent — on ne verse que ce qui n'a pas encore ete verse pour ce jour ; addStagePoints
  // applique le plafond quotidien, donc re-saisir 5 jours d'un coup ne fait pas exploser le compteur.
  const SP = config.habits.stage_points || {};
  const spTarget = sc.perfect ? (SP.perfect_day || 0)
    : (sc.pillars.length >= (SP.min_pillars ?? 2) ? (SP.valid_day || 0) : 0);
  const spAlready = prev.stagePointsAwarded || 0;
  const spGranted = spTarget > spAlready ? addStagePoints(spTarget - spAlready, { silent: true }) : 0;
  rec.stagePointsAwarded = spAlready + spGranted;

  // Bouclier de serie : +1 tous les shield_every_days jours, plafonne. Le filet se recharge.
  const S = config.habits.streak;
  if (!rec.late && S.shield_every_days && state.streak.current > 0
      && state.streak.current % S.shield_every_days === 0 && !rec.shieldAwarded) {
    if (state.streak.shields < (S.shield_max ?? 3)) state.streak.shields++;
    rec.shieldAwarded = true;
  }
  if (!state.sync.queue.includes(key)) state.sync.queue.push(key);
  save();
  bus.emit('day:submitted', { key, rec, diff, sc, spGranted });
  return { rec, diff, sc, spGranted };
}

// Jours manques (pas saisis) entre le dernier jour saisi et hier : Ombre + consommation de bouclier.
export function processMissedDays() {
  const today = dayKey();
  const keys = Object.keys(state.days).sort();
  if (!keys.length) return { missed: [], shielded: [] };
  const last = keys[keys.length - 1];
  const missed = [];
  for (let k = addDays(last, 1); daysBetween(k, today) >= 1; k = addDays(k, 1)) {
    if (!state.days[k]) missed.push(k);
  }
  // Le Bouclier absorbe une absence ENTIERE si on en a assez. Sinon on n'en depense aucun :
  // bruler des boucliers pour une serie qui casse de toute facon serait une double peine.
  const covered = missed.length > 0 && missed.length <= state.streak.shields;
  const shielded = [];
  for (const k of missed) {
    if (state.days[k]?.missedProcessed) continue;
    if (covered && state.streak.shields > 0) {
      // Le Bouclier de serie absorbe le jour manque : la serie tient, pas d'Elan.
      state.streak.shields--;
      state.days[k] = { entries: {}, elan: 0, shieldUsed: true, submittedAt: Date.now(), late: false, missedProcessed: true };
      shielded.push(k);
    } else {
      state.days[k] = { entries: {}, elan: 0, missed: true, missedProcessed: true };
      state.species.axes.ombre += config.habits.axis_points.missed_day_shadow;
    }
  }
  if (missed.length) { recomputeStreak(); save(); }
  return { missed, shielded };
}

export function elanTotalForDay(key) { return state.days[key]?.elan || 0; }
