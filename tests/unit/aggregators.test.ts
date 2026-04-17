import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Tests des fonctions agrégateurs / init.
 *
 * Ces fonctions câblent les sous-fonctions entre elles. Pendant le refactoring
 * (découpage custom.js en modules), c'est CE câblage qui risque de casser.
 *
 * On ne mock pas les sous-fonctions — on vérifie les EFFETS observables
 * (éléments DOM créés, classes posées, attributs ajoutés).
 */

// ── Sous-fonctions nécessaires (reproduites depuis custom.js) ──────────────

const RANKING_I18N_FR: Record<string, string> = {
  ranking_add: 'Ajouter au classement',
  ranking_add_aria: 'Ajouter %s au classement',
  ranking_remove: 'Retirer',
  ranking_remove_aria: 'Retirer %s du classement',
  ranking_up: 'Monter',
  ranking_up_aria: 'Monter %s d\'un rang',
  ranking_down: 'Descendre',
  ranking_down_aria: 'Descendre %s d\'un rang',
  ranking_actions_for: 'Actions pour %s',
};

function tRanking(key: string, label?: string): string {
  let str = RANKING_I18N_FR[key] || key;
  if (typeof label !== 'undefined') str = str.replace('%s', label);
  return str;
}

function getItemLabel(item: HTMLElement): string {
  const textSpan = item.querySelector('.ranking-item-text');
  if (textSpan) return textSpan.textContent!.trim();
  return item.dataset.label || item.textContent!.trim();
}

function createControlButtons(item: HTMLElement, _qId: string): void {
  if (item.querySelector('.ranking-controls')) return;
  const label = getItemLabel(item);
  const controls = document.createElement('span');
  controls.className = 'ranking-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', tRanking('ranking_actions_for', label));
  ['up', 'down', 'remove'].forEach((action) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `fr-btn ranking-btn-${action}`;
    controls.appendChild(btn);
  });
  item.appendChild(controls);
}

function createChoiceControlButtons(item: HTMLElement, _qId: string): void {
  if (item.querySelector('.ranking-choice-controls')) return;
  const controls = document.createElement('span');
  controls.className = 'ranking-choice-controls';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fr-btn ranking-btn-add';
  controls.appendChild(btn);
  item.appendChild(controls);
}

function updateControlButtonStates(qId: string): void {
  const rankList = document.getElementById('sortable-rank-' + qId);
  if (!rankList) return;
  const items = rankList.querySelectorAll('li:not(.ls-remove):not(.d-none)');
  items.forEach(function (item, index) {
    const btnUp = item.querySelector('.ranking-btn-up') as HTMLButtonElement;
    const btnDown = item.querySelector('.ranking-btn-down') as HTMLButtonElement;
    if (btnUp) btnUp.disabled = index === 0;
    if (btnDown) btnDown.disabled = index === items.length - 1;
  });
}

function updateChoiceControlButtonStates(qId: string): void {
  const container = document.querySelector('[data-ranking-qid="' + qId + '"]');
  if (!container) return;
  const maxAnswers = parseInt((container as HTMLElement).dataset.maxAnswers || '0') || 0;
  const rankList = document.getElementById('sortable-rank-' + qId);
  const choiceList = document.getElementById('sortable-choice-' + qId);
  if (!rankList || !choiceList) return;
  const rankedCount = rankList.querySelectorAll('li:not(.ls-remove):not(.d-none)').length;
  const isFull = maxAnswers > 0 && rankedCount >= maxAnswers;
  choiceList.querySelectorAll('.ranking-btn-add').forEach((btn) => {
    (btn as HTMLButtonElement).disabled = isFull;
  });
}

