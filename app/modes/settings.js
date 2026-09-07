// Reglages + onboarding : editeur du brief (habits.json), Notion, sauvegarde, installation.
import { config } from '../core/config.js';
import { state, save, exportJSON, importJSON, reset } from '../core/state.js';
import { h, btn, panel, toast, modal, confirmModal } from '../core/ui.js';
import { testSync, flushSync, requeueAll } from '../core/sync.js';
import * as notify from '../core/notify.js';
import { speciesVisual } from '../core/genome.js';
import { renderToCanvas } from '../render/creature.js';

let ctx, root;
export function mount(el, c) {
  ctx = c; root = el;
  // Mode developpeur : ?dev=1 dans l'URL, ou 5 tapes sur la ligne de build (panneau A propos).
  if (location.search.includes('dev=1') && !state.settings.dev) { state.settings.dev = true; save(); }
  if (c.opts?.onboarding) onboarding(); else render();
}
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
  // Le declencheur du soir
  root.append(renderNotify());
  // Confort de saisie
  const pts = h('button', { class: 'chip' + (state.settings.showPoints ? ' active' : ''), onClick: () => { state.settings.showPoints = !state.settings.showPoints; save(true); render(); } }, state.settings.showPoints ? 'Points affichés' : 'Points masqués');
  root.append(panel('Saisie', h('p', { class: 'muted small' }, 'Par défaut, le Rituel n\'affiche pas le nombre de points de chaque champ pendant la saisie : tu racontes ta journée, tu ne calcules pas. Le détail arrive à la récolte. Tu peux les réafficher.'),
    h('div', { class: 'settings-row' }, h('span', {}, 'Points par champ'), pts)));
  // Sauvegarde
  root.append(panel('Sauvegarde', h('p', { class: 'muted small' }, `Version de sauvegarde ${state.version} · ${Object.keys(state.days).length} jours · créée le ${new Date(state.createdAt).toLocaleDateString('fr-FR')}`),
    h('div', { class: 'row gap wrap' }, btn('Exporter', { size: 'sm', onClick: () => { const blob = new Blob([exportJSON()], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: `evolve-save-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); } }),
      btn('Importer', { size: 'sm', onClick: () => { const inp = h('input', { type: 'file', accept: 'application/json' }); inp.addEventListener('change', async () => { const f = inp.files[0]; if (!f) return; try { importJSON(await f.text()); toast('Sauvegarde importée', 'green'); location.reload(); } catch (e) { toast('Fichier invalide', 'red'); } }); inp.click(); } }),
      btn('Tout effacer', { size: 'sm', kind: 'red', onClick: async () => { if (await confirmModal('Effacer toute la partie ?', 'Irréversible. Exporte d\'abord si tu veux garder une trace (Notion, elle, garde tout).', 'Effacer', 'red')) { reset(); location.reload(); } } }))));
  // Triche de test : MASQUEE par defaut. Sur un jeu dont tout l'interet est que les chiffres
  // soient merites, ce panneau ne doit pas etre a portee de pouce. Activation : ?dev=1, ou
  // 5 tapes sur la ligne de build dans A propos.
  if (state.settings.dev) root.append(panel('Bac à sable', h('p', { class: 'muted small' }, 'Pour tester sans attendre demain. N\'écrit rien dans Notion.'),
    h('div', { class: 'row gap wrap' }, btn('+500 ⚡', { size: 'sm', onClick: () => { state.wallet.elan += 500; save(); ctx.refreshWallet(); } }), btn('+200 🧬 🍖 🧱', { size: 'sm', onClick: () => { state.wallet.genes += 200; state.wallet.biomasse += 200; state.wallet.materiaux += 200; save(); ctx.refreshWallet(); } }), btn('+50 Points de Stade', { size: 'sm', onClick: () => { state.species.stagePoints += 50; save(); toast('+50 Points de Stade (test)'); } }), btn('+20 sur chaque axe', { size: 'sm', onClick: () => { for (const ax of config.stages.axes.order) state.species.axes[ax] += 20; save(); import('./species.js').then(m => { const n = m.checkDrafts(); toast(`${n.length} draft(s) créé(s)`); }); } }))));
  const buildLine = h('p', { class: 'muted small' }, `EVOLVE 4.0 « Lignée » · build ${window.EVOLVE_VERSION} · tout l'équilibrage vit dans data/*.json.`);
  let devTaps = 0;
  buildLine.addEventListener('click', () => {
    if (++devTaps < 5) return;
    devTaps = 0; state.settings.dev = !state.settings.dev; save(true);
    toast(state.settings.dev ? 'Bac à sable activé' : 'Bac à sable masqué', 'gold'); render();
  });
  root.append(panel('À propos', buildLine, h('p', { class: 'muted small' }, 'Installer : Chrome Android → menu ⋮ → « Ajouter à l\'écran d\'accueil ». Sur iPhone : Partager → « Sur l\'écran d\'accueil ».'), btn('Retour au jeu', { kind: 'green', size: 'block', onClick: () => ctx.navigate('ritual') })));
}
// Notifications. Le texte dit franchement ce qu'une PWA sait faire et ce qu'elle ne sait pas :
// promettre un rappel fiable app fermee serait un mensonge, et un rappel rate est pire que pas de rappel.
function renderNotify() {
  const p = permissionLabel();
  const on = state.settings.notifyEnabled && notify.permission() === 'granted';
  const tog = h('button', { class: 'chip' + (on ? ' active' : ''), onClick: async () => {
    if (on) { notify.disable(); toast('Rappel désactivé', ''); render(); return; }
    const r = await notify.enable();
    if (r === 'granted') toast('Rappel activé', 'green');
    else if (r === 'denied') toast('Notifications refusées par le navigateur', 'red');
    else toast('Notifications indisponibles sur cet appareil', 'red');
    render();
  } }, on ? 'Rappel activé' : 'Rappel désactivé');

  const hour = h('input', { class: 'txt', type: 'time', value: String(notify.notifyHour()).padStart(2, '0') + ':' + String(notify.notifyMinute()).padStart(2, '0'), style: { maxWidth: '140px' } });
  hour.addEventListener('change', () => {
    const [hh, mm] = hour.value.split(':').map(Number);
    if (isNaN(hh)) return;
    state.settings.notifyHour = hh; state.settings.notifyMinute = mm || 0; save(true);
    notify.schedule(); toast('Rappel réglé sur ' + hour.value, 'green');
  });

  return panel('Le rappel du soir',
    h('p', { class: 'muted small' }, 'Une phrase, une fois par soir, dans le registre du Codex — jamais un reproche, jamais un mot sur ta série.'),
    h('div', { class: 'settings-row' }, h('span', {}, 'Rappel quotidien'), tog),
    h('div', { class: 'settings-row' }, h('span', {}, 'Heure'), hour),
    h('p', { class: 'small muted' }, 'Ce soir : « ' + notify.lineFor() + ' »'),
    h('div', { class: 'row gap wrap', style: { marginTop: '8px' } },
      btn('Tester maintenant', { size: 'sm', kind: 'blue', onClick: async () => { const r = await notify.preview(); if (r !== 'granted') toast('Autorisation refusée', 'red'); } })),
    h('p', { class: 'small muted', style: { marginTop: '8px' } }, p),
    h('p', { class: 'small muted' }, 'À savoir : une app web ne peut pas garantir un rappel quand elle est complètement fermée — c\'est une limite du navigateur, pas un réglage. Concrètement : le rappel part si l\'app est ouverte ou en arrière-plan à l\'heure dite, et sinon tu le retrouves à la réouverture. La version APK, elle, le rendra fiable.'));
}
function permissionLabel() {
  const p = notify.permission();
  if (p === 'unsupported') return 'Cet appareil ne gère pas les notifications web.';
  if (p === 'granted') return 'Autorisation accordée.';
  if (p === 'denied') return 'Autorisation refusée : il faut la rétablir dans les réglages du navigateur pour ce site.';
  return 'Autorisation pas encore demandée.';
}

function editHabits() {
  const ta = h('textarea', { class: 'txt mono' }, state.settings.habitsOverride || JSON.stringify(config.habits, null, 2));
  const m = modal(h('div', {}, h('h2', { class: 'modal-title' }, 'habits.json'), h('p', { class: 'muted small' }, 'Types : toggle · counter · number · duration · scale · text · multi · calories. Chaque champ a un id unique (colonne Notion), un barème, un pilier et un axe.'), ta,
    h('div', { class: 'row gap', style: { marginTop: '10px' } }, btn('Annuler', { onClick: () => m.close() }), btn('Enregistrer', { kind: 'green', onClick: () => { try { const j = JSON.parse(ta.value); if (!Array.isArray(j.sections)) throw new Error('sections manquantes'); state.settings.habitsOverride = JSON.stringify(j); save(true); toast('Brief enregistré — rechargement', 'green'); setTimeout(() => location.reload(), 600); } catch (e) { toast('JSON invalide : ' + e.message, 'red'); } } }))), { cls: '' });
  m.el.style.maxWidth = '600px';
}
