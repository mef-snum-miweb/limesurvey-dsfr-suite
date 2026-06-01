#!/usr/bin/env bash
# =============================================================================
# LimeSurvey DSFR Suite — Script de déploiement
# =============================================================================
set -euo pipefail

echo "==> Mise à jour du repo et des submodules..."
# `--no-recurse-submodules` sur le pull : empêche git de tenter de fetcher
# les SHA submodule référencés par l'historique des commits parents (peut
# échouer si un SHA orphelin existe après un rebase/force-push côté submodule).
# `submodule update --init --recursive` ne fetche que le SHA réellement
# pointé par le commit parent courant, ce qui est suffisant pour le déploiement.
git pull --ff-only --no-recurse-submodules
git submodule sync --recursive
git submodule update --init --recursive --force

echo "==> Pull des images Docker..."
docker compose pull

echo "==> Redémarrage des services..."
docker compose up -d

# Purge des caches LimeSurvey (assets Yii publiés + Twig compilé).
# Indispensable : sans cette purge, les fichiers à jour du thème sont bien sur
# disque mais LimeSurvey continue de servir les anciens assets/templates en
# cache → la nouvelle version "ne s'applique pas", ce qui pousse à tort à
# désinstaller/réinstaller le thème (geste destructeur pour la config par
# sondage). `|| true` : ne pas faire échouer le déploiement si le conteneur
# n'est pas encore prêt (les caches se régénéreront de toute façon).
echo "==> Purge des caches LimeSurvey (tmp/assets + tmp/runtime)..."
docker compose exec -T limesurvey sh -c \
  'rm -rf /var/www/html/tmp/runtime/* /var/www/html/tmp/assets/* 2>/dev/null' || true

echo "==> Déploiement terminé."
docker compose ps
