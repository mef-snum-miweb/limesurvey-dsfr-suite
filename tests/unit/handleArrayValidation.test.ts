import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleArrayValidation } from '../../modules/theme-dsfr/src/validation/array-validation.js';

// handleArrayValidation planifie setTimeout(updateErrorSummary, 50) après mutation
// — on active les fake timers pour capturer et neutraliser ces timeouts, sinon
// jsdom se termine avant leur exécution et updateErrorSummary lève
// "document is not defined" en unhandled error.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

// --- Helpers ---

function buildArrayDOM(qid: string, options?: { withErrors?: boolean }): void {
  const errorClasses = options?.withErrors
    ? 'fr-input--error error'
    : '';
  document.body.innerHTML = `
    <div id="${qid}" class="question-container input-error array-5-point">
      <div class="ls-question-mandatory">Ce champ est obligatoire</div>
      <div class="ls-question-mandatory-array">Répondez à toutes les lignes</div>
      <div class="question-valid-container">OK</div>
      <div class="fr-table">
        <table class="ls-answers">
          <thead><tr><th>Q</th><th>1</th><th>2</th></tr></thead>
          <tbody>
            <tr class="ls-mandatory-error">
              <th class="fr-text--error">Ligne 1</th>
              <td class="has-error"><div class="fr-input-group fr-input-group--error">
                <input type="text" class="${errorClasses}">
              </div></td>
              <td class="has-error"><div class="fr-input-group fr-input-group--error">
                <input type="text" class="${errorClasses}">
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// --- Tests ---

describe('handleArrayValidation', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('masque les messages d\'erreur legacy LimeSurvey', () => {
    buildArrayDOM('question10');
    handleArrayValidation();

    expect((document.querySelector('.ls-question-mandatory') as HTMLElement).style.display).toBe('none');
    expect((document.querySelector('.ls-question-mandatory-array') as HTMLElement).style.display).toBe('none');
    expect((document.querySelector('.question-valid-container') as HTMLElement).style.display).toBe('none');
  });

  it('retire les classes d\'erreur individuelles sur les inputs', () => {
    buildArrayDOM('question10', { withErrors: true });
    handleArrayValidation();

    document.querySelectorAll('table input').forEach((input) => {
      expect(input.classList.contains('fr-input--error')).toBe(false);
      expect(input.classList.contains('error')).toBe(false);
    });
  });

  it('retire fr-input-group--error des cellules', () => {
    buildArrayDOM('question10', { withErrors: true });
    handleArrayValidation();

    document.querySelectorAll('.fr-input-group').forEach((grp) => {
      expect(grp.classList.contains('fr-input-group--error')).toBe(false);
    });
  });

  it('retire ls-mandatory-error des lignes et fr-text--error des th', () => {
    buildArrayDOM('question10');
    handleArrayValidation();

    expect(document.querySelectorAll('tr.ls-mandatory-error').length).toBe(0);
    expect(document.querySelectorAll('th.fr-text--error').length).toBe(0);
  });

  it('retire has-error des cellules td', () => {
    buildArrayDOM('question10');
    handleArrayValidation();

    expect(document.querySelectorAll('td.has-error').length).toBe(0);
  });

  it('crée un compteur global avec aria-live="polite"', () => {
    buildArrayDOM('question10');
    handleArrayValidation();

    const counter = document.getElementById('mandatory-counter-question10');
    expect(counter).not.toBeNull();
    expect(counter!.getAttribute('aria-live')).toBe('polite');
    expect(counter!.querySelector('.fr-message--error')).not.toBeNull();
  });

  it('insère le compteur après le tableau', () => {
    buildArrayDOM('question10');
    handleArrayValidation();

    const table = document.querySelector('.fr-table')!;
    const counter = table.nextElementSibling;
    expect(counter!.id).toBe('mandatory-counter-question10');
  });

  it('ne retraite pas une question déjà attachée', () => {
    buildArrayDOM('question10');
    handleArrayValidation();
    handleArrayValidation();

    expect(document.querySelectorAll('[id^="mandatory-counter-"]').length).toBe(1);
  });

  it('ne fait rien s\'il n\'y a pas de question array en erreur', () => {
    document.body.innerHTML = '<div class="question-container input-error"><input></div>';
    expect(() => handleArrayValidation()).not.toThrow();
    expect(document.querySelector('[id^="mandatory-counter-"]')).toBeNull();
  });
});

/**
 * Tableaux À CHOIX (radios) — régression 527199 (Q17DGCCRF, Q17INSEE…).
 * Avant le fix, `handleArrayValidation` ne comptait que les champs texte ;
 * un tableau de radios (0 champ texte) était considéré « tout rempli »,
 * `input-error` retiré, et la question disparaissait du récapitulatif.
 */
describe('handleArrayValidation — tableaux à choix (radios)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  /**
   * Tableau radio à `rows` lignes × 2 colonnes. `answered` = nb de lignes
   * dont un radio est coché (les premières).
   */
  function buildRadioArrayDOM(qid: string, rows: number, answered = 0): void {
    let trs = '';
    for (let r = 1; r <= rows; r++) {
      const name = `q${qid}SQ00${r}`;
      const checkedA = r <= answered ? 'checked' : '';
      trs += `
        <tr class="ls-mandatory-error">
          <th class="fr-text--error">Ligne ${r}</th>
          <td><input type="radio" name="${name}" value="A1" ${checkedA}></td>
          <td><input type="radio" name="${name}" value="A2"></td>
        </tr>`;
    }
    document.body.innerHTML = `
      <div id="${qid}" class="question-container input-error array-flexible-row mandatory">
        <div class="ls-question-mandatory">Obligatoire</div>
        <div class="question-valid-container">OK</div>
        <div class="fr-table">
          <table class="ls-answers"><tbody>${trs}</tbody></table>
        </div>
      </div>`;
  }

  it('NE retire PAS input-error sur un tableau radio incomplet (cœur du bug 527199)', () => {
    buildRadioArrayDOM('question238', 8, 2); // 2/8 lignes répondues
    handleArrayValidation();

    const q = document.getElementById('question238')!;
    expect(q.classList.contains('input-error')).toBe(true);
    expect(q.classList.contains('input-valid')).toBe(false);
  });

  it('affiche un compteur de LIGNES restantes (pas de champs)', () => {
    buildRadioArrayDOM('question238', 8, 2);
    handleArrayValidation();

    const counter = document.getElementById('mandatory-counter-question238')!;
    expect(counter).not.toBeNull();
    // 6 lignes restantes sur 8
    expect(counter.textContent).toContain('6');
    expect(counter.textContent).toContain('lignes');
  });

  it('message "dernière ligne" au singulier quand il reste 1 ligne', () => {
    buildRadioArrayDOM('question238', 3, 2);
    handleArrayValidation();

    const counter = document.getElementById('mandatory-counter-question238')!;
    expect(counter.textContent).toBe('Veuillez répondre à la dernière ligne.');
  });

  it('passe en valide et retire le compteur quand toutes les lignes sont répondues', () => {
    buildRadioArrayDOM('question238', 3, 2);
    handleArrayValidation();

    const q = document.getElementById('question238')!;
    // L'utilisateur répond à la 3e ligne.
    const lastRowRadio = q.querySelector('input[name="qquestion238SQ003"]') as HTMLInputElement;
    lastRowRadio.checked = true;
    lastRowRadio.dispatchEvent(new Event('change', { bubbles: true }));

    expect(q.classList.contains('input-error')).toBe(false);
    expect(q.classList.contains('input-valid')).toBe(true);
    expect(document.getElementById('mandatory-counter-question238')).toBeNull();
  });

  it('masque l\'habillage d\'erreur natif (ls-mandatory-error / fr-text--error)', () => {
    buildRadioArrayDOM('question238', 4, 1);
    handleArrayValidation();

    expect(document.querySelectorAll('tr.ls-mandatory-error').length).toBe(0);
    expect(document.querySelectorAll('th.fr-text--error').length).toBe(0);
  });

  it('un tableau radio entièrement répondu n\'est pas marqué en erreur', () => {
    buildRadioArrayDOM('question238', 4, 4);
    handleArrayValidation();

    const q = document.getElementById('question238')!;
    expect(q.classList.contains('input-error')).toBe(false);
    expect(q.classList.contains('input-valid')).toBe(true);
  });
});