function updateRankNumbers(qId: string): void {
  const rankList = document.getElementById('sortable-rank-' + qId);
  if (!rankList) return;
  const items = rankList.querySelectorAll('li:not(.ls-remove):not(.d-none)');
  const total = items.length;
  items.forEach(function (item, index) {
    let badge = item.querySelector('.ranking-rank-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'ranking-rank-badge';
      badge.setAttribute('aria-hidden', 'true');
      item.insertBefore(badge, item.firstChild);
    }
    badge.textContent = '#' + (index + 1);
    const label = getItemLabel(item as HTMLElement);
    item.setAttribute('aria-label', label + ' - Rang ' + (index + 1) + ' sur ' + total + '. Entrée pour retirer, Alt+Flèches pour réordonner');
    item.setAttribute('aria-selected', 'true');
  });
  const choiceList = document.getElementById('sortable-choice-' + qId);
  if (choiceList) {
    choiceList.querySelectorAll('.ranking-rank-badge').forEach((b) => b.remove());
    choiceList.querySelectorAll('li:not(.ls-remove):not(.d-none)').forEach((item) => {
      item.setAttribute('aria-selected', 'false');
    });
  }
}

// ── Agrégateurs à tester ───────────────────────────────────────────────────

/**
 * refreshAllItems — orchestre createControlButtons, createChoiceControlButtons,
 * updateControlButtonStates, updateChoiceControlButtonStates, updateRankNumbers
 */
let _isInternalUpdate = false;

function refreshAllItems(qId: string): void {
  const rankList = document.getElementById('sortable-rank-' + qId);
  if (!rankList) return;

  _isInternalUpdate = true;
  try {
    rankList.querySelectorAll('.ranking-choice-controls').forEach((ctrl) => ctrl.remove());
    rankList.querySelectorAll('li:not(.ls-remove):not(.d-none)').forEach((item) => {
      createControlButtons(item as HTMLElement, qId);
    });
    const choiceList = document.getElementById('sortable-choice-' + qId);
    if (choiceList) {
      choiceList.querySelectorAll('.ranking-controls').forEach((ctrl) => ctrl.remove());
      choiceList.querySelectorAll('li:not(.ls-remove):not(.d-none)').forEach((item) => {
        createChoiceControlButtons(item as HTMLElement, qId);
      });
    }
    updateControlButtonStates(qId);
    updateChoiceControlButtonStates(qId);
    updateRankNumbers(qId);
  } finally {
    _isInternalUpdate = false;
  }
}

/**
 * initMultipleShortText — orchestre restoreVisibleLines, reinitInputOnDemand,
 * updateAddButtonVisibility
 */
function restoreVisibleLines(): void {
  document.querySelectorAll('[id^="selector--inputondemand-"]').forEach((container) => {
    const itemsList = container.querySelector('.selector--inputondemand-list');
    if (!itemsList) return;
    const allItems = itemsList.querySelectorAll('.selector--inputondemand-list-item');
    const hiddenItems = itemsList.querySelectorAll('.selector--inputondemand-list-item.d-none');
    if (hiddenItems.length === allItems.length && allItems.length > 0) {
      allItems[0].classList.remove('d-none');
    }
  });
}

function updateAddButtonVisibility(): void {
  document.querySelectorAll('[id^="selector--inputondemand-"]').forEach((container) => {
    const button = container.querySelector('.selector--inputondemand-addlinebutton') as HTMLElement;
    const itemsList = container.querySelector('.selector--inputondemand-list');
    if (!button || !itemsList) return;
    const hiddenItems = itemsList.querySelectorAll('.selector--inputondemand-list-item.d-none');
    button.style.display = hiddenItems.length > 0 ? '' : 'none';
  });
}

function initMultipleShortText(): void {
  restoreVisibleLines();
  // reinitInputOnDemand omet ici (nécessite addEventListener — testé via E2E)
  updateAddButtonVisibility();
}

/**
 * initConditionalQuestionsAria — détecte et traite les questions conditionnelles
 */
