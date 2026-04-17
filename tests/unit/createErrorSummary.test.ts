import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// --- Reproduire la logique depuis custom.js (lines 1269-1391, sans scrollIntoView/focus) ---

function createErrorSummary(): void {
  // Supprimer l'ancien récapitulatif s'il existe
  const oldSummary = document.getElementById('dsfr-error-summary');
  if (oldSummary) oldSummary.remove();

  // Trouver toutes les questions en erreur
  const errorQuestions = document.querySelectorAll(
    '.question-container.input-error, .question-container.fr-input-group--error'
  );

  if (errorQuestions.length === 0) return;

  // Construire la liste des erreurs
  const errorList: { id: string; label: string }[] = [];
  errorQuestions.forEach(function (question) {
    const questionId = question.id;

    const questionTextElement = question.querySelector('.ls-label-question, .question-text');
    let questionText = questionTextElement ? questionTextElement.textContent!.trim() : 'Question sans titre';

    const errorMessageElement = question.querySelector('.fr-message--error');
    let errorMessage = errorMessageElement ? errorMessageElement.textContent!.trim() : '';

    let label = questionText;
    if (errorMessage) {
      label += ' : ' + errorMessage;
    }

    if (label.length > 150) {
      label = label.substring(0, 147) + '...';
    }

    errorList.push({ id: questionId, label: label });
  });

  // Créer l'alerte DSFR
  const summary = document.createElement('div');
  summary.id = 'dsfr-error-summary';
  summary.className = 'fr-alert fr-alert--error fr-mb-4w';
  summary.setAttribute('role', 'alert');
  summary.setAttribute('tabindex', '-1');

  let html = '<h3 class="fr-alert__title">';
  html += errorList.length === 1 ? 'Une erreur a été détectée' : errorList.length + ' erreurs ont été détectées';
  html += '</h3>';
  html += '<p>Veuillez corriger les erreurs suivantes :</p>';
  html += '<ul class="fr-mb-0">';

  errorList.forEach(function (error) {
    html += '<li class="error-item" data-question-id="' + error.id + '">';
    html += '<a href="#' + error.id + '" class="fr-link fr-icon-error-warning-line fr-link--icon-left">' + error.label + '</a>';
    html += '</li>';
  });

  html += '</ul>';
  summary.innerHTML = html;

  // Insérer avant la première question
  const firstQuestion = document.querySelector('.question-container');
  if (firstQuestion && firstQuestion.parentNode) {
    firstQuestion.parentNode.insertBefore(summary, firstQuestion);
  }
}

// --- Helpers ---

function addErrorQuestion(id: string, text: string, errorMsg?: string): void {
  const q = document.createElement('div');
  q.id = id;
  q.className = 'question-container input-error';

  const label = document.createElement('h3');
  label.className = 'question-text';
  label.textContent = text;
  q.appendChild(label);

  if (errorMsg) {
    const msg = document.createElement('p');
    msg.className = 'fr-message fr-message--error';
    msg.textContent = errorMsg;
    q.appendChild(msg);
  }

  document.getElementById('questions')!.appendChild(q);
}

// --- Tests ---

describe('createErrorSummary', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="questions"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('crée un résumé avec role="alert" et tabindex="-1"', () => {
    addErrorQuestion('question1', 'Votre nom', 'Ce champ est obligatoire');

    createErrorSummary();

    const summary = document.getElementById('dsfr-error-summary')!;
    expect(summary).not.toBeNull();
    expect(summary.getAttribute('role')).toBe('alert');
    expect(summary.getAttribute('tabindex')).toBe('-1');
  });

  it('affiche "Une erreur a été détectée" pour 1 erreur', () => {
    addErrorQuestion('question1', 'Votre nom', 'Obligatoire');

    createErrorSummary();

    const title = document.querySelector('.fr-alert__title')!;
    expect(title.textContent).toBe('Une erreur a été détectée');
  });

  it('affiche "N erreurs ont été détectées" pour plusieurs erreurs', () => {
    addErrorQuestion('question1', 'Nom', 'Obligatoire');
    addErrorQuestion('question2', 'Prénom', 'Obligatoire');
    addErrorQuestion('question3', 'Email', 'Format invalide');

    createErrorSummary();

    const title = document.querySelector('.fr-alert__title')!;
    expect(title.textContent).toBe('3 erreurs ont été détectées');
  });

  it('crée un lien par question en erreur avec href="#questionId"', () => {
    addErrorQuestion('question42', 'Votre âge', 'Obligatoire');
    addErrorQuestion('question43', 'Votre ville');

    createErrorSummary();

    const links = document.querySelectorAll('#dsfr-error-summary a');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('#question42');
    expect(links[1].getAttribute('href')).toBe('#question43');
  });

  it('combine le texte de la question et le message d\'erreur', () => {
    addErrorQuestion('question1', 'Votre nom', 'Ce champ est obligatoire');

    createErrorSummary();

    const link = document.querySelector('#dsfr-error-summary a')!;
    expect(link.textContent).toBe('Votre nom : Ce champ est obligatoire');
  });

  it('affiche "Question sans titre" si pas de texte de question', () => {
    const q = document.createElement('div');
    q.id = 'question99';
    q.className = 'question-container input-error';
    document.getElementById('questions')!.appendChild(q);

    createErrorSummary();

    const link = document.querySelector('#dsfr-error-summary a')!;
    expect(link.textContent).toBe('Question sans titre');
  });

  it('tronque les labels longs à 150 caractères', () => {
    const longText = 'A'.repeat(200);
    addErrorQuestion('question1', longText);

    createErrorSummary();

    const link = document.querySelector('#dsfr-error-summary a')!;
    expect(link.textContent!.length).toBe(150);
    expect(link.textContent!.endsWith('...')).toBe(true);
  });

  it('est inséré avant la première question', () => {
    addErrorQuestion('question1', 'Q1', 'Erreur');

    createErrorSummary();

    const summary = document.getElementById('dsfr-error-summary')!;
    const firstQuestion = document.querySelector('.question-container')!;
    expect(summary.nextElementSibling).toBe(firstQuestion);
  });

  it('remplace l\'ancien résumé s\'il existe', () => {
    addErrorQuestion('question1', 'Q1', 'Erreur');

    createErrorSummary();
    createErrorSummary();

    const summaries = document.querySelectorAll('#dsfr-error-summary');
    expect(summaries.length).toBe(1);
  });

  it('ne crée rien s\'il n\'y a aucune question en erreur', () => {
    const q = document.createElement('div');
    q.className = 'question-container';
    document.getElementById('questions')!.appendChild(q);

    createErrorSummary();

    expect(document.getElementById('dsfr-error-summary')).toBeNull();
  });

  it('les items d\'erreur ont l\'attribut data-question-id', () => {
    addErrorQuestion('question42', 'Q42', 'Erreur');

    createErrorSummary();

    const item = document.querySelector('.error-item')!;
    expect(item.getAttribute('data-question-id')).toBe('question42');
  });

  it('a les classes DSFR correctes (fr-alert, fr-alert--error)', () => {
    addErrorQuestion('question1', 'Q1', 'Erreur');

    createErrorSummary();

    const summary = document.getElementById('dsfr-error-summary')!;
    expect(summary.classList.contains('fr-alert')).toBe(true);
    expect(summary.classList.contains('fr-alert--error')).toBe(true);
    expect(summary.classList.contains('fr-mb-4w')).toBe(true);
  });
});
