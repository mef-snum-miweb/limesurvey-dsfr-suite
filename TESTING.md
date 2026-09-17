# Tests

Suite de tests du thème DSFR, pilotée depuis ce repo parent. Trois strates complémentaires :

| Strate | Stack | Scope | Fichiers |
|---|---|---|---|
| **Unitaires + intégration** | [Vitest](https://vitest.dev/) + [jsdom](https://github.com/jsdom/jsdom) | Fonctions pures et modules `src/` branchés sur un DOM simulé | [`tests/unit/`](tests/unit/) |
| **E2E + a11y** | [Playwright](https://playwright.dev/) + [axe-core](https://www.deque.com/axe/) | Rendu réel dans Chromium sur une instance LimeSurvey dockerisée | [`tests/e2e/`](tests/e2e/) |
| **Round-trip saisie ↔ DB** | Playwright + MySQL | Remplit tout un questionnaire, soumet, vérifie que chaque valeur est correctement stockée en base | [`tests/e2e/results.spec.ts`](tests/e2e/results.spec.ts) |

Volume actuel : ~370 tests Vitest, ~125 tests Playwright classiques, 2 tests round-trip (variantes A et B avec valeurs différentes). ~71 s pour l'intégralité sur un Mac récent.

---

## Prérequis

Les tests tournent **en local sur la machine hôte** (Node + Chromium). Docker n'héberge que l'app ciblée par les E2E.

| Strate | Docker | Node / npm | Chromium |
|---|:---:|:---:|:---:|
| Vitest (`--simple`) | — | ✅ | — |
| Playwright (`--ui`, `--classic`, `--results`, `--full`) | ✅ (app + DB) | ✅ | ✅ |

### Installation (une fois par machine)

```bash
# 1. Dépendances Node (vitest, playwright, jsdom, axe-core, esbuild)
npm ci

# 2. Browser Chromium pour Playwright
npx playwright install chromium
```

### Stack Docker : lancée automatiquement

`playwright.config.ts` déclare un bloc [`webServer`](https://playwright.dev/docs/test-webserver) qui **démarre la stack et seede la DB si le port `8081` est libre** :

```ts
webServer: {
  command: 'docker compose -f docker-compose.dev.yml up -d && ./db/seed.sh',
  url: 'http://localhost:8081',
  reuseExistingServer: true,
  timeout: 180_000,
}
```

- Premier lancement → Playwright fait `docker compose up -d` et `./db/seed.sh` tout seul (~60 s).
- Si la stack tourne déjà (parce que tu as la démo ouverte) → `reuseExistingServer: true` réutilise l'instance, rien à faire.

Tu **peux** quand même préchauffer manuellement avant les tests si tu préfères maîtriser le timing :

```bash
docker compose -f docker-compose.dev.yml up -d
./db/seed.sh
```

---

## Lancer les tests

Orchestrateur : [`run_tests.sh`](run_tests.sh). Cinq modes via switch :

```bash
./run_tests.sh --simple    # Vitest seul (unitaires + intégration)
./run_tests.sh --ui        # Playwright classique (E2E + a11y), hors @results
./run_tests.sh --classic   # --simple + --ui
./run_tests.sh --results   # Uniquement le round-trip — modifie la DB de dev
./run_tests.sh --full      # Tout : --classic + --results
```

### Gate double 6.x / 7.x (ADR-129)

Le thème supporte **deux cores sur une seule branche** : toute modification doit donc
passer la suite sur les deux.

```bash
LS_CORE=6 ./run_tests.sh --full   # 6.16.16 (référence), port 8081
LS_CORE=7 ./run_tests.sh --full   # 7.1.0,               port 8082
```

Les deux stacks cohabitent : conteneurs (`LS_PREFIX`), port (`LS_PORT`), image
(`LS_IMAGE`) et volumes (nom de projet compose) distincts. Aucun nom de conteneur
ni port n'est codé en dur dans les tests — tout passe par
[`tests/e2e/helpers/env.ts`](tests/e2e/helpers/env.ts).

**Préparer une base 7.x** : le dump `db/init.sql` est figé au schéma 6.x (DBVersion 648).
Le rejouer sur une instance 7.x **corrompt le schéma** — `db/seed.sh` le refuse
désormais explicitement. La bonne méthode conserve les `qid` (un import `.lss` les
renumérote et casse les sélecteurs des tests) :

```bash
export LS_IMAGE=martialblog/limesurvey:7.1.0-260913-apache LS_PREFIX=limesurvey-ls7 LS_PORT=8082
docker compose -p ls7 -f docker-compose.dev.yml up -d db     # 1. base seule
docker exec -i limesurvey-ls7-db mysql -ulimesurvey -plimesurvey limesurvey < db/init.sql
docker compose -p ls7 -f docker-compose.dev.yml up -d        # 2. le core migre (648 → 712)
docker cp db/Ls7setupCommand.php limesurvey-ls7:/var/www/html/application/commands/
docker exec -u www-data -w /var/www/html limesurvey-ls7 php application/commands/console.php ls7setup
```

Pour partir d'une instance 7.x **vierge** (sans historique 6.x), utiliser
[`db/seed-ls7.sh`](db/seed-ls7.sh) avec un répertoire de `.lss`.

### Snapshots visuels (sur demande)

```bash
npm run test:visual                          # compare aux baselines committées
npm run test:visual -- --update-snapshots    # régénère les baselines (à committer)
```

Filet de sécurité **visuel** (prérequis des refactors CSS — revue 2026-06, #41) :
88 captures plein-page (2 questionnaires × chaque page × desktop/mobile ×
clair/sombre), comparées pixel à pixel aux baselines de
`tests/e2e/visual.spec.ts-snapshots/`. Exclu de la suite par défaut
(variable `VISUAL=1` posée par le script npm). Les baselines sont liées à la
plateforme (générées sur macOS) ; un changement de rendu **assumé** se
revoit dans le diff d'images puis se committe via `--update-snapshots`.
Les questions à ordre aléatoire (random_order/answer_order) sont masquées.

### Avant un round-trip

Le mode `--results` ajoute des lignes dans la table de réponses du questionnaire.
Attention à son nom, qui dépend du core : `lime_survey_<sid>` en 6.x,
`lime_responses_<sid>` en 7.x (les tests le détectent, cf. `responseTable()`).
Pour repartir d'une base propre :

```bash
# 6.x
docker exec limesurvey-dev-db mysql -u limesurvey -plimesurvey limesurvey \
    -e "TRUNCATE TABLE lime_survey_282267;"
# 7.x
docker exec limesurvey-ls7-db mysql -u limesurvey -plimesurvey limesurvey \
    -e "TRUNCATE TABLE lime_responses_282267;"
```

Le `sid` `282267` est celui du questionnaire de démo chargé par [`db/seed.sh`](db/seed.sh) — s'il change, adapte la commande.

---

## Consulter les rapports

Chaque exécution de `run_tests.sh` génère un **rapport HTML unifié** dans :

```
test-reports/<timestamp>/index.html
```

Ouvre-le dans un navigateur :

```bash
open test-reports/*/index.html        # macOS — dernier rapport
xdg-open test-reports/*/index.html    # Linux
```

Il contient :
- Le verdict global (PASS / FAIL) et le mode utilisé
- Une carte par suite exécutée (Vitest / Playwright classique / results)
- Le détail par fichier de test (pass / fail / durée)
- Les liens vers les rapports Playwright HTML détaillés (`playwright-html/` et `playwright-html-results/`)
- Les logs bruts (`vitest.log`, `playwright.log`, `playwright-results.log`)

Artefacts en cas d'échec (captures, traces, contextes d'erreur) dans `test-reports/<timestamp>/artifacts/`.

---

## Structure détaillée

### `tests/unit/`

Un fichier par module `src/` du thème (ou par fonction pure). Les tests s'importent directement depuis `modules/theme-dsfr/src/**/*.js`. Chaque test isole son DOM via `beforeEach`.

Catégories couvertes :
- **Validation** : `createErrorSummary`, `updateErrorSummary`, `handleArrayValidation`, `handleMultipleShortTextErrors`, `transformErrorsToDsfr`, `initAriaInvalidSync`
- **A11y** : `conditionalAria`, `fixTableAccessibility`, `enableImageLazyLoading`, `extendDescribedByForValidationTips`
- **Inputs** : `inputOnDemand`, `reorderListRadioNoAnswer`, `addInputmodeNumericToNumericFields`
- **Ranking** : tests de `updateRankNumbers`, `refreshAllItems`, disabling des boutons up/down aux extrémités
- **Helpers** : `tMandatory`, `tRanking`, `isValidNumber`, `sanitizeRTEContent`, `sanitizeTree`, `getQuestionText`, `extractQuestionCodes`, `findQuestionByCode`

### `tests/e2e/`

- **`smoke.spec.ts`** — la page se charge, thème DSFR appliqué, scripts custom chargés
- **`question-types.spec.ts`** — rendu de chaque type de question par page
- **`validation.spec.ts`** — champs obligatoires, messages d'erreur, résumé d'erreurs, mise à jour en place
- **`conditional.spec.ts`** — questions conditionnelles (QC / QCYes / QCNo / QCS*)
- **`relevance.spec.ts`** — classes `ls-irrelevant` / `ls-hidden` posées par la relevance
- **`ranking.spec.ts`** — rendu, ajout/retrait, réordonnancement, accessibilité clavier, live region
- **`numeric-sum-validation.spec.ts`** — contraintes min/max/sum sur `multiplenumeric`
- **`responsive.spec.ts`** — viewports mobile/tablet/desktop, linéarisation tableaux, labels visibles dans les cellules
- **`a11y.spec.ts`** — audit axe-core WCAG 2.1 AA par page, skip links, aria-required, aria-invalid, hiérarchie des titres, labels, focus
- **`results.spec.ts`** — round-trip saisie ↔ base : 2 variantes (A, B) avec valeurs déterministes différentes, vérification colonne par colonne dans `lime_survey_<sid>`
- **`visual.spec.ts`** — snapshots visuels des 2 questionnaires de démo (282267 **et** 527199), chaque page × desktop/mobile × clair/sombre — sur demande via `npm run test:visual`. Le questionnaire 527199 (inactif dans le seed : table de réponses désynchronisée) est ré-activé à la volée par `fixtures/ensure-survey-active.ts` + la commande console `db/ActivatesurveyCommand.php`

Helpers partagés dans [`tests/e2e/helpers/`](tests/e2e/helpers/) :
- `selectors.ts` — dictionnaire centralisé des sélecteurs CSS
- `formFiller.ts` — remplissage exhaustif d'un formulaire + snapshot DOM pré-soumission
- `dbFetcher.ts` — lecture de la dernière réponse soumise via `docker exec mysql`

Fixtures dans [`tests/e2e/fixtures/survey.ts`](tests/e2e/fixtures/survey.ts).

---

## Philosophie

- **Round-trip plutôt que mocks** : la suite `--results` soumet un vrai formulaire et lit la DB — on vérifie le contrat de bout en bout, pas des mocks intermédiaires.
- **Snapshot plutôt que prédiction** : le `formFiller` remplit tous les champs puis snapshot le DOM juste avant la soumission ; les attentes reflètent ce qui sera réellement envoyé au serveur, pas une prédiction abstraite.
- **Deux variantes par round-trip** : A et B utilisent des valeurs déterministes **différentes** (texte, numérique, radios, checkboxes, dates). Ça protège contre les faux positifs où le test passerait par coïncidence sur une valeur partagée avec un test précédent.
- **Couverture a11y systématique** : chaque page du questionnaire passe par `axe-core` avec niveau WCAG 2.1 AA — toute violation `critical` ou `serious` fait échouer la CI.

---

## Continuous Integration

`run_tests.sh --full` retourne un code de sortie non-zéro si au moins une suite exécutée échoue, donc utilisable tel quel dans un pipeline CI.

Build du bundle theme + diff check (pour détecter les bundles commités obsolètes) :

```bash
npm run build:theme:check     # build + git diff --exit-code sur scripts/custom.js
```

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Cannot find module '@rollup/rollup-linux-*'` au lancement de Vitest | `node_modules/` cross-compilé (macOS → Linux ou inverse) | `rm -rf node_modules && npm ci` |
| `Process from config.webServer was not able to start. Exit code: 127` | Docker pas installé / pas dans le `PATH` | Installer Docker Desktop ou Docker Engine |
| `Error: browserType.launch: Executable doesn't exist…` | Chromium Playwright pas installé | `npx playwright install chromium` |
| Tests `--results` qui échouent sur des valeurs "inattendues" | DB déjà peuplée par un run précédent | Voir [Avant un round-trip](#avant-un-round-trip) |
| Rapport HTML avec `—/—` partout sur Vitest | Vitest a planté avant d'écrire le JSON | Regarder `test-reports/<timestamp>/vitest.log` |
