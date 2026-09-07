# EVOLVE 4.0 — « Lignée » — Game Design Document

*Rédigé le 04/09/2026. Remplace le GDD 3.0 (17 ères historiques, Godot) comme document de vision. Décisions de pivot prises par Ali ce jour : fiction = race de créatures procédurale par stades d'évolution ; plateforme = PWA installable (HTML5/Canvas) puis APK ; le dépôt Godot `Evolve-3.0` devient une référence figée, au même titre que v1 et v2.*

---

## 1. Pitch

> **Prends soin de toi dans le monde réel, et regarde ta Lignée naître d'une cellule, conquérir les étoiles, devenir un dieu — et recréer l'univers.**

Une seule app, ouverte 3 à 6 fois par jour, qui remplace Mi Fitness + Yazio + les jeux mobiles récurrents (We Are Warriors, Grow Castle, Balatro, Worldbox, Vampire Survivors). Chaque geste réel nourrit une race de créatures **qui te ressemble** : ce que tu fais de ta journée sculpte littéralement son corps, ses instincts et son destin.

Ce que 4.0 garde du 3.0 : les trois couches (jeu / mémoire Notion / rétrospectives), le triple moteur étanche, le barème d'habitudes calibré, la doctrine « on baisse le prix, jamais on gonfle le gain », zéro FOMO, tout en JSON.
Ce que 4.0 change : la fiction (Lignée procédurale au lieu des ères humaines), la plateforme (PWA), et le **brief journalier entièrement configurable**.

## 2. La Lignée — le centre du jeu

### 2.1 Une race, pas un avatar
Tu ne joues pas une créature : tu joues une **espèce**. Elle a un génome (seed + traits), un stade d'évolution, un corps procédural rendu en vectoriel « sticker » (contour encre épais, aplats francs, à la We Are Warriors). Toutes les unités de bataille, tous les habitants de la Colonie, toutes les cartes sont des **individus de cette race** — variations du même génome. Quand la race mute, tout le jeu change de visage d'un coup.

### 2.2 Les 10 stades (le moteur vertical, financé par la vie réelle)
| # | Stade | Décor | Ce qui apparaît |
|---|---|---|---|
| 1 | 🦠 **Cellule** | Océan primordial, noir bleuté | Membrane, flagelles, cils ; nager, absorber |
| 2 | 🫧 **Colonie** | Récif, lumière filtrée | Plusieurs cellules soudées ; premiers organes |
| 3 | 🐾 **Créature** | Rivage, fougères | Membres, yeux, bouche ; chasser, fuir |
| 4 | 🔥 **Meute** | Savane, feu de camp | Outils, cris, hiérarchie ; la Colonie s'ouvre |
| 5 | 🏘️ **Cité** | Murs, marchés | Métiers, monnaie, murailles ; Bastion complet |
| 6 | 🌍 **Planétaire** | Mégalopoles, satellites | Industrie, science ; les Pouvoirs |
| 7 | 🚀 **Stellaire** | Vaisseaux, orbites | Colonies extra-planétaires ; factions xénos |
| 8 | 🌌 **Galactique** | Nébuleuses, sphères de Dyson | Empires-étoiles, entités énergétiques |
| 9 | 🔮 **Transcendance** | Espace abstrait, fractales | La race quitte la matière |
| 10 | ✨ **Divinité** | Blanc doré, seule scène émissive | Elle crée l'univers suivant → **Nouveau Cycle** |

**Rythme cible : 1 à 3 mois par stade** (bande v2 : 81–99 jours au stade 1 avec assiduité normale). Une Lignée complète = 2 à 3 ans. C'est un jeu-compagnon de vie.

Les 17 ères historiques du GDD 3.0 ne disparaissent pas : elles deviennent des **skins d'époque** optionnels (packs `content/skins/`) applicables aux stades 4-8.

### 2.3 Le Nouveau Cycle (prestige)
Atteindre la Divinité relance l'univers. La race précédente devient le **Panthéon** : ses traits dominants deviennent des **bénédictions permanentes** (+% production, +1 slot de deck, mutation de départ…). La nouvelle Lignée repart à la Cellule avec ces bénédictions et un décor légèrement altéré par son dieu. Chaque cycle achevé s'inscrit au Codex comme mythe fondateur du suivant. C'est la couche incrémentale « prestige » — et la promesse que le jeu n'a pas de fin.

