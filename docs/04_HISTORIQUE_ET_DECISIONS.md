# Historique, décisions verrouillées, chantiers ouverts — à jour au 06/09/2026

## Résumé chronologique

- **23–31/07/2026 — v2 (`evolve2`, Next.js/Vercel)** : Âge 1 « Cellule » complet, Bastion, Mare, Dérive, éditions Balatro, refonte UI ; 37 commits. Figé.
- **18/08/2026 — pivot 3.0 (`Evolve-3.0`, Godot 4.7)** : GDD 3.0 (17 ères historiques, triple moteur, Bastion unifié, Pêche + Atelier, Notion comme mémoire, charte EVOLVE V1.0). Le 19/08, ~4 500 lignes de GDScript couvrent les Phases 0-7 (moteur, 6 onglets, Bastion, Pêche/Atelier, jeu libre, Codex, Ère 2, assets vectoriels générés). Jamais exporté en APK. **Figé le 04/09.**
- **04/09/2026 — pivot 4.0 « Lignée » (PWA)**. Ali reformule le besoin : un jeu « qui pourrait gagner un concours de jeu mobile indé », DA façon We Are Warriors, mix incrémental/TD/gestion/Spore, suivi santé/alimentation/méditation, Notion pour des stats de vie, une race procédurale de la cellule à la divinité qui relance l'univers, brief journalier facile à modifier. Deux décisions prises par Ali (AskUserQuestion) : **race procédurale par stades** (pas les ères humaines) et **PWA puis APK** (pas Godot). Une session Cowork écrit le GDD 4.0 et code la Phase 0 complète en une journée (socle, Rituel, Espèce, Colonie, Bataille, Cartes, Observatoire, Notion, PWA), crée la base Notion « Chronique des Jours », déploie partiellement sur Vercel, livre le zip du code. Ali crée le dépôt `AliCla3166/EVOLVE_4.0`.
- **06/09/2026 — mise en ligne**. Ali pousse le code sur `AliCla3166/EVOLVE_4.0` (dépôt public). La Vercel Authentication est désactivée. L'app complète est déployée et vérifiée en production : 33/33 fichiers en 200, les 6 onglets fonctionnent, `/api/notion` répond (il réclame le token, non encore créé). Le déploiement passe par un `build.sh` qui clone le dépôt public — voir « Comment le déploiement marche » ci-dessous.
- **06/09/2026 (soir) — première passe de retours d'Ali.** La Bataille passe en couloir diagonal avec perspective légère et unités deux fois plus petites, rangées côte à côte ; « Chantier Elilo » devient « Chantier Alilou » ; la synchro Notion est vérifiée de bout en bout (elle marchait déjà : la base contenait bien la journée d'Ali) et gagne un bouton « Tout renvoyer ».


## Décisions verrouillées

### Héritées (v2/3.0), toujours valables
Barème d'habitudes v2 (journée parfaite ~166 ⚡, plafond 293) + commentaire +8 / moment fort +4 / humeur +2 · on baisse le prix, jamais on gonfle le gain · aucune progression ne se termine · verrou des doublons · éditions orthogonales à la rareté · jour en retard payé mais série non tenue · deadline 5 h, fenêtre 7 jours · rubis rares sans achat réel · triple moteur étanche · Défense = seule source de points verticaux (ici : Points de Stade) · Raid 100 % horizontal · pas de FOMO · le nom reste EVOLVE · Ali n'aime pas les QCM techniques en cours de travail.

