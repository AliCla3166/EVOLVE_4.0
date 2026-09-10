# EVOLVE 0.10.0 — Escouades et miniatures peintes

Une carte déploie désormais plusieurs individus. Les combats gardent leur chemin diagonal et leurs commandes, avec davantage de présence à l’écran et des décisions prises par chaque combattant.

## Direction artistique : les Reliques vivantes

La peinture des décors se prolonge dans les unités et les bâtiments : silhouettes sculptées, lumière chaude, noyaux ambrés, matières de silice, d’os, de pierre et de céramique. La palette, la typographie et les cadres de l’interface restent ceux du jeu. Les silhouettes peintes possèdent leurs propres contours sombres ; les cartes les présentent sur les fonds existants.

Les dix âges ont chacun six créatures (cinq rôles et un boss), treize bâtiments et trois habitations : **220 sprites dans 20 planches RGBA**, soit environ **9,38 Mio de WebP**. Les teintes ennemies et les repères au sol distinguent les camps. Les barres de santé apparaissent sur les blessés et les boss pour laisser les silhouettes intactes visibles.

Les matières évoluent du radiolaire nacré aux polypes coralliens, aux carapaces terrestres, au basalte tribal, au calcaire des cités, puis aux céramiques planétaires, aux constructions orbitales, à l’obsidienne astrale, aux voiles spirituels et à l’or cosmique. Cette progression prolonge la DA des décors ; Warpips inspire le rythme des groupes et WorldBox l’observation de la colonie, sans reprendre leurs assets.

## Règles intégrées

| Carte | Effectif initial | Au niveau 9 |
|---|---:|---:|
| Éclaireur | 5 | 8 |
| Brute | 4 | 7 |
| Tireur | 4 | 7 |
| Tank | 2 | 5 |
| Soigneur | 2 | 5 |

- Les niveaux **3, 6 et 9** ajoutent chacun un membre, en plus des bonus de statistiques existants. Le coût affiché achète l’escouade entière. Il faut assez de places pour la poser ; une tentative refusée ne consomme ni carte ni ration.
- Capacité de **24 par camp au premier âge**, puis +4 par âge, jusqu’à **60 par camp**. Les ennemis déploient aussi des escouades, avec des renforts progressifs selon le niveau de campagne ou la vague.
- Chaque individu conserve ses PV, sa cible, ses attaques et sa mort. Les cibles sont réparties pour éviter que tout le groupe vise le même adversaire. Un combattant déjà au contact peut frapper un autre adversaire accessible.
- Une cohésion souple rapproche les retardataires. Au contact, le groupe s’ouvre suivant les positions des cibles. Les disques physiques réservent de l’espace ; une pression numérique locale fait reculer le front inférieur en nombre.
- Mouvement de base ×1,65 ; intervalles d’attaque ×0,85. Les attaques d’une même escouade sont décalées pour éviter les salves parfaitement synchronisées.
- Les tireurs restent derrière le premier allié, reculent si la menace est trop proche et avancent lorsqu’ils sont seuls. Les soigneurs restent à portée de leurs alliés blessés. Le même moteur décide pour les deux camps.
- Les tirs décrivent une cloche vers le point visé au départ. Une cible qui s’en écarte suffisamment peut les esquiver, notamment pendant la retraite.
- Retraite : **30 secondes de recharge**, **10 secondes de regroupement**, sans invulnérabilité. Le point de rassemblement s’étend en plusieurs rangs pour accueillir 60 survivants.
- Ration initiale 32, production 2,6/s, réserve 180 ; bases renforcées et statistiques individuelles réduites selon le rôle pour absorber le passage aux groupes.

Les bâtiments peints remplacent les anciens dessins sur la carte et dans les fiches. Le peuplement reste progressif, jusqu’à 144 habitations et 44 habitants ; chaque âge recommence à trois refuges, sans supprimer les acquis économiques. L’exploration en plein écran conserve déplacement, zoom et sélection.

## Périmètre et réglages

Cette version constitue un premier équilibrage jouable. La difficulté de toutes les combinaisons de génome, de cartes et de niveaux nécessite des parties prolongées. Les animations des nouvelles images utilisent translation, oscillation, rotation et effets ; ce ne sont pas des cycles dessinés image par image. Le laboratoire d’espèce conserve son rendu procédural détaillé des mutations ; les miniatures de bataille partagent un corps peint par rôle et âge, avec teintes et effets complémentaires.

Les effectifs, vitesses, statistiques, distances et trajectoires se règlent dans `data/battle.json`. Les coordonnées des sprites sont dans `data/miniatures.json`. Les planches se chargent à la demande et le cache mémoire en conserve six au maximum. Le dessin procédural sert de secours pendant le chargement ou en cas d’image indisponible.

## Production et vérification

Images créées avec l’outil natif image_gen. Les originaux sont conservés dans le dossier de génération local ; `miniature-sources.json` et `miniature-generation/*.json` en donnent les références. Les trois derniers fichiers contiennent aussi leur prompt exact. Les autres prompts suivaient le même brief : atlas transparent, vue trois quarts, peinture naturaliste de stratégie, contours nets, ordre fixe des rôles ou bâtiments, matières et palette propres à l’âge, sans texte ni décor de fond.

`tools/import-miniatures.py` encode les originaux en WebP sans modifier la peinture ni son alpha, puis calcule les rectangles de lecture. Les originaux locaux ne sont pas requis pour jouer ou déployer : tous les fichiers utilisés par le jeu sont dans `assets/miniatures/`.

- `tools/miniatures.html` : galerie des dix âges ; contrôle du chargement et des 220 rectangles.
- `tools/worlds.html` : colonie et démonstration de placement indépendante de la sauvegarde, bouton « 120 combattants » ; 85 contrôles des mondes.
- `Get-Content tools/tactics-check.cjs -Raw | node` : séparation, poussée, soutien, retraite symétrique et peuplement.
- `Get-Content tools/squads-check.cjs -Raw | node` : effectifs, attaques décalées, cibles indépendantes, trajectoire et simulation de 120 combattants.

Vérification locale : une campagne terminée avec des escouades de mêlée et de tireurs, sans erreur de console. Les simulations de charge contrôlent le placement et la retraite ; elles ne constituent pas un benchmark sur téléphone physique.
