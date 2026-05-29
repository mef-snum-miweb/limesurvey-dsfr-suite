import { defineConfig } from '@playwright/test';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const reportDir = `./test-reports/${timestamp}`;

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts'],
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
    baseURL: 'http://localhost:8081',
    locale: 'fr-FR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'docker compose -f docker-compose.dev.yml up -d && ./db/seed.sh',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
