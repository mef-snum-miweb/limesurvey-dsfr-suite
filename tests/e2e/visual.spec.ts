/**
 * Filet de sécurité VISUEL — snapshots de chaque page des questionnaires
 * de démo, en desktop/mobile × clair/sombre.
 *
 * Objectif (revue 2026-06, prérequis de #41/#42) : détecter toute dérive
 * de RENDU que les E2E comportementaux ne voient pas, avant de toucher au
 * CSS (dépose des !important, @layer) ou au JS de validation.
 *
 * - 282267 : questionnaire de test RGAA (welcome + 8 étapes, tous types).
 * - 527199 : questionnaire métier Galileo BNA (welcome + 12 étapes,
 *   relevance en cascade) — activé à la volée si besoin (cf.
 *   fixtures/ensure-survey-active.ts).
 *
 * Exécution : `npm run test:visual` (exclu de la suite par défaut — la
 * variable VISUAL=1 lève le testIgnore du config). Baselines committées
 * dans visual.spec.ts-snapshots/ (suffixe plateforme : générées sur
 * darwin ; une CI linux devra générer les siennes).
 *
 * Mise à jour ASSUMÉE d'un rendu : `npm run test:visual -- --update-snapshots`
 * puis commit des PNG modifiés — le diff d'images EST la revue.
 */
import { test, expect, type Page } from '@playwright/test';
import { advancePages } from './fixtures/survey';
import { ensureSurveyActive } from './fixtures/ensure-survey-active';

const SURVEYS = [
  // pages = welcome + étapes (la dernière porte le bouton Envoyer, on ne soumet pas)
  { sid: 282267, pages: 9 },
  { sid: 527199, pages: 13 },
];

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 375, height: 812 },
} as const;

const SCHEMES = ['light', 'dark'] as const;

/**
 * Questions intrinsèquement non déterministes, masquées dans les captures :
 * - #question7 (282267, type Q « Multiples zones de texte court ») :
 *   random_order=1 — l'ordre de ses sous-questions change à chaque session.
 * - #question39 (282267, type R « Classement … ordre aléatoire ») :
 *   answer_order=random — l'ordre des items disponibles change à chaque
 *   session.
 */
const NON_DETERMINISTIC_QUESTIONS = ['#question7', '#question39'];

/** Stabilise la page avant capture : fontes chargées, focus relâché, JS du thème posé. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    await (document as any).fonts?.ready;
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo(0, 0);
  });
  // Laisse les inits du thème finir (stepper, transformations DSFR — délais
  // internes ≤ 300 ms, cf. src/index.js du thème).
  await page.waitForTimeout(450);
}

for (const { sid, pages } of SURVEYS) {
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    for (const scheme of SCHEMES) {
      test(`@visual ${sid} ${vpName} ${scheme}`, async ({ page }) => {
        // 8 walks complets : on prend large (long sur les pages à 22 questions).
        test.setTimeout(420_000);

        await ensureSurveyActive(sid);

        // Le thème lit localStorage['dsfr-theme'] à chaque chargement
        // (scripts/theme.js) : posé avant tout script, il s'applique sans
        // interaction sur chaque page du walk.
        await page.addInitScript((s) => {
          window.localStorage.setItem('dsfr-theme', s);
        }, scheme);
        await page.setViewportSize(viewport);

        await page.goto(`/index.php/${sid}?newtest=Y&lang=fr`);
        await page.waitForLoadState('domcontentloaded');

        for (let p = 1; p <= pages; p++) {
          await settle(page);
          await expect(page).toHaveScreenshot(
            `s${sid}-p${String(p).padStart(2, '0')}-${vpName}-${scheme}.png`,
            {
              fullPage: true,
              mask: NON_DETERMINISTIC_QUESTIONS.map((sel) => page.locator(sel)),
            },
          );
          if (p < pages) {
            await advancePages(page, 1);
          }
        }

        // Garde-fou : le walk doit avoir atteint la dernière page (bouton
        // Envoyer) — sinon les captures comparées ne sont pas celles qu'on
        // croit (page bloquée par une validation = baselines mensongères).
        await expect(page.locator('#ls-button-submit[value="movesubmit"]')).toBeVisible();
      });
    }
  }
}
