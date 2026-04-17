import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// --- Reproduire la logique depuis custom.js (lines 4081-4103) ---

const RTE_STYLE_PROPERTIES = [
  'color', 'background-color', 'background', 'font-size', 'font-family',
  'font-weight', 'font-style', 'text-decoration', 'text-align', 'line-height',
  'letter-spacing', 'text-transform', 'text-indent',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-color', 'border-width', 'border-style',
];

const RTE_CONTENT_SELECTORS = [
  '.question-title-container',
  '.question-help-container',
];

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;
  if (element.classList && (element.classList.contains('required-asterisk') || element.classList.contains('asterisk'))) return true;
  if (element.tagName === 'IMG') return true;
  if (element.querySelector && element.querySelector('img')) return true;
  if (element.closest && element.closest('[class*="upload"]')) return true;
  if (element.closest && element.closest('[class*="file"]')) return true;
  return false;
}

function sanitizeElementStyles(element: Element | null): void {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
  if (shouldSkipElement(element)) return;
  if (!(element as HTMLElement).hasAttribute('style')) return;
  RTE_STYLE_PROPERTIES.forEach((prop) => {
    (element as HTMLElement).style.removeProperty(prop);
  });
  if ((element as HTMLElement).getAttribute('style') === '' || (element as HTMLElement).style.cssText.trim() === '') {
    (element as HTMLElement).removeAttribute('style');
  }
}

function sanitizeTree(root: Element | null): void {
  if (!root) return;
  sanitizeElementStyles(root);
  root.querySelectorAll('*').forEach((child) => sanitizeElementStyles(child));
}

function sanitizeRTEContent(): void {
  if (
    typeof (window as any).LSThemeOptions === 'undefined' ||
    (window as any).LSThemeOptions.sanitize_rte_content !== 'on'
  ) {
    return;
  }

  RTE_CONTENT_SELECTORS.forEach((selector) => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        sanitizeTree(element);
      });
    } catch (_e) {
      // Ignorer les erreurs de sélecteur invalide
    }
  });
}

// --- Tests ---

describe('sanitizeRTEContent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    delete (window as any).LSThemeOptions;
    document.body.innerHTML = '';
  });

  it('ne fait rien si LSThemeOptions est absent', () => {
    const container = document.createElement('div');
    container.className = 'question-title-container';
    const p = document.createElement('p');
    p.style.color = 'red';
    container.appendChild(p);
    document.body.appendChild(container);

    sanitizeRTEContent();

    expect(p.style.color).toBe('red');
  });

  it('ne fait rien si sanitize_rte_content !== "on"', () => {
    (window as any).LSThemeOptions = { sanitize_rte_content: 'off' };

    const container = document.createElement('div');
    container.className = 'question-title-container';
    const p = document.createElement('p');
    p.style.color = 'red';
    container.appendChild(p);
    document.body.appendChild(container);

    sanitizeRTEContent();

    expect(p.style.color).toBe('red');
  });

  it('nettoie les styles dans .question-title-container quand activé', () => {
    (window as any).LSThemeOptions = { sanitize_rte_content: 'on' };

    const container = document.createElement('div');
    container.className = 'question-title-container';
    const p = document.createElement('p');
    p.style.color = 'red';
    p.style.fontSize = '18px';
    container.appendChild(p);
    document.body.appendChild(container);

    sanitizeRTEContent();

    expect(p.hasAttribute('style')).toBe(false);
  });

  it('nettoie les styles dans .question-help-container quand activé', () => {
    (window as any).LSThemeOptions = { sanitize_rte_content: 'on' };

    const container = document.createElement('div');
    container.className = 'question-help-container';
    const span = document.createElement('span');
    span.style.fontWeight = 'bold';
    span.style.textDecoration = 'underline';
    container.appendChild(span);
    document.body.appendChild(container);

    sanitizeRTEContent();

    expect(span.hasAttribute('style')).toBe(false);
  });

  it('nettoie les deux types de conteneurs en une passe', () => {
    (window as any).LSThemeOptions = { sanitize_rte_content: 'on' };

    const title = document.createElement('div');
    title.className = 'question-title-container';
    const titleP = document.createElement('p');
    titleP.style.color = 'blue';
    title.appendChild(titleP);

    const help = document.createElement('div');
    help.className = 'question-help-container';
    const helpP = document.createElement('p');
    helpP.style.fontFamily = 'Arial';
    help.appendChild(helpP);

    document.body.appendChild(title);
    document.body.appendChild(help);

    sanitizeRTEContent();

    expect(titleP.hasAttribute('style')).toBe(false);
    expect(helpP.hasAttribute('style')).toBe(false);
  });

  it('conserve les styles fonctionnels dans les conteneurs RTE', () => {
    (window as any).LSThemeOptions = { sanitize_rte_content: 'on' };

    const container = document.createElement('div');
    container.className = 'question-title-container';
    const div = document.createElement('div');
    div.setAttribute('style', 'display: flex; color: red; visibility: hidden;');
    container.appendChild(div);
    document.body.appendChild(container);

    sanitizeRTEContent();

    expect(div.style.display).toBe('flex');
    expect(div.style.visibility).toBe('hidden');
    expect(div.style.color).toBe('');
  });

  it('ne touche pas les éléments en dehors des sélecteurs RTE', () => {
    (window as any).LSThemeOptions = { sanitize_rte_content: 'on' };

    const outside = document.createElement('div');
    outside.className = 'some-other-container';
    const p = document.createElement('p');
    p.style.color = 'green';
    outside.appendChild(p);
    document.body.appendChild(outside);

    sanitizeRTEContent();

    expect(p.style.color).toBe('green');
  });
});
