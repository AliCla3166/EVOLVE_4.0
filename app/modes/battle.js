// La Bataille — couloir horizontal facon We Are Warriors.
// Trois terrains : campaign (base contre base), defense (vagues, source de Points de Stade
// COMPLEMENTAIRE du Rituel), raid (butin).
// Zero nombre d'equilibrage en dur : tout vient de config.battle / config.cards / config.stages.
import { config, stageOf } from '../core/config.js';
import { state, save } from '../core/state.js';
import { h, btn, panel, bar, chip, toast, modal } from '../core/ui.js';
import { speciesMods, mult, speciesVisual } from '../core/genome.js';
import { drawCreature, renderToCanvas } from '../render/creature.js';
import { makeRng } from '../core/rng.js';
import { dayKey } from '../core/clock.js';
import {
  grant, spend, addStagePoints, stagePointsRemainingToday, progressContract,
  addCardXp, unlockCard, recordKills
} from '../core/progress.js';

const INK = '#171B23';
const CHALK = '#F4F1E8';

let CTX = null;      // contexte fourni par main.js
let ROOT = null;     // element du menu
let B = null;        // etat de la bataille en cours
let raf = 0;
let menuPeril = 1;   // choix de peril memorise entre deux visites

// ------------------------------------------------------------------
// Cycle de vie
// ------------------------------------------------------------------
export function mount(el, ctx) {
  CTX = ctx; ROOT = el;
  renderMenu();
}
export function unmount() {
  stopLoop();
  destroyBattle();
  ROOT = null;
}

// ------------------------------------------------------------------
// Helpers de configuration
// ------------------------------------------------------------------
const CB = () => config.battle;
const CC = () => config.cards;
function stageNum() { return state.species.stage; }
function stageDef() { return stageOf(stageNum()); }
// Plafond de vague en Defense : la difficulte ne monte plus toute seule a l'infini, elle monte
// quand la Lignee monte. Sans ce plafond, +6 vagues par jour contre une croissance geometrique
// rendait le mode injouable en ~2 semaines — et coupait le seul pont vers les Points de Stade.
function defenseWaveCap() { const D = CB().defense; return D.wave_cap_base + D.wave_cap_per_stage * (stageNum() - 1); }
function cardDef(id) { return CC().cards.find(c => c.id === id) || null; }
function deckIds() {
  const d = state.cards.deck;
  return (d && d.length) ? d.slice() : CC().starter_deck.slice();
}
function currentFaction() {
  const F = CB().enemy_factions;
  const idx = Math.floor((state.battle.campaignLevel - 1) / F.rotation_every) % F.list.length;
  return F.list[idx];
}
function factionVisual(fac) {
  return { seed: fac.seed, stage: stageNum(), bodyplan: stageDef().bodyplan, eyes: 2, eye_size: 1, mouth: 'fangs', skin: 'plain', outline: 1 };
}
function turretDefs() { return CB().turrets.types; }
function turretSlots() {
  const n = CB().turrets.slots;
  const arr = state.battle.turrets || (state.battle.turrets = []);
  while (arr.length < n) arr.push(null);
  arr.length = n;
  return arr;
}
function turretCost(typeId, level) {
  const t = turretDefs()[typeId];
  return Math.round(t.cost_mat * Math.pow(t.cost_growth, level));
}

// Cout de ration : budget de stats -> prix. La regle centrale d'equilibrage.
function costOf(stats) {
  const F = CB().cost_formula;
  const dps = stats.atk_interval > 0 ? (stats.dmg + (stats.heal || 0)) / stats.atk_interval : 0;
  const raw = stats.hp / F.hp_div + dps * F.dps_mult + stats.speed / F.speed_div + stats.range / F.range_div;
  return Math.max(F.min_cost, Math.round(raw * F.cost_mult));
}

// ------------------------------------------------------------------
// Menu
// ------------------------------------------------------------------
function renderMenu() {
  if (!ROOT) return;
  ROOT.innerHTML = '';
  const b = state.battle;
  const fac = currentFaction();

  // --- Campagne
  ROOT.append(modeCard('⚔️', 'Campagne', `Niveau ${b.campaignLevel} · ${fac.name}`, fac.desc, () => startBattle({ mode: 'campaign' })));

  // --- Defense
  const sp = stagePointsRemainingToday();
  const wcap = defenseWaveCap();
  const startWave = Math.min(b.defenseWave, wcap);
  ROOT.append(modeCard('🛡️', 'Défense', `Vague ${startWave} / ${wcap} · ${sp} Point${sp > 1 ? 's' : ''} de Stade restant${sp > 1 ? 's' : ''} aujourd'hui`,
    sp > 0 ? `Complète les Points de Stade du Rituel. Plafond de vague ${wcap} au stade ${stageNum()} ; une défaite recule de ${CB().defense.wave_loss_setback}.`
      : 'Plafond du jour atteint — tu peux jouer, sans progression verticale.',
    () => startBattle({ mode: 'defense' })));

  // --- Raid
  const R = CB().raid;
  const today = dayKey();
  const used = b.raidsDay === today ? (b.raidsToday || 0) : 0;
  const free = Math.max(0, R.free_per_day - used);
  const raidCard = modeCard('💀', 'Raid', free > 0 ? `${free} sortie${free > 1 ? 's' : ''} gratuite${free > 1 ? 's' : ''}` : `Coût : ${raidCostNow()} 🧬`,
    'Butin pur, aucun Point de Stade.', () => startRaid());
  ROOT.append(raidCard);

  const perilRow = h('div', { class: 'row gap wrap', style: { marginTop: '2px' } });
  const rebuildPeril = () => {
    perilRow.innerHTML = '';
    perilRow.append(h('span', { class: 'muted' }, 'Péril'));
    for (const p of R.peril) {
      perilRow.append(chip(`${p.n} · ${p.name}`, menuPeril === p.n, () => { menuPeril = p.n; rebuildPeril(); }));
    }
    perilRow.append(h('span', { class: 'muted small' }, `Butin ×${R.peril[menuPeril - 1].loot_mult}`));
  };
  rebuildPeril();
  ROOT.append(panel('💀 Péril du Raid', perilRow));

  // La conversion de biomasse etait invisible et quasi nulle (100 pour +2 rations) : elle est
  // maintenant plafonnee, rentable, et annoncee avant d'entrer.
  const RB = CB().ration;
  ROOT.append(h('p', { class: 'muted small', style: { margin: '2px 0 8px' } },
    `Chaque sortie convertit jusqu'à ${RB.start_biomasse_max} 🍖 en ration de départ (+${RB.start_bonus_per_biomasse} ration par 🍖).`));

  // --- Tourelles
  ROOT.append(renderTurrets());

  // --- Deck
  ROOT.append(renderDeckPanel());
}

function modeCard(ico, title, sub, desc, onClick) {
  return h('div', { class: 'mode-card', onClick },
    h('div', { class: 'm-ico' }, ico),
    h('div', { class: 'grow' },
      h('h3', {}, title),
      h('div', { class: 'm-desc' }, sub),
      h('div', { class: 'm-desc muted' }, desc)),
    h('div', { class: 'm-ico', style: { fontSize: '22px', width: '20px' } }, '›'));
}

function raidCostNow() {
  const R = CB().raid;
  const today = dayKey();
  const used = state.battle.raidsDay === today ? (state.battle.raidsToday || 0) : 0;
  const over = used - R.free_per_day;
  if (over < 0) return 0;
  const tab = R.cost_after_free;
  return tab[Math.min(over, tab.length - 1)];
}
function startRaid() {
  const cost = raidCostNow();
  if (cost > 0 && !spend({ genes: cost })) { toast('Pas assez de 🧬 Gènes', 'red'); return; }
  const today = dayKey();
  if (state.battle.raidsDay !== today) { state.battle.raidsDay = today; state.battle.raidsToday = 0; }
  state.battle.raidsToday++;
  save(); CTX.refreshWallet();
  startBattle({ mode: 'raid', peril: menuPeril });
}

