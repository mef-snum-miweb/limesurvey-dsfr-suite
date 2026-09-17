import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initRadioOtherField } from '../../modules/theme-dsfr/src/inputs/radio-buttons.js';
import { handleArrayValidation } from '../../modules/theme-dsfr/src/validation/array-validation.js';

/**
 * Non-régression « fieldnames » 6.x / 7.x (ADR-129, theme#46).
 *
 * LimeSurvey 7 a changé le format des noms de champs : SGQA `282267X3X18`
 * en 6.x, `Q18` en 7.x (et `_C…` / `_S…` pour les sous-champs). Les modules JS
 * du thème ne doivent JAMAIS décomposer un fieldname : ils utilisent des
 * sélecteurs par préfixe (`[id^="javatbd"]`) et repassent le nom tel quel.
 *
 * Ces tests verrouillent cette propriété : le même scénario est joué avec les
 * deux formats, et doit produire le même résultat. Si un module se met à parser
 * un fieldname (regex SGQA, split sur « X », slice…), un de ces cas casse.
 */
const FIELDNAMES = [
  ['SGQA (LimeSurvey 6.x)', '282267X3X18'],
  ['Q<qid> (LimeSurvey 7.x)', 'Q18'],
] as const;

describe('Compatibilité des fieldnames 6.x / 7.x', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  describe.each(FIELDNAMES)('champ « Autre » — %s', (_label, name) => {
    it('affiche le champ et restaure la valeur quelle que soit la forme du nom', () => {
      document.body.innerHTML = `
        <input type="radio" name="${name}" value="-oth-" checked>
        <div id="div${name}other" class="ls-js-hidden">
          <input type="text" id="answer${name}othertext" value="">
          <input type="hidden" id="answer${name}othertextaux" value="Ma réponse">
        </div>
      `;
      initRadioOtherField();

      expect(document.getElementById(`div${name}other`)!.classList.contains('ls-js-hidden')).toBe(false);
      expect((document.getElementById(`answer${name}othertext`) as HTMLInputElement).value).toBe('Ma réponse');
    });

    it('vide le champ « Autre » quand une autre option est choisie', () => {
      document.body.innerHTML = `
        <input type="radio" name="${name}" value="-oth-" checked>
        <input type="radio" name="${name}" value="A1">
        <div id="div${name}other">
          <input type="text" id="answer${name}othertext" value="Texte saisi">
          <input type="hidden" id="answer${name}othertextaux" value="Texte saisi">
        </div>
      `;
      initRadioOtherField();

      const sibling = document.querySelector(`input[value="A1"]`) as HTMLInputElement;
      sibling.checked = true;
      sibling.dispatchEvent(new Event('change'));

      expect((document.getElementById(`answer${name}othertext`) as HTMLInputElement).value).toBe('');
    });
  });

  describe.each(FIELDNAMES)('validation de tableau — %s', (_label, name) => {
    it('regroupe les lignes par nom de champ sans le décomposer', () => {
      document.body.innerHTML = `
        <div id="question18" class="question-container mandatory">
          <div class="fr-table">
            <table>
              <tbody>
                <tr><td><input type="radio" name="${name}_SQ001" value="1"></td></tr>
                <tr><td><input type="radio" name="${name}_SQ002" value="1"></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      const question = document.getElementById('question18')!;
      expect(() => handleArrayValidation(question)).not.toThrow();
    });
  });
});
