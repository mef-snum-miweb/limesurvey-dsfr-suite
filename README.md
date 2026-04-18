# LimeSurvey DSFR Suite

Suite d'intégration DSFR (Système de Design de l'État) pour [LimeSurvey](https://www.limesurvey.org/). Environnement Docker pour le dev local et le déploiement en production — sans fork de LimeSurvey, avec l'image officielle [`martialblog/limesurvey`](https://github.com/martialblog/docker-limesurvey).

Trois modules vivent en submodules sous [`modules/`](modules/) :

| Module | Repo | Description |
|---|---|---|
| **Thème DSFR** | [`limesurvey-theme-dsfr`](https://github.com/bmatge/limesurvey-theme-dsfr) | Thème de sondage conforme au DSFR et au RGAA 4.1 |
| **Email DSFR** | [`limesurvey-email-dsfr`](https://github.com/bmatge/limesurvey-email-dsfr) | Plugin de templates d'email conformes DSFR |
| **Conversation Albert** | [`limesurvey-conversation-albert`](https://github.com/bmatge/limesurvey-conversation-albert) | Plugin d'assistant conversationnel IA |

---

## Trois usages, trois parcours

Ce repo sert trois scénarios distincts — chacun avec ses propres prérequis. **Prends le bon parcours selon ton intention**, tu ne pollues pas l'un avec l'autre.

| Je veux… | Parcours | Prérequis |
|---|---|---|
| **Essayer la suite** (démo visuelle, poser l'œil sur le thème, montrer à un collègue) | [→ Démo](#1-démo--faire-tourner-la-suite) | Docker |
| **Lancer la suite de tests** (unit + E2E + a11y + round-trip) | [→ Tests](#2-tests--lancer-et-consulter-les-rapports) | Docker **+** Node 18+ |
| **Modifier le thème ou un plugin** | [→ Développement](#3-développement--modifier-le-thème-ou-un-plugin) | Docker + Node 18+ + lecture de [`CONTRIBUTING`](modules/theme-dsfr/CONTRIBUTING.md) |
| **Déployer en prod** | [→ Production](#4-déploiement-en-production) | Docker + réseau Traefik |

---

## 1. Démo — faire tourner la suite

Objectif : avoir LimeSurvey avec le thème DSFR et les 2 plugins **opérationnels en local**, pour naviguer dans l'admin ou répondre au questionnaire de démo. Pas de build, pas de Node, juste Docker.

**Prérequis** : [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/) (inclus dans Docker Desktop).

```bash
# 1. Cloner avec les submodules
git clone --recurse-submodules https://github.com/bmatge/limesurvey-dsfr-suite.git
cd limesurvey-dsfr-suite

# 2. Démarrer la stack (LimeSurvey + MySQL)
docker compose -f docker-compose.dev.yml up -d

# 3. Charger le questionnaire de démo RGAA
./db/seed.sh

# 4. Ouvrir → http://localhost:8081  (admin / admin)
```

Les 3 submodules sont montés en direct dans le conteneur — toute modification est visible après un simple refresh du navigateur, sans rebuild Docker.

Si tu as cloné **sans** `--recurse-submodules`, tu peux rattraper :

```bash
git submodule update --init --recursive
```

**Arrêter la démo** :

```bash
docker compose -f docker-compose.dev.yml down       # arrêt (conserve les données)
docker compose -f docker-compose.dev.yml down -v    # arrêt + purge des volumes (DB remise à zéro)
```

---

## 2. Tests — lancer et consulter les rapports

Objectif : exécuter les trois strates de tests du thème (unitaires Vitest, E2E Playwright, round-trip saisie ↔ DB) et consulter le rapport HTML unifié.

### Architecture des tests

**Les tests tournent sur ta machine hôte** (Node), **pas dans Docker**. Docker héberge uniquement l'app (LimeSurvey + MySQL) que Playwright attaque via `http://localhost:8081`.

```
┌─────────────────────────────┐      HTTP       ┌──────────────────────┐
│  Machine hôte (ta machine)  │ ──────────────► │  Docker              │
│                             │                 │                      │
│  • Vitest (Node + jsdom)    │                 │  • limesurvey-dev    │
│  • Playwright (Chromium)    │ ◄── docker ──── │  • limesurvey-dev-db │
│  • run_tests.sh             │     exec        │                      │
└─────────────────────────────┘                 └──────────────────────┘
```

### Prérequis

- **Docker** (pour l'app — voir section [Démo](#1-démo--faire-tourner-la-suite))
- **Node 18+** et **npm**
- Les dépendances Node et le navigateur Chromium installés (cf. ci-dessous)

### Installation (une fois)

```bash
# Depuis la racine du repo
npm ci                              # installe vitest, playwright, jsdom, axe-core…
npx playwright install chromium     # télécharge le browser utilisé par les E2E
```

### Lancement

```bash
./run_tests.sh --simple    # Vitest seul (unit + intégration)  — rapide, pas besoin de Docker
./run_tests.sh --ui        # Playwright E2E + a11y (hors round-trip)
./run_tests.sh --classic   # --simple + --ui                     [mode par défaut]
./run_tests.sh --results   # Round-trip saisie ↔ DB seul         — modifie la DB de dev
./run_tests.sh --full      # Tout                                 — utilisé en CI
```

**Bon à savoir** : `playwright.config.ts` contient un `webServer` qui démarre **automatiquement** la stack Docker + le seed si le port `8081` est libre. Donc pour un `--ui`, `--classic`, `--results` ou `--full`, tu n'as pas besoin de lancer Docker à la main — Playwright s'en charge (ça peut prendre ~60 s la première fois). Si la stack tourne déjà (démo), elle est réutilisée.

### Consulter les rapports

Chaque exécution génère un rapport HTML unifié dans :

```
test-reports/<timestamp>/index.html
```

Ouvre-le dans un navigateur (`open test-reports/*/index.html` sur macOS). Il contient :

- Le verdict global (PASS / FAIL) et le mode utilisé
- Une carte par suite exécutée (Vitest / Playwright classique / results)
- Le détail par fichier de test
- Des liens vers les rapports Playwright détaillés (traces, screenshots sur échec)
- Les logs bruts (`vitest.log`, `playwright.log`, `playwright-results.log`)

**Détail complet** (couverture, structure, philosophie, CI) : [`TESTING.md`](TESTING.md).

---

## 3. Développement — modifier le thème ou un plugin

Objectif : éditer le JavaScript ou les templates Twig du thème, rebuilder le bundle, voir le résultat.

**Guide dédié** : [`modules/theme-dsfr/CONTRIBUTING.md`](modules/theme-dsfr/CONTRIBUTING.md) — arborescence, pipeline esbuild, conventions Twig, workflow git submodule, mise à jour DSFR, règles a11y.

**TL;DR** :

```bash
# 1. Environnement démo + deps de build (une fois)
docker compose -f docker-compose.dev.yml up -d
npm ci

# 2. Mode watch — rebuild auto du bundle à chaque sauvegarde
npm run build:theme:watch

# 3. Éditer dans modules/theme-dsfr/ — refresh navigateur pour voir
# 4. Si besoin, purger le cache Yii après rebuild :
npm run dev:purge-cache
```

### Workflow submodule (règle d'or)

On édite **toujours** depuis `modules/<nom>/`, jamais ailleurs. Chaque submodule a son propre remote.

```bash
# 1. Éditer + commit dans le submodule
cd modules/theme-dsfr
git add -A && git commit -m "feat: ..."
git push                    # → repo du submodule

# 2. Remonter le pointeur dans le parent
cd ../..
git add modules/theme-dsfr
git commit -m "chore: bump theme-dsfr"
git push
```

Pour tirer les dernières versions des 3 submodules :

```bash
git submodule update --remote --merge
```

---

## 4. Déploiement en production

```bash
git clone --recurse-submodules https://github.com/bmatge/limesurvey-dsfr-suite.git
cd limesurvey-dsfr-suite
cp .env.example .env        # adapter les valeurs pour la prod
./deploy.sh                 # pull repo + submodules + images Docker, restart
```

Le réseau `ecosystem-network` doit exister (créé par la stack Traefik). Les labels Traefik dans [`docker-compose.yml`](docker-compose.yml) sont à adapter au domaine cible.

---

## Documentation complémentaire

| Sujet | Où |
|---|---|
| Le thème DSFR lui-même | [`modules/theme-dsfr/README.md`](modules/theme-dsfr/README.md) |
| Options de config du thème | [`modules/theme-dsfr/THEME_OPTIONS.md`](modules/theme-dsfr/THEME_OPTIONS.md) |
| Couverture fonctionnelle du thème | [`modules/theme-dsfr/THEME_COVERAGE.md`](modules/theme-dsfr/THEME_COVERAGE.md) |
| Déclaration d'accessibilité (RGAA) | [`modules/theme-dsfr/DECLARATION_RGAA.md`](modules/theme-dsfr/DECLARATION_RGAA.md) |
| Guide développeur (Twig, esbuild, git) | [`modules/theme-dsfr/CONTRIBUTING.md`](modules/theme-dsfr/CONTRIBUTING.md) |
| **Tests** (couverture, lancement, rapports) | [`TESTING.md`](TESTING.md) |

---

## Licence

Chaque submodule a sa propre licence — voir les repos respectifs. Ce repo d'orchestration est sous [Licence Ouverte v2.0 (Etalab)](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).
