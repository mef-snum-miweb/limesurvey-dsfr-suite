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

echo "==> Déploiement terminé."
docker compose "${COMPOSE_ARGS[@]}" ps
