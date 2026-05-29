import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { transformErrorsToDsfr } from '../../modules/theme-dsfr/src/validation/errors-dsfr.js';

// --- Helpers pour créer le DOM de test ---

function createQuestionWithError(options: {
  qid: number;
  inputValue?: string;
  mandatoryText?: string;
  validationText?: string;
  isMultipleShortText?: boolean;
  isArray?: boolean;
  hasMessagesGroup?: boolean;
}): HTMLElement {
  const q = document.createElement('div');
  q.id = `question${options.qid}`;
  q.className = 'question-container input-error';
  if (options.isMultipleShortText) q.classList.add('multiple-short-txt');
  if (options.isArray) q.classList.add('array-5-point');

  const inputGroup = document.createElement('div');
  inputGroup.className = 'fr-input-group';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'fr-input';
  if (options.inputValue !== undefined) input.value = options.inputValue;
  inputGroup.appendChild(input);

  if (options.hasMessagesGroup !== false) {
    const messagesGroup = document.createElement('div');
    messagesGroup.className = 'fr-messages-group';
    messagesGroup.id = `messages-${options.qid}`;
    inputGroup.appendChild(messagesGroup);
  }

  q.appendChild(inputGroup);

  if (options.mandatoryText) {
    const mandatory = document.createElement('div');
    mandatory.className = 'ls-question-mandatory';
    mandatory.textContent = options.mandatoryText;
    q.appendChild(mandatory);
  }

  if (options.validationText) {
    const validation = document.createElement('div');
    validation.className = 'ls-em-tip';
    validation.textContent = options.validationText;
    // Pour que offsetParent ne soit pas null, il faut que l'élément soit dans le DOM
    q.appendChild(validation);
  }

  const validContainer = document.createElement('div');
  validContainer.className = 'question-valid-container';
  q.appendChild(validContainer);

  return q;
}

// --- Tests ---