### Nouvelles (04/09/2026)
- **Fiction** : la Lignée, 10 stades Cellule → Divinité, Nouveau Cycle (prestige : Panthéon = bénédictions permanentes). Les ères historiques = skins futurs.
- **Plateforme** : PWA vanilla JS (aucun build), Vercel, APK Capacitor en phase 1. Godot 3.0 figé.
- **Génome à 6 axes** nourri par les familles d'habitudes ; seuil → draft de 3 mutations ; mutations = visuel + stats de toute la race.
- **Brief journalier = `data/habits.json`**, éditable in-app, colonnes Notion créées automatiquement.
- **DA « sticker vivant »** : référence explicite We Are Warriors (contour encre épais, aplats, chunky 3D), palette UI de la charte V1.0 conservée, palette monde par stade.
- **Couloir de bataille (06/09)** : diagonale haut-gauche → bas-droite avec perspective légère, jamais un couloir horizontal. Unités à `view.unit_pct` = 0,085 du plus petit côté (moitié de la taille d'origine, demandée par Ali) et rangées latéralement en éventail : on doit pouvoir compter les unités d'un coup d'œil, elles ne se cachent pas. Toute la géométrie vit dans `battle.json : view`.
- **Métamorphose** = Points de Stade (Défense, plafonnés/jour) + coût en Élan (vie réelle).
- Colonie financée par l'Élan (la vie réelle construit la base) ; Biomasse/Matériaux/Gènes = monnaies horizontales.

## Comment le déploiement marche (06/09/2026)

L'accès GitHub et le `teamId` Vercel de la session Cowork étant tous deux inutilisables, le déploiement se fait par `deploy_to_vercel` **sans paramètre `teamId`** (le passer explicitement provoque un 403), avec une poignée de fichiers seulement dans l'appel : `vercel.json` (`buildCommand: bash build.sh`, `outputDirectory: public`), `build.sh`, `package.json` et `api/notion.js`. Le build clone `https://github.com/AliCla3166/EVOLVE_4.0.git` et recopie `index.html`, `style.css`, `sw.js`, `manifest.json`, `app/`, `data/`, `assets/` dans `public/`. `api/notion.js` doit rester dans l'appel : une fonction serverless doit exister dans les sources, un fichier récupéré au build ne serait servi qu'en statique. Cela contourne définitivement la limite de taille de l'outil (plus besoin de découper ni de minifier).

`build.sh` recopie en plus, par-dessus le clone, tout ce que contient un dossier `override/` fourni dans l'appel : c'est ainsi qu'on met en ligne un correctif avant qu'Ali l'ait poussé sur GitHub (la session n'a pas d'accès en écriture au dépôt). **`override/` est une béquille** : dès qu'Ali a poussé, redéployer sans lui, sinon un fichier figé dans `override/` écrasera silencieusement une version plus récente du dépôt.

## Chantiers ouverts (par priorité)

1. ~~Token Notion~~ — **fait le 06/09** : `NOTION_TOKEN` est en place sur Vercel, `/api/notion` répond `ok`, la première journée d'Ali est écrite dans la Chronique. La synchro fonctionne.
2. **Resynchroniser le dépôt** : les correctifs du 06/09 (soir) sont en ligne via le mécanisme `override/` du build, mais pas encore poussés sur GitHub (zip livré à Ali le 06/09). Dès qu'ils y sont, redéployer sans `override/` pour éviter que le dépôt et la production divergent.
3. **Déploiement automatique** : relier le projet Vercel `evolve` au dépôt GitHub (Project Settings → Git → GitHub). Demande une autorisation OAuth GitHub qu'Ali doit accorder lui-même ; tant que ce n'est pas fait, chaque mise à jour se redéploie avec la méthode ci-dessus (le build reprend le dernier commit du dépôt).
4. **Polish jeu** après premiers retours d'Ali : équilibrage de la Bataille (coûts de ration vs ration de départ), auto-résolution des vagues, ordres par unité, ciblage « une fois par ennemi », instinct Symbiose, sons.
5. **Phase 1** : Capacitor + Health Connect (pas/sommeil automatiques), notifications de brief à 20 h, écran de veille de la Colonie.
6. **Phase 2** : Expédition (survivors 3 min), Raid complet (ultimatums), Pouvoirs supplémentaires, Codex 30 entrées/stade.
7. **Phase 3** : stades 7-10 visuellement distincts, skins d'époque (17 ères), rétrospectives mensuelles automatisées (tâche planifiée Cowork qui lit la Chronique).
8. Porter `tools/economy/model.py` de v2 en `tools/simulate.py` pour resimuler Colonie + stades (cible 1-3 mois/stade).
9. Mettre à jour la page Notion « 🚀 Initialisation Evolve » (toujours sur l'état v2).
10. Hérités : sort de Walachie (v2) non tranché ; PixelLab vs Ideogram sans objet en 4.0 (rendu procédural).
