import { execFileSync } from 'node:child_process';
import { test, expect } from './fixtures/survey';
import { SURVEY_URL } from './fixtures/survey';

/**
 * Régression : la barre de progression DSFR ne doit pas dépendre du paramètre
 * "Afficher l'index des questions" (questionindex). Historiquement, le stepper
 * exigeait aQuestionIndex.items non vide pour s'afficher — ce qui forçait à
 * activer l'index (incremental ou full) pour voir la barre. Voir bug remonté
 * par le métier sur Galileo BNA le 2026-05-27.
 *
 * Sources LS : SurveyRuntimeHelper::run() peuple aSurveyInfo.progress.{value,
 * currentstep, total} dès que showprogress=Y et format != 'A', indépendamment
 * de questionindex. C'est ce qu'on utilise désormais en fallback.
 */

const SID = 282267;
const SQL = (query: string) =>
  execFileSync(
    'docker',
    [
      'exec',
      'limesurvey-dev-db',
      'mysql',
      '-u', 'limesurvey',
      '-plimesurvey',
      '-D', 'limesurvey',
      '-sNe', query,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  ).trim();

function setSurveyConfig(showprogress: 'Y' | 'N', questionindex: 0 | 1 | 2): void {
  SQL(`UPDATE lime_surveys SET showprogress='${showprogress}', questionindex=${questionindex} WHERE sid=${SID};`);
}

function readSurveyConfig(): { showprogress: string; questionindex: number } {
  const out = SQL(`SELECT showprogress, questionindex FROM lime_surveys WHERE sid=${SID};`);
  const [showprogress, qi] = out.split('\t');
  return { showprogress, questionindex: parseInt(qi, 10) };
}

let initialConfig: { showprogress: string; questionindex: number };

test.beforeAll(() => {
  initialConfig = readSurveyConfig();
});

// Restaure l'état initial après chaque test, pour éviter qu'un autre spec
// tournant en parallèle ne voie une config modifiée.
test.afterEach(() => {
  setSurveyConfig(initialConfig.showprogress as 'Y' | 'N', initialConfig.questionindex as 0 | 1 | 2);
});

test.describe.serial('Barre de progression DSFR — découplée de l\'index des questions', () => {
  for (const mode of [0, 1, 2] as const) {
    const label = mode === 0 ? 'Désactivé' : mode === 1 ? 'Incrémental' : 'Complet';

    test(`stepper visible avec questionindex=${mode} (${label}) + showprogress=Y`, async ({ page }) => {
      setSurveyConfig('Y', mode);

      await page.goto(SURVEY_URL);
      await page.waitForLoadState('domcontentloaded');

      // Welcome page (step=0) : le stepper est volontairement masqué (LS ne
      // calcule totalsteps qu'après le 1er "Suivant"). On passe la welcome.
      await page.locator('#ls-button-submit[value="movenext"]').click();
      await page.waitForLoadState('domcontentloaded');

      const stepper = page.locator('.fr-stepper');
      await expect(stepper).toBeVisible();

      // Vérifie que les data-attributs sont peuplés (le JS stepper-progress.js
      // les utilise pour générer le linear-gradient segmenté).
      const stepsAttr = await stepper.locator('.fr-stepper__steps').getAttribute('data-fr-steps');
      const currentAttr = await stepper.locator('.fr-stepper__steps').getAttribute('data-fr-current-step');
      const totalSteps = parseInt(stepsAttr ?? '0', 10);
      const currentStep = parseInt(currentAttr ?? '0', 10);

      // Mode Désactivé/Complet : totalSteps = nb de groupes (8 pour le sondage
      // de test). Mode Incrémental : aQuestionIndex.items ne contient que les
      // étapes déjà visitées (donc 1 après la 1re page). On accepte les deux.
      expect(totalSteps).toBeGreaterThanOrEqual(1);
      expect(currentStep).toBeGreaterThanOrEqual(1);
      expect(currentStep).toBeLessThanOrEqual(totalSteps);

      // Le titre doit contenir le nom du groupe courant (récupéré depuis
      // aSurveyInfo.aGroups en mode "Désactivé", ou aQuestionIndex.items en
      // mode "Incrémental"/"Complet"). On accepte les deux : on vérifie juste
      // qu'on n'a PAS le libellé générique "Étape courante".
      const title = await page.locator('.fr-stepper__title').textContent();
      expect(title).not.toMatch(/^Étape courante/);
    });
  }

  test('welcome page : stepper masqué même avec showprogress=Y', async ({ page }) => {
    setSurveyConfig('Y', 0);

    await page.goto(SURVEY_URL);
    await page.waitForLoadState('domcontentloaded');

    // Sur la welcome page (step=0), LS renvoie totalsteps=1 et currentstep=1,
    // ce qui afficherait une barre pleine trompeuse — on masque jusqu'à la
    // première vraie étape.
    await expect(page.locator('.fr-stepper')).toHaveCount(0);
  });

  test('stepper masqué quand showprogress=N quel que soit questionindex', async ({ page }) => {
    setSurveyConfig('N', 2);

    await page.goto(SURVEY_URL);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('.fr-stepper')).toHaveCount(0);
  });
});
