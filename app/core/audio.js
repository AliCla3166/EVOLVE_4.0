// LE SON. Il n'y en avait aucun : zéro fichier, zéro ligne. C'était le meilleur rapport
// « impression de vie » / effort de tout le projet, et le seul qu'on ne voit pas sur une capture
// d'écran, ce qui explique qu'il soit toujours repoussé.
//
// Parti pris : TOUT est synthétisé, rien n'est chargé. Pas un octet d'audio dans le dépôt, pas
// une requête réseau, pas de licence à surveiller — et une nappe qui ne boucle jamais parce
// qu'elle n'est pas un enregistrement mais un système qui tourne.
//
// La règle qui tient l'ensemble : CHAQUE ÂGE A SA TONALITÉ. Le stade 1 est en ré, la Divinité
// en la ; les pops, les cloches et la nappe d'un âge sont tous accordés sur sa fondamentale. Donc
// le jeu change de clé quand l'espèce évolue, et le joueur l'entend avant de le comprendre.
// C'est l'équivalent sonore de la palette par stade.
import { state, save } from './state.js';

let AC = null;              // AudioContext, créé au premier geste (les navigateurs l'exigent)
let master = null, sfxBus = null, padBus = null;
let amb = null;             // la nappe en cours { stage, nodes[], timer }
let ready = false;

// Une fondamentale par âge (Hz). La progression monte lentement : la Lignée s'éclaircit.
const ROOT = [146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 220.00];
// Les degrés autorisés (demi-tons). Pentatonique mineure jusqu'au stade 6, majeure ensuite :
// le monde s'ouvre au moment où l'espèce quitte sa planète.
const MIN5 = [0, 3, 5, 7, 10, 12, 15, 17];
const MAJ5 = [0, 2, 4, 7, 9, 12, 14, 16];

function root(s) { return ROOT[Math.max(0, Math.min(9, (s | 0) - 1))] || 174.61; }
function scale(s) { return s >= 7 ? MAJ5 : MIN5; }
function note(s, deg, oct = 0) { const sc = scale(s); return root(s) * Math.pow(2, (sc[((deg % sc.length) + sc.length) % sc.length] / 12) + oct); }
function stageNow() { return state?.species?.stage || 1; }

export function supported() { return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext); }
export function enabled() { return state.settings.soundEnabled !== false; }
export function volume() { return state.settings.soundVolume ?? 0.7; }

export function setEnabled(on) {
  state.settings.soundEnabled = !!on; save();
  if (!on) { stopAmbience(); }
  else { unlock(); ambience(stageNow()); }
}
export function setVolume(v) {
  state.settings.soundVolume = Math.max(0, Math.min(1, v)); save();
  if (master) master.gain.setTargetAtTime(volume(), AC.currentTime, 0.05);
}

// Un AudioContext ne démarre qu'après un geste de l'utilisateur. On s'accroche donc au premier
// clic venu, une seule fois, et on ne demande jamais rien à personne.
export function unlock() {
  if (!supported() || !enabled()) return;
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = volume(); master.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    padBus = AC.createGain(); padBus.gain.value = 0.0; padBus.connect(master);
    ready = true;
  }
  if (AC.state === 'suspended') AC.resume();
}

// --- briques ---------------------------------------------------------------
function env(g, t0, a, d, peak = 1) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
}
function osc(type, f, t0, a, d, peak, dest, glide) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + a + d);
  env(g, t0, a, d, peak);
  o.connect(g).connect(dest || sfxBus); o.start(t0); o.stop(t0 + a + d + 0.05);
  return o;
}
let NOISE = null;
function noiseBuf() {
  if (NOISE) return NOISE;
  const n = AC.sampleRate * 2, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  // Bruit brun : plus doux que le blanc, c'est lui qui fait l'eau et le vent.
  let last = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
  NOISE = b; return b;
}
function noise(t0, a, d, peak, freq, q, dest) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf(); s.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  const g = AC.createGain(); env(g, t0, a, d, peak);
  s.connect(f).connect(g).connect(dest || sfxBus); s.start(t0); s.stop(t0 + a + d + 0.05);
}

