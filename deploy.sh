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

echo "==> Déploiement terminé."
docker compose ps
