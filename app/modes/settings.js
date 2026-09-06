// Reglages + onboarding : editeur du brief (habits.json), Notion, sauvegarde, installation.
import { config } from '../core/config.js';
import { state, save, exportJSON, importJSON, reset } from '../core/state.js';
import { h, btn, panel, toast, modal, confirmModal } from '../core/ui.js';
import { testSync, flushSync, requeueAll } from '../core/sync.js';
import { speciesVisual } from '../core/genome.js';
import { renderToCanvas } from '../render/creature.js';

let ctx, root;
export function mount(el, c) { ctx = c; root = el; if (c.opts?.onboarding) onboarding(); else render(); }
export function unmount() {}

function onboarding() {
  const cv = h('canvas', { style: { width: '100%', height: '220px' } });
  const name = h('input', { class: 'txt', placeholder: 'Le nom de ta Lignée', style: { fontFamily: 'var(--display)', fontSize: '22px', textAlign: 'center' } });
  root.append(h('div', { class: 'onboard' }, h('h1', {}, 'EVOLVE'), h('p', { class: 'muted' }, 'Prends soin de toi dans le monde réel, et regarde ta Lignée naître d\'une cellule, conquérir les étoiles et devenir un dieu.'),
    h('div', { class: 'creature-stage', style: { height: '220px' } }, cv),
    h('p', {}, 'Une cellule vient d\'apparaître dans l\'océan primordial. Ce que tu fais chaque jour — bouger, manger, méditer, travailler — sculptera son corps.'),
    name,
    h('div', { style: { marginTop: '14px' } }, btn('Commencer', { kind: 'green', size: 'lg block', onClick: () => { state.species.name = name.value.trim() || 'Lignée sans nom'; state.settings.onboarded = true; save(true); ctx.navigate('ritual'); toast('Bienvenue. Remplis ton premier Rituel.', 'green'); } })),
    h('p', { class: 'small muted', style: { marginTop: '12px' } }, 'Astuce : ajoute EVOLVE à ton écran d\'accueil (menu du navigateur → « Ajouter à l\'écran d\'accueil ») pour l\'avoir comme une vraie app.')));
  let t0 = performance.now(); const loop = (now) => { if (!document.body.contains(cv)) return; renderToCanvas(cv, speciesVisual(), { tint: config.stages.stages[0].palette.tint, t: (now - t0) / 1000, scale: .8 }); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
}

function render() {
  root.innerHTML = '';
  root.append(h('h1', { style: { marginBottom: '10px' } }, '⚙️ Réglages'));
  // Brief
  root.append(panel('Le brief journalier', h('p', { class: 'muted small' }, 'Le Rituel est entièrement défini par un fichier JSON (habits.json). Modifie-le ici : ajoute une habitude, change un barème, retire une ligne. Les nouveaux champs apparaissent aussi dans les stats et dans Notion.'),
    h('div', { class: 'row gap wrap' }, btn('Éditer le brief', { kind: 'blue', size: 'sm', onClick: editHabits }), config.habitsOverridden ? btn('Revenir au fichier', { size: 'sm', onClick: async () => { if (await confirmModal('Revenir au brief du fichier ?', 'Ta version personnalisée sera oubliée.')) { state.settings.habitsOverride = null; save(true); location.reload(); } } }) : null),
    config.habitsOverridden ? h('p', { class: 'small', style: { color: 'var(--gold)', marginTop: '6px' } }, 'Brief personnalisé actif') : null));
  // Notion
  const s = state.sync;
  const ep = h('input', { class: 'txt', placeholder: 'URL de la fonction (vide = /api/notion)', value: s.endpoint || '' });
  ep.addEventListener('change', () => { s.endpoint = ep.value.trim(); save(); });
  const sec = h('input', { class: 'txt', type: 'password', placeholder: 'Clé de synchronisation (EVOLVE_SYNC_SECRET, optionnelle)', value: s.secret || '', style: { marginTop: '6px' } });
  sec.addEventListener('change', () => { s.secret = sec.value.trim(); save(); });
  const tog = h('button', { class: 'chip' + (s.enabled ? ' active' : ''), onClick: () => { s.enabled = !s.enabled; tog.classList.toggle('active', s.enabled); tog.textContent = s.enabled ? 'Sync activée' : 'Sync désactivée'; save(); if (s.enabled) flushSync(); } }, s.enabled ? 'Sync activée' : 'Sync désactivée');
  root.append(panel('Notion — Chronique des Jours', h('p', { class: 'muted small' }, 'Chaque jour récolté part vers ta base Notion via une petite fonction serveur (le token n\'est jamais dans l\'app). Le jeu marche hors-ligne et pousse quand il peut.'),
    h('div', { class: 'settings-row' }, h('span', {}, 'Synchronisation'), tog), ep, sec,
    h('div', { class: 'row gap', style: { marginTop: '8px' } }, btn('Tester', { size: 'sm', kind: 'blue', onClick: async () => { try { const r = await testSync(); toast(`OK · base « ${r.database || r.title || 'Chronique'} »`, 'green'); } catch (e) { toast('Échec : ' + e.message, 'red'); } } }), btn('Pousser maintenant', { size: 'sm', onClick: async () => { await flushSync(true); toast(state.sync.lastError ? state.sync.lastError : 'Poussé', state.sync.lastError ? 'red' : 'green'); } }), btn('Tout renvoyer', { size: 'sm', onClick: async () => { const n = requeueAll(); await flushSync(true); toast(state.sync.lastError ? state.sync.lastError : `${n} jour(s) renvoyé(s)`, state.sync.lastError ? 'red' : 'green'); } })),
    h('p', { class: 'small muted', style: { marginTop: '6px' } }, `${s.queue.length} jour(s) en attente${s.lastError ? ' · dernière erreur : ' + s.lastError : ''}`)));
  // Sauvegarde
  root.append(panel('Sauvegarde', h('p', { class: 'muted small' }, `Version de sauvegarde ${state.version} · ${Object.keys(state.days).length} jours · créée le ${new Date(state.createdAt).toLocaleDateString('fr-FR')}`),
    h('div', { class: 'row gap wrap' }, btn('Exporter', { size: 'sm', onClick: () => { const blob = new Blob([exportJSON()], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: `evolve-save-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); } }),
      btn('Importer', { size: 'sm', onClick: () => { const inp = h('input', { type: 'file', accept: 'application/json' }); inp.addEventListener('change', async () => { const f = inp.files[0]; if (!f) return; try { importJSON(await f.text()); toast('Sauvegarde importée', 'green'); location.reload(); } catch (e) { toast('Fichier invalide', 'red'); } }); inp.click(); } }),
      btn('Tout effacer', { size: 'sm', kind: 'red', onClick: async () => { if (await confirmModal('Effacer toute la partie ?', 'Irréversible. Exporte d\'abord si tu veux garder une trace (Notion, elle, garde tout).', 'Effacer', 'red')) { reset(); location.reload(); } } }))));
  // Triche de test (utile pour verifier le jeu) — gardee visible mais explicite
  root.append(panel('Bac à sable', h('p', { class: 'muted small' }, 'Pour tester sans attendre demain. N\'écrit rien dans Notion.'),
    h('div', { class: 'row gap wrap' }, btn('+500 ⚡', { size: 'sm', onClick: () => { state.wallet.elan += 500; save(); ctx.refreshWallet(); } }), btn('+200 🧬 🍖 🧱', { size: 'sm', onClick: () => { state.wallet.genes += 200; state.wallet.biomasse += 200; state.wallet.materiaux += 200; save(); ctx.refreshWallet(); } }), btn('+50 Points de Stade', { size: 'sm', onClick: () => { state.species.stagePoints += 50; save(); toast('+50 Points de Stade (test)'); } }), btn('+20 sur chaque axe', { size: 'sm', onClick: () => { for (const ax of config.stages.axes.order) state.species.axes[ax] += 20; save(); import('./species.js').then(m => { const n = m.checkDrafts(); toast(`${n.length} draft(s) créé(s)`); }); } }))));
  root.append(panel('À propos', h('p', { class: 'muted small' }, `EVOLVE 4.0 « Lignée » · build ${window.EVOLVE_VERSION} · tout l'équilibrage vit dans data/*.json.`), h('p', { class: 'muted small' }, 'Installer : Chrome Android → menu ⋮ → « Ajouter à l\'écran d\'accueil ». Sur iPhone : Partager → « Sur l\'écran d\'accueil ».'), btn('Retour au jeu', { kind: 'green', size: 'block', onClick: () => ctx.navigate('ritual') })));
}
function editHabits() {
  const ta = h('textarea', { class: 'txt mono' }, state.settings.habitsOverride || JSON.stringify(config.habits, null, 2));
  const m = modal(h('div', {}, h('h2', { class: 'modal-title' }, 'habits.json'), h('p', { class: 'muted small' }, 'Types : toggle · counter · number · duration · scale · text · multi · calories. Chaque champ a un id unique (colonne Notion), un barème, un pilier et un axe.'), ta,
    h('div', { class: 'row gap', style: { marginTop: '10px' } }, btn('Annuler', { onClick: () => m.close() }), btn('Enregistrer', { kind: 'green', onClick: () => { try { const j = JSON.parse(ta.value); if (!Array.isArray(j.sections)) throw new Error('sections manquantes'); state.settings.habitsOverride = JSON.stringify(j); save(true); toast('Brief enregistré — rechargement', 'green'); setTimeout(() => location.reload(), 600); } catch (e) { toast('JSON invalide : ' + e.message, 'red'); } } }))), { cls: '' });
  m.el.style.maxWidth = '600px';
}