// --- sons d'interface -------------------------------------------------------
// Chartés : « pops, cloches, montées harmoniques ». Tous accordés sur l'âge courant.
const SFX = {
  tap: (t, s) => osc('sine', note(s, 4, 1), t, 0.004, 0.055, 0.14),
  pop: (t, s) => { osc('triangle', note(s, 2, 1), t, 0.004, 0.09, 0.18, null, note(s, 5, 1)); },
  // Le gain d'Élan : une cloche courte, deux partiels. C'est LE son de la vie réelle.
  gain: (t, s) => { osc('sine', note(s, 4, 1), t, 0.006, 0.34, 0.20); osc('sine', note(s, 7, 2), t + 0.01, 0.006, 0.22, 0.09); },
  // Récolte du Rituel : une montée de trois notes. Le seul son un peu long du jeu.
  harvest: (t, s) => [0, 2, 4].forEach((d, i) => { osc('sine', note(s, d, 1), t + i * 0.085, 0.008, 0.42, 0.20); osc('sine', note(s, d, 2), t + i * 0.085, 0.008, 0.24, 0.06); }),
  build: (t, s) => { noise(t, 0.003, 0.11, 0.16, 900, 1.4); osc('square', note(s, 0, 0), t, 0.004, 0.10, 0.07); },
  done: (t, s) => [0, 4, 7].forEach((d, i) => osc('triangle', note(s, d, 1), t + i * 0.06, 0.006, 0.30, 0.14)),
  refuse: (t, s) => osc('sine', note(s, 1, 0) * 0.75, t, 0.005, 0.13, 0.13, null, note(s, 0, -1)),
  hit: (t, s) => { noise(t, 0.002, 0.07, 0.16, 1500, 0.9); osc('triangle', note(s, 0, 0) * 1.5, t, 0.002, 0.06, 0.09, null, note(s, 0, -1)); },
  turret: (t, s) => { noise(t, 0.002, 0.05, 0.10, 2600, 2.2); osc('sawtooth', note(s, 5, 1), t, 0.002, 0.07, 0.05, null, note(s, 0, 0)); },
  death: (t, s) => { noise(t, 0.004, 0.19, 0.11, 420, 0.7); osc('sine', note(s, 0, 0), t, 0.006, 0.20, 0.08, null, note(s, 0, -2)); },
  victory: (t, s) => [0, 2, 4, 7].forEach((d, i) => { osc('sine', note(s, d, 1), t + i * 0.11, 0.01, 0.55, 0.20); osc('sine', note(s, d, 2), t + i * 0.11, 0.01, 0.35, 0.07); }),
  defeat: (t, s) => [4, 2, 0].forEach((d, i) => osc('sine', note(s, d, 0), t + i * 0.15, 0.01, 0.45, 0.15, null, note(s, d, -1))),
  // Draft de mutation : le son du choix. Un accord qui s'ouvre.
  mutation: (t, s) => [0, 3, 7, 10].forEach((d, i) => osc('sine', note(s, 0, 1) * Math.pow(2, d / 12), t + i * 0.05, 0.02, 0.8, 0.11)),
  card: (t, s) => { noise(t, 0.003, 0.10, 0.13, 1800, 1.1); osc('triangle', note(s, 3, 1), t, 0.003, 0.08, 0.07); },
  // Métamorphose : dix fois dans une partie de quinze mois. Elle a droit à quatre secondes.
  morph: (t, s) => {
    for (let i = 0; i < 7; i++) osc('sine', note(s, i, 1), t + i * 0.13, 0.05, 2.4 - i * 0.15, 0.10);
    osc('sine', note(s + 1, 0, 0), t + 1.0, 0.9, 2.6, 0.16);
    osc('sine', note(s + 1, 4, 1), t + 1.3, 0.9, 2.2, 0.09);
    noise(t + 0.9, 0.7, 2.4, 0.05, 700, 0.6);
  }
};

let lastAt = 0;
export function play(name, opts = {}) {
  if (!enabled() || !ready || !AC) return;
  const fn = SFX[name]; if (!fn) return;
  const now = AC.currentTime;
  // Garde-fou : en bataille, dix unités peuvent frapper la même image. On plafonne.
  if (!opts.force && name !== 'morph' && now - lastAt < 0.022) return;
  lastAt = now;
  try { fn(now + 0.001, opts.stage || stageNow()); } catch (e) { /* le son ne casse jamais le jeu */ }
}

// --- la nappe par âge -------------------------------------------------------
// Cinq mondes sonores pour dix âges, et dans chacun un générateur d'événements rares : c'est lui
// qui empêche la nappe de ressembler à une boucle. On n'entend jamais deux fois la même minute.
const BEDS = {
  eau:   { filt: 'lowpass', freq: 380, q: 0.7, gain: 0.055, drone: [0, 7], every: [2.2, 6.0], evt: 'bulle' },
  rivage:{ filt: 'bandpass', freq: 900, q: 0.5, gain: 0.032, drone: [0, 5], every: [1.6, 5.0], evt: 'cri' },
  ville: { filt: 'lowpass', freq: 220, q: 1.0, gain: 0.050, drone: [0, 7, 12], every: [2.5, 7.0], evt: 'coup' },
  vide:  { filt: 'lowpass', freq: 160, q: 1.4, gain: 0.045, drone: [0, 7, 14], every: [4.0, 11.0], evt: 'scintille' },
  divin: { filt: 'lowpass', freq: 600, q: 0.6, gain: 0.030, drone: [0, 4, 7, 11], every: [3.5, 9.0], evt: 'cloche' }
};
const BED_OF = ['eau', 'eau', 'rivage', 'rivage', 'ville', 'ville', 'vide', 'vide', 'divin', 'divin'];

