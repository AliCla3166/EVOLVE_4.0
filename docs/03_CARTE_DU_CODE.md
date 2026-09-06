# Carte du code — Evolve 4.0 (PWA), état au 04/09/2026

~5 000 lignes de JS/CSS/JSON, aucune dépendance, aucun build. Un serveur statique suffit ; `api/notion.js` est la seule fonction serveur (Vercel).

## Coquille
- `index.html` — en-tête (5 pilules de monnaies + ⚙️), `main#screen`, nav 6 onglets (Rituel · Espèce · Colonie · Bataille · Cartes · Stats). Google Fonts (Lilita One + Nunito).
- `style.css` — DA « sticker vivant » : variables (Encre/Nuit/Ardoise/Craie + couleurs vives + palette de stade `--tint/--bg/--ground` injectée par `main.js : applyStagePalette`), boutons chunky `.btn`, barres pilules, chips, panneaux, composants par mode.
- `manifest.json`, `sw.js` (réseau d'abord + cache, ignore `/api/`, `fetch` en `cache: 'no-cache'`), `assets/icons/`. **Incrémenter `CACHE` dans `sw.js` à chaque mise en ligne qui change le code** : sinon un appareil déjà installé peut resservir d'anciens fichiers. `vercel.json` met `Cache-Control: no-cache` sur `/app/*`, `/data/*`, `style.css`, `index.html`, `sw.js`.
- `app/main.js` — bootstrap (dont la mise à jour du service worker : `reg.update()` au démarrage puis toutes les heures, et un rechargement unique sur `controllerchange` — sans quoi un appareil déjà installé reste bloqué sur une ancienne version) : `loadConfig` (avec override `habits`), `load()`, jours manqués, `tickColony`, chargement dynamique des modes, `navigate(id)`, `refreshWallet`, pastilles d'onglet (Rituel non fait, draft de mutation en attente), sauvegarde/sync périodiques.

## `app/core/`
- `state.js` — `defaultState()`, `SAVE_VERSION`, `MIGRATIONS`, `load/save/export/import/reset`. Schéma : `species` (stage, stagePoints, axes, axisTaken, mutations, pendingDrafts, cycle, blessings, pantheon), `wallet` (elan, genes, biomasse, materiaux, rubis, essence), `days` (par clé de jour), `ritualDrafts`, `streak`, `colony`, `battle`, `cards`, `codex`, `sync`, `settings`, `stats`.
- `config.js` — charge `data/*.json` ; `allFields()` aplatit les sections du brief ; `stageOf(n)`.
- `clock.js` — jour de jeu à 5 h (`dayKey`, `addDays`, `daysBetween`, `fmtDay`, `fmtDuration`).
- `economy.js` — `scoreField/scoreDay` (barème piloté par `habits.json`), piliers, `submitDay` (idempotent, verse la différence d'Élan et de points d'axe, bonus de série, rubis aux paliers), `recomputeStreak`, `processMissedDays` (Ombre + Bouclier).
- `genome.js` — `speciesMods()` (% de stats depuis axes + mutations + bâtiments spéciaux + bénédictions), `speciesVisual()` (paramètres du rendu).
- `progress.js` — `grant/spend/canAfford`, **`addStagePoints`** (plafond/jour), `progressContract`, `addCardXp`, `unlockCard`, `recordKills`.
- `sync.js` — file d'attente → `POST /api/notion` (payload = jour + définition des champs), `testSync`, `requeueAll()` (remet tous les jours saisis dans la file : sert à repousser un jour déjà synchronisé — bouton « Tout renvoyer » dans Réglages).
- `rng.js` (mulberry32 seedé), `events.js` (bus), `ui.js` (`h`, `btn`, `panel`, `bar`, `chip`, `toast`, `modal`, `confirmModal`, `floatBubble`, `fmt`).

## `app/render/creature.js`
`drawCreature(ctx, visual, {x,y,size,t,tint,pose,archetype,role,facing,flash})` — bodyplans `cell / cluster / beast / biped / astral / spirit / god`, parties pilotées par `visual` (eyes, limbs, tail, back, skin, aura, mouth, horns, spots…) issues des mutations. `renderToCanvas(canvas, visual, opts)` pour les vignettes.

## `app/modes/` (contrat : `mount(el, ctx)`, `unmount()`)
- `ritual.js` — bandeau 7 jours, héros (série, Élan du jour, 4 piliers), sections/champs rendus par type, brouillon persistant, récolte (bulles → compteur, modal de résumé, drafts de mutation, Codex).
- `species.js` — scène animée, nom, drafts (`checkDrafts`, `thresholdFor`), Métamorphose (`canMetamorph`, cinématique), Nouveau Cycle, axes, arbre des mutations, bénédictions, liste des stades.
- `colony.js` — `tickColony()` (production, hors-ligne, file de chantiers), `colonyRates()`, carte canvas avec individus qui vaquent, 12 sockets, contrats du jour, Accélérer (rubis).
- `battle.js` — menu (Campagne/Défense/Raid, péril, tourelles, deck) + combat plein écran (couloir, ration, main de cartes, ordres/ciblage, IA ennemie, vagues déterministes, pouvoirs, récompenses selon le mode). **Cartes en main (06/09 soir)** : `cardStats(card)` calcule ce que la carte donnera vraiment (archétype × variante × doublons × édition × génome) ; chaque carte affiche PV / attaque (ou soin) / portée via `battle.json : ui`, son rôle, son niveau, un bouton `i` et un appui long qui ouvrent `showCardInfo()` — panneau non bloquant, la bataille continue. `updateRationBar()` affiche le débit par seconde, fait monter une bulle à chaque ration produite et tient le compteur d'unités (`maxUnits()` / `alivePlayerUnits()`). **Géométrie (06/09)** : le couloir est une diagonale haut-gauche (t=0, base joueur, au loin) → bas-droite (t=1, base ennemie, au premier plan), avec perspective légère. `project(x, row)` convertit une position de couloir + un rang latéral en `{px, py, s}` ; `laneEnds`/`laneNormal`/`depthAt` la composent ; `assignRows()` répartit en éventail (0, +1, -1, +2, -2) les unités qui occupent le même endroit pour qu'elles restent dénombrables ; `drawLane()` dessine la bande qui s'élargit en se rapprochant. Tout est piloté par `battle.json : view` — ne jamais remettre de coordonnées en dur. La boucle saute `draw()` quand `document.hidden` (un onglet en arrière-plan affiche donc un canvas vide : ce n'est pas un bug).
- `cards.js` — deck (8 slots, éditions Négatives sans slot), collection, packs (pity), détail (XP de combat, et ce que le niveau apporte en PV/dégâts). Les cartes instinct s'affichent avec leur `icon` (cards.json), pas avec un rendu de créature.
- `observatory.js` — tuiles, heatmap 8 semaines, courbes 7/30/365 par champ, phrases d'insight, fréquence des activités, Codex, Mémoire (statut Notion, journal, export CSV).
- `settings.js` — onboarding, éditeur JSON du brief, Notion (endpoint, clé, test), export/import/reset, bac à sable de test, à propos.
- `codex.js` — `checkCodex()` (déclencheurs), modal d'entrée, liste.

