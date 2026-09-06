#!/usr/bin/env bash
# Build Vercel. Le code de l'app vient du depot public GitHub (clone au moment du build),
# ce qui evite de faire transiter tous les fichiers dans l'appel de deploiement.
# Le dossier override/ (fourni directement dans le deploiement) est recopie PAR-DESSUS le clone :
# il sert a livrer des corrections avant qu'elles soient poussees sur GitHub.
# api/notion.js reste en dehors de public/ : une fonction serverless doit exister dans les sources.
set -euo pipefail

REPO="https://github.com/AliCla3166/EVOLVE_4.0.git"

rm -rf src public
git clone --depth 1 "$REPO" src

mkdir -p public
cp src/index.html src/style.css src/sw.js src/manifest.json public/
cp -R src/app public/app
cp -R src/data public/data
cp -R src/assets public/assets

# Corrections livrees avec le deploiement, appliquees par-dessus le depot.
if [ -d override ]; then
  echo "--- override applique ---"
  (cd override && find . -type f | sed 's|^\./||') | while read -r f; do
    mkdir -p "public/$(dirname "$f")"
    cp "override/$f" "public/$f"
    echo "  $f"
  done
fi

echo "--- contenu de public/ ---"
find public -type f | sort

# Verification : rien ne doit manquer a l'arrivee.
for f in index.html style.css sw.js manifest.json app/main.js app/render/creature.js \
         app/core/state.js app/core/economy.js app/core/config.js app/core/clock.js \
         app/core/events.js app/core/genome.js app/core/progress.js app/core/rng.js \
         app/core/sync.js app/core/ui.js \
         app/modes/ritual.js app/modes/species.js app/modes/colony.js app/modes/battle.js \
         app/modes/cards.js app/modes/observatory.js app/modes/settings.js app/modes/codex.js \
         data/habits.json data/stages.json data/mutations.json data/colony.json \
         data/battle.json data/cards.json data/codex.json \
         assets/icons/icon-192.png assets/icons/icon-512.png; do
  if [ ! -s "public/$f" ]; then echo "MANQUANT: $f" >&2; exit 1; fi
done
echo "OK : tous les fichiers attendus sont presents."
