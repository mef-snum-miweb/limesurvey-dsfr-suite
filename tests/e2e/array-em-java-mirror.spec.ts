import { test, expect, SURVEY_URL, navigateToSelector } from './fixtures/survey';
import { S } from './helpers/selectors';
import type { Page } from '@playwright/test';

/**
 * Non-régression : ExpressionManager sur les questions array (tableaux).
 *
 * Contexte du bug (thème DSFR, questionnaires JCS quotas/ateliers statFunctions) :
 * le core `em_javascript.js` met à jour le miroir caché `#java{sgqa}` et relance
 * ExpressionManager via une délégation d'événements attachée à des CLASSES :
 *
 *   $(document).on('change', '.radio-item :radio, .checkbox-item :checkbox, …',
 *                  () => checkconditions(value, name, 'radio'));
 *
 * `checkconditions()` fait `$('#java'+name).val(value)` PUIS recalcule relevance
 * et tailoring (statCountIf, sum, conditions…). Un ancien bloc de `scripts/theme.js`
 * (« SOLUTION SIMPLE : nettoyer les classes ») retirait `radio-item` /
 * `checkbox-item` / `answer-item` des cellules `<td>` de tableau au DOMContentLoaded.
 * Résultat : les radios d'un array ne matchaient plus le sélecteur du core →
 * `checkconditions()` jamais appelé → `#java` restait VIDE → toute expression
 * dépendant de l'array (relevance conditionnelle, statFunctions) calculait sur du
 * néant. Les listes radio simples (`.radio-item` en `<div>`, hors tableau) n'étaient
 * pas touchées, d'où l'attribution trompeuse au module statFunctions.
 *
 * Ces tests verrouillent les deux maillons de la chaîne :
 *  1. les cellules de tableau CONSERVENT les classes fonctionnelles ;
 *  2. cocher un radio d'array remplit bien son miroir `#java{sgqa}`.
 *
 * Repère : questionnaire 282267, `#question26` = array flexible (F, 4 sous-questions),
 * rendu en `table.ls-answers` avec un radio par ligne/colonne.
 */

async function goToArrayPage(page: Page): Promise<void> {
  await page.goto(SURVEY_URL);
  await page.waitForLoadState('domcontentloaded');
  await navigateToSelector(page, '#question26');
  // Laisse le core (bindings EM) + les transforms du thème (+100 ms) se poser.
  await page.waitForTimeout(400);
}

test.describe('Array EM — miroir #java et classes fonctionnelles', () => {

  test('les cellules radio d\'un tableau conservent la classe radio-item', async ({ page }) => {
    await goToArrayPage(page);

    const table = page.locator(S.arrayTable).first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Au moins une cellule porteuse d'un radio doit encore avoir `radio-item` :
    // c'est le point d'ancrage de la délégation d'événements du core EM.
    const radioCells = table.locator('td.radio-item');
    await expect(radioCells.first()).toBeAttached({ timeout: 5_000 });
    expect(await radioCells.count()).toBeGreaterThan(0);
  });

  test('cocher un radio d\'array remplit son miroir caché #java{sgqa}', async ({ page }) => {
    await goToArrayPage(page);

    const table = page.locator(S.arrayTable).first();
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Premier radio réel (non « sans réponse ») dans une cellule du tableau.
    const radio = table
      .locator('td input[type="radio"]:not([value=""])')
      .first();
    await expect(radio).toBeAttached({ timeout: 5_000 });

    const name = await radio.getAttribute('name');
    const value = await radio.getAttribute('value');
    expect(name, 'le radio doit avoir un name (sgqa)').toBeTruthy();

    // Le miroir doit exister et être vide avant interaction.
    const mirror = page.locator(`#java${name}`);
    await expect(mirror).toBeAttached({ timeout: 5_000 });
    expect(await mirror.inputValue()).toBe('');

    // Vraie interaction utilisateur → déclenche la délégation `change` du core.
    await radio.check({ force: true });
    await page.waitForTimeout(400);

    // Cœur de la non-régression : le miroir #java doit désormais porter la
    // valeur cochée. S'il reste vide, ExpressionManager (relevance, statCountIf,
    // sommes…) calcule sur du vide — le bug d'origine.
    await expect(mirror).toHaveValue(value ?? '', { timeout: 5_000 });
  });
});