### 2.4 Le génome : tes habitudes sculptent la créature
Le génome a **6 axes**, chacun nourri par une famille d'habitudes réelles (mapping dans `data/habits.json`, modifiable) :

| Axe | Nourri par | Effet visuel | Effet de jeu |
|---|---|---|---|
| 💪 **Vigueur** | Pas, sport, chantier | Membres plus longs, posture | Vitesse, esquive des unités |
| 🍖 **Robustesse** | Nutrition (déficit/équilibre), sommeil | Corps massif, carapace | PV, régénération |
| 🧠 **Esprit** | Méditation, lecture, yoga | Crâne, yeux, halo | Pouvoirs, chances de mutation rare |
| 🔧 **Ingéniosité** | Travail (Magic Focus), apprentissage | Outils, appendices | Production de la Colonie, tourelles |
| 🤝 **Lien** | Devis, contacts, moments forts, commentaire | Motifs, couleurs vives | Taille de main, tirage, XP partagé |
| 🌑 **Ombre** | Malus (surplus calorique, jour manqué) | Épines, teinte sombre | Dégâts bruts mais fragilité (jamais purement punitif : l'Ombre est un style de jeu) |

Chaque jour validé verse des **points d'axe** ; à chaque seuil, une **Mutation** est proposée (choix entre 3, façon draft) : c'est là que la race devient *la tienne*. Tout est visible sur l'écran **Espèce**, avec l'arbre phylogénétique de tes choix.

## 3. Les 5 modes (chaque mode nourrit un autre)

```
   Rituel (vie réelle) ──⚡ Élan──▶ Espèce (mutations, stades)
        │                              │ génome → stats de toutes les unités
        ▼                              ▼
   Colonie (idle/gestion) ──🍖 Biomasse──▶ Bataille (lane TD / WAW)
        ▲                              │ 🧬 Gènes, cartes, Points de Stade (Défense seulement)
        └────── bâtiments débloqués ◀──┘
                     ▲
              Cartes (deck, Instincts, éditions) ◀── Gènes
```

### 3.1 Le Rituel — le brief journalier (2 min, la porte d'entrée)
- Écran d'accueil du jour. Liste de saisie **définie dans `data/habits.json`** : chaque ligne a un type (`toggle`, `counter`, `number`, `duration`, `scale`, `text`, `multi`), un barème, un plafond, un pilier, un axe de génome. **Modifier le brief = éditer ce fichier** (ou l'éditeur intégré dans Réglages, qui édite le même JSON).
- Barème v2 conservé tel quel (journée parfaite 166 ⚡, plafond 293 ⚡) + commentaire du jour (+8) + moment fort (+4) + humeur (+2). Piliers : Nutrition · Mouvement · Travail · Soin ; le business compte dans l'Élan, jamais dans la journée validée.
- Nouveau 4.0, pour remplacer Yazio/Mi Fitness : **repas** (petit-déj / déj / dîner / grignotage, kcal estimées et « qualité » 1-3), **hydratation**, **sommeil** (heures + qualité), **méditation** (minutes, type), **poids** (optionnel, courbe). Tout dans le même JSON.
- Deadline 5h ; fenêtre 7 jours glissants ; retard = payé, série non tenue ; Bouclier de série gagné en jeu.
- Récolte : l'Élan tombe dans l'Espèce, la créature s'anime, les points d'axe montent, éventuel draft de Mutation. Le « juice » quotidien.

### 3.2 L'Espèce — Spore
- Vue de la créature en grand, animée (respiration, regard, idle). Jauges des 6 axes, stade actuel, progression vers le stade suivant (Points de Stade).
- **Draft de mutation** : 3 cartes de mutation tirées (seed du jour), 1 choix. Chaque mutation = 1 objet JSON (`id`, `axe`, `partie` (membres/tête/dos/peau/aura), `stats`, `visuel`). Ajouter une mutation = ajouter un objet.
- **Métamorphose** au passage de stade : cinématique 10 s, le corps se recompose, nouveau décor, nouveau chapitre de Codex.
- **Arbre phylogénétique** : l'historique de tes mutations, daté — c'est ta vie réelle lue dans un corps.

