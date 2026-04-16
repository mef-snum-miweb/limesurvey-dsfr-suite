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
CONTAINER="limesurvey-dev-db"
DB_USER="limesurvey"
DB_PASS="limesurvey"
DB_NAME="limesurvey"
LS_URL="http://localhost:8081"

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
echo "Chargement de $DUMP_FILE..."
sed 's/^INSERT INTO/REPLACE INTO/' "$DUMP_FILE" \
  | docker exec -i "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" --force "$DB_NAME" 2>/dev/null

# --- Vérification ---
count=$(docker exec "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -sNe "SELECT COUNT(*) FROM lime_surveys;" 2>/dev/null)
echo "Seed terminé : $count questionnaire(s) chargé(s)."
