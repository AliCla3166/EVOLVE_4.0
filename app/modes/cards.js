// Les Cartes — collection, deck de 8, tirage de packs (genes), editions, verrou des doublons, XP de combat.
import { config, stageOf } from '../core/config.js';
import { state, save } from '../core/state.js';
import { makeRng } from '../core/rng.js';
import { speciesVisual } from '../core/genome.js';
import { renderToCanvas } from '../render/creature.js';
import { h, btn, panel, bar, toast, modal, fmt, chip } from '../core/ui.js';
import { spend, unlockCard, cardXpTier } from '../core/progress.js';

let ctx, root, tab = 'deck';
export function mount(el, c) { ctx = c; root = el; ensureStarter(); render(); }
export function unmount() {}

function ensureStarter() {
  const C = config.cards; const col = state.cards.collection;
  if (!Object.keys(col).length) { for (const [id, n] of Object.entries(C.starter_collection)) col[id] = { count: n, edition: 'none' }; }
  if (!state.cards.deck.length) state.cards.deck = C.starter_deck.slice();
  save();
}
export function cardDef(id) { return config.cards.cards.find(c => c.id === id); }
const U = () => config.battle.ui;
export function usable(id) { return (state.cards.collection[id]?.count || 0) >= 2; }
export function cardLevel(id) { return Math.max(0, (state.cards.collection[id]?.count || 0) - 2); }
export function deckSlotsUsed() { const E = config.cards.editions; return state.cards.deck.filter(id => !E[state.cards.collection[id]?.edition || 'none']?.no_slot).length; }

function drawCard(id, opts = {}) {
  const def = cardDef(id); if (!def) return h('div');
  const col = state.cards.collection[id]; const ed = col?.edition || 'none'; const E = config.cards.editions[ed];
  const cv = h('canvas');
  const inDeck = state.cards.deck.includes(id);
  const el = h('div', { class: `gcard rar-${def.rarity}${def.kind === 'instinct' ? ' instinct' : ''}${ed !== 'none' ? ' edition-' + ed : ''}${!usable(id) && !opts.reveal ? ' locked' : ''}${inDeck && opts.deckMark ? ' in-deck' : ''}`, onClick: opts.onClick },
    def.kind === 'unit' ? cv : h('div', { style: { fontSize: '44px', height: '72px', display: 'flex', alignItems: 'center' } }, def.icon || '✦'),
    h('div', { class: 'gc-name' }, def.name),
    cardLevel(id) > 0 ? h('div', { class: 'gc-lvl' }, `niv. ${cardLevel(id) + 1}${cardXpTier(id) ? ' · ★' + cardXpTier(id) : ''}`) : (cardXpTier(id) ? h('div', { class: 'gc-lvl' }, '★' + cardXpTier(id)) : null),
    col ? h('div', { class: 'gc-count' }, `×${col.count}`) : null,
    E?.label ? h('div', { class: 'small', style: { color: 'var(--gold)', fontWeight: 900 } }, E.label) : null);
  if (def.kind === 'unit') requestAnimationFrame(() => renderToCanvas(cv, speciesVisual(), { tint: stageOf(state.species.stage).palette.tint, t: 1.2, archetype: def.archetype, role: config.battle.archetypes[def.archetype].role, scale: 1.1 }));
  return el;
}

