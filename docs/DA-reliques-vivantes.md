# EVOLVE — Reliques vivantes

Livraison locale du 8 septembre 2026, version 0.8.0.

## Intention

Une espèce transforme progressivement ses organes en architecture. Son noyau fendu devient œil, porte, instrument puis foyer cosmique. La direction s'appuie sur les centres d'intérêt et références décrits dans les dossiers de passation, sans reprendre leurs instructions comme une nouvelle commande ni leurs listes de chantiers comme une autorisation de les réaliser.

- **We Are Warriors / Grow Castle** : masses compactes et lecture immédiate du rôle.
- **Spore / naturalisme** : continuité du corps, variations déterministes, mutations visibles.
- **Dune / Warhammer** : matériaux minéraux, contreforts, masques et monuments ; aucun emblème ni personnage de ces univers.
- **No Man's Sky** : rupture d'échelle dans les stades cosmiques, suspension et abandon des appuis.
- **Worldbox / Travian** : une colonie dont chaque bâtiment se reconnaît par sa fonction.
- **Balatro** : portraits lisibles dans les cartes, sans modifier les éditions et les règles de collection.

## Grammaire des assets

Silhouette fermée et contour extérieur unique. Une face éclairée, une face sombre, un foyer de détail autour du noyau. Grandes surfaces calmes ; motifs secondaires supprimés en dessous de 50 px. La charte UI, les typographies, les fonds, les couleurs des ressources et les composants existants sont conservés.

La membrane devient carapace puis masque. La vacuole devient bassin, silo et four. Une arche ouverte signale le soin ; une masse large et un bouclier signalent la protection. Le Cœur reprend exactement le même motif dans la Colonie et la Bataille.

Les bâtiments aquatiques ont leur propre silhouette, avec une matière plus translucide suggérée par la couleur et quelques bulles. Ils ne sont plus réduits puis enfermés sous une cloche identique. Au sol, des bagues apparaissent aux niveaux 3 et 6 ; les chiffres continuent d'indiquer le niveau exact.

Les dix stades ont un traitement distinct : cellule carénée, colonie lobée, quadrupède, bipède outillé, manteau de la Cité, armure planétaire, carène flottante, satellites galactiques, corps fuselé de Transcendance, ailes minérales de Divinité.

## Ce qui est intégré

- Créatures et équipement redessinés dans le rendu partagé : Espèce, Colonie, Bataille et portraits des Cartes.
- Douze bâtiments, Cœur et trois tourelles redessinés.
- Pictogrammes principaux redessinés ; trait et détails harmonisés sur le catalogue complet.
- Correction de la recherche d'emojis : la RegExp globale conservait son index et sautait certains nœuds voisins.
- Libellés accessibles des boutons d'humeur, auparavant muets après conversion en SVG.
- Aperçu du bâtiment dans la fenêtre de construction / amélioration.
- Portraits cadrés selon le rôle et la hauteur pour éviter de couper coiffes et armes.
- Version affichée et cache alignés sur 0.8.0.

Aucun changement de sauvegarde, de récompense, d'économie, de données de vie ou de synchronisation Notion. Aucun déploiement effectué.

## Consulter et entretenir

Ouvrir `tools/assets.html` depuis le serveur local du jeu (port 8765). L'atelier permet de changer stade, mutation, individu et animation ; une exportation PNG rassemble les dix stades et les bâtiments. Il ne charge pas l'état du joueur.

- `app/render/relic.js` : primitives et cache des tracés.
- `app/render/creature.js` : corps, équipement et mutations.
- `app/render/buildings.js` : bâtiments et tourelles.
- `app/core/relic-icons.js` : dessins des nouveaux pictogrammes.
- `tools/assets-preview.js` : planche interactive et vérifications du rendu.
- `tools/mobile.html` : le jeu dans un écran de 390 × 844 px, utilisant la sauvegarde locale de cette origine.

L'atelier vérifie 657 cas de rendu, l'isolation du contexte Canvas entre sprites, les 47 mutations comparées à leur corps d'origine et le remplacement d'emojis voisins ou ajoutés dynamiquement. Ces contrôles détectent les erreurs de dessin et d'intégration ; ils ne remplacent pas un avis artistique ni un essai sur un téléphone physique.

## Trois améliorations de jeu proposées

Ces idées sont des propositions, pas des mécanismes ajoutés à cette livraison.

1. **Voir son prochain choix de mutation sur le corps.** Trois portraits avant/après, avec l'organe concerné mis en évidence et une phrase reliant la mutation à l'habitude qui l'a nourrie. C'est le prolongement le plus direct de la promesse du jeu et de ce travail sur les assets.
2. **Une page de carnet hebdomadaire.** Le portrait de la lignée au début et à la fin de la semaine, un moment fort réel et une notule de Codex. Aucun objectif obligatoire ni récompense perdue : juste une trace que l'on a envie de conserver.
3. **Rendre le choix Colonie / Métamorphose visible avant la dépense.** Dans la fenêtre de construction, indiquer l'Élan restant après achat et ce qu'il manque pour le prochain stade. Une information utile pour décider, sans toucher aux gains ni aux coûts.

Une sauvegarde cloud de l'espèce mérite ensuite un chantier distinct, avec une stratégie de restauration explicite. Les réserves du dossier sur la priorité des Points de Stade et les textes de Nouveau Cycle méritent aussi une vérification séparée : cette refonte artistique ne change pas ces règles.
