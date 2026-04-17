import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Reproduire la logique interne checkSumAndUpdate depuis custom.js (lines 2117-2234) ---
// La fonction observeNumericMultiSumValidation est complexe (DOM + events + setTimeout).
// On teste la logique de calcul et d'affichage en isolation.

/**
 * Logique de vérification de la somme extraite de observeNumericMultiSumValidation.
 * Retourne { isSumError, currentSum, anyFilled }.
 */
function checkSum(
  inputs: HTMLInputElement[],
  minSum: number,
  maxSum: number
): { isSumError: boolean; currentSum: number; anyFilled: boolean } {
  let currentSum = 0;
  let anyFilled = false;

  inputs.forEach(function (inp) {
    const val = inp.value ? inp.value.trim().replace(',', '.') : '';
    if (val !== '' && !isNaN(parseFloat(val))) {
      currentSum += parseFloat(val);
      anyFilled = true;
    }
  });

  const isSumError = anyFilled && (currentSum < minSum || currentSum > maxSum);
  return { isSumError, currentSum, anyFilled };
}

/**
 * Parse les limites depuis le texte du message de validation.
 * Extraite du regex dans observeNumericMultiSumValidation.
 */
function parseRange(text: string): { min: number; max: number } | null {
  const match = text.match(/(\d+)\s+.+\s+(\d+)/);
  if (!match) return null;
  return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
}

/**
 * Applique les classes d'erreur/info sur le message de somme.
 */
function applySumState(
  sumRangeMsg: HTMLElement,
  isSumError: boolean
): void {
  if (isSumError) {
    sumRangeMsg.classList.remove('fr-message--info', 'fr-message--valid');
    sumRangeMsg.classList.add('fr-message--error');
    sumRangeMsg.setAttribute('role', 'alert');
  } else {
    sumRangeMsg.classList.remove('fr-message--error');
    sumRangeMsg.classList.add('fr-message--info');
    sumRangeMsg.removeAttribute('role');
  }
}

// --- Tests ---