function render() {
  root.innerHTML = '';
  const C = config.cards;
  root.append(h('div', { class: 'tabs-inline' }, ...[['deck', 'Deck'], ['collection', 'Collection'], ['packs', 'Tirage']].map(([id, l]) => h('button', { class: tab === id ? 'active' : '', onClick: () => { tab = id; render(); } }, l))));
  if (tab === 'deck') {
    const used = deckSlotsUsed(); const size = config.battle.hand.deck_size;
    root.append(panel(`Deck · ${used} / ${size}`, h('p', { class: 'muted small' }, 'Tape une carte pour la retirer. Une carte Négative ne compte pas dans la taille du deck.'),
      h('div', { class: 'card-grid' }, ...state.cards.deck.map((id, i) => drawCard(id, { onClick: () => { state.cards.deck.splice(i, 1); save(); render(); } })))));
    const avail = Object.keys(state.cards.collection).filter(usable);
    root.append(panel('Ajouter au deck', h('p', { class: 'muted small' }, 'Une carte devient jouable à la 2e prise ; chaque doublon suivant la monte d\'un niveau.'),
      h('div', { class: 'card-grid' }, ...avail.map(id => drawCard(id, { deckMark: true, onClick: () => { const E = C.editions[state.cards.collection[id]?.edition || 'none']; if (!E.no_slot && deckSlotsUsed() >= size) return toast('Deck plein', 'red'); const copies = state.cards.deck.filter(x => x === id).length; if (copies >= (state.cards.collection[id].count - 1)) return toast('Pas assez d\'exemplaires', 'red'); state.cards.deck.push(id); save(); render(); } })))));
  } else if (tab === 'collection') {
    const all = C.cards.slice().sort((a, b) => Object.keys(C.rarity).indexOf(b.rarity) - Object.keys(C.rarity).indexOf(a.rarity));
    root.append(panel(`Collection · ${Object.keys(state.cards.collection).length} / ${C.cards.length}`, h('div', { class: 'card-grid' }, ...all.map(c => drawCard(c.id, { onClick: () => detail(c.id) })))));
  } else {
    const pity = state.cards.pity;
    root.append(panel('Tirage', h('p', { class: 'muted' }, `Un pack = 3 cartes pour ${C.pack_cost_genes} 🧬. Les gènes viennent de la Bataille, de la Colonie et des contrats — jamais de l'Élan.`),
      bar(pity / C.pity_legendary * 100, { color: 'var(--gold)', label: `Pity légendaire ${pity} / ${C.pity_legendary}`, height: 16 }),
      h('div', { style: { marginTop: '12px' } }, btn(`Ouvrir un pack · ${C.pack_cost_genes} 🧬`, { kind: 'gold', size: 'block lg', disabled: state.wallet.genes < C.pack_cost_genes, onClick: openPack })),
      h('div', { class: 'row wrap gap', style: { marginTop: '10px' } }, ...Object.entries(C.rarity).map(([k, r]) => h('span', { class: 'mut-tag', style: { borderColor: r.color } }, `${r.label} ${r.weight} %`)))));
    root.append(panel('Éditions', h('p', { class: 'muted small' }, 'Tirées indépendamment de la rareté — du désir, pas du rendement.'), h('div', { class: 'row wrap gap' }, ...Object.entries(C.editions).filter(([k]) => k !== 'none').map(([k, e]) => h('span', { class: 'mut-tag' }, `${e.label} · ${e.chance} %${e.no_slot ? ' · sans slot' : e.bonus_pct ? ' · +' + e.bonus_pct + ' %' : ''}`)))));
  }
}
function detail(id) {
  const def = cardDef(id); const col = state.cards.collection[id]; const arch = def.archetype ? config.battle.archetypes[def.archetype] : null;
  const xp = state.cards.xp[id] || 0; const tiers = config.cards.xp_tiers;
  const m = modal(h('div', {}, h('h2', { class: 'modal-title', style: { color: config.cards.rarity[def.rarity].color } }, def.name), h('p', { class: 'modal-text' }, def.desc),
    arch ? h('p', { class: 'small muted' }, `${U().role_icons[arch.role]} ${U().role_labels[arch.role]} · ${U().stat_icons.hp} ${arch.hp} · ${U().stat_icons.dmg} ${arch.dmg} / ${arch.atk_interval}s · ${U().stat_icons.range} ${arch.range} · ${U().stat_icons.speed} ${arch.speed}`) : null,
    h('p', { class: 'small' }, col ? `×${col.count} · ${usable(id) ? 'jouable · niveau ' + (cardLevel(id) + 1) : 'encore 1 exemplaire pour la jouer'}` : 'Pas encore obtenue'),
    // Ce que le niveau apporte concretement, et ce que rapporterait le prochain doublon.
    arch ? h('p', { class: 'small', style: { borderLeft: '3px solid var(--gold)', paddingLeft: '8px' } },
      cardLevel(id) > 0
        ? `Niveau ${cardLevel(id) + 1} : +${cardLevel(id) * config.cards.duplicate_level_pct} % PV et dégâts, soit ${Math.round(arch.hp * (1 + cardLevel(id) * config.cards.duplicate_level_pct / 100))} PV et ${Math.round(arch.dmg * (1 + cardLevel(id) * config.cards.duplicate_level_pct / 100))} dégâts. Prochain doublon : +${config.cards.duplicate_level_pct} %.`
        : `Chaque doublon au-delà du deuxième : +${config.cards.duplicate_level_pct} % PV et dégâts.`) : null,
    def.kind === 'unit' ? h('div', {}, bar(Math.min(100, xp / tiers[tiers.length - 1] * 100), { color: 'var(--purple)', label: `XP de combat ${xp} · palier ${cardXpTier(id)} / ${tiers.length}`, height: 16 }), h('p', { class: 'small muted', style: { marginTop: '6px' } }, `Paliers à ${tiers.join(' / ')} kills : attaque spéciale → passif → actif`)) : null,
    h('div', { style: { marginTop: '10px' } }, btn('Fermer', { onClick: () => m.close() }))));
}
function openPack() {
  const C = config.cards; if (!spend({ genes: C.pack_cost_genes })) return toast('Pas assez de gènes', 'red');
  const rng = makeRng(`pack:${Date.now()}:${state.seed}`);
  const got = [];
  for (let i = 0; i < 3; i++) {
    state.cards.pity++;
    let rarity = rng.weighted(Object.keys(C.rarity), k => C.rarity[k].weight);
    if (state.cards.pity >= C.pity_legendary) { rarity = 'legendary'; }
    if (rarity === 'legendary') state.cards.pity = 0;
    const pool = C.cards.filter(c => c.rarity === rarity); const def = rng.pick(pool);
    const edition = rng.weighted(Object.keys(C.editions), k => C.editions[k].chance);
    unlockCard(def.id, edition); got.push({ id: def.id, edition });
  }
  save(); ctx.refreshWallet();
  const wrap = h('div', { class: 'pack-reveal' });
  const m = modal(h('div', { class: 'center-text' }, h('h2', { class: 'modal-title' }, '✨ Pack ouvert'), wrap, btn('Super', { kind: 'gold', onClick: () => { m.close(); render(); } })));
  got.forEach((g, i) => setTimeout(() => { const c = drawCard(g.id, { reveal: true }); c.style.animationDelay = '0s'; wrap.append(c); if (cardDef(g.id).rarity === 'legendary' || g.edition !== 'none') toast(`${cardDef(g.id).name} ${C.editions[g.edition].label}`.trim(), 'gold'); }, i * 350));
}
