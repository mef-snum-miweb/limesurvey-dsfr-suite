#!/usr/bin/env bash
# =============================================================================
# LimeSurvey DSFR Suite — Script de déploiement
# =============================================================================
#
# Modes :
#   ./deploy.sh              # suite complète (base + override auto-chargé)
#   ./deploy.sh --vanilla    # instance vanilla (bypass de l'override)
# =============================================================================
set -euo pipefail

MODE="suite"
COMPOSE_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --vanilla)
      MODE="vanilla"
      # Bypass explicite de `docker-compose.override.yml` : on ne charge que
      # le fichier de base, sans les 4 bind-mounts DSFR.
      COMPOSE_ARGS=(-f docker-compose.yml)
      ;;
    *)
      echo "usage: $0 [--vanilla]" >&2; exit 2 ;;
  esac
done

echo "==> Mode : $MODE"

# --- Parade au piège spawn (vibelab-platform#79) -----------------------------
# `spawn up` exporte COMPOSE_FILE=docker-compose.yml:.spawn-override.yml, ce qui
# court-circuite le chargement AUTOMATIQUE de docker-compose.override.yml :
# l'instance repart alors en LimeSurvey vanilla, sans les 4 modules DSFR.
# On reconstruit donc explicitement la liste des fichiers, en conservant
# l'override de spawn (réseau mail, middlewares Traefik) quand il existe.
if [ "$MODE" = "suite" ]; then
  COMPOSE_FILE_LIST="docker-compose.yml:docker-compose.override.yml"
  # NB : pas de `[ -f … ] && …` ici — sous `set -e`, un test faux ferait
  # sortir le script.
  if [ -f .spawn-override.yml ]; then
    COMPOSE_FILE_LIST="$COMPOSE_FILE_LIST:.spawn-override.yml"
  fi
  export COMPOSE_FILE="$COMPOSE_FILE_LIST"
  echo "==> COMPOSE_FILE : $COMPOSE_FILE"
fi

echo "==> Mise à jour du repo et des submodules..."
# `--no-recurse-submodules` sur le pull : empêche git de tenter de fetcher
# les SHA submodule référencés par l'historique des commits parents (peut
# échouer si un SHA orphelin existe après un rebase/force-push côté submodule).
# `submodule update --init --recursive` ne fetche que le SHA réellement
# pointé par le commit parent courant, ce qui est suffisant pour le déploiement.
git pull --ff-only --no-recurse-submodules
if [ "$MODE" = "suite" ]; then
  git submodule sync --recursive
  git submodule update --init --recursive --force
fi

echo "==> Pull des images Docker..."
docker compose "${COMPOSE_ARGS[@]}" pull

echo "==> Redémarrage des services..."
docker compose "${COMPOSE_ARGS[@]}" up -d

# Purge des caches LimeSurvey (assets Yii publiés + Twig compilé).
# Indispensable : sans cette purge, les fichiers à jour du thème sont bien sur
# disque mais LimeSurvey continue de servir les anciens assets/templates en
# cache → la nouvelle version "ne s'applique pas", ce qui pousse à tort à
# désinstaller/réinstaller le thème (geste destructeur pour la config par
# sondage). `|| true` : ne pas faire échouer le déploiement si le conteneur
# n'est pas encore prêt (les caches se régénéreront de toute façon).
echo "==> Purge des caches LimeSurvey (tmp/assets + tmp/runtime)..."
docker compose "${COMPOSE_ARGS[@]}" exec -T web sh -c \
  'rm -rf /var/www/html/tmp/runtime/* /var/www/html/tmp/assets/* 2>/dev/null' || true

# --- Correctif de traduction française (limesurvey-theme-dsfr#73) ------------
# Le catalogue fr livré avec LimeSurvey 7.x a perdu des entrées (msgid modifiés
# en amont) : des messages de validation s'affichent en anglais. Le script est
# auto-détectant — il ne touche à rien sur un core 6.x ni sur un catalogue déjà
# complet — et doit être rejoué après chaque recréation de conteneur.
if [ "$MODE" = "suite" ] && command -v python3 >/dev/null 2>&1; then
  WEB_CONTAINER_NAME=$(docker compose "${COMPOSE_ARGS[@]}" ps --format '{{.Name}}' web 2>/dev/null | head -1)
  if [ -n "$WEB_CONTAINER_NAME" ]; then
    echo "==> Catalogue de traduction français..."
    python3 tools/patch-fr-locale.py "$WEB_CONTAINER_NAME" || \
      echo "⚠️  correctif de traduction non appliqué (non bloquant)" >&2
  fi
fi

# --- Garde-fou : les modules DSFR sont-ils réellement montés ? ---------------
# Un déploiement « réussi » mais sans bind-mounts = prod en vanilla (le symptôme
# du piège ci-dessus). On le dit franchement plutôt que de laisser passer.
if [ "$MODE" = "suite" ]; then
  WEB_CONTAINER=$(docker compose "${COMPOSE_ARGS[@]}" ps -q web 2>/dev/null | head -1)
  MOUNTS=$(docker inspect "$WEB_CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Type "bind"}}{{.Destination}} {{end}}{{end}}' 2>/dev/null || echo "")
  MISSING=""
  for dest in themes/survey/dsfr plugins/DSFRMail plugins/ConversationIA plugins/CKEditorDSFR; do
    case "$MOUNTS" in *"$dest"*) ;; *) MISSING="$MISSING $dest";; esac
  done
  if [ -n "$MISSING" ]; then
    echo "⚠️  Modules DSFR NON montés :$MISSING" >&2
    echo "    L'instance tourne en vanilla. Vérifier COMPOSE_FILE et docker-compose.override.yml." >&2
    exit 1
  fi
  echo "==> Modules DSFR montés : OK (4/4)"
fi

echo "==> Déploiement terminé."
docker compose "${COMPOSE_ARGS[@]}" ps