function renderTurrets() {
  const wrap = h('div', { class: 'col gap' });
  const slots = turretSlots();
  const types = turretDefs();
  slots.forEach((slot, i) => {
    const row = h('div', { class: 'turret-slot', style: { flexWrap: 'wrap' } });
    if (!slot) {
      row.append(h('div', { class: 'm-ico', style: { fontSize: '22px', width: '28px' } }, '➕'));
      row.append(h('div', { class: 'grow small muted' }, `Emplacement ${i + 1} libre`));
      for (const [id, t] of Object.entries(types)) {
        if (id.startsWith('_')) continue;
        const c = turretCost(id, 0);
        row.append(btn(`${t.icon} ${c}🧱`, {
          kind: 'slate', size: 'sm',
          onClick: () => {
            if (!spend({ materiaux: c })) { toast('Pas assez de 🧱 Matériaux', 'red'); return; }
            slots[i] = { type: id, level: 1 }; save(); CTX.refreshWallet(); renderMenu();
          }
        }));
      }
    } else {
      const t = types[slot.type];
      const c = turretCost(slot.type, slot.level);
      row.append(h('div', { class: 'm-ico', style: { fontSize: '24px', width: '28px' } }, t.icon));
      row.append(h('div', { class: 'grow' },
        h('div', { style: { fontFamily: 'var(--display)' } }, `${t.label} · niv. ${slot.level}`),
        h('div', { class: 'small muted' }, t.heal ? `Soin ${Math.round(t.heal * slot.level)} / ${t.interval}s` : `Dégâts ${Math.round(t.dmg * slot.level)} / ${t.interval}s`)));
      row.append(btn(`⬆ ${c}🧱`, {
        kind: 'gold', size: 'sm',
        onClick: () => {
          if (!spend({ materiaux: c })) { toast('Pas assez de 🧱 Matériaux', 'red'); return; }
          slot.level++; save(); CTX.refreshWallet(); renderMenu();
        }
      }));
    }
    wrap.append(row);
  });
  return panel('🏹 Tourelles', wrap, h('div', { class: 'small muted', style: { marginTop: '6px' } }, 'Couche fixe près de ta base, achetée avec les Matériaux de la Colonie.'));
}

function renderDeckPanel() {
  const grid = h('div', { class: 'card-grid' });
  const ids = deckIds();
  for (const id of ids) {
    const def = cardDef(id);
    const isInstinct = !def || def.kind === 'instinct' || !def.archetype;
    const cell = h('div', { class: 'gcard' + (isInstinct ? ' instinct' : '') });
    // Un instinct n'a pas de corps a dessiner : pastille en texte (l'emoji d'un canvas depend
    // des polices du systeme et pouvait rendre la vignette vide).
    const art = isInstinct ? h('div', { class: 'gc-glyph' }, (def && def.icon) || '✦') : h('canvas');
    cell.append(art, h('div', { class: 'gc-name' }, def ? def.name : id));
    grid.append(cell);
    if (!isInstinct) requestAnimationFrame(() => {
      try {
        renderToCanvas(art, speciesVisual(), { tint: stageDef().palette.tint, archetype: def.archetype, role: CB().archetypes[def.archetype].role, t: 0.4, scale: 0.8 });
      } catch (e) { /* rendu decoratif : on ignore */ }
    });
  }
  return panel('🃏 Deck', grid,
    h('div', { class: 'row gap', style: { marginTop: '10px' } },
      h('div', { class: 'grow small muted' }, `${ids.length} carte(s) · main de ${CB().hand.size}`),
      btn('Gérer les cartes', { kind: 'purple', size: 'sm', onClick: () => CTX.navigate('cards') })));
}

// ------------------------------------------------------------------
// Preparation d'une bataille
// ------------------------------------------------------------------
function startBattle(opts) {
  destroyBattle();
  const pct = speciesMods();
  const st = stageDef();
  const L = CB().lane;
  const R = CB().ration;
  const mode = opts.mode;

  // Instincts du deck (passifs)
  const ids = deckIds();
  const instincts = ids.map(cardDef).filter(c => c && c.kind === 'instinct').map(c => c.effect).filter(Boolean);

  // Cartes-unites jouables
  const unitCards = ids.map(cardDef).filter(c => c && c.kind === 'unit');

  // Biomasse convertie en ration de depart
  const bio = Math.floor(Math.min(state.wallet.biomasse, R.start_biomasse_max));
  let startBonus = Math.min(R.start_bonus_max, bio * R.start_bonus_per_biomasse);
  if (bio > 0) {
    state.wallet.biomasse -= bio; save(); CTX.refreshWallet();
    toast(`−${bio} 🍖 → +${Math.round(startBonus)} rations de départ`, 'gold');
  }

  const baseHp = CB().base.hp_base + CB().base.hp_per_stage * (stageNum() - 1);
  const fac = currentFaction();
  const peril = mode === 'raid' ? CB().raid.peril[(opts.peril || 1) - 1] : null;

  let enemyBase = null;
  if (mode === 'campaign') {
    const C = CB().campaign;
    enemyBase = { x: L.base_x_enemy, hp: C.enemy_base_hp * Math.pow(C.enemy_base_hp_growth, state.battle.campaignLevel - 1), max: 0 };
  } else if (mode === 'raid') {
    const C = CB().campaign;
    enemyBase = { x: L.base_x_enemy, hp: C.enemy_base_hp * peril.hp_mult, max: 0 };
  }
  if (enemyBase) enemyBase.max = enemyBase.hp;

  B = {
    mode, pct, stage: stageNum(), st, fac, peril,
    lane: L, laneLen: L.length,
    ration: R.start + startBonus, rationMax: R.max,
    rationRate: R.rate_per_sec * mult(pct, 'ration_rate'),
    enemyRation: 0,
    units: [], projectiles: [], floaters: [], particles: [], deaths: [],
    playerBase: { x: L.base_x_player, hp: baseHp, max: baseHp },
    enemyBase,
    time: 0, shake: 0, freezeT: 0,
    order: CB().orders.default,
    targeting: CB().targeting.default,
    instincts, unitCards,
    drawPile: [], hand: [],
    cardsPlayed: 0, freeCards: 0,
    killsByCard: {}, totalKills: 0,
    wave: mode === 'defense' ? Math.min(state.battle.defenseWave, defenseWaveCap()) : 0,
    wavesHeld: 0, waveT: 0, waveQueue: [], waveSpawned: 0,
    over: false, result: null,
    powers: CB().powers.list.filter(p => p.min_stage <= stageNum()).map(p => ({ def: p, cd: 0 })),
    turrets: buildTurrets(),
    enemySpawnCd: 0,
    visual: speciesVisual(),
    enemyVisual: factionVisual(fac),
    dpr: 1, W: 0, H: 0
  };

  // Instinct "premiere carte gratuite"
  for (const e of instincts) if (e.kind === 'first_free') B.freeCards += 1;

  buildDrawPile();
  for (let i = 0; i < CB().hand.size; i++) drawCard();
  if (mode === 'defense') prepareWave(B.wave);

  buildOverlay();
  startLoop();
}

function buildTurrets() {
  const out = [];
  const slots = turretSlots();
  const types = turretDefs();
  const L = CB().lane;
  slots.forEach((s, i) => {
    if (!s) return;
    const t = types[s.type];
    out.push({
      type: s.type, def: t, level: s.level, cd: 0,
      x: L.base_x_player + L.spawn_offset * 0.45 + i * L.spawn_offset * 0.22
    });
  });
  return out;
}

function buildDrawPile() {
  const pool = B.unitCards.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  B.drawPile = pool;
}
function drawCard() {
  if (!B.unitCards.length) return;
  if (!B.drawPile.length) buildDrawPile();
  const c = B.drawPile.pop();
  if (c) B.hand.push(c);
}

// ------------------------------------------------------------------
// Stats d'unites
// ------------------------------------------------------------------
function instinctArchHpPct(archId) {
  let p = 0;
  for (const e of B.instincts) if (e.kind === 'archetype_bonus' && e.archetype === archId) p += (e.hp_pct || 0);
  return p;
}
function instinctCostReduction(card) {
  let r = 0;
  for (const e of B.instincts) if (e.kind === 'cost_reduction' && e.rarity === card.rarity) r += (e.amount || 0);
  return r;
}
// Budget "propre" de la carte (sans genome) : sert au prix.
function cardBudget(card) {
  const A = CB().archetypes[card.archetype];
  const col = state.cards.collection[card.id];
  const count = col?.count || 0;
  const dup = 1 + Math.max(0, count - 2) * CC().duplicate_level_pct / 100;
  const ed = CC().editions[col?.edition || 'none'] || CC().editions.none;
  const edm = 1 + (ed.bonus_pct || 0) / 100;
  const m = card.mods || {};
  return {
    hp: A.hp * (1 + (m.hp_pct || 0) / 100) * dup * edm,
    dmg: (A.dmg || 0) * (1 + (m.dmg_pct || 0) / 100) * dup * edm,
    heal: (A.heal || 0) * dup * edm,
    speed: A.speed, range: A.range, atk_interval: A.atk_interval,
    dup, edm
  };
}
function cardCost(card) {
  return Math.max(CB().cost_formula.min_cost, costOf(cardBudget(card)) - instinctCostReduction(card));
}
function makePlayerUnit(card) {
  const A = CB().archetypes[card.archetype];
  const bud = cardBudget(card);
  const p = B.pct;
  const m = card.mods || {};
  const hp = bud.hp * mult(p, 'hp') * mult(p, 'unit_hp') * (1 + instinctArchHpPct(card.archetype) / 100);
  const dmg = bud.dmg * mult(p, 'damage') * mult(p, 'unit_damage');
  const heal = bud.heal * mult(p, 'damage');
  return {
    side: 'p', cardId: card.id, arch: card.archetype, role: A.role,
    x: B.lane.base_x_player + B.lane.spawn_offset,
    hp, maxHp: hp, dmg, heal, speed: A.speed * mult(p, 'speed'),
    range: A.range, interval: A.atk_interval, cd: A.atk_interval * 0.5,
    sizeMult: A.size * (m.size || 1), trait: m.trait || null,
    kills: 0, alphaStacks: 0, dots: [], slowT: 0, slowPct: 0, frozenT: 0,
    flash: 0, pose: 'walk', dead: false, deadT: 0, boss: false
  };
}
function makeEnemyUnit(archId, opts = {}) {
  const A = CB().archetypes[archId];
  const C = CB().campaign;
  let hpMult = 1, dmgMult = 1;
  if (B.mode === 'campaign') {
    const lv = state.battle.campaignLevel - 1;
    hpMult = Math.pow(C.enemy_hp_growth, lv); dmgMult = Math.pow(C.enemy_dmg_growth, lv);
  } else if (B.mode === 'raid') {
    hpMult = B.peril.hp_mult; dmgMult = B.peril.hp_mult;
  } else if (B.mode === 'defense') {
    hpMult = Math.pow(CB().defense.enemy_hp_growth, B.wave - 1);
    dmgMult = Math.pow(CB().defense.enemy_dmg_growth, B.wave - 1);
  }
  const boss = !!opts.boss;
  if (boss) hpMult *= CB().defense.boss_hp_mult;
  const hp = A.hp * hpMult;
  return {
    side: 'e', cardId: null, arch: boss ? 'boss' : archId, baseArch: archId, role: A.role,
    x: opts.x !== undefined ? opts.x : (B.mode === 'defense' ? B.laneLen : B.lane.base_x_enemy - B.lane.spawn_offset),
    hp, maxHp: hp, dmg: (A.dmg || 0) * dmgMult, heal: (A.heal || 0) * hpMult,
    speed: A.speed, range: A.range, interval: A.atk_interval, cd: A.atk_interval * 0.5,
    sizeMult: A.size * (boss ? CB().combat.boss_size_mult : 1), trait: null,
    kills: 0, alphaStacks: 0, dots: [], slowT: 0, slowPct: 0, frozenT: 0,
    flash: 0, pose: 'walk', dead: false, deadT: 0, boss
  };
}
function enemyCost(archId) {
  const A = CB().archetypes[archId];
  return costOf({ hp: A.hp, dmg: A.dmg || 0, heal: A.heal || 0, speed: A.speed, range: A.range, atk_interval: A.atk_interval });
}

