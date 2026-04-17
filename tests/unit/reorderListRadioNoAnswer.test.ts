import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// --- Reproduire la logique depuis custom.js (lines 3713-3781) ---

function reorderListRadioNoAnswer(): void {
  const questions = document.querySelectorAll('.list-radio.question-container');
  questions.forEach(function (q) {
    if ((q as HTMLElement).dataset.listradioReordered === '1') return;

    const noAnswerRadio = q.querySelector('input[type="radio"][value=""]') as HTMLInputElement | null;
    if (!noAnswerRadio) return;

    const noAnswerRow = noAnswerRadio.closest('.fr-fieldset__element');
    if (!noAnswerRow) return;

    const content = noAnswerRow.parentNode as HTMLElement;
    if (content && content.firstElementChild !== noAnswerRow) {
      content.insertBefore(noAnswerRow, content.firstElementChild);
    }

    const allRadios = q.querySelectorAll(
      'input[type="radio"][name="' + noAnswerRadio.name + '"]'
    ) as NodeListOf<HTMLInputElement>;
    const anyChecked = Array.prototype.some.call(allRadios, function (r: HTMLInputElement) {
      return r.checked;
    });

    const otherRadio = q.querySelector('input[type="radio"][id^="SOTH"]') as HTMLInputElement | null;
    let isIncompleteOther = false;
    if (otherRadio && otherRadio.checked) {
      const otherText = q.querySelector('[id$="othertext"]') as HTMLInputElement | null;
      if (otherText && otherText.value.trim() === '') {
        isIncompleteOther = true;
      }
    }

    if (!anyChecked || isIncompleteOther) {
      allRadios.forEach(function (r) {
        r.checked = false;
        r.removeAttribute('checked');
      });
      noAnswerRadio.checked = true;
      noAnswerRadio.setAttribute('checked', 'checked');

      const javaInput = q.querySelector('input[type="hidden"][id^="java"]') as HTMLInputElement | null;
      if (javaInput) javaInput.value = '';

      if (otherRadio) {
        otherRadio.setAttribute('aria-expanded', 'false');
      }
    }

    (q as HTMLElement).dataset.listradioReordered = '1';
  });
}

// --- Tests ---

describe('reorderListRadioNoAnswer', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('déplace "Sans réponse" en première position', () => {
    document.body.innerHTML = `
      <div class="list-radio question-container">
        <div class="fr-fieldset__content">
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="A"> A</div>
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="B"> B</div>
          <div class="fr-fieldset__element"><input type="radio" name="q1" value=""> Sans réponse</div>
        </div>
      </div>
    `;

    reorderListRadioNoAnswer();

    const firstRadio = document.querySelector('.fr-fieldset__content .fr-fieldset__element:first-child input') as HTMLInputElement;
    expect(firstRadio.value).toBe('');
  });

  it('coche "Sans réponse" si aucun radio n\'est sélectionné', () => {
    document.body.innerHTML = `
      <div class="list-radio question-container">
        <div class="fr-fieldset__content">
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="A"> A</div>
          <div class="fr-fieldset__element"><input type="radio" name="q1" value=""> Sans réponse</div>
        </div>
      </div>
    `;

    reorderListRadioNoAnswer();

    const noAnswer = document.querySelector('input[value=""]') as HTMLInputElement;
    expect(noAnswer.checked).toBe(true);
    expect(noAnswer.hasAttribute('checked')).toBe(true);
  });

  it('ne change pas la sélection si un radio est déjà coché', () => {
    document.body.innerHTML = `
      <div class="list-radio question-container">
        <div class="fr-fieldset__content">
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="A" checked> A</div>
          <div class="fr-fieldset__element"><input type="radio" name="q1" value=""> Sans réponse</div>
        </div>
      </div>
    `;

    reorderListRadioNoAnswer();

    const radioA = document.querySelector('input[value="A"]') as HTMLInputElement;
    expect(radioA.checked).toBe(true);
  });

  it('reset sur "Sans réponse" si "Autre" est coché mais le champ est vide', () => {
    document.body.innerHTML = `
      <div class="list-radio question-container">
        <div class="fr-fieldset__content">
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="A"> A</div>
          <div class="fr-fieldset__element">
            <input type="radio" name="q1" value="-oth-" id="SOTH42" checked>
            <input type="text" id="answer42othertext" value="">
          </div>
          <div class="fr-fieldset__element"><input type="radio" name="q1" value=""> Sans réponse</div>
        </div>
      </div>
    `;

    reorderListRadioNoAnswer();

    const noAnswer = document.querySelector('input[value=""]') as HTMLInputElement;
    expect(noAnswer.checked).toBe(true);

    const other = document.getElementById('SOTH42') as HTMLInputElement;
    expect(other.checked).toBe(false);
    expect(other.getAttribute('aria-expanded')).toBe('false');
  });

  it('ne retraite pas une question déjà marquée', () => {
    document.body.innerHTML = `
      <div class="list-radio question-container" data-listradio-reordered="1">
        <div class="fr-fieldset__content">
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="A"> A</div>
          <div class="fr-fieldset__element"><input type="radio" name="q1" value=""> Sans réponse</div>
        </div>
      </div>
    `;

    reorderListRadioNoAnswer();

    // "Sans réponse" reste en dernière position car la question est marquée comme traitée
    const lastRadio = document.querySelector('.fr-fieldset__content .fr-fieldset__element:last-child input') as HTMLInputElement;
    expect(lastRadio.value).toBe('');
  });

  it('ne fait rien si pas de radio "Sans réponse"', () => {
    document.body.innerHTML = `
      <div class="list-radio question-container">
        <div class="fr-fieldset__content">
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="A"> A</div>
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="B"> B</div>
        </div>
      </div>
    `;

    expect(() => reorderListRadioNoAnswer()).not.toThrow();
  });

  it('met à jour le hidden java input', () => {
    document.body.innerHTML = `
      <div class="list-radio question-container">
        <input type="hidden" id="java42" value="A">
        <div class="fr-fieldset__content">
          <div class="fr-fieldset__element"><input type="radio" name="q1" value="A"> A</div>
          <div class="fr-fieldset__element"><input type="radio" name="q1" value=""> Sans réponse</div>
        </div>
      </div>
    `;

    reorderListRadioNoAnswer();

    expect((document.getElementById('java42') as HTMLInputElement).value).toBe('');
  });
});
