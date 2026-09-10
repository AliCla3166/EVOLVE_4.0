# EVOLVE 0.9.0 — Mondes vivants et formations

Les décors, le peuplement et les déplacements sont intégrés au jeu. La palette, les menus et l’économie conservent leurs règles.

## Décors et peuplement

- 20 illustrations originales : un champ de bataille et une colonie pour chacun des 10 âges, de l’océan primordial au jardin cosmique.
- Fichiers de production dans `assets/backgrounds/`, WebP, environ 4,57 Mio au total. Chargement des décors à la demande, cache mémoire limité à quatre images.
- Direction « Reliques vivantes » : silice, coquilles, ossatures, calcaire et architectures célestes. Inspiration naturaliste et cosmique, cohérente avec les silhouettes déjà refaites.
- Images générées avec l’outil natif OpenAI image_gen. Les prompts et les chemins des originaux conservés sont consignés dans `background-prompts.json`. La conversion WebP n’ajoute aucune retouche artistique.
- La diagonale de bataille reste calculée par le jeu : départ à 17 % / 30 %, arrivée à 83 % / 72 %. Le décor est adapté sans recadrage qui déplacerait le terrain.
- Jusqu’à 144 habitations et 44 habitants animés. Quatre variantes de maisons par âge, dessinées et mises en cache séparément du fond.
- Le peuplement grandit avec les améliorations achevées et les Points de Stade gagnés pendant cet âge. Sa progression ne recule jamais lors d’une dépense.
- Chaque métamorphose recommence un peuplement de trois refuges. Les bâtiments économiques et les ressources restent acquis. Le Nouveau Cycle conserve ses règles de remise à zéro existantes.
- « Explorer » ouvre la carte en plein écran dans le jeu. Glisser pour se déplacer, molette/pincement et boutons pour zoomer, flèches au clavier, touche Début pour recentrer, Échap pour fermer. Les bâtiments ouvrent leur fiche ; les habitations indiquent leur quartier.

## Combat

- Positions latérales persistantes et cercles de séparation physiques, proportionnels à la taille des unités. Les rangs ne sont plus un simple décalage du dessin.
- Une supériorité numérique de combattants proches du front exerce une poussée graduelle. Des unités éloignées ne poussent pas à distance.
- Les tireurs suivent le combattant le plus avancé et se placent derrière lui lorsqu’il est engagé. Seuls, ils avancent ; menacés de trop près, ils reculent tant que la base le permet.
- Les soigneurs se tiennent derrière le front, avec une distance adaptée à leur portée de soins. Ils privilégient l’allié ayant la plus faible proportion de PV.
- Les projectiles suivent aussi le déplacement latéral de leur cible.
- « Retraite » est immédiatement disponible lorsqu’il reste des alliés. Recharge : 30 secondes. Pendant 10 secondes, les survivants et les renforts se regroupent près du Cœur, en formation. Le mouvement est accéléré, y compris pour les unités lentes. Aucun soin gratuit ni invulnérabilité ; le gel peut toujours immobiliser une unité. L’ordre Attaquer/Tenir précédent reprend ensuite.
- L’IA emploie les mêmes règles de séparation, de placement, de poussée et de retraite. Elle se replie si son groupe est blessé et suffisamment inférieur en nombre, loin de sa base ; même recharge de 30 secondes.
- Les réglages se trouvent dans `data/battle.json` → `tactics`. Ceux du peuplement et des décors sont dans `data/environments.json`.

## Vérification et aperçu

- `tools/worlds.html` : atelier indépendant de la sauvegarde, choix d’âge et de peuplement, exploration et simulation sans dégâts. Le bouton de contrôle vérifie les 20 images, les 40 variantes d’habitations, les emplacements déterministes, la migration et la diagonale sur trois formats : 85 vérifications.
- `tools/tactics-check.cjs` : tests de séparation, front nombreux, tireurs des deux camps, poussée, retraite, grands corps, IA et peuplement. Exécuter depuis le dossier du jeu : `Get-Content tools/tactics-check.cjs -Raw | node`.
- Version de sauvegarde 2 : migration conservant l’économie et initialisant le peuplement. Version du cache de l’application : 0.9.0.
- Les commandes tactiques et les images ont été vérifiées en navigateur local. Le pincement est implémenté, mais reste à valider sur un téléphone physique.

## Publier depuis PowerShell

La commande suivante ajoute les changements du dossier, crée le commit, puis pousse la branche `main`. Chaque étape dépend de la réussite de la précédente ; compatible avec Windows PowerShell 5.1.

```powershell
Set-Location -LiteralPath 'C:\Users\User\OneDrive\PERSO ALI\EVOLVE' -ErrorAction Stop; git add --all; if ($LASTEXITCODE -eq 0) { git commit -m "Ameliore les mondes, la colonie et les formations de combat"; if ($LASTEXITCODE -eq 0) { git push origin main } }
```

Aucun push n’a été effectué automatiquement.