// ------------------------------------------------------------------
// Overlay DOM
// ------------------------------------------------------------------
function buildOverlay() {
  const wrap = h('div', { class: 'battle-wrap' });
  const canvas = h('canvas');
  wrap.append(canvas);

  const title = B.mode === 'campaign' ? `Niveau ${state.battle.campaignLevel}`
    : B.mode === 'defense' ? `Vague ${B.wave}` : `Raid · ${B.peril.name}`;
  const label = h('div', { class: 'pill', id: 'b-title' }, title);
  const orderBtn = h('button', { class: 'chip active', onClick: toggleOrder }, '⚔️ Attaquer');
  const targetBtn = h('button', { class: 'chip', onClick: toggleTargeting }, '🎯 Proche');
  const quitBtn = h('button', { class: 'chip', onClick: abandon }, '✕');
  const note = h('div', { class: 'pill', style: { display: 'none', borderColor: 'var(--gold-d)', color: 'var(--gold)' } }, 'Récompenses du jour épuisées');
  const hud = h('div', { class: 'battle-hud' }, label, orderBtn, targetBtn, h('div', { class: 'grow' }), note, quitBtn);
  wrap.append(hud);

  const rb = bar(0, { color: 'var(--orange)', label: ' ', height: 22 });
  rb.classList.add('ration-bar');
  wrap.append(rb);

  // Combien d'unites sur le terrain, sur combien d'emplacements disponibles.
  const field = h('div', { class: 'field-count' }, '');
  wrap.append(field);

  const powersRow = h('div', { class: 'powers-row' });
  for (const p of B.powers) {
    const cost = powerCost(p.def);
    const b = h('button', { class: 'power-btn', title: p.def.name, onClick: () => usePower(p) }, p.def.icon, h('span', { class: 'cd' }));
    p.el = b; p.cdEl = b.querySelector('.cd'); p.cost = cost;
    powersRow.append(b);
  }
  wrap.append(powersRow);

  const hand = h('div', { class: 'hand' });
  wrap.append(hand);

  document.body.append(wrap);
  B.dom = { wrap, canvas, hud, label, orderBtn, targetBtn, note, rb, field, hand, powersRow };
  B.g = canvas.getContext('2d');
  resizeCanvas();
  B.onResize = () => resizeCanvas();
  window.addEventListener('resize', B.onResize);
  renderHand();
}

function resizeCanvas() {
  if (!B || !B.dom) return;
  const c = B.dom.canvas;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth || window.innerWidth, hh = c.clientHeight || window.innerHeight;
  c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(hh * dpr));
  B.dpr = dpr; B.W = w; B.H = hh;
  B.g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Ce que la carte donnera reellement sur le terrain : archetype + variante + niveau (doublons)
// + edition + genome. On affiche ca, pas les valeurs brutes de battle.json, sinon le joueur lit
// des chiffres qui ne correspondent pas a l'unite qu'il pose.
function cardStats(card) {
  if (!card.archetype) return null;   // instinct : pas d'unite, donc pas de stats de combat
  const A = CB().archetypes[card.archetype];
  if (!A) return null;
  const bud = cardBudget(card), p = B.pct, m = card.mods || {};
  const col = state.cards.collection[card.id];
  return {
    role: A.role,
    hp: Math.round(bud.hp * mult(p, 'hp') * mult(p, 'unit_hp') * (1 + instinctArchHpPct(card.archetype) / 100)),
    dmg: Math.round(bud.dmg * mult(p, 'damage') * mult(p, 'unit_damage')),
    heal: Math.round(bud.heal * mult(p, 'damage')),
    range: Math.round(A.range),
    speed: Math.round(A.speed * mult(p, 'speed')),
    interval: A.atk_interval,
    trait: m.trait || null,
    level: Math.max(0, (col?.count || 0) - 2) + 1,
    levelPct: Math.round((bud.dup - 1) * 100),
    editionPct: Math.round((bud.edm - 1) * 100),
    edition: col?.edition || 'none'
  };
}
// Les stats mises en avant sur la carte elle-meme (le reste est dans la fiche).
function statChips(st) {
  const U = CB().ui;
  const val = { hp: st.hp, dmg: st.dmg, heal: st.heal, range: st.range, speed: st.speed, interval: st.interval };
  const keys = U.card_stats.map(k => (k === 'dmg' && st.role === 'support') ? 'heal' : k);
  return keys.map(k => h('span', { class: 'hc-stat', title: U.stat_labels[k] }, U.stat_icons[k], h('b', {}, String(val[k] ?? 0))));
}

function renderHand() {
  const host = B.dom.hand;
  host.innerHTML = '';
  B.handEls = [];
  const U = CB().ui;
  B.hand.forEach((card, i) => {
    const cost = cardCost(card);
    const st = cardStats(card);
    const isInstinct = card.kind === 'instinct' || !card.archetype;
    const el = h('div', { class: 'hand-card' + (isInstinct ? ' instinct' : '') });
    const cv = isInstinct ? h('div', { class: 'hc-glyph' }, card.icon || '✦') : h('canvas');
    const info = h('button', { class: 'hc-info', title: 'Voir la fiche' }, 'i');
    el.append(cv, h('div', { class: 'hc-cost' }, String(cost)), info);
    if (st) el.append(h('div', { class: 'hc-role', title: U.role_labels[st.role] }, U.role_icons[st.role]));
    if (st && st.level > 1) el.append(h('div', { class: 'hc-lvl', title: `Niveau ${st.level} · +${st.levelPct} % PV et dégâts` }, 'N' + st.level));
    el.append(h('div', { class: 'hc-name' }, card.name));
    el.append(h('div', { class: 'hc-stats' }, ...(st ? statChips(st) : [h('span', { class: 'hc-stat wide' }, '✦', h('b', {}, 'passif'))])));

    // Clic = jouer la carte. Appui long (ou bouton i) = fiche, sans interrompre la bataille.
    let hold = 0, held = false;
    const startHold = () => { held = false; clearTimeout(hold); hold = setTimeout(() => { held = true; showCardInfo(card); }, 400); };
    const endHold = () => clearTimeout(hold);
    el.addEventListener('pointerdown', startHold);
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, endHold);
    el.addEventListener('click', (ev) => {
      if (held) { held = false; return; }
      if (ev.target.closest('.hc-info')) return;
      playCard(i);
    });
    info.addEventListener('click', (ev) => { ev.stopPropagation(); endHold(); showCardInfo(card); });

    host.append(el);
    B.handEls.push({ el, cost, card });
    // Rendu unique de la vignette (jamais chaque frame). Une carte instinct n'a pas de corps a
    // dessiner : sans ce branchement, le rendu levait une erreur et la vignette restait blanche.
    if (!isInstinct) requestAnimationFrame(() => {
      try {
        renderToCanvas(cv, B.visual, { tint: B.st.palette.tint, archetype: card.archetype, role: CB().archetypes[card.archetype].role, t: 0.3, scale: 0.85 });
      } catch (e) { /* rendu decoratif : on ignore */ }
    });
  });
  updateHandAffordability();
}