describe('transformErrorsToDsfr', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('pose aria-invalid="true" sur tous les champs des questions en erreur', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Ce champ est obligatoire' });
    document.body.appendChild(q);

    transformErrorsToDsfr();

    expect(q.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });

  it('ajoute .fr-input-group--error sur le groupe d\'input', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire' });
    document.body.appendChild(q);

    transformErrorsToDsfr();

    expect(q.querySelector('.fr-input-group')!.classList.contains('fr-input-group--error')).toBe(true);
  });

  it('crée un message d\'erreur DSFR dans le messages-group', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Ce champ est obligatoire' });
    document.body.appendChild(q);

    transformErrorsToDsfr();

    const errorMsg = q.querySelector('.fr-message--error');
    expect(errorMsg).not.toBeNull();
    expect(errorMsg!.textContent).toBe('Ce champ est obligatoire');
    expect(errorMsg!.getAttribute('role')).toBe('alert');
  });

  it('utilise le message obligatoire si le champ est vide', () => {
    const q = createQuestionWithError({
      qid: 1,
      inputValue: '',
      mandatoryText: 'Obligatoire',
      validationText: 'Format invalide',
    });
    document.body.appendChild(q);

    transformErrorsToDsfr();

    const errorMsg = q.querySelector('.fr-message--error');
    expect(errorMsg!.textContent).toBe('Obligatoire');
  });

  it('masque le conteneur .question-valid-container', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire' });
    document.body.appendChild(q);

    transformErrorsToDsfr();

    const validContainer = q.querySelector('.question-valid-container') as HTMLElement;
    expect(validContainer.style.display).toBe('none');
  });

  it('ne duplique pas le message si déjà présent', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire' });
    document.body.appendChild(q);

    // Premier appel
    transformErrorsToDsfr();
    // Deuxième appel
    transformErrorsToDsfr();

    const errorMsgs = q.querySelectorAll('.fr-message--error');
    expect(errorMsgs.length).toBe(1);
  });

  it('ignore les questions multiple-short-txt (handler spécialisé)', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire', isMultipleShortText: true });
    document.body.appendChild(q);

    transformErrorsToDsfr();

    // aria-invalid est posé (passe systématique) mais pas de message DSFR créé
    expect(q.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
    expect(q.querySelector('.fr-message--error')).toBeNull();
  });

  it('ignore les questions array-* (handler spécialisé)', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire', isArray: true });
    document.body.appendChild(q);

    transformErrorsToDsfr();

    expect(q.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
    expect(q.querySelector('.fr-message--error')).toBeNull();
  });

  it('ne fait rien si pas de .fr-input-group', () => {
    const q = document.createElement('div');
    q.className = 'question-container input-error';
    const input = document.createElement('input');
    input.type = 'text';
    q.appendChild(input);
    document.body.appendChild(q);

    expect(() => transformErrorsToDsfr()).not.toThrow();
    expect(q.querySelector('.fr-message--error')).toBeNull();
  });

  it('ne fait rien si pas de .fr-messages-group', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire', hasMessagesGroup: false });
    document.body.appendChild(q);

    expect(() => transformErrorsToDsfr()).not.toThrow();
    expect(q.querySelector('.fr-message--error')).toBeNull();
  });

  it('traite plusieurs questions en erreur', () => {
    const q1 = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire Q1' });
    const q2 = createQuestionWithError({ qid: 2, mandatoryText: 'Obligatoire Q2' });
    document.body.appendChild(q1);
    document.body.appendChild(q2);

    transformErrorsToDsfr();

    expect(q1.querySelector('.fr-message--error')!.textContent).toBe('Obligatoire Q1');
    expect(q2.querySelector('.fr-message--error')!.textContent).toBe('Obligatoire Q2');
  });

  it('ne fait rien s\'il n\'y a aucune question en erreur', () => {
    document.body.innerHTML = '<div class="question-container"><input type="text"></div>';
    expect(() => transformErrorsToDsfr()).not.toThrow();
  });

  it('nettoie les espaces multiples dans le message d\'erreur', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: '  Ce   champ   est   obligatoire  ' });
    document.body.appendChild(q);

    transformErrorsToDsfr();

    expect(q.querySelector('.fr-message--error')!.textContent).toBe('Ce champ est obligatoire');
  });

  // --- Questions masquées par relevance (régression 527199) ---
  // Le core LimeSurvey pose `input-error` sur des questions mandatory masquées.
  // On ne doit ni poser aria-invalid ni fabriquer de message d'erreur dessus,
  // sinon elles apparaîtraient déjà en erreur dès que la relevance les révèle.
  it.each(['ls-irrelevant', 'ls-hidden', 'd-none'] as const)(
    'ignore une question en erreur masquée via %s',
    (hideClass) => {
      const q = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire' });
      q.classList.add(hideClass);
      document.body.appendChild(q);

      transformErrorsToDsfr();

      expect(q.querySelector('input')!.getAttribute('aria-invalid')).toBeNull();
      expect(q.querySelector('.fr-message--error')).toBeNull();
      expect(q.querySelector('.fr-input-group')!.classList.contains('fr-input-group--error')).toBe(false);
    },
  );

  it('ignore une question en erreur masquée via display:none inline', () => {
    const q = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire' });
    q.style.display = 'none';
    document.body.appendChild(q);

    transformErrorsToDsfr();

    expect(q.querySelector('input')!.getAttribute('aria-invalid')).toBeNull();
    expect(q.querySelector('.fr-message--error')).toBeNull();
  });

  it('traite la question visible mais ignore sa voisine masquée (mix)', () => {
    const visible = createQuestionWithError({ qid: 1, mandatoryText: 'Obligatoire visible' });
    const hidden = createQuestionWithError({ qid: 2, mandatoryText: 'Obligatoire masquée' });
    hidden.classList.add('ls-irrelevant');
    document.body.appendChild(visible);
    document.body.appendChild(hidden);

    transformErrorsToDsfr();

    expect(visible.querySelector('.fr-message--error')!.textContent).toBe('Obligatoire visible');
    expect(hidden.querySelector('.fr-message--error')).toBeNull();
    expect(hidden.querySelector('input')!.getAttribute('aria-invalid')).toBeNull();
  });
});
