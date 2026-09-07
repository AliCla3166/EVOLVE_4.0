# Historique, décisions verrouillées, chantiers ouverts — à jour au 06/09/2026

## Résumé chronologique

- **23–31/07/2026 — v2 (`evolve2`, Next.js/Vercel)** : Âge 1 « Cellule » complet, Bastion, Mare, Dérive, éditions Balatro, refonte UI ; 37 commits. Figé.
- **18/08/2026 — pivot 3.0 (`Evolve-3.0`, Godot 4.7)** : GDD 3.0 (17 ères historiques, triple moteur, Bastion unifié, Pêche + Atelier, Notion comme mémoire, charte EVOLVE V1.0). Le 19/08, ~4 500 lignes de GDScript couvrent les Phases 0-7 (moteur, 6 onglets, Bastion, Pêche/Atelier, jeu libre, Codex, Ère 2, assets vectoriels générés). Jamais exporté en APK. **Figé le 04/09.**
- **04/09/2026 — pivot 4.0 « Lignée » (PWA)**. Ali reformule le besoin : un jeu « qui pourrait gagner un concours de jeu mobile indé », DA façon We Are Warriors, mix incrémental/TD/gestion/Spore, suivi santé/alimentation/méditation, Notion pour des stats de vie, une race procédurale de la cellule à la divinité qui relance l'univers, brief journalier facile à modifier. Deux décisions prises par Ali (AskUserQuestion) : **race procédurale par stades** (pas les ères humaines) et **PWA puis APK** (pas Godot). Une session Cowork écrit le GDD 4.0 et code la Phase 0 complète en une journée (socle, Rituel, Espèce, Colonie, Bataille, Cartes, Observatoire, Notion, PWA), crée la base Notion « Chronique des Jours », déploie partiellement sur Vercel, livre le zip du code. Ali crée le dépôt `AliCla3166/EVOLVE_4.0`.
- **06/09/2026 — mise en ligne**. Ali pousse le code sur `AliCla3166/EVOLVE_4.0` (dépôt public). La Vercel Authentication est désactivée. L'app complète est déployée et vérifiée en production : 33/33 fichiers en 200, les 6 onglets fonctionnent, `/api/notion` répond (il réclame le token, non encore créé). Le déploiement passe par un `build.sh` qui clone le dépôt public — voir « Comment le déploiement marche » ci-dessous.
- **06/09/2026 (soir) — première passe de retours d'Ali.** La Bataille passe en couloir diagonal avec perspective légère et unités deux fois plus petites, rangées côte à côte ; « Chantier Elilo » devient « Chantier Alilou » ; la synchro Notion est vérifiée de bout en bout (elle marchait déjà : la base contenait bien la journée d'Ali) et gagne un bouton « Tout renvoyer ».


## Décisions verrouillées

### Héritées (v2/3.0), toujours valables
Barème d'habitudes v2 (journée parfaite ~166 ⚡, plafond 293) + commentaire +8 / moment fort +4 / humeur +2 · on baisse le prix, jamais on gonfle le gain · aucune progression ne se termine · verrou des doublons · éditions orthogonales à la rareté · jour en retard payé mais série non tenue · deadline 5 h, fenêtre 7 jours · rubis rares sans achat réel · triple moteur étanche · Défense = seule source de points verticaux (ici : Points de Stade) — **révoqué le 07/09/2026 : le Rituel en est désormais la source principale** · Raid 100 % horizontal · pas de FOMO · le nom reste EVOLVE · Ali n'aime pas les QCM techniques en cours de travail.

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

## Équilibrage du 07/09/2026 — après diagnostic complet du build

Diagnostic du dépôt (commit `a33a21b`) lu intégralement, puis six correctifs appliqués et vérifiés en navigateur headless. Détail et justification : GDD 4.0 §11.

