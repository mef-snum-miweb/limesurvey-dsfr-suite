import { execFileSync } from 'node:child_process';
import { test, expect } from './fixtures/survey';
import { SURVEY_URL, navigateToSelector } from './fixtures/survey';

/**
 * Régressions remontées par le métier 2026-05-29 sur Galileo (sondage 527199) :
 *
 * Bug 1 — Q16 (Multiple choice avec exclusive_option = « Aucun ») : cocher
 * « Aucun » + tenter Suivant déclenchait le message d'erreur (autres questions
 * mandatory vides), MAIS les options non cochées de Q16 disparaissaient
 * visuellement. Cause : le CSS DSFR `[id^="question"] .ls-irrelevant` matchait
 * les sub-questions internes (qui reçoivent `.ls-irrelevant .ls-disabled`
 * quand exclusive_option est cochée), avec `display: none !important`. Fix :
 * restreindre le sélecteur aux .question-container / .group-container racines
 * (sélecteur self avec `.`, pas descendant) + opacity 0.5 sur les sub-items
 * disabled au lieu de display:none.
 *
 * Bug 2 — Bouton « Imprimer vos réponses » absent en fin de questionnaire.
 * Notre `submit.twig` avait perdu (au fork depuis vanilla) les blocs
 * `printanswer`, `publicstatistics` et `endurl`. Restaurés avec habillage DSFR
 * (boutons `.fr-btn` + icônes `fr-icon-printer-line`, `fr-icon-line-chart-line`,
 * `fr-icon-external-link-line`).
 */

const SID = 282267;
const sql = (q: string) =>
  execFileSync(
    'docker',
    ['exec', 'limesurvey-dev-db', 'mysql', '-u', 'limesurvey', '-plimesurvey', '-D', 'limesurvey', '-sNe', q],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  ).trim();

test.describe('Bug 1 — option exclusive (« Aucun ») ne doit pas masquer les autres sous-questions', () => {
  test.beforeAll(() => {
    // Sécurité : si un autre spec a pollué l'état du sondage avant nous, reseed.
    reseed();
  });

  test('cocher l\'option exclusive laisse les autres sous-questions visibles (juste désactivées)', async ({ page }) => {
    await page.goto(SURVEY_URL);
    await page.waitForLoadState('domcontentloaded');
    // Q21 dans le sondage 282267 = « Multiples cases à cocher (avec Option d'exclusion) »,
    // SQ05 (« Option exclusive ») a l'attribut exclude_all_others.
    await navigateToSelector(page, '#question21', 15);

    const totalItems = await page.locator('#question21 .checkbox-item').count();
    expect(totalItems).toBeGreaterThan(1);

    await page.locator('#question21 label:has-text("Option exclusive")').click();
    // Laisse LS appliquer ls-irrelevant/ls-disabled sur les autres items
    await page.waitForTimeout(300);

    const visibleItems = await page.locator('#question21 .checkbox-item:visible').count();
    expect(visibleItems).toBe(totalItems);

    // Vérifie que les sub-items inactifs sont signalés visuellement (opacité réduite)
    const otherSubGroup = page.locator('#question21 .checkbox-item .fr-checkbox-group.ls-irrelevant').first();
    if (await otherSubGroup.count() > 0) {
      const opacity = await otherSubGroup.evaluate((el) => getComputedStyle(el).opacity);
      expect(parseFloat(opacity)).toBeLessThan(1);
    }
  });
});

// Force la sérialisation : les tests Bug 2 modifient l'état du sondage en BDD,
// et le test Bug 1 attend l'état canonique du seed (notamment toutes les
// mandatory et min_answers). Sans ce mode, Playwright peut paralléliser entre
// fichiers et le test Bug 1 voit un état pollué.
test.describe.configure({ mode: 'serial' });

const reseed = () =>
  execFileSync('bash', ['./db/seed.sh', '--force'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'ignore'],
  });

test.describe('Bug 2 — bouton « Imprimer vos réponses » sur la page submit', () => {
  test.beforeAll(() => {
    // Garantit un état canonique avant la 1re modif du sondage.
    reseed();
  });

  test.afterAll(() => {
    // Restore via seed : plus robuste que de rejouer des updates individuels
    // (GROUP_CONCAT a une limite à 1024 chars par défaut et tronquait
    // silencieusement notre snapshot mandatory pour 204 questions).
    reseed();
  });

  test('le bouton « Imprimer vos réponses » est rendu quand printanswers=Y', async ({ page }) => {
    // Configure pour permettre une soumission rapide (format A = all in one,
    // toutes les questions facultatives, pas de min_answers).
    sql(`UPDATE lime_questions SET mandatory='N' WHERE sid=${SID};`);
    sql(`UPDATE lime_question_attributes SET value='' WHERE attribute='min_answers';`);
    sql(`UPDATE lime_surveys SET format='A', printanswers='Y', showwelcome='N' WHERE sid=${SID};`);

    await page.goto(SURVEY_URL);
    await page.waitForLoadState('domcontentloaded');
    const submitBtn = page.locator('#ls-button-submit');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Sur la page submit, le bouton imprimer DSFR doit être présent
    const printLink = page.locator('a.fr-btn .fr-icon-printer-line, a.fr-btn.fr-icon-printer-line').first();
    await expect(printLink).toBeVisible();
  });

  test('le bouton « Imprimer vos réponses » est absent quand printanswers=N', async ({ page }) => {
    sql(`UPDATE lime_questions SET mandatory='N' WHERE sid=${SID};`);
    sql(`UPDATE lime_question_attributes SET value='' WHERE attribute='min_answers';`);
    sql(`UPDATE lime_surveys SET format='A', printanswers='N', showwelcome='N' WHERE sid=${SID};`);

    await page.goto(SURVEY_URL);
    await page.waitForLoadState('domcontentloaded');
    const submitBtn = page.locator('#ls-button-submit');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    await expect(page.locator('a.fr-btn.fr-icon-printer-line')).toHaveCount(0);
  });
});
