#!/usr/bin/env bash
# Régénère les exports du guide contributeur (HTML autonome, Word, PDF)
# depuis guide-contributeur.md + img/ + assets/guide.css.
#
# Usage : ./build.sh   (depuis n'importe où)
# Prérequis : pandoc, et Google Chrome (pour le PDF).
set -euo pipefail
cd "$(dirname "$0")"

SRC="guide-contributeur.md"
TMP="_build_tmp.md"
TITLE="Guide du contributeur — Thème DSFR pour LimeSurvey"

# 1) Retirer le sommaire manuel (pandoc en régénère un, avec liens)
python3 - "$SRC" "$TMP" <<'PY'
import re, sys
md = open(sys.argv[1], encoding='utf-8').read()
open(sys.argv[2], 'w', encoding='utf-8').write(
    re.sub(r'\n## Sommaire\b.*?\n---\n', '\n', md, count=1, flags=re.S)
)
PY

# 2) HTML autonome (CSS + images embarqués en data-URI)
pandoc "$TMP" -s --toc --toc-depth=3 --embed-resources \
  --metadata pagetitle="$TITLE" --metadata lang=fr \
  --include-before-body assets/header.html \
  -c assets/guide.css -o guide-contributeur.html

# 3) Word (sommaire natif, images intégrées)
pandoc "$TMP" --toc --toc-depth=3 -o guide-contributeur.docx

rm -f "$TMP"

# 4) PDF via Chrome headless (depuis le HTML autonome ; images = data-URI, aucun serveur requis)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "$CHROME" ]; then
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf-no-header \
    --print-to-pdf="$(pwd)/guide-contributeur.pdf" "file://$(pwd)/guide-contributeur.html" >/dev/null 2>&1
  echo "✔ PDF régénéré"
else
  echo "⚠ Chrome introuvable — PDF non régénéré (HTML/Word OK)"
fi

echo "✔ Exports à jour : guide-contributeur.{html,docx,pdf}"
