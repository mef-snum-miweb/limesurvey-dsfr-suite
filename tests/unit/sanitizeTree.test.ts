import { describe, it, expect } from 'vitest';

// --- Reproduire la logique depuis custom.js (lines 4026-4080) ---

const RTE_STYLE_PROPERTIES = [
  'color', 'background-color', 'background', 'font-size', 'font-family',
  'font-weight', 'font-style', 'text-decoration', 'text-align', 'line-height',
  'letter-spacing', 'text-transform', 'text-indent',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-color', 'border-width', 'border-style',
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
  const children = root.querySelectorAll('*');
  children.forEach((child) => {
    sanitizeElementStyles(child);
  });
}

// --- Tests ---

describe('sanitizeTree', () => {
  it('nettoie les styles de mise en forme sur la racine', () => {
    const root = document.createElement('div');
    root.style.color = 'red';
    root.style.fontSize = '24px';

    sanitizeTree(root);

    expect(root.hasAttribute('style')).toBe(false);
  });

  it('nettoie les styles de tous les enfants', () => {
    const root = document.createElement('div');
    const p = document.createElement('p');
    p.style.textAlign = 'center';
    const span = document.createElement('span');
    span.style.fontWeight = 'bold';
    span.style.color = 'blue';
    root.appendChild(p);
    p.appendChild(span);

    sanitizeTree(root);

    expect(p.hasAttribute('style')).toBe(false);
    expect(span.hasAttribute('style')).toBe(false);
  });

  it('conserve les styles fonctionnels (display, position) sur les enfants', () => {
    const root = document.createElement('div');
    const child = document.createElement('div');
    child.setAttribute('style', 'display: none; color: red; position: absolute; font-size: 16px;');
    root.appendChild(child);

    document.body.appendChild(root);
    sanitizeTree(root);
    document.body.removeChild(root);

    expect(child.style.display).toBe('none');
    expect(child.style.position).toBe('absolute');
    expect(child.style.color).toBe('');
    expect(child.style.fontSize).toBe('');
  });

  it('ne touche pas les <img> dans l\'arbre', () => {
    const root = document.createElement('div');
    const wrapper = document.createElement('div');
    wrapper.style.color = 'red';
    const img = document.createElement('img');
    img.style.border = '1px solid red';
    wrapper.appendChild(img);
    root.appendChild(wrapper);

    sanitizeTree(root);

    // Le wrapper contient un <img> → shouldSkipElement retourne true → style conservé
    expect(wrapper.style.color).toBe('red');
    // L'<img> lui-même est aussi skippé
    expect(img.style.border).not.toBe('');
  });

  it('ne touche pas les éléments required-asterisk', () => {
    const root = document.createElement('div');
    const asterisk = document.createElement('span');
    asterisk.classList.add('required-asterisk');
    asterisk.style.color = 'red';
    root.appendChild(asterisk);

    sanitizeTree(root);

    expect(asterisk.style.color).toBe('red');
  });

  it('gère un arbre profond (3 niveaux)', () => {
    const root = document.createElement('div');
    root.style.margin = '10px';
    const level1 = document.createElement('div');
    level1.style.padding = '5px';
    const level2 = document.createElement('p');
    level2.style.lineHeight = '1.5';
    const level3 = document.createElement('span');
    level3.style.letterSpacing = '2px';

    root.appendChild(level1);
    level1.appendChild(level2);
    level2.appendChild(level3);

    sanitizeTree(root);

    expect(root.hasAttribute('style')).toBe(false);
    expect(level1.hasAttribute('style')).toBe(false);
    expect(level2.hasAttribute('style')).toBe(false);
    expect(level3.hasAttribute('style')).toBe(false);
  });

  it('ne fait rien pour null', () => {
    expect(() => sanitizeTree(null)).not.toThrow();
  });

  it('gère un arbre sans enfants', () => {
    const root = document.createElement('p');
    root.style.fontFamily = 'Arial';

    sanitizeTree(root);

    expect(root.hasAttribute('style')).toBe(false);
  });
});
