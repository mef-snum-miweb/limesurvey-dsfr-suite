import { defineConfig } from '@playwright/test';

// Gate double 6.x / 7.x (ADR-129) : le core visé est choisi par variables
// d'environnement, jamais codé en dur. Voir tests/e2e/helpers/env.ts et
// docker-compose.dev.yml (LS_IMAGE / LS_PREFIX / LS_PORT).
const LS_PORT = process.env.LS_PORT || '8081';
const LS_PROJECT = process.env.LS_PROJECT || 'limesurvey-dsfr-suite';
const BASE_URL = process.env.LS_BASE_URL || `http://localhost:${LS_PORT}`;

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const reportDir = `./test-reports/${timestamp}`;

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts'],
  // Les snapshots visuels (lents, ~88 captures) ne tournent que sur demande :
  // `npm run test:visual` pose VISUAL=1. Exclus de la suite par défaut.
  testIgnore: process.env.VISUAL ? [] : ['**/visual.spec.ts'],
  // Baselines visuelles séparées par core : la référence est le rendu de
  // 6.16.16 (dossier historique) ; la 7.x a le sien, pour que la dérive entre
  // les deux soit explicite au lieu d'écraser la référence.
  //
  // Comparaison CROISÉE (theme#47) : `LS_CORE=7 LS_VISUAL_REF=6 npm run test:visual`
  // exécute la 7.x contre les baselines 6.x — chaque écart de rendu entre les
  // deux cores ressort alors comme un échec, avec son image de diff.
  snapshotPathTemplate:
    (process.env.LS_VISUAL_REF || process.env.LS_CORE) === '7'
      ? '{testDir}/{testFilePath}-snapshots-ls7/{arg}-{projectName}-{platform}{ext}'
      : '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}',

  expect: {
    toHaveScreenshot: {
      // Tolérance anti-bruit (anti-aliasing) — un vrai changement de rendu
      // dépasse largement 100 pixels.
      maxDiffPixels: 100,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  fullyParallel: false,
  // Force un seul worker pour éviter que des specs touchant à l'état du sondage
  // (round-trip DB, submit page, bascule de paramètres) ne se polluent
  // mutuellement quand Playwright parallélise entre fichiers.
  workers: 1,
  retries: 1,
  timeout: 30_000,
  outputDir: `${reportDir}/artifacts`,
  reporter: [
    ['list'],
    ['json', { outputFile: `${reportDir}/results.json` }],
    ['html', { outputFolder: `${reportDir}/html`, open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: `docker compose -p ${LS_PROJECT} -f docker-compose.dev.yml up -d && ./db/seed.sh`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