function extractQuestionCodes(expression: string | null): string[] {
  if (!expression) return [];
  const codes: string[] = [];
  const regex = /\b(Q\d+(?:_SQ\d+)?)\./gi;
  let match;
  while ((match = regex.exec(expression)) !== null) {
    if (!codes.includes(match[1])) codes.push(match[1]);
  }
  return codes;
}

function findQuestionByCode(code: string): Element | null {
  return document.querySelector(`[data-qcode="${code}"]`) ||
         document.querySelector(`[id*="${code}"]`);
}

function getQuestionText(el: HTMLElement): string {
  const title = el.querySelector('[id^="ls-question-text-"]');
  if (title) {
    const text = title.textContent!.trim();
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }
  const num = el.querySelector('.fr-text--xs');
  if (num) return num.textContent!.trim();
  return 'la question précédente';
}

function createConditionalDescription(questionId: string, parentQuestions: string[]): HTMLElement {
  const descId = `conditional-desc-${questionId}`;
  let el = document.getElementById(descId) as HTMLElement;
  if (el) return el;
  el = document.createElement('div');
  el.id = descId;
  el.className = 'fr-sr-only';
  el.setAttribute('role', 'note');
  const pq = [...parentQuestions];
  if (pq.length === 1) el.textContent = `Cette question dépend de votre réponse à ${pq[0]}.`;
  else if (pq.length > 1) {
    const last = pq.pop()!;
    el.textContent = `Cette question dépend de vos réponses à ${pq.join(', ')} et ${last}.`;
  } else el.textContent = 'Cette question est conditionnelle.';
  return el;
}

function addAriaDescribedBy(questionElement: HTMLElement, descriptionId: string): void {
  questionElement.querySelectorAll('input, select, textarea').forEach((field) => {
    const cur = field.getAttribute('aria-describedby') || '';
    if (!cur.includes(descriptionId)) {
      field.setAttribute('aria-describedby', cur ? `${cur} ${descriptionId}`.trim() : descriptionId);
    }
  });
}

function processConditionalQuestion(questionElement: HTMLElement): void {
  const relevanceExpression = questionElement.getAttribute('data-relevance');
  if (!relevanceExpression) return;
  const questionId = questionElement.id || 'q-fallback';
  const parentCodes = extractQuestionCodes(relevanceExpression);
  if (parentCodes.length === 0) return;
  const parentTexts: string[] = [];
  parentCodes.forEach((code) => {
    const parent = findQuestionByCode(code);
    if (parent) parentTexts.push(getQuestionText(parent as HTMLElement));
  });
  if (parentTexts.length === 0) return;
  const desc = createConditionalDescription(questionId, parentTexts);
  questionElement.insertBefore(desc, questionElement.firstChild);
  addAriaDescribedBy(questionElement, desc.id);
}

