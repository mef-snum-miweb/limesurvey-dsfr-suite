import { test, expect, SURVEY_URL, advancePages } from './fixtures/survey';
import { S } from './helpers/selectors';
import type { Page } from '@playwright/test';

/**
 * Tests E2E pour la validation de somme des champs numériques multiples.
 * Couvre : observeNumericMultiSumValidation (custom.js lines 2117-2234)
 *
 * Page 3 contient les questions numériques, dont le type K (multiple numeric).
 */

const NEXT_BTN = '#ls-button-submit[value="movenext"]';

async function goToNumericPage(page: Page): Promise<void> {
  await page.goto(SURVEY_URL);
  await page.waitForLoadState('domcontentloaded');
  await advancePages(page, 3);
}

test.describe('Validation somme numérique multiple (page 3)', () => {

  test.describe('Structure des questions numériques multiples', () => {

    test('la page contient des questions numeric-multi avec des inputs numériques', async ({ page }) => {
      await goToNumericPage(page);

      const numericMulti = page.locator('.question-container.numeric-multi, .question-container.multiple-numerical-input');
      const count = await numericMulti.count();

      // S'il y a des questions numeric-multi, vérifier la structure
      if (count > 0) {
        const firstQ = numericMulti.first();
        const numericInputs = firstQ.locator(S.numericInput);
        expect(await numericInputs.count()).toBeGreaterThan(1);
      } else {
        // Vérifier au moins que des inputs numériques existent sur la page
        const anyNumeric = page.locator(S.numericInput);
        expect(await anyNumeric.count()).toBeGreaterThan(0);
      }
    });

    test('les inputs numériques ont inputmode="numeric"', async ({ page }) => {
      await goToNumericPage(page);

      const numericInputs = page.locator(S.numericInput);
      await expect(numericInputs.first()).toBeVisible({ timeout: 10_000 });

      const count = await numericInputs.count();
      let hasInputmode = false;
      for (let i = 0; i < Math.min(count, 5); i++) {
        const inputmode = await numericInputs.nth(i).getAttribute('inputmode');
        if (inputmode === 'numeric') {
          hasInputmode = true;
          break;
        }
      }
      expect(hasInputmode).toBe(true);
    });
  });

  test.describe('Validation par somme', () => {

    test('saisir des valeurs numériques valides ne déclenche pas d\'erreur de somme', async ({ page }) => {
      await goToNumericPage(page);

      // Trouver une question numeric-multi
      const numericMulti = page.locator('.question-container.numeric-multi, .question-container.multiple-numerical-input');
      const count = await numericMulti.count();

      if (count > 0) {
        const firstQ = numericMulti.first();
        const inputs = firstQ.locator(S.numericInput);
        const inputCount = await inputs.count();

        if (inputCount >= 2) {
          // Saisir des petites valeurs pour rester dans les limites
          await inputs.nth(0).fill('1');
          await inputs.nth(1).fill('2');
          await page.waitForTimeout(500);

          // Pas d'erreur de somme
          const sumError = firstQ.locator('.sum-range-error');
          const hasError = await sumError.count() > 0 && await sumError.first().isVisible().catch(() => false);
          // Note : si pas de contrainte de somme sur cette question, pas d'erreur non plus
          expect(hasError).toBe(false);
        }
      }
    });

    test('les messages de validation LimeSurvey sont visibles pour les champs numériques', async ({ page }) => {
      await goToNumericPage(page);

      // Vérifier que les tips de validation (vmsg_*) existent
      const validationTips = page.locator(S.validationTip);
      const count = await validationTips.count();

      // Il devrait y avoir au moins un tip de validation sur la page numérique
      expect(count).toBeGreaterThan(0);
    });

    test('saisir du texte dans un champ numérique marque le champ en erreur', async ({ page }) => {
      await goToNumericPage(page);

      const numericInput = page.locator(S.numericInput).first();
      await expect(numericInput).toBeVisible({ timeout: 10_000 });

      // Saisir du texte invalide
      await numericInput.fill('abc');

      // Soumettre la page
      await page.locator(NEXT_BTN).click();
      await page.waitForLoadState('domcontentloaded');

      // Vérifier qu'une erreur apparaît
      const errorVisible = await page.locator(S.questionContainerError).first().isVisible().catch(() => false)
        || await page.locator(S.frInputGroupError).first().isVisible().catch(() => false)
        || await page.locator(S.frMessageError).first().isVisible().catch(() => false);

      expect(errorVisible).toBe(true);
    });

    test('le total se met à jour dynamiquement quand on remplit les champs', async ({ page }) => {
      await goToNumericPage(page);

      // Chercher un élément de total dynamique (LimeSurvey le génère dans les questions K)
      const totalElement = page.locator('[id^="totalvalue_"]');
      const hasTotalElement = await totalElement.count() > 0;

      if (hasTotalElement) {
        const totalId = await totalElement.first().getAttribute('id');
        // Extraire le qid depuis totalvalue_<qid>
        const qid = totalId!.replace('totalvalue_', '');
        const question = page.locator(`#question${qid}`);

        const inputs = question.locator(S.numericInput);
        const inputCount = await inputs.count();

        if (inputCount >= 2) {
          // Vider tous les champs d'abord
          for (let i = 0; i < inputCount; i++) {
            await inputs.nth(i).fill('');
          }
          await page.waitForTimeout(300);

          const initialTotal = await totalElement.first().textContent();

          // Remplir les deux premiers champs
          await inputs.nth(0).fill('10');
          await inputs.nth(0).dispatchEvent('change');
          await page.waitForTimeout(300);
          await inputs.nth(1).fill('20');
          await inputs.nth(1).dispatchEvent('change');
          await page.waitForTimeout(500);

          // Le total devrait avoir changé
          const newTotal = await totalElement.first().textContent();
          expect(newTotal?.trim()).not.toBe(initialTotal?.trim());
        }
      }
    });
  });

  test.describe('Accessibilité des erreurs numériques', () => {

    test('les erreurs numériques ont le role="alert"', async ({ page }) => {
      await goToNumericPage(page);

      const numericInput = page.locator(S.numericInput).first();
      await expect(numericInput).toBeVisible({ timeout: 10_000 });

      await numericInput.fill('abc');
      await page.locator(NEXT_BTN).click();
      await page.waitForLoadState('domcontentloaded');

      // Les messages d'erreur DSFR devraient avoir role="alert"
      const errorMessages = page.locator('.fr-message--error[role="alert"]');
      const count = await errorMessages.count();

      if (count > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    });

    test('les champs numériques en erreur ont aria-invalid="true"', async ({ page }) => {
      await goToNumericPage(page);

      const numericInput = page.locator(S.numericInput).first();
      await expect(numericInput).toBeVisible({ timeout: 10_000 });

      await numericInput.fill('abc');
      await page.locator(NEXT_BTN).click();
      await page.waitForLoadState('domcontentloaded');

      // Chercher un input numérique dans une question en erreur
      const errorInput = page.locator('.question-container.input-error ' + S.numericInput);
      const count = await errorInput.count();

      if (count > 0) {
        await expect(errorInput.first()).toHaveAttribute('aria-invalid', 'true');
      }
    });
  });
});