function bedEvent(kind, s) {
  const t = AC.currentTime + 0.01;
  if (kind === 'bulle') { osc('sine', note(s, 5, 1) * (0.9 + Math.random() * 0.3), t, 0.004, 0.10, 0.045, padBus, note(s, 7, 2)); }
  else if (kind === 'cri') { const d = Math.floor(Math.random() * 5); osc('triangle', note(s, d, 2), t, 0.02, 0.16, 0.030, padBus, note(s, d + 2, 2)); }
  else if (kind === 'coup') { noise(t, 0.004, 0.28, 0.030, 300 + Math.random() * 400, 1.6, padBus); }
  else if (kind === 'scintille') { const d = Math.floor(Math.random() * 6); osc('sine', note(s, d, 3), t, 0.35, 1.1, 0.018, padBus); }
  else if (kind === 'cloche') { const d = Math.floor(Math.random() * 4); osc('sine', note(s, d, 2), t, 0.02, 2.2, 0.030, padBus); osc('sine', note(s, d, 3), t, 0.02, 1.4, 0.010, padBus); }
}

export function ambience(stage = stageNow()) {
  if (!supported() || !enabled()) return;
  unlock();
  if (!ready) return;
  if (amb && amb.stage === stage) return;
  stopAmbience(0.8);
  const B = BEDS[BED_OF[Math.max(0, Math.min(9, stage - 1))]];
  const t0 = AC.currentTime, nodes = [];

  // Le lit : bruit brun filtré, avec un filtre qui respire. C'est l'eau, le vent ou la rumeur.
  const src = AC.createBufferSource(); src.buffer = noiseBuf(); src.loop = true;
  const flt = AC.createBiquadFilter(); flt.type = B.filt; flt.frequency.value = B.freq; flt.Q.value = B.q;
  const lfo = AC.createOscillator(), lfoG = AC.createGain();
  lfo.frequency.value = 0.055 + Math.random() * 0.05; lfoG.gain.value = B.freq * 0.34;
  lfo.connect(lfoG).connect(flt.frequency);
  const gn = AC.createGain(); gn.gain.value = B.gain;
  src.connect(flt).connect(gn).connect(padBus);
  src.start(t0); lfo.start(t0); nodes.push(src, lfo);

  // Le bourdon : deux ou trois sinus très bas, légèrement désaccordés, qui battent lentement.
  B.drone.forEach((d, i) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.value = note(stage, 0, -1) * Math.pow(2, d / 12) * (1 + (i - 1) * 0.0016);
    g.gain.value = 0.028 / (i + 1);
    o.connect(g).connect(padBus); o.start(t0); nodes.push(o);
  });

  padBus.gain.cancelScheduledValues(t0);
  padBus.gain.setValueAtTime(0.0001, t0);
  padBus.gain.exponentialRampToValueAtTime(1, t0 + 2.5);      // la nappe entre en 2,5 s

  const tick = () => {
    if (!amb) return;
    bedEvent(B.evt, stage);
    amb.timer = setTimeout(tick, (B.every[0] + Math.random() * (B.every[1] - B.every[0])) * 1000);
  };
  amb = { stage, nodes, timer: setTimeout(tick, 1500) };
}

export function stopAmbience(fade = 0.4) {
  if (!amb || !AC) return;
  clearTimeout(amb.timer);
  const t = AC.currentTime, old = amb.nodes;
  padBus.gain.cancelScheduledValues(t);
  padBus.gain.setValueAtTime(Math.max(0.0001, padBus.gain.value), t);
  padBus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  setTimeout(() => { for (const n of old) { try { n.stop(); } catch {} } }, fade * 1000 + 120);
  amb = null;
}

// Un onglet caché ne doit rien jouer : c'est la première chose qu'on reproche à un jeu web.
export function init() {
  if (!supported()) return;
  const first = () => { unlock(); if (enabled()) ambience(); };
  document.addEventListener('pointerdown', first, { once: true, capture: true });
  document.addEventListener('keydown', first, { once: true, capture: true });
  // Un clic sur un bouton fait « pop ». Délégué : aucun appel à ajouter dans les cinq modes.
  document.addEventListener('pointerdown', (e) => {
    const b = e.target?.closest?.('.btn, .chip, nav.tabs button, .slot, .card');
    if (b && !b.disabled) play(b.classList?.contains('btn') ? 'pop' : 'tap');
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (!AC) return;
    if (document.visibilityState === 'hidden') AC.suspend();
    else if (enabled()) AC.resume();
  });
}
