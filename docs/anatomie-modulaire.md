# EVOLVE 0.12.0 — Premier âge modulaire

Le pilote couvre entièrement **Cellule**, avec les sept mutations accessibles à cet âge. La vue Espèce assemble désormais neuf composants peints : corps, membrane renforcée, noyau ouvert, vacuole, cil, flagelle, épine, halo et noyau au repos. Les pièces partagent la lumière, la perspective et les matières des « Reliques vivantes ». Les appendices sont dessinés derrière la membrane pour cacher leurs attaches.

Les choix existants déterminent réellement l’image : cils vibratiles, flagelle, membrane épaisse, noyau double, vacuole dorée, phosphorescence et épines de membrane. Les 128 combinaisons ont été rendues et comparées dans l’atelier : 128 apparences distinctes, sans erreur de chargement. La respiration, les appendices et le noyau sont animés avec les mêmes pièces ; aucune génération d’image n’est nécessaire pendant le jeu.

Les cartes de mutation ouvrent une comparaison animée entre l’état actuel et le résultat attendu. « Comparer les autres » ferme sans mutation ; « Choisir cette mutation » applique le choix existant. Le portrait effectue un fondu de 850 ms entre les deux assemblages. Les valeurs statistiques, conditions de progression et sauvegardes restent celles du jeu.

Le décor de Cellule reprend le fond peint de sa colonie. Les âges 2 à 10 conservent leur portrait procédural évolutif ; ils bénéficient de la comparaison, mais leurs pièces anatomiques peintes ne font pas partie de ce pilote. Les unités de bataille gardent leurs silhouettes peintes par rôle : la déclinaison de leurs appendices selon le génome sera une étape distincte après validation des assemblages.

L’image source générée est référencée avec son prompt exact dans `anatomy-generation.json`. La planche de production est `assets/miniatures/anatomy-cell.webp`, ses rectangles dans `data/miniatures.json`, et le moteur d’assemblage dans `app/render/anatomy.js`. Le traitement après génération ne fait que convertir en WebP et définir les rectangles de lecture, sans retoucher la peinture.

Atelier indépendant de la sauvegarde : `tools/anatomy.html`. On peut y activer les sept traits, comparer le noyau double et constater les 128 rendus distincts. Le composant de comparaison est le même que dans Espèce. Le portrait intégré a également été vérifié dans le jeu.

Cette version corrige aussi les grades de combat : **3, 6 et 9 éliminations personnelles**, pour les deux camps. Attendre n’octroie plus de grade. Une élimination n’est comptée qu’une fois ; les tourelles et pouvoirs ne donnent pas de kill à une unité arbitraire. Les bonus de chaque grade restent inchangés. Les détails figurent dans `veterans-et-tourelles.md`.