// Fiche d'une carte. Volontairement non bloquante : la bataille continue derriere et on ferme
// en touchant l'ecran — la fiche ne doit pas perturber la partie.
function showCardInfo(card) {
  if (!B || !B.dom) return;
  const U = CB().ui, st = cardStats(card);
  const prev = B.dom.wrap.querySelector('.card-info-veil'); if (prev) prev.remove();
  const rows = [];
  if (st) {
    const order = ['hp', st.role === 'support' ? 'heal' : 'dmg', 'range', 'speed', 'interval'];
    const val = { hp: st.hp, dmg: st.dmg, heal: st.heal, range: st.range, speed: st.speed, interval: st.interval + ' s' };
    for (const k of order) rows.push(h('div', { class: 'ci-row' }, h('span', {}, U.stat_icons[k] + ' ' + U.stat_labels[k]), h('b', {}, String(val[k]))));
  }
  const box = h('div', { class: 'card-info', onClick: (e) => e.stopPropagation() },
    h('div', { class: 'ci-head' }, (st ? U.role_icons[st.role] : (card.icon || '✦')) + ' ' + card.name,
      st ? h('span', { class: 'ci-lvl' }, `niv. ${st.level}`) : null),
    h('p', { class: 'ci-desc' }, card.desc || ''),
    rows.length ? h('div', { class: 'ci-rows' }, ...rows) : null,
    st ? h('div', { class: 'ci-bonus' },
      st.levelPct ? h('div', {}, `Niveau ${st.level} : +${st.levelPct} % PV et dégâts, cumulés depuis ${st.level - 1} doublon${st.level > 2 ? 's' : ''}.`) : null,
      st.editionPct ? h('div', {}, `Édition ${st.edition} : +${st.editionPct} % sur les stats.`) : null,
      h('div', { class: 'muted' }, `Prochain doublon : +${CC().duplicate_level_pct} % PV et dégâts.`)) : null,
    h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Touche l’écran pour fermer.'));
  const veil = h('div', { class: 'card-info-veil', onClick: () => veil.remove() }, box);
  B.dom.wrap.append(veil);
}
function updateHandAffordability() {
  if (!B || !B.handEls) return;
  for (const e of B.handEls) {
    const free = B.freeCards > 0;
    e.el.classList.toggle('unaffordable', !free && B.ration < e.cost);
  }
}

function playCard(i) {
  if (!B || B.over) return;
  const card = B.hand[i];
  if (!card) return;
  if (alivePlayerUnits() >= maxUnits()) { toast('Terrain plein', 'red'); return; }
  const cost = cardCost(card);
  const free = B.freeCards > 0;
  if (!free && B.ration < cost) { toast('Pas assez de ration', 'red'); return; }
  if (free) B.freeCards--; else B.ration -= cost;
  const u = makePlayerUnit(card);
  B.units.push(u);
  if (u.trait === 'free_next') B.freeCards += (CB().traits.free_next.cards || 1);
  B.hand.splice(i, 1);
  if (CB().hand.draw_on_play) drawCard();
  B.cardsPlayed++;
  state.battle.cardsPlayed = (state.battle.cardsPlayed || 0) + 1;
  progressContract('cards_played', 1);
  renderHand();
}

function toggleOrder() {
  const opts = CB().orders.options;
  B.order = opts[(opts.indexOf(B.order) + 1) % opts.length];
  B.dom.orderBtn.textContent = B.order === 'attack' ? '⚔️ Attaquer' : '🛡️ Tenir';
  B.dom.orderBtn.classList.toggle('active', B.order === 'attack');
}
function toggleTargeting() {
  const opts = ['nearest', 'weakest', 'strongest'];
  B.targeting = opts[(opts.indexOf(B.targeting) + 1) % opts.length];
  B.dom.targetBtn.textContent = { nearest: '🎯 Proche', weakest: '🎯 Faible', strongest: '🎯 Fort' }[B.targeting];
}

function powerCost(def) {
  return Math.max(1, Math.round(def.charge_elan / mult(B.pct, 'power_charge')));
}
function usePower(p) {
  if (!B || B.over || p.cd > 0) return;
  if (state.wallet.elan < p.cost) { toast('Pas assez d\'⚡ Élan', 'red'); return; }
  if (!spend({ elan: p.cost })) return;
  CTX.refreshWallet();
  p.cd = p.def.cooldown_sec;
  const e = p.def.effect;
  if (e.kind === 'aoe_damage') {
    const foes = B.units.filter(u => u.side === 'e' && !u.dead);
    let cx = B.enemyBase ? B.enemyBase.x : B.laneLen * 0.7;
    if (foes.length) cx = foes.reduce((s, u) => s + u.x, 0) / foes.length;
    for (const u of foes) if (Math.abs(u.x - cx) <= e.radius) hurt(u, e.dmg, null, false);
    for (let i = 0; i < 14; i++) {
      B.particles.push({ x: cx + (Math.random() - 0.5) * e.radius * 2, y: 0, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 60, life: 0.7, r: 4 + Math.random() * 5, color: '#FFC24B' });
    }
    B.meteor = { x: cx, r: e.radius, t: 0.6 };
    B.shake = 8;
  } else if (e.kind === 'freeze') {
    for (const u of B.units) if (u.side === 'e' && !u.dead) u.frozenT = Math.max(u.frozenT, e.seconds);
    B.freezeT = e.seconds;
  } else if (e.kind === 'heal_all') {
    for (const u of B.units) if (u.side === 'p' && !u.dead) healUnit(u, u.maxHp * e.pct / 100);
  }
  toast(p.def.name, 'purple');
}

function abandon() {
  if (!B) return;
  endBattle('abandon');
}

// ------------------------------------------------------------------
// Boucle
// ------------------------------------------------------------------
let lastT = 0;
function startLoop() {
  lastT = performance.now();
  const step = (now) => {
    raf = requestAnimationFrame(step);
    if (!B) return;
    let dt = (now - lastT) / 1000; lastT = now;
    if (document.hidden) return;
    dt = Math.min(dt, 0.05);
    if (!B.over) update(dt);
    draw();
  };
  raf = requestAnimationFrame(step);
}
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
function destroyBattle() {
  if (!B) return;
  if (B.onResize) window.removeEventListener('resize', B.onResize);
  B.dom?.wrap?.remove();
  B = null;
}

// ------------------------------------------------------------------
// Simulation
// ------------------------------------------------------------------
function aliveUnits(side) { return B.units.filter(u => u.side === side && !u.dead); }
function holdX() { return B.laneLen * CB().combat.hold_x_pct; }

function update(dt) {
  B.time += dt;
  if (B.shake > 0) B.shake = Math.max(0, B.shake - dt * 30);
  if (B.freezeT > 0) B.freezeT -= dt;
  if (B.meteor) { B.meteor.t -= dt; if (B.meteor.t <= 0) B.meteor = null; }

  // Ration
  B.ration = Math.min(B.rationMax, B.ration + B.rationRate * dt);
  updateRationBar();

  // Pouvoirs
  for (const p of B.powers) {
    if (p.cd > 0) p.cd = Math.max(0, p.cd - dt);
    const ready = p.cd <= 0 && state.wallet.elan >= p.cost;
    p.el.disabled = !ready;
    p.cdEl.style.transform = `scaleY(${p.cd / p.def.cooldown_sec})`;
  }

  // IA ennemie / vagues
  if (B.mode === 'defense') updateWaves(dt); else updateEnemyAI(dt);

  // Unites
  for (const u of B.units) {
    if (u.dead) { u.deadT += dt; continue; }
    updateStatus(u, dt);
    if (u.frozenT > 0) { u.pose = 'idle'; continue; }
    updateUnit(u, dt);
  }
  B.units = B.units.filter(u => !u.dead || u.deadT < CB().combat.death_fade_sec);

  updateTurrets(dt);
  updateProjectiles(dt);

  // Effets visuels
  for (const f of B.floaters) { f.t += dt; f.y -= dt * 34; }
  B.floaters = B.floaters.filter(f => f.t < 1);
  for (const p of B.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; }
  B.particles = B.particles.filter(p => p.life > 0);

  updateHandAffordability();
  checkEnd();
}

function updateStatus(u, dt) {
  if (u.frozenT > 0) u.frozenT -= dt;
  if (u.slowT > 0) { u.slowT -= dt; if (u.slowT <= 0) u.slowPct = 0; }
  if (u.flash > 0) u.flash = Math.max(0, u.flash - dt * 4);
  for (const d of u.dots) { d.t -= dt; hurt(u, d.dps * dt, d.from, false, true); }
  u.dots = u.dots.filter(d => d.t > 0);
  if (u.trait === 'regen') healUnit(u, u.maxHp * CB().traits.regen.pct_per_sec / 100 * dt, true);
}

function speedOf(u) {
  let s = u.speed * (1 - u.slowPct / 100);
  if (u.side === 'p') {
    const allies = aliveUnits('p').length;
    for (const e of B.instincts) if (e.kind === 'threshold_units' && allies >= e.min) s *= (1 + (e.speed_pct || 0) / 100);
  }
  return s;
}
function dmgOf(u) {
  let d = u.dmg;
  if (u.trait === 'alpha') d *= 1 + u.alphaStacks * CB().traits.alpha.dmg_pct_per_kill / 100;
  if (u.side === 'p') {
    for (const e of B.instincts) {
      if (e.kind === 'per_archetype') {
        const n = aliveUnits('p').filter(x => x.arch === e.archetype).length;
        d *= 1 + n * (e.dmg_pct || 0) / 100;
      }
    }
  }
  return d;
}

function pickTarget(u) {
  const foes = aliveUnits(u.side === 'p' ? 'e' : 'p').filter(f => Math.abs(f.x - u.x) <= u.range);
  if (!foes.length) return null;
  if (B.targeting === 'weakest' && u.side === 'p') return foes.reduce((a, b) => (b.hp < a.hp ? b : a));
  if (B.targeting === 'strongest' && u.side === 'p') return foes.reduce((a, b) => (b.hp > a.hp ? b : a));
  return foes.reduce((a, b) => (Math.abs(b.x - u.x) < Math.abs(a.x - u.x) ? b : a));
}
function targetBase(u) {
  if (u.side === 'p') {
    if (!B.enemyBase) return null;
    return Math.abs(B.enemyBase.x - u.x) <= u.range ? B.enemyBase : null;
  }
  return Math.abs(B.playerBase.x - u.x) <= u.range ? B.playerBase : null;
}

function updateUnit(u, dt) {
  u.cd -= dt;
  // Soigneur : cherche un allie blesse a portee
  if (u.role === 'support' && u.heal > 0) {
    const allies = aliveUnits(u.side).filter(a => a !== u && Math.abs(a.x - u.x) <= u.range && a.hp < a.maxHp);
    if (allies.length && u.cd <= 0) {
      u.pose = 'attack'; u.cd = u.interval;
      if (u.trait === 'heal_all') for (const a of allies) healUnit(a, u.heal);
      else { const t = allies.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)); healUnit(t, u.heal); }
      return;
    }
  }
  const foe = pickTarget(u);
  const bse = targetBase(u);
  if (foe || bse) {
    u.pose = 'attack';
    if (u.cd <= 0) {
      u.cd = u.interval;
      const tgt = foe || bse;
      if (u.role === 'ranged') {
        const shots = u.trait === 'double_shot' ? CB().traits.double_shot.shots : 1;
        for (let i = 0; i < shots; i++) {
          B.projectiles.push({ x: u.x, row: u._row || 0, side: u.side, dmg: dmgOf(u), from: u, target: tgt, dir: u.side === 'p' ? 1 : -1, trait: u.trait, delay: i * 0.12, yoff: i * 6 });
        }
      } else {
        attack(u, tgt);
      }
    }
    return;
  }
  // Avance
  u.pose = 'walk';
  const dir = u.side === 'p' ? 1 : -1;
  if (u.side === 'p' && B.order === 'hold' && u.x >= holdX()) { u.pose = 'idle'; return; }
  u.x += dir * speedOf(u) * dt;
  u.x = Math.max(0, Math.min(B.laneLen, u.x));
}

