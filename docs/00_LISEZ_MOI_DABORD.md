# Comment utiliser ce dossier — pack de connaissances du Project « EVOLVE »

Mis à jour le **04/09/2026** (pivot **Evolve 4.0 « Lignée »**, PWA). Une nouvelle session Cowork lit `01_INSTRUCTIONS_CLAUDE.md` en premier, puis `03_CARTE_DU_CODE.md`, `04_HISTORIQUE_ET_DECISIONS.md` et le GDD `evolve-4.0-game-design.md`.

Statut :
- **Version active** : Evolve 4.0, PWA vanilla JS. Dépôt cible `AliCla3166/EVOLVE_4.0` (créé, push initial en attente d'attachement à une session). Code de référence en attendant : `evolve4-source.zip` (conversation du 04/09) + archive sur la page Notion « 🧬 EVOLVE 4.0 — Lignée (PWA) — builds ».
- **Déploiement** : projet Vercel `evolve` (alias `evolve-alicla3166s-projects.vercel.app`), déploiement partiel + Vercel Authentication à désactiver.
- **Mémoire** : base Notion « 📖 Chronique des Jours » créée ; token d'intégration à créer par Ali.
- **Références figées** : `Evolve-3.0` (Godot, 19/08), `evolve2` (Next.js, https://evolve2-nine.vercel.app), `evolve-game` (v1).

| Fichier | Rôle |
|---|---|
| `01_INSTRUCTIONS_CLAUDE.md` | Manuel d'exploitation 4.0 : checklist, règles d'architecture, pièges (dont la limite de taille des déploiements Vercel par outil), façon de travailler avec Ali. |
| `03_CARTE_DU_CODE.md` | Ce que contient le code 4.0, fichier par fichier, et ce qui n'existe pas encore. |
| `04_HISTORIQUE_ET_DECISIONS.md` | v1 → v2 → 3.0 → 4.0, décisions verrouillées, chantiers ouverts par priorité. |
| `evolve-4.0-game-design.md` | Le GDD 4.0 — seule source de vérité de conception. |
| `evolve-3.0-game-design.md`, `EVOLVE3.0-charteG.html`, `age1-*`, `plan-refonte-*`, `02_ACCES_ET_IDENTIFIANTS.md` | Archives 3.0/v2 : valeurs calibrées, charte V1.0 (palette UI toujours utilisée), accès. `02_` reste valable pour GitHub/Vercel/Notion mais ses clés Godot/Firebase sont sans objet. |

Sources canoniques en cas de doute : le dépôt (quand il existera) gagne sur ce pack ; le GDD 4.0 gagne sur toute archive 3.0.