### 3.3 La Colonie — incrémental / gestion (Travian × Worldbox)
- 12 emplacements autour du Cœur, bâtiments à timers (minutes → 48 h), 3 chantiers simultanés, cumul hors-ligne 8 h (12 h avec Bouclier). Ratios v2 : temps ×3,0 / production ×1,8 / coût ×2,1. Fondations sans dernier niveau.
- Skins par stade (nid → hutte → maison → tour → station → sphère), mêmes sockets.
- Ambiance Worldbox : des individus de ta race vaquent sur la carte (rendu procédural), réagissent aux événements (fête après une journée parfaite, tempête après 3 jours manqués — visuel seulement, jamais punitif économiquement).
- Produit **Biomasse** (ration de bataille) et **Matériaux** (tourelles, murailles), débloque des recherches.

### 3.4 La Bataille — lane TD façon We Are Warriors
- Couloir horizontal, ta base à gauche, l'ennemie à droite, unités qui marchent et se tapent, ration qui monte, invocation par cartes. Trois terrains : **Campagne** (base contre base, ~40 niveaux/stade, rotation de faction tous les 10), **Défense** (vagues contre ta base — source de Points de Stade **complémentaire du Rituel**, plafonnée/jour, difficulté bornée par le stade — voir amendement du 07/09/2026), **Raid** (attaque pure, butin, 100 % horizontal).
- Couche fixe : 4 slots de tourelles/murailles/pièges achetés avec les Matériaux de la Colonie.
- Ordres par unité (tenir / attaquer), ciblage (proche / faible / fort / une fois par ennemi). Boss toutes les 5 vagues. Auto-résolution honorable si tu n'es pas là.
- Ennemis : factions procédurales elles aussi (autres lignées de l'univers) — même moteur de rendu, autre génome.
- Ultis (Pouvoirs) chargés par l'Élan : météores, gel temporel, nova, soin.

### 3.5 Les Cartes — deck-building (Balatro)
- Une carte = un individu (variante de ta race) ou un **Instinct** (passif de synergie façon joker : « +30 % dégâts si 3 unités à épines », « la première carte jouée coûte 0 »). Raretés 4 niveaux, **éditions orthogonales** (chromée/holo/polychrome/négative, désir pas rendement), **verrou des doublons** (utilisable à la 2e prise), pity légendaire.
- Deck de 8, main de 3 (montent en horizontal). XP de combat par carte (kills) → attaque spéciale, passif, actif.
- Gagnées avec les 🧬 Gènes (butin de bataille, contrats) — jamais avec l'Élan.

### 3.6 Extensions prévues (packs, pas MVP)
**Expédition** (run auto-battler 3 min façon Vampire Survivors : ta créature seule, vagues, drafts de mutations temporaires — records + fragments plafonnés), **Pêche génétique** (mini-jeu d'adresse qui remonte des séquences), **Worldbox avancé** (catastrophes, dieux rivaux), skins d'époque (les 17 ères).

## 4. Triple moteur — inchangé, réaffirmé
1. **Vertical** (sacré, plafonné) : Élan, points d'axe, Points de Stade, stades, Cycles. Financé par la vie réelle. Le **Rituel** en est la source principale (6 Points de Stade pour une journée parfaite, 3 pour une journée validée) ; la **Défense** complète jusqu'au plafond quotidien. *(Amendé le 07/09/2026 — voir §11.)*
2. **Campagne** (compétence) : niveaux, factions, cartes, XP.
3. **Horizontal** (illimité) : Raid, collection, éditions, Codex, records, cosmétiques.
Aucun temps d'écran n'achète un stade. Aucune vie réelle n'achète un niveau de Campagne.

## 5. Monnaies
⚡ **Élan** (vie réelle, plafonné/jour) · 🧬 **Gènes** (bataille/contrats → cartes, mutations horizontales) · 🍖 **Biomasse** (Colonie → ration, invocations) · 🧱 **Matériaux** (Colonie → tourelles) · 💎 **Rubis** (rare, jamais achetés : jalons, séries) · ✨ **Essence** (Nouveau Cycle uniquement).

## 6. Mémoire et stats (objectif n°1)
- **Chronique des Jours** (base Notion dédiée) : 1 enregistrement/jour, écrit par l'app via une fonction serveur (token hors app). Colonnes fixes (date, Élan, série, piliers, humeur, commentaire, moment fort, sommeil, pas, kcal, repas, méditation, poids…) + colonne `Détails` JSON pour tout champ ajouté au brief — **un nouveau champ dans `habits.json` apparaît automatiquement dans Notion** (la fonction crée la propriété si absente).
- Cache local + file d'attente hors-ligne ; l'app marche sans réseau et pousse quand elle peut.
- **Observatoire** in-app : heatmap de série, courbes 7/30/365 par champ, fréquence des activités, corrélations en phrases, records.
- **Rétrospectives** : tâche planifiée mensuelle (session Claude) lit la Chronique → page « 📖 Chronique de [Mois] » ; annuelle le 1er janvier ; Stèle dans la Colonie pour chaque chronique.

## 7. Direction artistique — « sticker vivant »
Référence explicite : We Are Warriors. Règles :
- **Contour encre `#171B23` épais partout** (3px UI, 6-8px sur les créatures à l'échelle), aplats francs, ombre plate décalée, **zéro dégradé complexe** ; un highlight blanc simple sur les rondeurs.
- **Chunky 3D** : boutons avec socle 5px plus sombre, enfoncement au clic ; panneaux ardoise bord encre radius 16 ; barres pilules.
- **Corps « bean »**, têtes rondes, yeux énormes ; une animation par archétype (marche à rebond, attaque à pivot d'arme, mort en pop) ; la créature procédurale garde une silhouette lisible à 64 px.
- Palette UI : Encre `#171B23` · Nuit `#20262F` · Ardoise `#2C3440` · Ardoise claire `#3E4A5C` · Craie `#F4F1E8` · Vert Élan `#45D95E` (réservé à la vie réelle) · Or `#FFC24B` · Rouge `#EF5D50` · Bleu `#4EA8E8` · Violet `#A76BD9`. Une seule couleur vive dominante par écran.
- Palette monde par stade (teinte/ombre) définie dans `data/stages.json`.
- Typo : **Lilita One** (titres, chiffres, boutons) + **Nunito 700-900** (corps). Jamais sous 12 px.
- Feedback : bulles de points qui filent vers le compteur, chiffres flottants, secousse d'écran légère, particules d'aplats.
- Son : pops, cloches, montées harmoniques ; nappe par stade (extension).

## 8. Architecture (PWA)
```
evolve4/
  index.html            # coquille, nav 5 onglets
  app/                  # ES modules, aucun build
    core/   state.js (sauvegarde versionnée + migrations), rng.js (PRNG seedé),
            config.js (charge data/*.json), clock.js (jour à 5h), sync.js (file Notion)
    modes/  ritual.js, species.js, colony.js, battle.js, cards.js, observatory.js, settings.js
    render/ creature.js (rendu procédural), ui.js (composants chunky), fx.js
  data/                 # TOUT l'équilibrage, chaque fichier commenté
    habits.json stages.json mutations.json colony.json battle.json cards.json codex.json
  content/              # packs découverts au lancement (skins, factions, codex)
  api/notion.js         # fonction serverless Vercel (token en variable d'env)
  manifest.json sw.js   # PWA
  tools/simulate.py     # simulateur d'équilibrage (porté de v2)
```
Règles non négociables reprises de 3.0 : moteur ignorant du contenu, zéro nombre en dur, sauvegarde versionnée dès le premier commit, PRNG seedé sauf combat temps réel, aperçu de vague déterministe, token jamais dans le dépôt, pas de FOMO, prix baissés plutôt que gains gonflés.

## 9. Roadmap
- **Phase 0 (cette session)** : socle + Rituel configurable + Espèce (stade 1-3 visibles) + Colonie stade 1 + Bataille Défense/Campagne + Cartes + Observatoire + Notion + déploiement. Jouable sur téléphone.
- **Phase 1** : APK Capacitor + Health Connect (pas, sommeil automatiques), notifications de brief.
- **Phase 2** : Expédition (survivors), Raid complet, Pouvoirs, Codex 30 entrées/stade, son.
- **Phase 3** : Nouveau Cycle, stades 7-10, skins d'époque, rétrospectives automatisées.
Critère de passage : « j'ai envie de l'ouvrir demain », pas « ça marche ».

## 10. Décisions tranchées le 04/09/2026
Fiction = Lignée procédurale en 10 stades + Nouveau Cycle · Plateforme = PWA puis APK · Godot 3.0 figé en référence · brief journalier = `habits.json` (éditable in-app) · le génome à 6 axes est le pont vie réelle → visuel · Défense = seule source de Points de Stade *(révoqué le 07/09/2026, voir §11)* · le nom reste **EVOLVE**.

---

## 11. Amendement du 07/09/2026 — après diagnostic du code livré

Six correctifs appliqués au dépôt à la suite d'un diagnostic complet du build. Ils ne changent ni la fiction, ni la DA, ni l'architecture ; ils corrigent des chiffres et deux règles qui empêchaient le jeu de tenir sa propre promesse.

1. **La Défense ne se verrouille plus.** Le constat : `defenseWave` montait de +6 par jour sans jamais redescendre, contre des PV ennemis en 1,08^vague — la Défense devenait injouable entre le 8ᵉ et le 15ᵉ jour, et comme elle était le seul pont vers les Points de Stade, le moteur vertical s'arrêtait définitivement. Correctifs : **plafond de vague lié au stade** (`wave_cap_base` 12 + `wave_cap_per_stage` 8 par stade), croissance ramenée à 1,035 PV / 1,025 dégâts, nombre d'ennemis borné à 16 par vague, et **recul de 3 vagues en cas de défaite** — le mode trouve tout seul le niveau réel du joueur. La difficulté ne monte plus avec le calendrier, elle monte avec la Lignée.
2. **Le Rituel finance le moteur vertical.** Journée parfaite = 6 Points de Stade, journée validée (≥ 2 piliers) = 3, dans la limite du plafond quotidien de 12. La Défense complète le reste. Le pitch — « prends soin de toi et regarde ta Lignée évoluer » — redevient littéralement vrai : on peut progresser sans jamais ouvrir la Bataille, deux fois plus vite en y jouant. Idempotent, et une journée saisie en retard compte aussi.
3. **La biomasse n'est plus brûlée pour rien.** L'ancienne conversion prenait jusqu'à 100 🍖 pour +2 rations (1,25 seconde de régénération) : toute la production de la Colonie s'évaporait, sans le moindre affichage. Désormais : prélèvement plafonné à 30 🍖, +0,4 ration par 🍖 (soit +12 rations, plus d'une demi-invocation), annoncé dans le menu de Bataille et par un toast au lancement.
4. **Rythme des stades recalibré.** L'ancien barème demandait 8 500 Points de Stade et 124 800 ⚡ — 708 jours au plafond absolu, 175 jours rien que pour le dernier stade. Nouveau calibrage sur une hypothèse **réaliste** (8 Points de Stade et 95 ⚡ nets par jour, une fois la Colonie servie) : première métamorphose à ~14 jours, puis 28 → 76 jours par stade, ~15 mois pour une Lignée complète (~10 mois en jeu parfait).
5. **Le filet de série se recharge.** +1 Bouclier tous les 14 jours de série, plafond 3. Une absence est absorbée **entièrement** si l'on a assez de boucliers ; sinon aucun n'est dépensé — brûler un bouclier pour une série qui casse de toute façon était une double peine. Et le cumul hors-ligne de la Colonie ne dépend plus des boucliers (12 h en base) : protéger sa série ne doit pas punir sa Colonie.
6. **Le Bac à sable est masqué.** Sur un jeu dont tout l'intérêt est que les chiffres soient mérités, le panneau de triche ne doit pas être à portée de pouce. Activation : `?dev=1` dans l'URL, ou cinq tapes sur la ligne de build dans Réglages → À propos.

Restent ouverts, non traités ici : notification quotidienne (le déclencheur manque toujours), écran de retour après absence, Ombre rendue lisible, Codex qui cite le moment fort, réduction du Rituel à 6-8 champs, `tools/simulate.py`.