## `data/`
`habits.json` (le brief : sections/champs/types/barèmes/piliers/axes, série, points d'axe) · `stages.json` (10 stades, coûts, palettes, 6 axes, cycle) · `mutations.json` (26 mutations, `visual` + `stats`) · `colony.json` (12 bâtiments × 10 noms de stade, ratios v2, contrats, rush) · `battle.json` (couloir, ration, archétypes, tourelles, 5 factions, campagne/défense/raid, pouvoirs, traits, IA) · `cards.json` (21 cartes, raretés, éditions, deck de départ) · `codex.json` (20 entrées).

## `api/notion.js`
Vercel serverless (Node, `fetch`). GET = test ; POST = upsert du jour dans la data source (recherche par titre `Jour`), création des propriétés manquantes pour tout champ du brief, colonne `Détails` = JSON brut. Env : `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`, `EVOLVE_SYNC_SECRET`.

## Ce qui n'existe pas encore (phases 1-3 du GDD)
APK Capacitor + Health Connect, notifications, Expédition (survivors), Raid complet avec ultimatums, son, skins d'époque, rétrospectives automatisées (tâche planifiée), simulateur d'équilibrage `tools/simulate.py` (à porter de v2), tests automatisés (les scripts Playwright du 04/09 sont hors dépôt).
