/**
 * Suite "results" — vérifie que la saisie front est correctement restituée
 * dans les résultats LimeSurvey.
 *
 * Pour chaque variante (A puis B), on :
 *   1. Ouvre une nouvelle session de questionnaire (URL `newtest=Y`)
 *   2. Remplit TOUS les champs visibles page par page avec des valeurs
 *      déterministes et uniques par variante
 *   3. Soumet la réponse finale
 *   4. Interroge la base de données LimeSurvey pour récupérer la dernière
 *      réponse soumise
 *   5. Vérifie colonne par colonne que ce qui a été saisi = ce qui est stocké
 *
 * La variante A et la variante B emploient des valeurs différentes, ce qui
 * protège contre les faux positifs où le test passerait parce que la DB
 * contiendrait des valeurs "par défaut" concordant fortuitement.
 *
 * Tagué `@results` — le runner `run_tests.sh` filtre dessus pour les modes
 * `--results` et `--full`. Les autres modes (`--ui`, `--classic`) excluent
 * ce tag via `--grep-invert`.
 */
import { test, expect, SURVEY_URL } from './fixtures/survey';
import { fillAllVisibleFields, currentStepLabel, type Variant, type FilledValues } from './helpers/formFiller';
import { getLatestSubmittedResponse, countSubmittedResponses } from './helpers/dbFetcher';
import type { Page } from '@playwright/test';

const NEXT_BTN = '#ls-button-submit[value="movenext"]';
const FINAL_SUBMIT_BTN = '#ls-button-submit[value="movesubmit"]';
const MAX_PAGES = 15;

/**
 * Remplit et soumet tout le questionnaire. Renvoie la map
 * {nom_de_colonne_SGQA → valeur saisie}.
 */
async function fillAndSubmitSurvey(page: Page, variant: Variant): Promise<FilledValues> {
  const all: FilledValues = new Map();

  await page.goto(SURVEY_URL);
  await page.waitForLoadState('domcontentloaded');

  // Page de bienvenue (si présente)
  const welcomeNext = page.locator(NEXT_BTN);
  if (await welcomeNext.isVisible().catch(() => false)) {
    await welcomeNext.click();
    await page.waitForLoadState('domcontentloaded');
  }

  for (let i = 0; i < MAX_PAGES; i++) {
    const stepBefore = await currentStepLabel(page);
    const pageValues = await fillAllVisibleFields(page, variant);
    pageValues.forEach((v, k) => all.set(k, v));

    const finalBtn = page.locator(FINAL_SUBMIT_BTN);
    if (await finalBtn.isVisible().catch(() => false)) {
      await finalBtn.click();
      await page.waitForLoadState('domcontentloaded');
      return all;
    }

    const nextBtn = page.locator(NEXT_BTN);
    if (!(await nextBtn.isVisible().catch(() => false))) {
      throw new Error(`Ni bouton "Suivant" ni bouton "Envoyer" à l'étape ${stepBefore ?? '?'}.`);
    }
    await nextBtn.click();
    await page.waitForLoadState('domcontentloaded');

    const stepAfter = await currentStepLabel(page);
    if (stepAfter && stepAfter === stepBefore) {
      // Pas d'avancement : on cherche l'explication dans les messages d'erreur
      const errorMessages = await page.locator('.fr-message--error, .question-container.input-error [id^="ls-question-text-"]').allTextContents();
      throw new Error(
        `Blocage à l'étape "${stepBefore}" (variante ${variant}) — pas d'avancement après clic sur Suivant. ` +
        `Messages d'erreur : ${JSON.stringify(errorMessages)}`,
      );
    }
  }

  throw new Error(`Questionnaire non soumis après ${MAX_PAGES} étapes.`);
}

/** Compare deux valeurs en étant tolérant au format numérique (DB MySQL
 *  stocke "1.0000000000" pour un int, mais le DOM a "1"). */