function attack(u, tgt) {
  const crit = Math.random() < CB().combat.crit_chance;
  let d = dmgOf(u) * (crit ? CB().combat.crit_mult : 1);
  if (tgt.maxHp !== undefined && tgt.side) {
    hurt(tgt, d, u, crit);
    applyOnHit(u, tgt);
  } else {
    hurtBase(tgt, d, crit);
  }
}
function applyOnHit(u, tgt) {
  const T = CB().traits;
  if (u.trait === 'poison') tgt.dots.push({ dps: T.poison.dps, t: T.poison.seconds, from: u });
  if (u.trait === 'frost') { tgt.slowPct = Math.max(tgt.slowPct, T.frost.slow_pct); tgt.slowT = T.frost.seconds; }
  if (u.trait === 'fire') {
    tgt.dots.push({ dps: T.fire.dps, t: T.fire.seconds, from: u });
    for (const o of aliveUnits(tgt.side)) {
      if (o === tgt) continue;
      if (Math.abs(o.x - tgt.x) <= T.fire.splash_range) hurt(o, dmgOf(u) * T.fire.splash_pct / 100, u, false);
    }
  }
  if (tgt.trait === 'thorns') hurt(u, dmgOf(tgt) * T.thorns.reflect_pct / 100, tgt, false, true);
}

function hurt(u, d, from, crit, silent) {
  if (u.dead || d <= 0) return;
  u.hp -= d; u.flash = 1;
  if (!silent) B.floaters.push({ x: u.x, row: u._row || 0, y: -unitPx(u) * 1.4, text: String(Math.round(d)), color: crit ? '#FFC24B' : CHALK, t: 0, big: !!crit });
  if (u.hp <= 0) killUnit(u, from);
}
function healUnit(u, amount, silent) {
  if (u.dead || amount <= 0) return;
  const before = u.hp;
  u.hp = Math.min(u.maxHp, u.hp + amount);
  if (!silent && u.hp - before >= 1) B.floaters.push({ x: u.x, row: u._row || 0, y: -unitPx(u) * 1.4, text: '+' + Math.round(u.hp - before), color: '#45D95E', t: 0 });
}
function killUnit(u, from) {
  u.dead = true; u.deadT = 0; u.hp = 0;
  B.deaths.push({ x: u.x, row: u._row || 0, t: 0, size: unitPx(u), color: u.side === 'p' ? B.st.palette.tint : B.fac.tint });
  for (let i = 0; i < 8; i++) {
    B.particles.push({ x: u.x, row: u._row || 0, y: -unitPx(u) * 0.8, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 90, life: 0.5 + Math.random() * 0.3, r: 3 + Math.random() * 4, color: u.side === 'p' ? B.st.palette.tint : B.fac.tint });
  }
  if (from && from.side === 'p' && u.side === 'e') {
    from.kills++;
    if (from.trait === 'alpha') from.alphaStacks++;
    if (from.cardId) B.killsByCard[from.cardId] = (B.killsByCard[from.cardId] || 0) + 1;
    B.totalKills++;
    for (const e of B.instincts) if (e.kind === 'on_kill_ration') B.ration = Math.min(B.rationMax, B.ration + (e.amount || 0));
  }
}
function hurtBase(b, d, crit) {
  b.hp = Math.max(0, b.hp - d);
  B.floaters.push({ x: b.x, y: -60, text: String(Math.round(d)), color: crit ? '#FFC24B' : CHALK, t: 0, big: !!crit });
  if (b.hp <= 0) B.shake = 14;
}

function updateProjectiles(dt) {
  const sp = CB().combat.projectile_speed;
  for (const p of B.projectiles) {
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.x += p.dir * sp * dt;
    const t = p.target;
    const alive = t && (t.dead === undefined ? t.hp > 0 : !t.dead);
    if (!alive) { p.done = true; continue; }
    if ((p.dir > 0 && p.x >= t.x) || (p.dir < 0 && p.x <= t.x)) {
      const crit = Math.random() < CB().combat.crit_chance;
      const d = p.dmg * (crit ? CB().combat.crit_mult : 1);
      if (t.side) { hurt(t, d, p.from, crit); if (p.from) applyOnHit(p.from, t); }
      else hurtBase(t, d, crit);
      p.done = true;
    }
    if (p.x < 0 || p.x > B.laneLen) p.done = true;
  }
  B.projectiles = B.projectiles.filter(p => !p.done);
}

function updateTurrets(dt) {
  const boost = mult(B.pct, 'turret_damage');
  for (const t of B.turrets) {
    t.cd -= dt;
    if (t.cd > 0) continue;
    const d = t.def;
    if (d.heal) {
      const hurtAllies = aliveUnits('p').filter(u => Math.abs(u.x - t.x) <= d.range && u.hp < u.maxHp);
      if (!hurtAllies.length) continue;
      t.cd = d.interval;
      const tgt = hurtAllies.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a));
      healUnit(tgt, d.heal * t.level);
    } else {
      const foes = aliveUnits('e').filter(u => Math.abs(u.x - t.x) <= d.range);
      if (!foes.length) continue;
      t.cd = d.interval;
      const tgt = foes.reduce((a, b) => (Math.abs(b.x - t.x) < Math.abs(a.x - t.x) ? b : a));
      hurt(tgt, d.dmg * t.level * boost, null, false);
      B.projectiles.push({ x: t.x, row: -(CB().view.lane_half_width + 0.8), side: 'p', dmg: 0, from: null, target: tgt, dir: 1, delay: 0, yoff: -14, ghost: true });
    }
  }
}