function initConditionalQuestionsAria(): void {
  const hiddenQuestions = document.querySelectorAll(
    '.question-container.ls-irrelevant, .question-container.ls-hidden'
  );
  hiddenQuestions.forEach(function (q) {
    if (!q.hasAttribute('data-relevance') && !(q as HTMLElement).dataset.dsfrConditionalProcessed) {
      (q as HTMLElement).dataset.dsfrConditionalProcessed = 'true';
      const questionId = q.id || 'q-auto';
      const desc = createConditionalDescription(questionId, []);
      q.insertBefore(desc, q.firstChild);
      addAriaDescribedBy(q as HTMLElement, desc.id);
    }
  });

  const conditionalQuestions = document.querySelectorAll('.question-container[data-relevance]');
  conditionalQuestions.forEach(function (questionElement) {
    if ((questionElement as HTMLElement).dataset.dsfrConditionalProcessed) return;
    (questionElement as HTMLElement).dataset.dsfrConditionalProcessed = 'true';
    try { processConditionalQuestion(questionElement as HTMLElement); } catch (_e) { /* */ }
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('refreshAllItems — agrégateur ranking', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  function buildDOM(): void {
    document.body.innerHTML = `
      <div class="ranking-question-dsfr" data-ranking-qid="10" data-max-answers="3">
        <ul id="sortable-rank-10" role="listbox">
          <li data-value="A"><span class="ranking-item-text">Pomme</span></li>
          <li data-value="B"><span class="ranking-item-text">Banane</span></li>
        </ul>
        <ul id="sortable-choice-10" role="listbox">
          <li data-value="C"><span class="ranking-item-text">Cerise</span></li>
        </ul>
      </div>
    `;
  }

  it('ajoute les boutons Monter/Descendre/Retirer sur les items classés', () => {
    buildDOM();
    refreshAllItems('10');
    const controls = document.querySelectorAll('#sortable-rank-10 .ranking-controls');
    expect(controls.length).toBe(2);
  });

  it('ajoute les boutons Ajouter sur les items de la choice list', () => {
    buildDOM();
    refreshAllItems('10');
    const addBtns = document.querySelectorAll('#sortable-choice-10 .ranking-btn-add');
    expect(addBtns.length).toBe(1);
  });

  it('pose les badges de rang #1, #2', () => {
    buildDOM();
    refreshAllItems('10');
    const badges = document.querySelectorAll('#sortable-rank-10 .ranking-rank-badge');
    expect(badges[0].textContent).toBe('#1');
    expect(badges[1].textContent).toBe('#2');
  });

  it('désactive Monter sur le 1er et Descendre sur le dernier', () => {
    buildDOM();
    refreshAllItems('10');
    const items = document.querySelectorAll('#sortable-rank-10 li');
    expect((items[0].querySelector('.ranking-btn-up') as HTMLButtonElement).disabled).toBe(true);
    expect((items[0].querySelector('.ranking-btn-down') as HTMLButtonElement).disabled).toBe(false);
    expect((items[1].querySelector('.ranking-btn-up') as HTMLButtonElement).disabled).toBe(false);
    expect((items[1].querySelector('.ranking-btn-down') as HTMLButtonElement).disabled).toBe(true);
  });

  it('pose aria-selected="true" sur les items classés et "false" sur les choix', () => {
    buildDOM();
    refreshAllItems('10');
    expect(document.querySelector('#sortable-rank-10 li')!.getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('#sortable-choice-10 li')!.getAttribute('aria-selected')).toBe('false');
  });

  it('nettoie les boutons choice-controls résiduels dans la ranked list', () => {
    buildDOM();
    // Simuler un bouton résiduel (item drag-droppé avec son bouton Ajouter)
    const rankedItem = document.querySelector('#sortable-rank-10 li')!;
    const residual = document.createElement('span');
    residual.className = 'ranking-choice-controls';
    rankedItem.appendChild(residual);

    refreshAllItems('10');

    expect(document.querySelectorAll('#sortable-rank-10 .ranking-choice-controls').length).toBe(0);
  });

  it('nettoie les boutons ranking-controls résiduels dans la choice list', () => {
    buildDOM();
    // Simuler un bouton résiduel (item retiré du classement)
    const choiceItem = document.querySelector('#sortable-choice-10 li')!;
    const residual = document.createElement('span');
    residual.className = 'ranking-controls';
    choiceItem.appendChild(residual);

    refreshAllItems('10');

    expect(document.querySelectorAll('#sortable-choice-10 .ranking-controls').length).toBe(0);
  });

  it('est idempotent (double appel ne duplique rien)', () => {
    buildDOM();
    refreshAllItems('10');
    refreshAllItems('10');
    expect(document.querySelectorAll('#sortable-rank-10 .ranking-controls').length).toBe(2);
    expect(document.querySelectorAll('#sortable-rank-10 .ranking-rank-badge').length).toBe(2);
  });
});

describe('initMultipleShortText — agrégateur input on demand', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('affiche la première ligne si toutes sont masquées ET masque le bouton si plus de lignes', () => {
    document.body.innerHTML = `
      <div id="selector--inputondemand-q42">
        <div class="selector--inputondemand-list">
          <div class="selector--inputondemand-list-item d-none"><input type="text"></div>
          <div class="selector--inputondemand-list-item d-none"><input type="text"></div>
        </div>
        <button class="selector--inputondemand-addlinebutton">Ajouter</button>
      </div>
    `;

    initMultipleShortText();

    // restoreVisibleLines : première ligne visible
    const items = document.querySelectorAll('.selector--inputondemand-list-item');
    expect(items[0].classList.contains('d-none')).toBe(false);
    expect(items[1].classList.contains('d-none')).toBe(true);

    // updateAddButtonVisibility : bouton visible (1 ligne masquée)
    const btn = document.querySelector('.selector--inputondemand-addlinebutton') as HTMLElement;
    expect(btn.style.display).toBe('');
  });

  it('masque le bouton quand toutes les lignes sont visibles', () => {
    document.body.innerHTML = `
      <div id="selector--inputondemand-q42">
        <div class="selector--inputondemand-list">
          <div class="selector--inputondemand-list-item"><input type="text"></div>
          <div class="selector--inputondemand-list-item"><input type="text"></div>
        </div>
        <button class="selector--inputondemand-addlinebutton">Ajouter</button>
      </div>
    `;

    initMultipleShortText();

    const btn = document.querySelector('.selector--inputondemand-addlinebutton') as HTMLElement;
    expect(btn.style.display).toBe('none');
  });
});

describe('initConditionalQuestionsAria — agrégateur conditionnels', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('crée une description générique pour les questions ls-irrelevant sans data-relevance', () => {
    document.body.innerHTML = `
      <div id="question42" class="question-container ls-irrelevant">
        <input type="text" id="answer42">
      </div>
    `;

    initConditionalQuestionsAria();

    // Description créée
    const desc = document.querySelector('#conditional-desc-question42');
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toBe('Cette question est conditionnelle.');
    expect(desc!.getAttribute('role')).toBe('note');

    // aria-describedby lié
    expect(document.getElementById('answer42')!.getAttribute('aria-describedby')).toBe('conditional-desc-question42');

    // Marquée comme traitée
    expect((document.getElementById('question42') as HTMLElement).dataset.dsfrConditionalProcessed).toBe('true');
  });

  it('crée une description enrichie pour les questions avec data-relevance', () => {
    document.body.innerHTML = `
      <div id="questionQ1" data-qcode="Q1">
        <h3 id="ls-question-text-Q1">Votre âge ?</h3>
      </div>
      <div id="question43" class="question-container" data-relevance="Q1.NAOK > 18">
        <input type="text" id="answer43">
      </div>
    `;

    initConditionalQuestionsAria();

    const desc = document.querySelector('#conditional-desc-question43');
    expect(desc).not.toBeNull();
    expect(desc!.textContent).toContain('Votre âge ?');

    expect(document.getElementById('answer43')!.getAttribute('aria-describedby')).toBe('conditional-desc-question43');
  });

  it('ne retraite pas une question déjà marquée', () => {
    document.body.innerHTML = `
      <div id="question42" class="question-container ls-irrelevant" data-dsfr-conditional-processed="true">
        <input type="text" id="answer42">
      </div>
    `;

    initConditionalQuestionsAria();

    // Pas de description créée
    expect(document.querySelector('[id^="conditional-desc-"]')).toBeNull();
  });

  it('traite plusieurs questions en une passe', () => {
    document.body.innerHTML = `
      <div id="question42" class="question-container ls-irrelevant">
        <input type="text">
      </div>
      <div id="question43" class="question-container ls-hidden">
        <input type="text">
      </div>
    `;

    initConditionalQuestionsAria();

    expect(document.querySelectorAll('[id^="conditional-desc-"]').length).toBe(2);
  });
});
