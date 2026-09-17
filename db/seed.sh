#!/usr/bin/env bash
# =============================================================================
# Charge les données de test (questionnaire RGAA) dans la DB LimeSurvey.
#
# LimeSurvey initialise son propre schéma au premier démarrage. Ce script
# attend que l'init soit terminée, puis injecte les données par-dessus
# avec REPLACE INTO pour éviter les conflits de clés.
#
# Usage :
#   ./db/seed.sh            # attend et charge
#   ./db/seed.sh --force    # recharge même si déjà seedé
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DUMP_FILE="$SCRIPT_DIR/init.sql"
# Gate double 6.x / 7.x (ADR-129) : jamais de nom de conteneur ni de port en dur.
CONTAINER="${LS_PREFIX:-limesurvey-dev}-db"
DB_USER="limesurvey"
DB_PASS="limesurvey"
DB_NAME="limesurvey"
LS_URL="${LS_BASE_URL:-http://localhost:${LS_PORT:-8081}}"

# Version de schéma portée par le dump (db/init.sql).
DUMP_DBVERSION=648

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Erreur : $DUMP_FILE introuvable." >&2
  exit 1
fi

# --- Attendre que LimeSurvey soit prêt (max 120s) ---
echo "En attente de LimeSurvey ($LS_URL)..."
elapsed=0
until curl -sf "$LS_URL" > /dev/null 2>&1; do
  sleep 2
  elapsed=$((elapsed + 2))
  if [[ $elapsed -ge 120 ]]; then
    echo "Erreur : LimeSurvey n'a pas répondu après ${elapsed}s." >&2
    exit 1
  fi
done
echo "LimeSurvey prêt (${elapsed}s)."

# --- Vérifier si déjà seedé ---
if [[ "${1:-}" != "--force" ]]; then
  count=$(docker exec "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    -sNe "SELECT COUNT(*) FROM lime_surveys;" 2>/dev/null || echo 0)
  if [[ "$count" -gt 0 ]]; then
    echo "Base déjà seedée ($count questionnaire(s)). Utilisez --force pour recharger."
    exit 0
  fi
fi

# --- Charger les données ---
# Garde-fou (suite#31) : ce dump est au schéma 6.x. Le rejouer sur une base
# déjà migrée en 7.x recrée les tables au format 6.x — l'app tombe alors en
# « Unknown column 't.showregisterpolicy' » et tous les tests suivants sont faux.
CURRENT_DBVERSION=$(docker exec "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -sNe "SELECT stg_value FROM lime_settings_global WHERE stg_name='DBVersion';" 2>/dev/null || echo "")
if [[ -n "$CURRENT_DBVERSION" && "$CURRENT_DBVERSION" -gt "$DUMP_DBVERSION" ]]; then
  echo "Erreur : la base cible est en DBVersion $CURRENT_DBVERSION, le dump en $DUMP_DBVERSION." >&2
  echo "        Rejouer ce dump corromprait le schéma. Pour une instance 7.x, utiliser db/seed-ls7.sh," >&2
  echo "        ou recréer la base à vide puis laisser le core migrer (cf. TESTING.md)." >&2
  exit 3
fi

echo "Chargement de $DUMP_FILE..."
sed 's/^INSERT INTO/REPLACE INTO/' "$DUMP_FILE" \
  | docker exec -i "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" --force "$DB_NAME" 2>/dev/null

# --- Vérification ---
count=$(docker exec "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -sNe "SELECT COUNT(*) FROM lime_surveys;" 2>/dev/null)
echo "Seed terminé : $count questionnaire(s) chargé(s)."