// --- IA ennemie (campagne / raid)
function updateEnemyAI(dt) {
  const C = CB().campaign;
  const lv = B.mode === 'campaign' ? state.battle.campaignLevel - 1 : (B.peril.n - 1);
  const rate = C.enemy_ration_rate_base * Math.pow(C.enemy_ration_growth, lv);
  B.enemyRation += rate * dt;
  B.enemySpawnCd -= dt;
  if (B.enemySpawnCd > 0) return;
  const weights = CB().enemy_ai.weights[B.fac.trait] || CB().enemy_ai.weights.damage;
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total, pickId = entries[0][0];
  for (const [id, w] of entries) { r -= w; if (r <= 0) { pickId = id; break; } }
  const cost = enemyCost(pickId);
  if (B.enemyRation < cost) return;
  B.enemyRation -= cost;
  B.enemySpawnCd = CB().enemy_ai.spawn_interval_min_sec;
  const boss = B.mode === 'campaign' && state.battle.campaignLevel % CB().campaign.boss_every === 0 && !B.bossSpawned;
  if (boss) B.bossSpawned = true;
  B.units.push(makeEnemyUnit(pickId, { boss }));
}

// --- Vagues (defense), composition deterministe
function prepareWave(n) {
  const D = CB().defense;
  const rng = makeRng('wave' + n);
  // Borne haute : au-dela, la vague devient illisible a l'ecran et impossible a intercepter
  // avec les 4 a 13 unites autorisees sur le terrain.
  const count = Math.max(1, Math.min(D.enemy_count_max, Math.round(D.enemy_count_base + D.enemy_count_growth * n)));
  const ids = Object.keys(CB().archetypes).filter(k => !k.startsWith('_'));
  const q = [];
  const boss = n % D.boss_every === 0;
  for (let i = 0; i < count; i++) {
    q.push({ arch: rng.pick(ids), at: (i / count) * D.wave_duration_sec * 0.7, boss: false });
  }
  if (boss) q.push({ arch: rng.pick(ids), at: D.wave_duration_sec * 0.35, boss: true });
  B.waveQueue = q; B.waveSpawned = 0; B.waveT = 0;
  if (B.dom) B.dom.label.textContent = `Vague ${n}` + (boss ? ' 👑' : '');
  updateRewardNote();
}
function updateWaves(dt) {
  const D = CB().defense;
  B.waveT += dt;
  for (const e of B.waveQueue) {
    if (!e.spawned && B.waveT >= e.at) { e.spawned = true; B.units.push(makeEnemyUnit(e.arch, { boss: e.boss })); }
  }
  const allSpawned = B.waveQueue.every(e => e.spawned);
  const foesLeft = aliveUnits('e').length;
  if ((allSpawned && foesLeft === 0) || B.waveT >= D.wave_duration_sec) {
    // Vague tenue : recompense puis vague suivante
    awardWave();
    B.wave++;
    prepareWave(B.wave);
  }
}
function rewardsExhausted() {
  const D = CB().defense;
  const today = dayKey();
  const used = state.battle.defenseDay === today ? (state.battle.defenseWavesToday || 0) : 0;
  return used >= D.max_wave_progress_per_day;
}
function updateRewardNote() {
  if (!B || !B.dom) return;
  B.dom.note.style.display = (B.mode === 'defense' && rewardsExhausted()) ? '' : 'none';
}
function awardWave() {
  const D = CB().defense;
  B.wavesHeld++;
  const today = dayKey();
  if (state.battle.defenseDay !== today) { state.battle.defenseDay = today; state.battle.defenseWavesToday = 0; }
  if (state.battle.defenseWavesToday < D.max_wave_progress_per_day) {
    state.battle.defenseWavesToday++;
    B.pendingStagePoints = (B.pendingStagePoints || 0) + D.stage_points_per_wave;
    B.pendingGenes = (B.pendingGenes || 0) + D.genes_per_wave;
    B.pendingBio = (B.pendingBio || 0) + D.biomasse_per_wave;
    // Borne par le plafond du stade : une valeur heritee trop haute redescend d'elle-meme ici.
    state.battle.defenseWave = Math.min(defenseWaveCap(), Math.max(state.battle.defenseWave, B.wave + 1));
    state.battle.records.defenseWave = Math.max(state.battle.records.defenseWave || 0, B.wave);
    progressContract('defense_waves', 1);
  }
  updateRewardNote();
  save();
}

function checkEnd() {
  if (B.over) return;
  if (B.playerBase.hp <= 0) { endBattle('defeat'); return; }
  if (B.enemyBase && B.enemyBase.hp <= 0) { endBattle('victory'); return; }
}

// ------------------------------------------------------------------
// Fin de bataille et recompenses
// ------------------------------------------------------------------
function endBattle(result) {
  if (!B || B.over) return;
  B.over = true; B.result = result;
  const lines = [];
  const mode = B.mode;

  // XP de carte + kills
  for (const [cardId, k] of Object.entries(B.killsByCard)) addCardXp(cardId, k);
  if (B.totalKills) recordKills(B.totalKills);

  if (mode === 'campaign' && result === 'victory') {
    const R = CB().campaign.rewards;
    const lvl = state.battle.campaignLevel;
    const genes = Math.round(R.genes_base + R.genes_per_level * lvl);
    grant({ genes, materiaux: R.materiaux_base }, { silent: true });
    lines.push(`+${genes} 🧬  +${R.materiaux_base} 🧱`);
    if (Math.random() < R.card_chance) {
      const card = randomLootCard();
      if (card) { unlockCard(card.id); lines.push(`Nouvelle carte : ${card.name}`); toast(`🃏 ${card.name}`, 'purple'); }
    }
    state.battle.campaignLevel++;
    progressContract('campaign_win', 1);
  } else if (mode === 'defense') {
    const sp = B.pendingStagePoints || 0;
    if (sp > 0) addStagePoints(sp);
    if (B.pendingGenes || B.pendingBio) {
      grant({ genes: B.pendingGenes || 0, biomasse: B.pendingBio || 0 }, { silent: true });
      lines.push(`+${Math.round(B.pendingGenes || 0)} 🧬  +${Math.round(B.pendingBio || 0)} 🍖`);
    }
    lines.push(`${B.wavesHeld} vague(s) tenue(s)`);
    // Recul en cas de defaite : le mode se re-equilibre tout seul au lieu de se verrouiller.
    if (result === 'defeat') {
      const back = CB().defense.wave_loss_setback || 0;
      if (back > 0 && state.battle.defenseWave > 1) {
        state.battle.defenseWave = Math.max(1, state.battle.defenseWave - back);
        lines.push(`La Défense repart à la vague ${state.battle.defenseWave}.`);
      }
    }
    if (rewardsExhausted()) lines.push('Récompenses du jour épuisées — reviens demain.');
  } else if (mode === 'raid' && result === 'victory') {
    const L = CB().raid.loot;
    const m = B.peril.loot_mult;
    const genes = Math.round(L.genes_base * m), mat = Math.round(L.materiaux_base * m);
    grant({ genes, materiaux: mat }, { silent: true });
    lines.push(`+${genes} 🧬  +${mat} 🧱`);
    state.battle.records.raidPeril = Math.max(state.battle.records.raidPeril || 0, B.peril.n);
  }
  if (B.totalKills) lines.push(`${B.totalKills} élimination(s)`);

  save();
  CTX.refreshWallet();
  import('./codex.js').then(m => m.checkCodex()).catch(() => {});

  showEndModal(result, lines);
}

function randomLootCard() {
  const pool = CC().cards.filter(c => c.rarity === 'common' || c.rarity === 'rare');
  if (!pool.length) return null;
  const total = pool.reduce((s, c) => s + (CC().rarity[c.rarity]?.weight || 1), 0);
  let r = Math.random() * total;
  for (const c of pool) { r -= (CC().rarity[c.rarity]?.weight || 1); if (r <= 0) return c; }
  return pool[pool.length - 1];
}

function showEndModal(result, lines) {
  const titles = { victory: 'Victoire !', defeat: 'Défaite', abandon: 'Retraite' };
  const colors = { victory: 'var(--green)', defeat: 'var(--red)', abandon: 'var(--chalk-d)' };
  const body = h('div', { class: 'battle-end' },
    h('div', { class: 'big', style: { color: colors[result] } }, titles[result] || 'Fin'),
    ...lines.map(l => h('p', { class: 'muted' }, l)),
    result === 'abandon' ? h('p', { class: 'muted small' }, 'Retraite honorable : aucune pénalité.') : null,
    btn('Retour', { kind: 'green', onClick: () => { m.close(); leaveBattle(); } }));
  const m = modal(body, { closable: false });
}
function leaveBattle() {
  stopLoop();
  destroyBattle();
  renderMenu();
}