describe('observeNumericMultiSumValidation — logique checkSum', () => {
  describe('checkSum', () => {
    function makeInputs(values: string[]): HTMLInputElement[] {
      return values.map((v) => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = v;
        return input;
      });
    }

    it('pas d\'erreur si la somme est dans les limites', () => {
      const result = checkSum(makeInputs(['3', '4', '3']), 5, 15);
      expect(result.isSumError).toBe(false);
      expect(result.currentSum).toBe(10);
      expect(result.anyFilled).toBe(true);
    });

    it('erreur si la somme est inférieure au minimum', () => {
      const result = checkSum(makeInputs(['1', '1']), 5, 15);
      expect(result.isSumError).toBe(true);
      expect(result.currentSum).toBe(2);
    });

    it('erreur si la somme est supérieure au maximum', () => {
      const result = checkSum(makeInputs(['10', '8']), 5, 15);
      expect(result.isSumError).toBe(true);
      expect(result.currentSum).toBe(18);
    });

    it('pas d\'erreur si aucun champ n\'est rempli', () => {
      const result = checkSum(makeInputs(['', '', '']), 5, 15);
      expect(result.isSumError).toBe(false);
      expect(result.anyFilled).toBe(false);
    });

    it('gère les virgules comme séparateur décimal', () => {
      const result = checkSum(makeInputs(['3,5', '1,5']), 3, 10);
      expect(result.isSumError).toBe(false);
      expect(result.currentSum).toBe(5);
    });

    it('gère les points comme séparateur décimal', () => {
      const result = checkSum(makeInputs(['3.5', '1.5']), 3, 10);
      expect(result.isSumError).toBe(false);
      expect(result.currentSum).toBe(5);
    });

    it('ignore les champs vides dans le calcul', () => {
      const result = checkSum(makeInputs(['5', '', '5']), 5, 15);
      expect(result.currentSum).toBe(10);
      expect(result.anyFilled).toBe(true);
    });

    it('pas d\'erreur à la frontière exacte (min = max = somme)', () => {
      const result = checkSum(makeInputs(['5', '5']), 10, 10);
      expect(result.isSumError).toBe(false);
      expect(result.currentSum).toBe(10);
    });

    it('ignore les valeurs non numériques', () => {
      const result = checkSum(makeInputs(['abc', '5', 'xyz']), 3, 10);
      expect(result.currentSum).toBe(5);
      expect(result.anyFilled).toBe(true);
    });

    it('gère les espaces dans les valeurs', () => {
      const result = checkSum(makeInputs([' 3 ', ' 4 ']), 5, 10);
      expect(result.currentSum).toBe(7);
      expect(result.isSumError).toBe(false);
    });
  });

  describe('parseRange', () => {
    it('parse "entre 3 et 10"', () => {
      expect(parseRange('La somme doit être entre 3 et 10')).toEqual({ min: 3, max: 10 });
    });

    it('parse "entre 0 et 100"', () => {
      expect(parseRange('Valeur entre 0 et 100')).toEqual({ min: 0, max: 100 });
    });

    it('retourne null si pas de match', () => {
      expect(parseRange('Texte sans nombres')).toBeNull();
    });

    it('parse un message LimeSurvey typique', () => {
      expect(parseRange('La somme des valeurs doit être comprise entre 5 et 20')).toEqual({ min: 5, max: 20 });
    });
  });

  describe('applySumState', () => {
    it('ajoute fr-message--error et role="alert" en cas d\'erreur', () => {
      const msg = document.createElement('p');
      msg.className = 'fr-message fr-message--info';

      applySumState(msg, true);

      expect(msg.classList.contains('fr-message--error')).toBe(true);
      expect(msg.classList.contains('fr-message--info')).toBe(false);
      expect(msg.getAttribute('role')).toBe('alert');
    });

    it('retire fr-message--error et le role en cas de succès', () => {
      const msg = document.createElement('p');
      msg.className = 'fr-message fr-message--error';
      msg.setAttribute('role', 'alert');

      applySumState(msg, false);

      expect(msg.classList.contains('fr-message--info')).toBe(true);
      expect(msg.classList.contains('fr-message--error')).toBe(false);
      expect(msg.hasAttribute('role')).toBe(false);
    });
  });
});

describe('observeNumericMultiSumValidation — intégration DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('structure le DOM correctement pour la validation de somme', () => {
    // Vérifier que la structure DOM attendue par la fonction est testable
    document.body.innerHTML = `
      <div class="question-container numeric-multi" id="question10">
        <div class="ls-group-total">
          <div class="ls-input-group">
            <span class="dynamic-total" id="totalvalue_10">0</span>
          </div>
        </div>
        <div class="ls-questionhelp" id="vmsg_10_sum_range">
          La somme doit être entre 5 et 20
        </div>
        <input class="numeric" data-number="1" value="3">
        <input class="numeric" data-number="1" value="4">
      </div>
    `;

    // Vérifier les sélecteurs utilisés par la fonction
    const question = document.querySelector('.question-container.numeric-multi');
    expect(question).not.toBeNull();

    const totalEl = question!.querySelector('.dynamic-total');
    expect(totalEl).not.toBeNull();
    expect(totalEl!.id).toBe('totalvalue_10');

    const qId = totalEl!.id.replace('totalvalue_', '');
    expect(qId).toBe('10');

    const sumRangeMsg = document.getElementById('vmsg_' + qId + '_sum_range');
    expect(sumRangeMsg).not.toBeNull();

    const range = parseRange(sumRangeMsg!.textContent!);
    expect(range).toEqual({ min: 5, max: 20 });

    const inputs = question!.querySelectorAll('input.numeric[data-number="1"]') as NodeListOf<HTMLInputElement>;
    expect(inputs.length).toBe(2);

    const result = checkSum(Array.from(inputs), range!.min, range!.max);
    expect(result.currentSum).toBe(7);
    expect(result.isSumError).toBe(false);
  });
});
