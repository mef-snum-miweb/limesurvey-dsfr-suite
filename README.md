# LimeSurvey DSFR Suite

Suite d'intégration DSFR (Système de Design de l'État) pour [LimeSurvey](https://www.limesurvey.org/). Environnement Docker pour le dev local et le déploiement en production — sans fork de LimeSurvey, avec l'image officielle [`martialblog/limesurvey`](https://github.com/martialblog/docker-limesurvey).

Quatre modules vivent en submodules sous [`modules/`](modules/) :

| Module | Repo | Description |
|---|---|---|
| **Thème DSFR** | [`limesurvey-theme-dsfr`](https://github.com/mef-snum-miweb/limesurvey-theme-dsfr) | Thème de sondage conforme au DSFR et au RGAA 4.1 |
| **CKEditor DSFR** | [`limesurvey-ckeditor-dsfr`](https://github.com/mef-snum-miweb/limesurvey-ckeditor-dsfr) | Plugin éditeur : palette de composants + styles DSFR dans l'éditeur admin |
| **Email DSFR** | [`limesurvey-email-dsfr`](https://github.com/mef-snum-miweb/limesurvey-email-dsfr) | Plugin de templates d'email conformes DSFR |
| **Conversation Albert** | [`limesurvey-conversation-albert`](https://github.com/mef-snum-miweb/limesurvey-conversation-albert) | Plugin d'assistant conversationnel IA |

---

## Compatibilité LimeSurvey 6.x et 7.x

Le thème et la suite de tests supportent **LimeSurvey 6.16.16 (référence) et 7.1.0**, sur une
**branche unique** — pas deux branches maintenues en miroir (ADR-129).

| | 6.16.16 | 7.1.0 |
|---|---|---|
| Unitaires | 441/441 | 441/441 |
| E2E (Playwright) | 145/145 | 145/145 |
| Visuel (108 captures) | 20/20 | 20/20 |
| Rendu comparé au core de référence | — | **identique** (comparaison croisée 20/20) |

LimeSurvey 7 a renommé un grand nombre de conventions que le thème doit suivre — noms de
champs POST, ids `javatbd`, structure de la liste de réponses (`<div>` → `<ul>/<li>`), rendu
du ranking. Le thème détecte **ce qui change** (présence d'une variable, format du fieldname),
jamais la version : elle n'est pas exposée aux templates Twig. Chaque bloc de transition porte
le marqueur `LS6-COMPAT` — `grep -rn "LS6-COMPAT" modules/theme-dsfr/views/` en donne la liste.

Le core d'une instance se choisit dans son `.env` (`LS_CORE_IMAGE`), et la suite de tests cible
l'un ou l'autre avec `LS_CORE=6|7 ./run_tests.sh` :
[→ cohabitation 6.x / 7.x](#faire-cohabiter-une-instance-6x-et-une-instance-7x).

### Réserves connues

Elles sont réelles et assumées — à lire avant de mettre une instance 7.x en production :

- **L'upload de fichier n'a aucun test E2E**, alors que LimeSurvey 7 a renommé son champ
  compteur (`_Cfilecount`). Le code est adapté et suit la même détection que le reste, mais
  **ce n'est pas vérifié en exécution** : prévoir une vérification manuelle.
- **`show_noanswer=1` sur la double échelle** n'est exercé par aucun questionnaire de test.
  Le core 7 y présélectionne « Sans réponse » là où notre override garde « Veuillez
  choisir… » — divergence assumée vis-à-vis du vanilla, non couverte.
- **Le catalogue français de LimeSurvey 7.1 est incomplet** (5 605 entrées contre 5 886 en
  6.16.16 : des `msgid` ont changé en amont). Sans rattrapage, des messages de validation
  s'affichent **en anglais**. `deploy.sh` applique automatiquement
  [`locale/fr-ls7-patch.po`](locale/fr-ls7-patch.po) — c'est un **correctif temporaire**, à
  supprimer quand l'amont sera corrigé.
- **Passer une instance existante de 6.x à 7.x migre sa base de façon irréversible**
  (`updatedb`, 648 → 712). Pour comparer deux versions, on déploie deux instances.
- La **prod reste volontairement sur 6.16.16** : la bascule est une décision séparée, qui
  suppose la reprise des questionnaires existants.

---

## Trois usages, trois parcours

Ce repo sert trois scénarios distincts — chacun avec ses propres prérequis. **Prends le bon parcours selon ton intention**, tu ne pollues pas l'un avec l'autre.

| Je veux… | Parcours | Prérequis |
|---|---|---|
| **Essayer la suite** (démo visuelle, poser l'œil sur le thème, montrer à un collègue) | [→ Démo](#1-démo--faire-tourner-la-suite) | Docker |
| **Lancer la suite de tests** (unit + E2E + a11y + round-trip) | [→ Tests](#2-tests--lancer-et-consulter-les-rapports) | Docker **+** Node 24 (cf. [`.nvmrc`](.nvmrc)) |
| **Modifier le thème ou un plugin** | [→ Développement](#3-développement--modifier-le-thème-ou-un-plugin) | Docker + Node 24 + lecture de [`CONTRIBUTING`](modules/theme-dsfr/CONTRIBUTING.md) |
| **Déployer en prod** | [→ Production](#4-déploiement-en-production) | Docker + réseau Traefik |
| **Tester une installation à froid** (Upload & install d'un module sur une instance vierge) | [→ Instance vanilla](#5-instance-vanilla-tester-linstallation-à-froid-dun-module) | Docker |

---

## 1. Démo — faire tourner la suite

Objectif : avoir LimeSurvey avec le thème DSFR et les 3 plugins **opérationnels en local**, pour naviguer dans l'admin ou répondre au questionnaire de démo. Pas de build, pas de Node, juste Docker.

**Prérequis** : [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/) (inclus dans Docker Desktop).

```bash
# 1. Cloner avec les submodules
git clone --recurse-submodules https://github.com/mef-snum-miweb/limesurvey-dsfr-suite.git
cd limesurvey-dsfr-suite

# 2. Démarrer la stack (LimeSurvey + MySQL)
docker compose -f docker-compose.dev.yml up -d

# 3. Charger le questionnaire de démo RGAA
./db/seed.sh

# 4. Ouvrir → http://localhost:8081  (admin / admin)
```

Les 4 submodules sont montés en direct dans le conteneur — toute modification est visible après un simple refresh du navigateur, sans rebuild Docker.

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
- **Node 24** (LTS, cf. [`.nvmrc`](.nvmrc) — `nvm use`) et **npm**
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

Pour tirer les dernières versions des 4 submodules :

```bash
git submodule update --remote --merge
```

---

## 4. Déploiement en production

```bash
git clone --recurse-submodules https://github.com/mef-snum-miweb/limesurvey-dsfr-suite.git
cd limesurvey-dsfr-suite
cp .env.example .env        # adapter les valeurs pour la prod
./deploy.sh                 # pull repo + submodules + images Docker, restart
```

Le réseau externe Traefik (nom via `TRAEFIK_NETWORK` dans `.env`) doit exister. Les labels Traefik dans [`docker-compose.yml`](docker-compose.yml) sont paramétrés via `.env` (`PUBLIC_DOMAIN`, `TRAEFIK_CERT_RESOLVER`, etc.).

**Architecture Compose** : `docker-compose.yml` est la base vanilla ; `docker-compose.override.yml` (auto-chargé) ajoute les 4 bind-mounts DSFR. Le comportement historique de `docker compose up -d` est inchangé — il continue à monter la suite complète.

> ⚠️ **Piège `spawn`** (vibelab-platform#79) : `spawn up` exporte
> `COMPOSE_FILE=docker-compose.yml:.spawn-override.yml`, ce qui **court-circuite le
> chargement automatique** de `docker-compose.override.yml` — l'instance repart en
> LimeSurvey vanilla, sans les modules DSFR. `deploy.sh` reconstruit donc la liste
> des fichiers lui-même et **échoue** si les 4 bind-mounts ne sont pas là. Après tout
> `spawn up`, relancer `./deploy.sh` sur l'instance.

### Faire cohabiter une instance 6.x et une instance 7.x

Le thème est compatible **6.16.16 et 7.1.0** (ADR-129). Le core d'une instance se
choisit dans son seul `.env`, sans branche ni compose dédiés :

```bash
# .env d'une instance de validation 7.x
INSTANCE_NAME=limesurvey-7                                     # conteneurs et routeurs distincts
LS_CORE_IMAGE=martialblog/limesurvey:7.1.0-260913-apache       # core 7.x
PUBLIC_DOMAIN=limesurvey-7.lab.miweb.run
```

Sans `LS_CORE_IMAGE`, l'instance reste sur le core 6.16.16 de référence. Chaque
instance ayant ses propres volumes, les bases ne se mélangent pas.

> ⚠️ **Ne jamais changer ce tag sur une instance existante** : au démarrage, le core
> migre la base (`updatedb`, 648 → 712) et l'opération est **irréversible**. Pour
> comparer deux versions, on déploie deux instances.

Déploiement type sur le lab :

```bash
ssh vps "spawn up limesurvey-7 git@github.com:mef-snum-miweb/limesurvey-dsfr-suite.git --keep --mail"
ssh vps "cd /opt/apps/limesurvey-7 && ./deploy.sh"   # remonte les modules DSFR (piège ci-dessus)
```

---

## 5. Instance vanilla — tester l'installation à froid d'un module

Objectif : disposer d'un LimeSurvey **sans aucun addon** pour valider l'installation d'un module via *Configuration → Plugins → Upload & install* ou *Thèmes → Importer*. Deux options selon le besoin :

### Localement (dev jetable)

```bash
docker compose -f docker-compose.dev.vanilla.yml up -d
# → http://localhost:8082  (admin / admin)
docker compose -f docker-compose.dev.vanilla.yml down -v   # reset complet
```

Cohabite avec l'instance suite dev sur `:8081` (volumes et containers distincts).

### Sur le lab (persistante, HTTPS réel)

Instance dédiée déployée depuis le repo [`mef-snum-miweb/limesurvey-core`](https://github.com/mef-snum-miweb/limesurvey-core) :

> <https://limesurvey-core.lab.miweb.run>

### Depuis le repo suite (production, ponctuel)

Le `deploy.sh` accepte un flag pour bypasser l'override modules :

```bash
./deploy.sh --vanilla        # instance vanilla depuis les mêmes fichiers
```

À utiliser uniquement pour un test ponctuel dans un environnement dédié — ne pas lancer contre la DB de production de la suite, LimeSurvey planterait sur les plugins actifs en base sans fichiers montés.

### Choisir le mode au déploiement (spawn ou orchestrateur)

Sous un orchestrateur qui lance `docker compose up` sans argument (ex. `spawn` sur le lab), le mode se choisit **par le `.env` de l'app**, sans toucher à l'outillage :

```bash
# .env — mode vanilla : ne charger QUE la base (ignore l'override modules)
COMPOSE_FILE=docker-compose.yml
```

- **Sans cette ligne** (défaut) : base + override auto-chargé → **suite complète**, modules livrés par submodules git (admin devops).
- **Avec cette ligne** : instance **vanilla** → thème et plugins s'installent et se mettent à jour en **ZIP via l'UI d'admin** (admin fonctionnel). Les fichiers installés vivent dans le volume `upload/` et survivent aux redéploiements.

Le choix se fait **à la création de l'instance** : ne pas basculer une instance existante d'un mode à l'autre sans migration (risque de double copie d'un même plugin — un garde-fou du plugin CKEditorDSFR l'affiche en admin le cas échéant, cf. sa doc « Migrer d'une installation filesystem vers le ZIP »).

---

## Documentation complémentaire

| Sujet | Où |
|---|---|
| **Guide du contributeur** (gestionnaires d'enquêtes — thème + éditeur) | [`docs/guide-contributeur/guide-contributeur.md`](docs/guide-contributeur/guide-contributeur.md) |
| Le thème DSFR lui-même | [`modules/theme-dsfr/README.md`](modules/theme-dsfr/README.md) |
| Options de config du thème | [`modules/theme-dsfr/THEME_OPTIONS.md`](modules/theme-dsfr/THEME_OPTIONS.md) |
| Couverture fonctionnelle du thème | [`modules/theme-dsfr/THEME_COVERAGE.md`](modules/theme-dsfr/THEME_COVERAGE.md) |
| Déclaration d'accessibilité (RGAA) | [`modules/theme-dsfr/DECLARATION_RGAA.md`](modules/theme-dsfr/DECLARATION_RGAA.md) |
| Guide développeur (Twig, esbuild, git) | [`modules/theme-dsfr/CONTRIBUTING.md`](modules/theme-dsfr/CONTRIBUTING.md) |
| **Tests** (couverture, lancement, rapports) | [`TESTING.md`](TESTING.md) |

---

## Licence

Chaque submodule a sa propre licence — voir les repos respectifs. Ce repo d'orchestration est sous [Licence Ouverte v2.0 (Etalab)](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).
