import { test, expect, advancePages } from './fixtures/survey';
import type { Page } from '@playwright/test';

/**
 * Contrat de la synchronisation des tips Expression Manager (issue theme-dsfr#42).
 *
 * Le core déclenche `classChangeGood`/`classChangeError` (jQuery) sur les nœuds
 * `#vmsg_{qid}_{vclass}` et y réécrit les textes tailorés. Le thème remplace
 * visuellement ces nœuds par des `<p class="fr-message" id="…-dsfr">` : il doit
 * relayer ces signaux dynamiques SANS réactiver le marquage `input-error` que
 * le core pose à froid sur les pages vierges (cause du revert de #29).
 *
 * Repères sur le questionnaire 282267 :
 * - page 2 : question219 multiple-short-txt obligatoire, EM `num_answers`
 *   (« Veuillez compléter de 2 à 4 réponses ») ;
 * - page 3 : question11 numeric-multi, EM `sum_range`
 *   (« La somme doit être comprise entre 3 et 10 »).
 */

// Laisse l'EM (run initial à ready) et les transforms du thème (+100 ms) se poser.
const SETTLE_MS = 800;

async function goToPage(page: Page, count: number): Promise<void> {
  await page.goto('/index.php/282267?newtest=Y&lang=fr');
  await page.waitForLoadState('domcontentloaded');
  await advancePages(page, count);
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * Saisit une valeur par une vraie frappe clavier : le thème ne relaie les
 * signaux EM qu'après une interaction utilisateur réelle (isTrusted), que
 * `fill()` (événements synthétiques) ne produit pas. Le `change` final est
 * dispatché pour déclencher la réévaluation EM sans attendre un blur.
 */
async function fillWithEmEvents(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector);
  await field.fill('');
  await field.pressSequentially(value);
  await field.dispatchEvent('change');
}

test.describe('Synchronisation des tips EM (#42)', () => {

  test('page vierge : une question multi-texte obligatoire ne porte aucune erreur à froid', async ({ page }) => {
    await goToPage(page, 2);

    // La question cible est bien là, avec son tip EM transformé en DSFR
    const tip = page.locator('#vmsg_219_num_answers-dsfr');
    await expect(tip).toBeVisible();
    await expect(tip).toHaveClass(/fr-message--info/);
    await expect(tip).not.toHaveClass(/fr-message--error/);

    // Aucun marquage d'erreur à froid, nulle part sur la page
    await expect(page.locator('.question-container.input-error')).toHaveCount(0);
    await expect(page.locator('#dsfr-error-summary')).toHaveCount(0);
    expect(await page.locator('.fr-message--error:visible').count()).toBe(0);
  });

  test('saisie partielle : le tip num_answers passe en erreur puis revient quand le minimum est atteint', async ({ page }) => {
    await goToPage(page, 2);

    const tip = page.locator('#vmsg_219_num_answers-dsfr');
    await expect(tip).toHaveClass(/fr-message--info/);

    const inputs = page.locator('#question219 .answer-item input[type="text"]');
    expect(await inputs.count()).toBeGreaterThanOrEqual(2);

    // 1 réponse sur un minimum de 2 → l'EM signale l'insuffisance
    await fillWithEmEvents(page, '#question219 .answer-item input[type="text"] >> nth=0', 'Première réponse');
    await expect(tip).toHaveClass(/fr-message--error/, { timeout: 3_000 });

    // 2e réponse → le minimum est atteint, le tip redevient informatif
    await fillWithEmEvents(page, '#question219 .answer-item input[type="text"] >> nth=1', 'Deuxième réponse');
    await expect(tip).not.toHaveClass(/fr-message--error/, { timeout: 3_000 });
    await expect(tip).toHaveClass(/fr-message--info/);
  });

  test('somme numeric-multi : le tip sum_range suit dynamiquement la validité de la somme', async ({ page }) => {
    await goToPage(page, 3);

    const tip = page.locator('#vmsg_11_sum_range-dsfr');
    await expect(tip).toBeVisible();
    await expect(tip).toHaveClass(/fr-message--info/);

    const inputs = page.locator('#question11 input[data-number="1"]:not(.dynamic-total)');
    expect(await inputs.count()).toBeGreaterThanOrEqual(2);

    // Somme hors bornes (8 + 7 = 15 > 10) → erreur dynamique
    await fillWithEmEvents(page, '#question11 input[data-number="1"] >> nth=0', '8');
    await fillWithEmEvents(page, '#question11 input[data-number="1"] >> nth=1', '7');
    await expect(tip).toHaveClass(/fr-message--error/, { timeout: 3_000 });

    // Somme ramenée dans les bornes (2 + 3 = 5 ∈ [3, 10]) → retour à l'info
    await fillWithEmEvents(page, '#question11 input[data-number="1"] >> nth=0', '2');
    await fillWithEmEvents(page, '#question11 input[data-number="1"] >> nth=1', '3');
    await expect(tip).not.toHaveClass(/fr-message--error/, { timeout: 3_000 });
  });
});
