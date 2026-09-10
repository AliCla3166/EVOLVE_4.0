# EVOLVE 4.0 — « Lignée »

Jeu mobile personnel de suivi d'habitudes (PWA, vanilla JS, aucun build). Voir `docs/evolve-4.0-game-design.md`.

Version 0.10.0 : escouades autonomes et 220 miniatures peintes. Voir [les règles et la direction artistique](docs/escouades-et-miniatures.md). Atelier visuel : `tools/miniatures.html` ; colonie et placement de 120 combattants : `tools/worlds.html`.

## Lancer en local
`python3 -m http.server 8765` puis ouvrir http://localhost:8765/

## Modifier le brief journalier
Éditer `data/habits.json` (ou Réglages → « Éditer le brief » dans l'app). Chaque champ = une ligne du Rituel, une colonne dans l'Observatoire et dans Notion.

## Tout l'équilibrage
`data/*.json` — chaque fichier commence par un `_comment` qui explique ses valeurs. Zéro nombre en dur dans `app/`.

## Notion
`api/notion.js` (fonction Vercel). Variables d'environnement : `NOTION_TOKEN` (obligatoire), `NOTION_DATA_SOURCE_ID` (défaut : la base « Chronique des Jours »), `EVOLVE_SYNC_SECRET` (optionnel, à recopier dans Réglages → Clé de synchronisation).

## Structure
```
index.html style.css sw.js manifest.json
app/core/    state (sauvegarde versionnée), config, clock (jour à 5h), economy (barème), genome, progress, sync, ui, rng, events
app/modes/   ritual, species, colony, battle, cards, observatory, settings, codex
app/render/  creature.js (rendu procédural de la race)
data/        habits, stages, mutations, colony, battle, cards, codex
api/         notion.js
```
