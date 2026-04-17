import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// --- Reproduire les effets DOM de handleMultipleShortTextErrors (lines 964-1136) ---

function handleMultipleShortTextErrors(): void {
  const multipleQuestions = document.querySelectorAll('.question-container.multiple-short-txt');

  multipleQuestions.forEach(function (question) {
    if (!question.classList.contains('input-error')) return;
    if ((question as HTMLElement).dataset.mandatoryCounterAttached) return;
    (question as HTMLElement).dataset.mandatoryCounterAttached = 'true';

    // Cacher les messages legacy
    question.querySelectorAll(
      '.ls-question-mandatory, .ls-question-mandatory-initial, .ls-question-mandatory-array'
    ).forEach((msg) => { (msg as HTMLElement).style.display = 'none'; });

    const validContainer = question.querySelector('.question-valid-container');
    if (validContainer) (validContainer as HTMLElement).style.display = 'none';

    // Retirer erreurs individuelles
    question.querySelectorAll('.answer-item:not(.d-none)').forEach((item) => {
      const inputGroup = item.querySelector('.fr-input-group');
      const messagesGroup = item.querySelector('.fr-messages-group');
      if (inputGroup) inputGroup.classList.remove('fr-input-group--error');
      if (messagesGroup) {
        const err = messagesGroup.querySelector('.fr-message--error');
        if (err) err.remove();
      }
      item.classList.remove('input-error', 'ls-error-mandatory', 'has-error');
    });

    // Créer compteur global
    const counterContainer = document.createElement('div');
    counterContainer.className = 'fr-messages-group fr-mt-2w';
    counterContainer.setAttribute('aria-live', 'polite');
    counterContainer.id = 'mandatory-counter-' + (question.id || 'test');

    const counterMessage = document.createElement('p');
    counterMessage.className = 'fr-message fr-message--error';
    counterMessage.setAttribute('role', 'status');
    counterContainer.appendChild(counterMessage);

    const answersList = question.querySelector('.ls-answers, .subquestion-list');
    if (answersList && answersList.parentNode) {
      answersList.parentNode.insertBefore(counterContainer, answersList.nextSibling);
    } else {
      question.appendChild(counterContainer);
    }
  });
}

// --- Helpers ---

function buildMultiShortTextDOM(qid: string, itemCount: number): void {
  const items = Array.from({ length: itemCount }, (_, i) => `
    <div class="answer-item input-error ls-error-mandatory has-error">
      <div class="fr-input-group fr-input-group--error">
        <input type="text" value="">
        <div class="fr-messages-group">
          <p class="fr-message fr-message--error">Obligatoire</p>
        </div>
      </div>
    </div>
  `).join('');

  document.body.innerHTML = `
    <div id="${qid}" class="question-container multiple-short-txt input-error">
      <div class="ls-question-mandatory">Ce champ est obligatoire</div>
      <div class="ls-question-mandatory-initial">Veuillez répondre</div>
      <div class="question-valid-container">OK</div>
      <div class="ls-answers">${items}</div>
    </div>
  `;
}

// --- Tests ---

describe('handleMultipleShortTextErrors', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('masque les messages legacy LimeSurvey', () => {
    buildMultiShortTextDOM('q10', 2);
    handleMultipleShortTextErrors();

    expect((document.querySelector('.ls-question-mandatory') as HTMLElement).style.display).toBe('none');
    expect((document.querySelector('.ls-question-mandatory-initial') as HTMLElement).style.display).toBe('none');
    expect((document.querySelector('.question-valid-container') as HTMLElement).style.display).toBe('none');
  });

  it('retire les classes d\'erreur individuelles sur les answer-items', () => {
    buildMultiShortTextDOM('q10', 3);
    handleMultipleShortTextErrors();

    document.querySelectorAll('.answer-item').forEach((item) => {
      expect(item.classList.contains('input-error')).toBe(false);
      expect(item.classList.contains('ls-error-mandatory')).toBe(false);
      expect(item.classList.contains('has-error')).toBe(false);
    });
  });

  it('retire fr-input-group--error des groupes d\'input', () => {
    buildMultiShortTextDOM('q10', 2);
    handleMultipleShortTextErrors();

    document.querySelectorAll('.fr-input-group').forEach((grp) => {
      expect(grp.classList.contains('fr-input-group--error')).toBe(false);
    });
  });

  it('supprime les messages fr-message--error individuels', () => {
    buildMultiShortTextDOM('q10', 2);
    handleMultipleShortTextErrors();

    // Les messages d'erreur individuels dans les answer-items sont supprimés
    document.querySelectorAll('.answer-item .fr-messages-group').forEach((grp) => {
      expect(grp.querySelector('.fr-message--error')).toBeNull();
    });
  });

  it('crée un compteur global avec aria-live="polite"', () => {
    buildMultiShortTextDOM('q10', 2);
    handleMultipleShortTextErrors();

    const counter = document.getElementById('mandatory-counter-q10');
    expect(counter).not.toBeNull();
    expect(counter!.getAttribute('aria-live')).toBe('polite');
    expect(counter!.querySelector('.fr-message--error')!.getAttribute('role')).toBe('status');
  });

  it('insère le compteur après la liste de réponses', () => {
    buildMultiShortTextDOM('q10', 2);
    handleMultipleShortTextErrors();

    const answers = document.querySelector('.ls-answers')!;
    expect(answers.nextElementSibling!.id).toBe('mandatory-counter-q10');
  });

  it('ne traite pas une question sans input-error', () => {
    document.body.innerHTML = `
      <div id="q10" class="question-container multiple-short-txt">
        <div class="ls-answers">
          <div class="answer-item"><input type="text" value="ok"></div>
        </div>
      </div>
    `;
    handleMultipleShortTextErrors();
    expect(document.querySelector('[id^="mandatory-counter-"]')).toBeNull();
  });

  it('ne retraite pas une question déjà attachée', () => {
    buildMultiShortTextDOM('q10', 2);
    handleMultipleShortTextErrors();
    handleMultipleShortTextErrors();
    expect(document.querySelectorAll('[id^="mandatory-counter-"]').length).toBe(1);
  });
});
