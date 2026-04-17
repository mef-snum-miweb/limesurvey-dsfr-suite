import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// --- Reproduire la logique depuis custom.js (lines 1398-1472) ---

function updateErrorSummary(): void {
  const summary = document.getElementById('dsfr-error-summary');
  if (!summary) return;

  const errorItems = summary.querySelectorAll('.error-item');

  let totalErrors = errorItems.length;
  let correctedCount = 0;

  errorItems.forEach(function (item) {
    const questionId = item.getAttribute('data-question-id');
    const question = document.getElementById(questionId!);

    if (!question) return;

    const isError = question.classList.contains('input-error');
    const isValid = question.classList.contains('input-valid');

    const inputs = question.querySelectorAll(
      '.fr-input, input[type="text"], input[type="number"], textarea, select'
    );
    let allInputsValid = inputs.length > 0;
    inputs.forEach(function (input) {
      if (
        input.classList.contains('fr-input--error') ||
        !(input as HTMLInputElement).value ||
        (input as HTMLInputElement).value.trim() === ''
      ) {
        allInputsValid = false;
      }
    });

    if ((isValid && !isError) || allInputsValid) {
      if (!item.classList.contains('corrected')) {
        item.classList.add('corrected');
        const link = item.querySelector('a');
        if (link) {
          link.classList.remove('fr-icon-error-warning-line');
          link.classList.add('fr-icon-checkbox-circle-line');
        }
      }
      correctedCount++;
    }
  });

  const title = summary.querySelector('.fr-alert__title');
  const description = summary.querySelector('p');

  if (correctedCount === totalErrors) {
    summary.className = 'fr-alert fr-alert--success fr-mb-4w';
    if (title) title.textContent = 'Toutes les erreurs ont été corrigées !';
    if (description) description.textContent = 'Vous pouvez maintenant soumettre le formulaire.';
  } else if (correctedCount > 0) {
    summary.className = 'fr-alert fr-alert--warning fr-mb-4w';
    if (title) {
      const remaining = totalErrors - correctedCount;
      title.textContent = remaining + ' erreur' + (remaining > 1 ? 's' : '') + ' restante' + (remaining > 1 ? 's' : '');
    }
    if (description) description.textContent = 'Continuez à corriger les erreurs suivantes :';
  }
}

// --- Helpers ---

function buildSummary(errorItems: { questionId: string }[]): void {
  const summary = document.createElement('div');
  summary.id = 'dsfr-error-summary';
  summary.className = 'fr-alert fr-alert--error fr-mb-4w';

  let html = `<h3 class="fr-alert__title">${errorItems.length} erreurs ont été détectées</h3>`;
  html += '<p>Veuillez corriger les erreurs suivantes :</p>';
  html += '<ul>';
  errorItems.forEach((item) => {
    html += `<li class="error-item" data-question-id="${item.questionId}">`;
    html += `<a href="#${item.questionId}" class="fr-link fr-icon-error-warning-line">Erreur</a>`;
    html += '</li>';
  });
  html += '</ul>';
  summary.innerHTML = html;
  document.body.appendChild(summary);
}

function addQuestion(id: string, options: { isError?: boolean; isValid?: boolean; inputValue?: string }): void {
  const q = document.createElement('div');
  q.id = id;
  q.className = 'question-container';
  if (options.isError) q.classList.add('input-error');
  if (options.isValid) q.classList.add('input-valid');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fr-input';
  if (options.inputValue !== undefined) input.value = options.inputValue;
  q.appendChild(input);

  document.body.appendChild(q);
}

// --- Tests ---

describe('updateErrorSummary', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ne fait rien si le résumé n\'existe pas', () => {
    expect(() => updateErrorSummary()).not.toThrow();
  });

  it('marque un item comme "corrected" quand la question est corrigée', () => {
    addQuestion('q1', { isValid: true, inputValue: 'Test' });
    buildSummary([{ questionId: 'q1' }]);

    updateErrorSummary();

    const item = document.querySelector('.error-item')!;
    expect(item.classList.contains('corrected')).toBe(true);
  });

  it('remplace l\'icône d\'erreur par l\'icône de validation sur les items corrigés', () => {
    addQuestion('q1', { isValid: true, inputValue: 'Test' });
    buildSummary([{ questionId: 'q1' }]);

    updateErrorSummary();

    const link = document.querySelector('.error-item a')!;
    expect(link.classList.contains('fr-icon-checkbox-circle-line')).toBe(true);
    expect(link.classList.contains('fr-icon-error-warning-line')).toBe(false);
  });

  it('passe en SUCCESS quand toutes les erreurs sont corrigées', () => {
    addQuestion('q1', { isValid: true, inputValue: 'Corrigé' });
    addQuestion('q2', { isValid: true, inputValue: 'Corrigé' });
    buildSummary([{ questionId: 'q1' }, { questionId: 'q2' }]);

    updateErrorSummary();

    const summary = document.getElementById('dsfr-error-summary')!;
    expect(summary.classList.contains('fr-alert--success')).toBe(true);
    expect(summary.classList.contains('fr-alert--error')).toBe(false);
    expect(summary.querySelector('.fr-alert__title')!.textContent).toBe(
      'Toutes les erreurs ont été corrigées !'
    );
    expect(summary.querySelector('p')!.textContent).toBe(
      'Vous pouvez maintenant soumettre le formulaire.'
    );
  });

  it('passe en WARNING quand certaines erreurs sont corrigées', () => {
    addQuestion('q1', { isValid: true, inputValue: 'Corrigé' });
    addQuestion('q2', { isError: true, inputValue: '' });
    buildSummary([{ questionId: 'q1' }, { questionId: 'q2' }]);

    updateErrorSummary();

    const summary = document.getElementById('dsfr-error-summary')!;
    expect(summary.classList.contains('fr-alert--warning')).toBe(true);
    expect(summary.querySelector('.fr-alert__title')!.textContent).toBe('1 erreur restante');
  });

  it('affiche le pluriel correct pour les erreurs restantes', () => {
    addQuestion('q1', { isValid: true, inputValue: 'OK' });
    addQuestion('q2', { isError: true, inputValue: '' });
    addQuestion('q3', { isError: true, inputValue: '' });
    buildSummary([{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }]);

    updateErrorSummary();

    expect(document.querySelector('.fr-alert__title')!.textContent).toBe('2 erreurs restantes');
  });

  it('reste en ERROR si aucune erreur n\'est corrigée', () => {
    addQuestion('q1', { isError: true, inputValue: '' });
    addQuestion('q2', { isError: true, inputValue: '' });
    buildSummary([{ questionId: 'q1' }, { questionId: 'q2' }]);

    updateErrorSummary();

    const summary = document.getElementById('dsfr-error-summary')!;
    expect(summary.classList.contains('fr-alert--error')).toBe(true);
  });

  it('ne marque pas "corrected" deux fois (idempotence)', () => {
    addQuestion('q1', { isValid: true, inputValue: 'Test' });
    buildSummary([{ questionId: 'q1' }]);

    updateErrorSummary();
    updateErrorSummary();

    // Toujours 1 seul item corrected
    const items = document.querySelectorAll('.error-item.corrected');
    expect(items.length).toBe(1);
  });

  it('considère valid un champ avec valeur remplie même sans input-valid', () => {
    addQuestion('q1', { inputValue: 'Rempli' });
    buildSummary([{ questionId: 'q1' }]);

    updateErrorSummary();

    // allInputsValid = true car le champ est rempli et pas fr-input--error
    const item = document.querySelector('.error-item')!;
    expect(item.classList.contains('corrected')).toBe(true);
  });
});
