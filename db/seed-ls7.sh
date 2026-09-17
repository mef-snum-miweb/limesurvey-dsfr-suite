#!/usr/bin/env bash
# =============================================================================
# Seed d'une instance LimeSurvey 7.x (branche limesurvey-7-0)
# =============================================================================
#
# Le dump db/init.sql est au schéma 6.x (DBVersion 648) : inutilisable en 7.x.
# Ce script part d'une instance 7.x vierge et :
#   1. enregistre le thème DSFR + active les plugins (db/Ls7setupCommand.php) ;
#   2. importe chaque .lss du répertoire fourni (sid conservé s'il est libre) ;
#   3. active les questionnaires listés dans ACTIVATE (défaut : 282267 527199).
#
# Usage :
#   ./db/seed-ls7.sh <répertoire-de-.lss> [conteneur]
#   ACTIVATE="282267 527199 189954" ./db/seed-ls7.sh ./exports
#
# Piège LS7 : `console.php importsurvey fichier.lss:<langue>` force la langue
# de base ET vide les langues additionnelles ; on passe `fichier.lss:` (langue
# vide) pour garder les langues du .lss.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LSS_DIR="${1:?usage: $0 <répertoire-de-.lss> [conteneur]}"
CONTAINER="${2:-limesurvey-dev}"
ACTIVATE="${ACTIVATE:-282267 527199}"
CONSOLE=(docker exec -u www-data -w /var/www/html "$CONTAINER" php application/commands/console.php)

for cmd in Ls7setupCommand ActivatesurveyCommand; do
  docker cp "$SCRIPT_DIR/$cmd.php" "$CONTAINER:/var/www/html/application/commands/$cmd.php"
done

echo "==> Thème + plugins DSFR"
"${CONSOLE[@]}" ls7setup

echo "==> Import des questionnaires ($LSS_DIR)"
docker exec "$CONTAINER" mkdir -p /tmp/seed-lss
for f in "$LSS_DIR"/*.lss; do
  b=$(basename "$f")
  docker cp "$f" "$CONTAINER:/tmp/seed-lss/$b"
  echo "  $b -> $("${CONSOLE[@]}" importsurvey "/tmp/seed-lss/$b:" 2>&1 | tail -1)"
done

echo "==> Activation : $ACTIVATE"
for sid in $ACTIVATE; do
  "${CONSOLE[@]}" activatesurvey "$sid" | tail -1
done

docker exec "$CONTAINER" sh -c 'rm -rf /var/www/html/tmp/runtime/* /var/www/html/tmp/assets/*'
echo "==> Seed LS7 terminé."
