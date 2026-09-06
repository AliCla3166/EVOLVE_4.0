# EVOLVE — instructions pour une nouvelle session Cowork (Evolve 4.0 « Lignée »)

Document écrit **pour Claude**. Mis à jour le **06/09/2026**. Il remplace la version du 18/08 (pivot 3.0 / Godot), conservée dans `04_HISTORIQUE_ET_DECISIONS.md`.

## Le changement le plus important

Le 04/09/2026, Ali a redéfini le jeu et sa plateforme, décisions prises explicitement (AskUserQuestion) :
1. **Fiction** : le centre du jeu est une **race de créatures procédurale (la Lignée)** qui traverse **10 stades** (Cellule → Colonie → Créature → Meute → Cité → Planétaire → Stellaire → Galactique → Transcendance → Divinité) puis relance l'univers (**Nouveau Cycle**, prestige : la race précédente devient le Panthéon). Les 17 ères historiques du GDD 3.0 deviennent des skins optionnels — plus la colonne vertébrale.
2. **Plateforme** : **PWA HTML5/Canvas (vanilla JS, ES modules, aucun build)**, déployée sur Vercel, installable sur Android via « Ajouter à l'écran d'accueil » ; APK Capacitor en phase 1. Le dépôt Godot `AliCla3166/Evolve-3.0` (Phases 0-7 codées jusqu'au 19/08) devient une **référence figée**, comme v1 et v2.
3. **Le brief journalier est 100 % configurable** dans `data/habits.json` (éditeur intégré dans Réglages) — c'est l'exigence n°1 de modifiabilité.
4. **Génome à 6 axes** (Vigueur, Robustesse, Esprit, Ingéniosité, Lien, Ombre) : chaque famille d'habitudes nourrit un axe ; un seuil franchi = un draft de 3 mutations ; les mutations changent le corps rendu procéduralement ET les stats de toutes les unités.

Le GDD 4.0 est `evolve-4.0-game-design.md` (dans ce Project et dans `docs/` du dépôt) — **seule source de vérité** sur la fiction, les 5 modes, le triple moteur, la DA « sticker vivant » (référence We Are Warriors) et la roadmap.

## Checklist de démarrage

1. Lire ce document, puis `03_CARTE_DU_CODE.md`, `04_HISTORIQUE_ET_DECISIONS.md`, et le GDD 4.0.
2. Dépôt actif : **`AliCla3166/EVOLVE_4.0`** (public). Ali y a poussé tout le code le 06/09 — c'est la source de vérité. La session Cowork n'a **pas** d'accès en écriture GitHub : pour modifier le code, éditer en local puis demander à Ali de committer, ou lui livrer les fichiers.
3. Déploiement : projet Vercel **`evolve`** (compte perso d'Ali, alias `evolve-alicla3166s-projects.vercel.app`). **En ligne et complet depuis le 06/09**, Vercel Authentication désactivée. Méthode : `deploy_to_vercel` **sans `teamId`** (le passer donne un 403) avec 4 fichiers seulement — `vercel.json` (`buildCommand: bash build.sh`, `outputDirectory: public`), `build.sh` (clone le dépôt public et recopie `app/ data/ assets/ index.html style.css sw.js manifest.json` dans `public/`), `package.json`, `api/notion.js`. Garder `api/notion.js` dans l'appel : une fonction serverless doit être dans les sources. Détail complet dans `04_HISTORIQUE_ET_DECISIONS.md`.
4. Tester en local : `python3 -m http.server 8765` dans le dossier, Playwright (chromium à `/opt/pw-browsers/chromium`) en viewport 390×844 ; scripts de tour/capture réutilisables dans `/tmp` de la session du 04/09 (`tour.mjs`, `battle_shot.mjs`, `flow.mjs`) — à recréer au besoin : ils ne sont pas dans le dépôt.
5. Notion : base **« 📖 Chronique des Jours »** créée le 04/09 (database `3386112cf8b54e8db247227b0dea23f1`, data source `0c0db707-8a43-4956-853e-fde2e5b6699f`), sous « 📋 EVOLVE — Sommaire du projet ». **Token d'intégration à créer par Ali** (notion.so/profile/integrations) et à mettre dans Vercel (`NOTION_TOKEN`), puis connecter l'intégration à la base. Tant que ce n'est pas fait, la sync est désactivée dans l'app (Réglages) et la file d'attente locale garde les jours.

## Règles d'architecture (héritées, toujours valables)

1. **Triple moteur étanche** : vertical (Élan, points d'axe, Points de Stade, stades, cycles — vie réelle, plafonné) / Campagne (compétence) / horizontal (illimité). **Seule porte vers le vertical : `addStagePoints()` dans `core/progress.js`, appelée uniquement par la Bataille mode Défense**, plafonnée par jour (`stages.json : stage_points_daily_cap`). `grant()` refuse l'Élan.
2. **Zéro nombre d'équilibrage et zéro texte joueur en dur** : tout dans `data/*.json`, chaque fichier avec `_comment`.
3. **Sauvegarde versionnée** (`core/state.js : SAVE_VERSION`, `MIGRATIONS`) — incrémenter à tout changement de schéma, écrire la migration.
4. **PRNG seedé** (`core/rng.js`) partout sauf le combat temps réel (battle.js).
5. **Cache local + Notion différé** (`core/sync.js`) ; token Notion uniquement en variable d'environnement Vercel (`api/notion.js`).
6. **On baisse le prix, jamais on gonfle le gain** ; **aucune progression ne se termine** ; **pas de FOMO** ; éditions de cartes orthogonales à la rareté ; verrou des doublons (jouable à la 2e prise).
7. Un champ ajouté à `habits.json` doit fonctionner sans toucher au code : Rituel (`modes/ritual.js : renderField`), Observatoire (`numericValue`), Notion (`api/notion.js` crée la colonne à la volée). Si un nouveau `type` de champ est nécessaire, l'ajouter dans ces trois endroits ET dans `core/economy.js : scoreField`.
8. Langue : français accentué pour le joueur ; commentaires de code et commits en français sans accents.

## Pièges connus

- Le déploiement par `mcp__Vercel__deploy_to_vercel` passe les fichiers **dans l'appel d'outil**, et une charge trop grosse est tronquée sans erreur : voir « Mettre en ligne quand le dépôt est en retard » plus bas, c'est le piège le plus coûteux du projet.
- Passer `teamId` aux outils Vercel provoque un 403 (`list_teams` renvoie vide) : toujours l'omettre. Les outils de lecture (`get_project`, `list_deployments`, `get_deployment_build_logs`) l'exigent et sont donc inutilisables — vérifier par `curl` sur l'alias de production à la place.
- L'accès GitHub en écriture n'existe pas dans la session ; il n'y a pas d'outil `add_repo`. Le dépôt est public : on peut le lire par `fetch` de l'API GitHub depuis un onglet Chrome (`javascript_tool`), pas par WebFetch (403).
- Playwright : `page.close()`/`reload` déclenchent `visibilitychange` → `save(true)` écrase un `localStorage` seedé. Seeder via `context.addInitScript` (voir `tour.mjs` du 04/09).
- Le Rituel ne prend pas les photos ni les capteurs : pas, sommeil, kcal sont saisis à la main (Health Connect = phase 1 avec Capacitor).
- `app/modes/battle.js` et `colony.js` ont été écrits par des sous-agents le 04/09 et ajoutés `battle.json : combat/traits/enemy_ai/cost_formula.*` et `colony.json : rush` — additifs, à conserver.

## Mettre en ligne quand le dépôt est en retard

Tant que les correctifs ne sont pas poussés sur GitHub, le build les reprend d'ailleurs. Deux mécanismes, dans cet ordre de préférence :

1. **Le dépôt est à jour** → `build.sh` clone, point final. Appel de déploiement minuscule (4 fichiers).
2. **Le dépôt est en retard** → `build.sh` récupère par `curl -fsSL` les fichiers déjà publiés depuis l'alias de production, puis applique `override/` (livré dans l'appel) par-dessus. C'est ainsi qu'on met en ligne un correctif sans accès en écriture au dépôt, sans faire transiter 100 Ko dans l'appel.

**Le plafond de l'outil de déploiement est un piège silencieux** : au-delà d'environ 40 k tokens de sortie, l'appel est tronqué **au milieu du tableau `files`** — il reste valide, et Vercel publie une arborescence amputée sans erreur. Deux demi-déploiements ont été mis en production comme ça le 06/09. Donc : garder la charge sous ~37 k tokens (minifier avec terser `--module` et compacter les JSON si besoin), compter les fichiers avant d'envoyer, et **toujours vérifier après coup par `curl … | diff - <source locale>` sur chaque fichier** — c'est le seul contrôle qui détecte une troncature. `build.sh` se termine par une vérification d'existence et des `grep` sur les marqueurs attendus, pour que le build échoue bruyamment plutôt que de publier une app cassée.

## Comment travailler avec Ali

- Pas de questions à choix multiples en cours de travail pour des décisions techniques : décider, documenter, rendre compte. Poser les vraies questions de scope/produit (comme le 04/09).
- Répondre en français, compact et direct. Envoyer des captures d'écran au fil de l'eau.
- Ne jamais committer/pousser sans qu'Ali le demande — sauf le push initial de `EVOLVE_4.0`, explicitement attendu par Ali.