| # | Problème constaté dans le code | Correctif |
|---|---|---|
| 1 | `defenseWave` +6/jour sans retour possible × PV ennemis 1,08^vague → Défense injouable en 8-15 jours, donc **plus aucun Point de Stade, définitivement** | Plafond de vague `12 + 8 × (stade−1)`, croissance 1,035 PV / 1,025 dégâts, 16 ennemis max par vague, recul de 3 vagues en cas de défaite |
| 2 | Les Points de Stade ne venaient que de la Défense : la vie réelle ne payait jamais l'évolution | Rituel : 6 Points de Stade (journée parfaite) / 3 (≥ 2 piliers), plafond quotidien inchangé à 12 |
| 3 | Chaque bataille consommait jusqu'à 100 🍖 pour +2 rations, sans affichage | Prélèvement plafonné à 30 🍖, +0,4 ration par 🍖, annoncé dans le menu et par un toast |
| 4 | 8 500 Points de Stade et 124 800 ⚡ au total (708 jours au plafond absolu, 175 jours pour le seul stade 10) | 3 570 Points de Stade / 42 100 ⚡ : ~14 j pour la première métamorphose, 28 → 76 j par stade, ~15 mois au total |
| 5 | 1 seul Bouclier, jamais régénéré, n'absorbant qu'un jour isolé, et le dépenser rabotait le cumul hors-ligne de la Colonie (12 h → 8 h) | +1 Bouclier tous les 14 jours (max 3), absorption d'une absence entière ou d'aucun jour, cumul hors-ligne fixé à 12 h et découplé |
| 6 | Panneau de triche « Bac à sable » visible en production | Masqué ; activation par `?dev=1` ou 5 tapes sur la ligne de build (À propos) |

Vérifications passées : journée parfaite → +6 Points de Stade affichés dans la modale de récolte ; re-soumission idempotente (aucun double versement) ; journée à 2 piliers → +3 ; série 13 → 14 → +1 Bouclier ; 2 jours manqués avec 2 boucliers → absence couverte, série tenue ; 2 jours manqués avec 1 bouclier → aucun bouclier gâché ; sauvegarde héritée à `defenseWave = 200` → la Défense se lance à la vague 12 (plafond du stade 1) ; biomasse 60 → 30 avec « −30 🍖 → +12 rations » ; Bac à sable masqué sans `?dev=1`. Aucune erreur JS.

Build passé à `0.2.0` (`index.html`) et cache du service worker à `evolve4-v0.2.0`. Format de sauvegarde inchangé (version 1) : les parties en cours sont conservées, `defenseWave` se re-borne tout seul.

**Non traité dans ce lot** (lot 2 du plan) : notification quotidienne, écran de retour après absence, Ombre rendue lisible, Codex citant le moment fort, Rituel réduit à 6-8 champs, écran « ce qui a changé depuis hier », `tools/simulate.py`.

## 07/09/2026 — Lot 2 : la boucle d'habitude (build 0.3.0)

Suite du diagnostic du 07/09. Le lot 1 avait débloqué le moteur ; le lot 2 s'attaque à ce qui
faisait qu'on n'ouvrait pas l'app.

- **Le déclencheur.** `app/core/notify.js` + `data/notify.json`. Un rappel du soir, réglable,
  registre du Codex, jamais un reproche, jamais un mot sur la série. Limite assumée et écrite dans
  les Réglages : une PWA ne peut pas garantir une notification app fermée (Notification Triggers
  non livrée, Push API = serveur + VAPID). On fait donc : minuterie tant que l'onglet vit, rappel
  de rattrapage à la réouverture après l'heure, `periodicSync` quand le navigateur l'accorde. La
  fiabilité viendra de l'APK.
- **Le retour après absence.** `app/modes/comeback.js` remplace le toast rouge. Il raconte ce qui
  s'est passé (production de la Colonie, boucliers, mutations en attente), explique l'Ombre comme
  un style de jeu et non une punition, et propose la saisie rétroactive. Aucun mot sur la série.
- **Mémoire → fiction.** Chaque entrée de Codex débloquée fige en exergue le « moment fort » écrit
  au moment du déblocage (`state.codex.quotes`). C'est le seul endroit où la vie réelle devient la
  matière du lore, et ça n'utilise que des données déjà collectées.
- **Rituel allégé.** `"core": true` dans `habits.json` : 8 champs visibles au lieu de 16, le reste
  replié derrière « Détails » (barème inchangé). Les points par champ sont masqués pendant la
  saisie — on raconte sa journée, on n'optimise pas un barème — et le détail arrive à la récolte.
  Réglages → Saisie pour les réafficher.
- **Parcours de 30 secondes.** « Journée comme d'habitude » remplit la médiane des 14 derniers
  jours (`typicalDay()` dans `economy.js`). Jamais les champs texte : un souvenir inventé n'a
  aucune valeur. Un bandeau « depuis hier » résume production, chantiers, mutations, contrats.

Vérifié au navigateur (Playwright, 390x844) : onboarding, 8 champs au chargement, récolte qui verse
Élan + Points de Stade, écran de retour après 4 jours d'absence, citation du Codex, six onglets
rendus, zéro erreur console.

## 07/09/2026 — Refonte visuelle (en attente de validation)