// ------------------------------------------------------------------
// Rendu
// ------------------------------------------------------------------
function shadeHex(hex, amt) { const n = parseInt(hex.slice(1), 16); const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))); return '#' + ((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0'); }

// --- Geometrie du couloir -----------------------------------------
// Le couloir n'est pas horizontal : il descend du haut-gauche (t=0, base joueur, au loin)
// vers le bas-droite (t=1, base ennemie, au premier plan). A ecran egal le trajet est bien
// plus long, et la profondeur donne une perspective legere. Tout est pilote par battle.json : view.
function V() { return CB().view; }
function laneEnds() {
  const v = V(), padX = B.W * v.pad_x_pct;
  return { x0: padX, y0: B.H * v.top_y_pct, x1: B.W - padX, y1: B.H * v.bottom_y_pct };
}
// Perpendiculaire au couloir, orientee vers le haut-droite : sert a ranger les unites cote a cote.
function laneNormal() {
  const e = laneEnds(), dx = e.x1 - e.x0, dy = e.y1 - e.y0, len = Math.hypot(dx, dy) || 1;
  return { nx: dy / len, ny: -dx / len };
}
function depthAt(t) { const v = V(); return v.far_scale + (v.near_scale - v.far_scale) * Math.max(0, Math.min(1, t)); }
// Taille de reference d'une unite, avant profondeur.
function unitRef() { return Math.min(B.W, B.H) * V().unit_pct; }
function unitPx(u) { return unitRef() * u.sizeMult; }
function horizonY() { return laneEnds().y0 - Math.min(B.W, B.H) * V().horizon_lift; }

// Position de couloir (0..laneLen) + rang lateral -> coordonnees ecran et echelle de profondeur.
function project(x, row = 0) {
  const e = laneEnds(), v = V(), t = x / B.laneLen;
  let px = e.x0 + (e.x1 - e.x0) * t;
  let py = e.y0 + (e.y1 - e.y0) * t;
  let s = depthAt(t);
  if (row) {
    const n = laneNormal(), d = row * v.row_spacing * unitRef() * s;
    px += n.nx * d; py += n.ny * d;
    s *= 1 - row * v.row_depth;   // un rang plus haut sur l'ecran = un peu plus loin
  }
  return { px, py, s };
}

// Les unites qui occupent le meme endroit du couloir prennent des rangs lateraux differents
// (0, +1, -1, +2, -2...) : elles se rangent cote a cote avec un leger chevauchement au lieu de
// se cacher, et restent denombrables. Au-dela de `rows`, on ouvre un second rideau en retrait.
const ROW_ORDER = [0, 1, -1, 2, -2, 3, -3];
function assignRows() {
  const v = V(), rows = Math.max(1, Math.min(v.rows, ROW_ORDER.length));
  for (const side of ['p', 'e']) {
    const list = B.units.filter(u => u.side === side).sort((a, b) => a.x - b.x);
    let anchor = -1e9, i = 0;
    for (const u of list) {
      if (u.x - anchor > v.row_x_window) { anchor = u.x; i = 0; }
      u._row = ROW_ORDER[i % rows];
      u._layer = Math.floor(i / rows);
      i++;
    }
  }
}
// Position de dessin : les rideaux suivants reculent legerement pour ne pas se superposer.
function drawX(u) {
  const back = (u._layer || 0) * V().layer_setback * (u.side === 'p' ? -1 : 1);
  return Math.max(-40, Math.min(B.laneLen + 40, u.x + back));
}

// Plafond d'unites simultanees et effectif actuel : le joueur doit voir combien il peut encore poser.
function maxUnits() { return CB().field.max_units_start + CB().field.max_units_per_stage * (B.stage - 1); }
function alivePlayerUnits() { return B.units.filter(u => u.side === 'p' && !u.dead).length; }

function updateRationBar() {
  const U = CB().ui;
  const f = B.dom.rb.querySelector('.bar-fill');
  const l = B.dom.rb.querySelector('.bar-label');
  if (f) f.style.width = Math.min(100, B.ration / B.rationMax * 100) + '%';
  if (l) l.textContent = `${Math.floor(B.ration)} / ${B.rationMax} ${U.ration_icon}  +${B.rationRate.toFixed(1)}/s`;
  else B.dom.rb.append(h('div', { class: 'bar-label' }, ''));

  // Production visible : a chaque ration entiere gagnee, une bulle monte de la barre.
  const n = Math.floor(B.ration);
  if (B._lastRation === undefined) B._lastRation = n;
  if (n > B._lastRation) {
    const gained = n - B._lastRation;
    B._lastRation = n;
    if (B.dom.rb.isConnected && !document.hidden) {
      const bubble = h('div', { class: 'ration-pop' }, `+${gained} ${U.ration_icon}`);
      bubble.style.left = Math.min(96, Math.max(4, B.ration / B.rationMax * 100)) + '%';
      B.dom.rb.append(bubble);
      setTimeout(() => bubble.remove(), 900);
      f && f.classList.remove('pulse'); void (f && f.offsetWidth); f && f.classList.add('pulse');
    }
  } else if (n < B._lastRation) B._lastRation = n;

  // Compteur d'unites : combien sur le terrain, sur combien d'emplacements.
  const alive = alivePlayerUnits(), max = maxUnits();
  if (B.dom.field) {
    B.dom.field.textContent = `${U.unit_icon} ${alive} / ${max}`;
    B.dom.field.classList.toggle('full', alive >= max);
  }
}

function draw() {
  const g = B.g;
  if (!g) return;
  const W = B.W, H = B.H;
  g.save();
  if (B.shake > 0) g.translate((Math.random() - 0.5) * B.shake, (Math.random() - 0.5) * B.shake);

  // fond
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, B.st.palette.bg); grad.addColorStop(1, B.st.palette.bg2);
  g.fillStyle = grad; g.fillRect(-20, -20, W + 40, H + 40);
  drawAmbient(g, W, H);

  // decor lointain : 2 couches de collines / recifs en aplats (style sticker), astre
  const hz = horizonY();
  {
    const aquatic = B.st.bodyplan === 'cell' || B.st.bodyplan === 'cluster';
    g.save();
    // astre (soleil / lune / lumiere filtree)
    g.beginPath(); g.arc(W * 0.74, hz - H * 0.16, Math.min(W, H) * 0.09, 0, Math.PI * 2);
    g.fillStyle = aquatic ? 'rgba(255,255,255,.08)' : (B.st.emissive ? '#FFF3C4' : '#FFC24B'); g.globalAlpha = aquatic ? 1 : .9; g.fill();
    if (!aquatic) { g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
    g.globalAlpha = 1;
    const rng2 = makeRng('hills' + B.st.n);
    const layers = [{ y: hz - H * 0.11, a: H * 0.085, col: shadeHex(B.st.palette.bg2, .18), n: 5 }, { y: hz - H * 0.045, a: H * 0.055, col: shadeHex(B.st.palette.ground, -.25), n: 7 }];
    for (const L of layers) {
      g.beginPath(); g.moveTo(-20, hz + 10);
      const seg = (W + 40) / L.n;
      for (let i = 0; i <= L.n; i++) { const x = -20 + i * seg; const hh = L.a * (0.5 + rng2() * 0.5); g.lineTo(x - seg * 0.5, L.y); g.quadraticCurveTo(x, L.y - hh, x + seg * 0.5, L.y); }
      g.lineTo(W + 20, hz + 10); g.closePath();
      g.fillStyle = L.col; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    }
    g.restore();
  }
  // sol : tout ce qui est sous l'horizon
  g.fillStyle = B.st.palette.ground;
  g.fillRect(-20, hz, W + 40, H - hz + 20);
  g.beginPath(); g.moveTo(-20, hz); g.lineTo(W + 20, hz);
  g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  drawGroundDecor(g, hz);
  drawLane(g);

  drawBase(g, B.playerBase, B.st.palette.tint, 1);
  drawTurrets(g);
  if (B.enemyBase) drawBase(g, B.enemyBase, B.fac.tint, -1);

  // morts (pop)
  for (const d of B.deaths) {
    d.t += 1 / 60;
    const a = 1 - d.t / 0.4;
    if (a <= 0) continue;
    const p = project(d.x, d.row || 0);
    g.beginPath(); g.arc(p.px, p.py - d.size * p.s * 0.4, d.size * p.s * (0.2 + d.t * 1.6), 0, Math.PI * 2);
    g.strokeStyle = d.color; g.globalAlpha = a; g.lineWidth = 4; g.stroke(); g.globalAlpha = 1;
  }
  B.deaths = B.deaths.filter(d => d.t < 0.4);

  // unites : rangees cote a cote, puis dessinees des plus lointaines aux plus proches
  assignRows();
  const drawList = B.units.map(u => ({ u, p: project(drawX(u), u._row || 0) })).sort((a, b) => a.p.py - b.p.py);
  for (const d of drawList) drawUnit(g, d.u, d.p);

  // projectiles
  for (const p of B.projectiles) {
    if (p.delay > 0) continue;
    const q = project(p.x, p.row || 0);
    g.beginPath();
    g.ellipse(q.px, q.py - unitRef() * q.s * 0.55 + (p.yoff || 0), 6 * q.s, 4 * q.s, 0, 0, Math.PI * 2);
    g.fillStyle = p.ghost ? '#FFC24B' : (p.side === 'p' ? B.st.palette.tint : B.fac.tint);
    g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  }

  // particules
  for (const p of B.particles) {
    const q = project(p.x, p.row || 0);
    g.beginPath(); g.arc(q.px, q.py + p.y * q.s, p.r * q.s, 0, Math.PI * 2);
    g.fillStyle = p.color; g.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); g.fill(); g.globalAlpha = 1;
  }

  // meteores
  if (B.meteor) {
    const q = project(B.meteor.x);
    const rr = B.meteor.r / B.laneLen * Math.hypot(laneEnds().x1 - laneEnds().x0, laneEnds().y1 - laneEnds().y0);
    g.globalAlpha = Math.max(0, B.meteor.t);
    g.beginPath(); g.ellipse(q.px, q.py - 8, rr, rr * 0.45, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(239,93,80,.35)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = '#FFC24B'; g.stroke();
    g.globalAlpha = 1;
  }

  // chiffres flottants
  g.textAlign = 'center';
  for (const f of B.floaters) {
    const q = project(f.x, f.row || 0);
    g.globalAlpha = Math.max(0, 1 - f.t);
    g.font = `${Math.round((f.big ? 20 : 14) * q.s)}px 'Lilita One', sans-serif`;
    g.lineWidth = 4; g.strokeStyle = INK;
    g.strokeText(f.text, q.px, q.py + f.y * q.s);
    g.fillStyle = f.color; g.fillText(f.text, q.px, q.py + f.y * q.s);
    g.globalAlpha = 1;
  }

  // voile de gel
  if (B.freezeT > 0) { g.fillStyle = 'rgba(78,168,232,.45)'; g.fillRect(0, 0, W, H); }

  g.restore();
}

function drawAmbient(g, W, H) {
  const under = B.st.bodyplan === 'cell' || B.st.bodyplan === 'cluster';
  const n = 7;
  for (let i = 0; i < n; i++) {
    const seed = i * 137.5;
    if (under) {
      const y = H * 0.62 - ((B.time * (12 + i * 4) + seed) % (H * 0.6));
      const x = (seed * 3.3) % W;
      g.beginPath(); g.arc(x, y, 5 + (i % 3) * 4, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2; g.stroke();
    } else {
      const x = ((seed * 5.1 + B.time * (6 + i)) % (W + 160)) - 80;
      const y = H * 0.12 + (i % 3) * H * 0.08;
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.beginPath();
      g.ellipse(x, y, 42 + i * 5, 16 + (i % 2) * 5, 0, 0, Math.PI * 2);
      g.ellipse(x + 30, y - 8, 26, 13, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
}
function drawGroundDecor(g, hz) {
  const rng = makeRng('decor' + B.stage);
  for (let i = 0; i < 10; i++) {
    const y = hz + (B.H - hz) * (0.12 + rng() * 0.85);
    const near = (y - hz) / Math.max(1, B.H - hz);
    const x = rng() * B.W;
    const w = (14 + rng() * 30) * (0.5 + near), hh = (5 + rng() * 10) * (0.5 + near);
    g.beginPath(); g.ellipse(x, y, w, hh, 0, Math.PI, 0);
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fill();
  }
  for (let i = 0; i < 8; i++) {
    const y = hz + (B.H - hz) * (0.1 + rng() * 0.85);
    const near = (y - hz) / Math.max(1, B.H - hz);
    const x = rng() * B.W;
    const hgt = (8 + rng() * 14) * (0.5 + near);
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 4, y - hgt * 0.7, x + (rng() > 0.5 ? 7 : -7), y - hgt);
    g.lineWidth = 3.5; g.strokeStyle = INK; g.lineCap = 'round'; g.stroke();
    g.lineWidth = 2; g.strokeStyle = B.st.palette.tint; g.stroke();
  }
}

// Le couloir lui-meme : une bande qui s'elargit en se rapprochant. C'est elle qui "dit" la profondeur.
function drawLane(g) {
  const v = V(), n = laneNormal(), steps = 14;
  const left = [], right = [];
  for (let i = 0; i <= steps; i++) {
    const t = -0.14 + 1.28 * (i / steps);
    const p = project(t * B.laneLen);
    const hw = unitRef() * v.lane_half_width * p.s;
    left.push([p.px - n.nx * hw, p.py - n.ny * hw]);
    right.push([p.px + n.nx * hw, p.py + n.ny * hw]);
  }
  g.beginPath();
  g.moveTo(left[0][0], left[0][1]);
  for (const q of left) g.lineTo(q[0], q[1]);
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  g.fillStyle = shadeHex(B.st.palette.ground, .12);
  g.fill();
  g.lineWidth = 4; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
}

// Ombre portee au sol : cale les unites et les bases dans la perspective.
function groundShadow(g, px, py, r) {
  g.beginPath(); g.ellipse(px, py + r * 0.06, r * 1.05, r * 0.34, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fill();
}

function drawBase(g, base, color, facing) {
  const p = project(base.x);
  const r = unitRef() * V().base_scale * p.s;
  groundShadow(g, p.px, p.py, r * 1.15);
  g.beginPath();
  g.moveTo(p.px - r * 1.2, p.py);
  g.quadraticCurveTo(p.px - r * 1.1, p.py - r * 1.7, p.px, p.py - r * 1.8);
  g.quadraticCurveTo(p.px + r * 1.1, p.py - r * 1.7, p.px + r * 1.2, p.py);
  g.closePath();
  g.fillStyle = color; g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
  // entree
  g.beginPath(); g.ellipse(p.px + facing * r * 0.45, p.py - r * 0.45, r * 0.35, r * 0.5, 0, 0, Math.PI * 2);
  g.fillStyle = INK; g.fill();
  // barre de PV
  const bw = r * 2.2, bh = Math.max(9, 12 * p.s), by = p.py - r * 2.3;
  g.fillStyle = INK; g.fillRect(p.px - bw / 2, by, bw, bh);
  g.fillStyle = base === B.playerBase ? '#45D95E' : '#EF5D50';
  g.fillRect(p.px - bw / 2 + 2, by + 2, Math.max(0, (bw - 4) * base.hp / base.max), bh - 4);
  g.lineWidth = 3; g.strokeStyle = INK; g.strokeRect(p.px - bw / 2, by, bw, bh);
  g.font = `${Math.round(12 * p.s)}px 'Lilita One', sans-serif`; g.textAlign = 'center'; g.fillStyle = CHALK;
  g.fillText(Math.ceil(base.hp), p.px, by - 4);
}

function drawTurrets(g) {
  // Les tourelles bordent le couloir du cote joueur, en retrait de la voie.
  for (const t of B.turrets) {
    const p = project(t.x, -(V().lane_half_width + 0.8));
    const hh = unitRef() * 1.1 * p.s, w = unitRef() * 0.28 * p.s;
    groundShadow(g, p.px, p.py, w * 1.6);
    g.beginPath();
    g.moveTo(p.px - w, p.py); g.lineTo(p.px - w * 0.8, p.py - hh); g.lineTo(p.px + w * 0.8, p.py - hh); g.lineTo(p.px + w, p.py);
    g.closePath();
    g.fillStyle = '#7A8598'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(p.px, p.py - hh - w * 0.5, w * 0.8, 0, Math.PI * 2);
    g.fillStyle = t.def.heal ? '#45D95E' : '#E0A045'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  }
}

function drawUnit(g, u, p) {
  const size = unitPx(u) * p.s;
  const dying = u.dead;
  g.save();
  if (dying) g.globalAlpha = Math.max(0, 1 - u.deadT / CB().combat.death_fade_sec);
  else groundShadow(g, p.px, p.py, size * 0.5);
  const visual = u.side === 'p' ? B.visual : B.enemyVisual;
  const tint = u.side === 'p' ? B.st.palette.tint : B.fac.tint;
  try {
    drawCreature(g, visual, {
      x: p.px, y: p.py, size, t: B.time + u.x * 0.01, tint,
      pose: dying ? 'idle' : u.pose, archetype: u.arch, role: u.role,
      facing: u.side === 'p' ? 1 : -1, flash: u.flash
    });
  } catch (e) { /* le rendu ne doit jamais casser la boucle */ }
  g.restore();
  if (dying) return;
  // barre de PV
  const bw = size * 0.62, bh = Math.max(4, 6 * p.s), by = p.py - size * 1.08;
  g.fillStyle = INK; g.fillRect(p.px - bw / 2, by, bw, bh);
  g.fillStyle = u.side === 'p' ? '#45D95E' : '#EF5D50';
  g.fillRect(p.px - bw / 2 + 1.5, by + 1.5, Math.max(0, (bw - 3) * u.hp / u.maxHp), bh - 3);
  g.lineWidth = 2; g.strokeStyle = INK; g.strokeRect(p.px - bw / 2, by, bw, bh);
  if (u.frozenT > 0) { g.fillStyle = 'rgba(78,168,232,.45)'; g.beginPath(); g.arc(p.px, p.py - size * 0.45, size * 0.45, 0, Math.PI * 2); g.fill(); }
}