function valuesEqual(expected: string, actual: string): boolean {
  if (expected === actual) return true;
  // Normalisation "null → ''" déjà faite par l'appelant.

  // Dates AVANT la comparaison numérique : `parseFloat('15/06/2024')` vaut 15
  // et `parseFloat('2024-06-15 00:00:00')` vaut 2024 — la branche numérique
  // conclurait à tort à une divergence. Le DOM porte la valeur affichée,
  // la DB un datetime : on compare le jour, pas le format.
  const asDay = (v: string): string | null => {
    const fr = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
    const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    return null;
  };
  const expectedDay = asDay(expected.trim());
  const actualDay = asDay(actual.trim());
  if (expectedDay && actualDay) return expectedDay === actualDay;

  // Comparaison numérique, uniquement si les DEUX côtés sont des nombres purs
  // (la DB MySQL stocke "1.0000000000" là où le DOM a "1").
  const isNumeric = (v: string): boolean => /^-?\d+([.,]\d+)?$/.test(v.trim());
  if (isNumeric(expected) && isNumeric(actual)) {
    return parseFloat(expected.replace(',', '.')) === parseFloat(actual.replace(',', '.'));
  }
  return false;
}

/**
 * Compare la ligne DB à la map {nom_de_colonne → valeur lue dans le DOM
 * juste avant soumission}. Une colonne absente de la DB est signalée.
 * Les champs que le DOM n'a pas remplis (expected === '') sont ignorés
 * si la DB les a aussi à vide ou null.
 */
function expectRoundTrip(dbRow: Record<string, string | null>, filled: FilledValues): void {
  const mismatches: string[] = [];
  for (const [col, expected] of filled) {
    if (!(col in dbRow)) {
      if (expected === '') continue; // colonne inconnue côté DB + rien à vérifier → silencieux
      mismatches.push(`[${col}] colonne absente du résultat DB (attendu: "${expected}")`);
      continue;
    }
    const actual = dbRow[col] ?? '';
    if (!valuesEqual(expected, actual)) {
      mismatches.push(`[${col}] attendu "${expected}", obtenu "${actual}"`);
    }
  }
  expect(mismatches, `Divergences de restitution :\n  - ${mismatches.join('\n  - ')}`).toEqual([]);
}

test.describe.serial('@results — saisie → restitution round-trip', () => {
  // Remplir 7 pages + soumettre + requêter la DB prend facilement > 30s.
  test.describe.configure({ retries: 0, timeout: 180_000 });

  test('variante A : remplit tous les champs et vérifie la restitution DB', async ({ page }) => {
    const countBefore = countSubmittedResponses();

    const filled = await fillAndSubmitSurvey(page, 'A');
    expect(filled.size, 'aucune valeur saisie — le remplisseur est cassé').toBeGreaterThan(0);

    const countAfter = countSubmittedResponses();
    expect(countAfter, 'aucune nouvelle réponse n\'a été enregistrée en DB').toBeGreaterThan(countBefore);

    const dbRow = getLatestSubmittedResponse();
    expectRoundTrip(dbRow, filled);
  });

  test('variante B : mêmes champs avec d\'autres valeurs et restitution DB', async ({ page }) => {
    const countBefore = countSubmittedResponses();

    const filled = await fillAndSubmitSurvey(page, 'B');
    expect(filled.size).toBeGreaterThan(0);

    const countAfter = countSubmittedResponses();
    expect(countAfter).toBeGreaterThan(countBefore);

    const dbRow = getLatestSubmittedResponse();
    expectRoundTrip(dbRow, filled);

    // Sanity check : au moins une valeur texte porte bien le préfixe "Reponse-B",
    // preuve qu'on a bien vérifié la 2e passe et pas celle de la variante A.
    const hasBValue = Object.values(dbRow).some(
      (v) => typeof v === 'string' && v.startsWith('Reponse-B'),
    );
    expect(hasBValue, 'aucune valeur "Reponse-B" retrouvée dans la ligne DB').toBe(true);
  });
});
