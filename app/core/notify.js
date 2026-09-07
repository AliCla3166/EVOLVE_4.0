// Le declencheur du soir. C'est le maillon qui manquait a la boucle d'habitude : sans rappel,
// le jeu repose entierement sur la memoire du joueur.
//
// HONNETETE TECHNIQUE — a lire avant de "corriger" ce fichier :
// une PWA ne peut PAS programmer de facon fiable une notification locale qui parte quand l'app est
// fermee. L'API Notification Triggers n'est pas livree, et le Push API demanderait un serveur et des
// cles VAPID. Ce module fait donc ce qui est reellement possible, et le dit a l'utilisateur :
//   1. si l'app est ouverte (ou en arriere-plan, onglet vivant) a l'heure dite -> notification sure ;
//   2. si l'app est reouverte apres l'heure et que le Rituel du jour n'est pas recolte -> rappel
//      immediat, une seule fois par jour ;
//   3. periodicSync quand le navigateur l'accorde (Chrome Android, app installee) -> meilleure
//      couverture, jamais garantie.
// La fiabilite complete viendra de l'APK Capacitor (notifications locales natives).
import { state, save } from './state.js';
import { config } from './config.js';
import { dayKey } from './clock.js';
import { makeRng } from './rng.js';

let timer = null;

export function supported() {
  return typeof Notification !== 'undefined';
}
export function permission() {
  return supported() ? Notification.permission : 'unsupported';
}
export async function requestPermission() {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

function cfg() { return config.notify || { default_hour: 21, default_minute: 0, title: 'EVOLVE', pending: [], done: [] }; }
export function notifyHour() { return state.settings.notifyHour ?? cfg().default_hour; }
export function notifyMinute() { return state.settings.notifyMinute ?? cfg().default_minute ?? 0; }
export function enabled() { return !!state.settings.notifyEnabled; }

// Phrase du soir : deterministe par jour, pour qu'un meme soir ne change pas de texte a chaque tick.
export function lineFor(key = dayKey()) {
  const c = cfg();
  const done = !!state.days[key]?.submittedAt;
  const pool = (done ? c.done : c.pending) || [];
  if (!pool.length) return done ? 'Journée récoltée.' : 'Le Rituel du jour est encore ouvert.';
  return makeRng('notify:' + key + ':' + (done ? 'd' : 'p')).pick(pool);
}

function targetTime(base = new Date()) {
  const d = new Date(base);
  d.setHours(notifyHour(), notifyMinute(), 0, 0);
  return d;
}

async function fire(reason) {
  if (!enabled() || permission() !== 'granted') return false;
  const key = dayKey();
  // Une seule notification par jour, quelle qu'en soit la cause.
  if (state.settings.notifiedDay === key) return false;
  const body = lineFor(key);
  state.settings.notifiedDay = key; save();
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    const opts = { body, icon: './assets/icons/icon-192.png', badge: './assets/icons/icon-192.png', tag: 'evolve-rituel', renotify: false, data: { reason } };
    if (reg?.showNotification) await reg.showNotification(cfg().title, opts);
    else new Notification(cfg().title, opts);
    return true;
  } catch (e) { console.warn('[notify]', e); return false; }
}

// Rappel de rattrapage : l'app est rouverte apres l'heure, le Rituel n'est pas fait.
export function catchUp() {
  if (!enabled() || permission() !== 'granted') return;
  const key = dayKey();
  if (state.days[key]?.submittedAt) return;      // deja recolte : on ne derange pas
  if (state.settings.notifiedDay === key) return;
  if (Date.now() < targetTime().getTime()) return;
  fire('catchup');
}

// Minuterie tant que l'onglet vit. Se reprogramme toute seule pour le lendemain.
export function schedule() {
  clearTimeout(timer); timer = null;
  if (!enabled() || permission() !== 'granted') return;
  let target = targetTime();
  if (Date.now() >= target.getTime()) { target = targetTime(new Date(Date.now() + 86400e3)); }
  const delay = Math.max(1000, target.getTime() - Date.now());
  // setTimeout au-dela de ~24 j deborde : ici on est toujours sous 24 h, c'est sur.
  timer = setTimeout(async () => { await fire('timer'); schedule(); }, delay);
}

export function cancel() { clearTimeout(timer); timer = null; }

// Meilleure couverture quand le navigateur l'accorde. Jamais garantie, jamais bloquant.
export async function tryPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (!reg?.periodicSync) return false;
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (st.state !== 'granted') return false;
    await reg.periodicSync.register('evolve-rappel', { minInterval: 12 * 3600e3 });
    return true;
  } catch { return false; }
}

export async function enable() {
  const p = await requestPermission();
  state.settings.notifyEnabled = (p === 'granted');
  save();
  if (state.settings.notifyEnabled) { schedule(); tryPeriodicSync(); }
  return p;
}
export function disable() { state.settings.notifyEnabled = false; save(); cancel(); }

// Apercu : ignore le verrou "une par jour" pour que le bouton Tester montre vraiment quelque chose.
export async function preview() {
  if (permission() !== 'granted') { const p = await requestPermission(); if (p !== 'granted') return p; }
  const body = lineFor();
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    const opts = { body, icon: './assets/icons/icon-192.png', tag: 'evolve-apercu' };
    if (reg?.showNotification) await reg.showNotification(cfg().title, opts);
    else new Notification(cfg().title, opts);
    return 'granted';
  } catch { return 'error'; }
}

export function init() {
  if (!supported()) return;
  if (state.settings.notifyEnabled && permission() === 'granted') { schedule(); catchUp(); tryPeriodicSync(); }
}