Direction retenue par Ali : **chunky assumé, beaucoup plus abouti** — on garde les proportions
We Are Warriors, on ajoute la diversité, l'équipement et l'animation.

- **`app/render/gear.js` (nouveau)** — l'équipement par rôle × palier de stade. Cinq paliers
  (organique / naturel / taillé / forgé / énergie) pour dix stades : le même archétype porte un
  aiguillon à la Cellule, des griffes à la Créature, une hache à la Meute, une épée à la Cité, une
  lame d'énergie chez les Galactiques. Chaque nouveau palier devient une récompense visible de
  métamorphose.
- **`app/render/creature.js`** — trois manques comblés : diversité (chaque archétype a des traits
  propres à TOUS les stades, plus seulement au bipède), équipement visible dès le stade 1, et une
  animation d'attaque en trois temps (anticipation / frappe / récupération) calée sur l'intervalle
  d'attaque réel de l'unité via `opts.atk`, au lieu d'un balancement sinusoïdal continu. Ajout des
  poses de mort et du regard qui vise. La bête du stade 3 a un cou et des pattes épaisses : elle
  lisait comme une chenille.
- **`app/render/buildings.js` (nouveau)** — douze monuments distincts au lieu de deux dessins,
  pilotés par la clé `shape` de `data/colony.json`. Variante aquatique sous cloche pour les stades
  1-2, fondations et étais pendant un chantier.
- **Tourelles** — `data/battle.json > turrets.layout` les répartit en arc autour du Bastion (deux
  de chaque côté, les plus éloignées plus écartées) au lieu de les aligner d'un seul côté. Trois
  silhouettes et trois gestes de tir : bras de baliste qui recule puis claque, pieux qui se
  referment, orbe qui émet une onde.

Vérifié au navigateur : bataille réelle en stade 5 avec quatre tourelles, zéro erreur console.
Planche de validation publiée avant mise en production.

## 07/09/2026 — Passe 2 : le système de tracé (`render/style.js`)

Retour d'Ali sur la première passe : « ça fait vraiment brouillon ». L'audit du code a donné
quatre causes mesurables, et aucune n'était une question de style :

| Mesuré dans l'ancien code | Corrigé par |
|---|---|
| **18 épaisseurs de trait** différentes sur une seule créature | `weights()` : trois épaisseurs — silhouette, structure, accent. Toute autre valeur est un bug de style. |
| **31 détails intérieurs** portant chacun un contour noir | `inner()` : un détail qui vit dans une silhouette déjà contournée ne s'entoure jamais d'encre. |
| **6 membres tracés en deux traits superposés** (encre puis couleur) | `capsule()` : un membre est une forme fermée fuselée, plus un trait. Supprime les jointures visibles à l'épaule et à la hanche. |
| aplats parfaitement plats, détails placés au hasard | `tones()` + `form()` : quatre valeurs par teinte, une seule direction de lumière (haut-gauche), ombrage en aplats francs — du volume sans un seul dégradé, ce que la charte exige. `golden()` remplace le placement aléatoire. |

`form()` est le cœur : on remplit la silhouette, on peint **dans son masque** trois aplats décalés
vers la lumière, puis on contourne **une seule fois**. Aucun trait ne peut donc baver. En dessous
de 26 px les bandes ne sont plus lisibles : on retombe sur un aplat simple (LOD).

Appliqué aux trois moteurs : `creature.js` (réécrit), `gear.js` (armes en formes fermées avec la
même lumière), `buildings.js` (les monuments reçoivent le même plan de lumière, par bandes
horizontales découpées dans la silhouette — un tracé canvas ne pouvant pas être rejoué, la
technique du décalage ne s'y applique pas).

Ajouté au passage, en réponse au diagnostic : **une tête par archétype** — casque pour le tank,
crête pour la brute, capuche pour le tireur, couronne de pétales pour le soigneur, bandeau pour
l'éclaireur. C'est le repère de lisibilité le moins cher du style, et il n'était pas utilisé.
Et **un geste par archétype** (`ARCH[].geste`) : la brute lève puis abat, l'éclaireur pique,
le tank pousse, le tireur recule à la détente, le soigneur lève son bâton.

Coût mesuré en bataille réelle (stade 5, quatre tourelles) : 29 → 27 images/seconde entre l'ancien
et le nouveau moteur, dans un conteneur sans GPU où les deux plafonnent pour la même raison. Le
surcoût réel du système est donc négligeable ; le chiffre absolu ne veut rien dire hors du
téléphone.
