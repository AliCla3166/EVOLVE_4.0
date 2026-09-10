# EVOLVE 0.11.0 — Combats plus tranchants et vétérans

Les unités des deux camps subissent 65 % de dégâts supplémentaires. À dégâts constants, une recrue perd donc ses PV environ 39 % plus vite. Cela concerne aussi les tourelles et les dégâts périodiques ; les PV des bases ne sont pas affectés par ce multiplicateur.

Chaque individu gagne des grades temporaires toutes les trois éliminations personnelles (3, 6 et 9 kills), pour les deux camps. Le temps de survie seul ne donne aucun grade. Les grades repartent à zéro pour une nouvelle unité et ne sont pas sauvegardés entre les batailles. Une promotion ne soigne pas et n’augmente pas les PV maximum.

| Grade | Kills | Dégâts | Cadence | Réduction des dégâts reçus | Taille |
|---|---:|---:|---:|---:|---:|
| Vétéran | 3 | +15 % | +12 % | 8 % | +8 % |
| Élite | 6 | +30 % | +24 % | 15 % | +16 % |
| Champion | 9 | +50 % | +40 % | 22 % | +24 % |

Ces bonus sont des totaux par grade, non des multiplicateurs successifs. La cadence augmente en réduisant l’intervalle entre attaques. La résistance s’applique après l’augmentation générale des dégâts. Le grossissement agrandit également le disque de séparation physique. Un anneau et un à trois chevrons bronze, argent ou or indiquent le grade autour de l’unité ; son nom apparaît à la promotion.

Les trois tourelles disposent maintenant de sprites peints originaux, en os sculpté, basalte et noyau ambré : baliste, piège à mâchoires et autel de soin. Leurs animations de tir emploient recul, lumière et onde. La même planche est utilisée aux dix âges. Elle est stockée dans `assets/miniatures/turrets.webp`, avec les découpes dans `data/miniatures.json` et le prompt source dans `docs/turret-generation.json`. Le menu affiche aussi l’aperçu peint des tourelles construites.

Portées : baliste **220 → 440**, piège **60 → 150**, autel **150 → 360**. Les portées conservent la mesure longitudinale du moteur existant. Les coûts restent inchangés.

Vérification : `Get-Content tools/veterans-check.cjs -Raw | node` contrôle les seuils, les bonus, l’absence de soin, le plafond, les morts, la symétrie et les nouvelles portées. `tools/veterans.html` montre les quatre grades et les trois tourelles indépendamment de la sauvegarde. Le nouvel équilibrage raccourcit le temps nécessaire pour tuer les unités ; la durée totale d’une bataille dépend toujours des compositions et des soins.
