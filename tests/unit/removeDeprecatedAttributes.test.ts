import { describe, it, expect } from 'vitest';

// --- Reproduire la logique depuis custom.js (lines 4049-4059) ---

function shouldSkipElement(element: Element | null): boolean {
  if (!element) return true;
  if (
    element.classList &&
    (element.classList.contains('required-asterisk') ||
      element.classList.contains('asterisk'))
  )
    return true;
  if (element.tagName === 'IMG') return true;
  if (element.querySelector && element.querySelector('img')) return true;
  if (element.closest && element.closest('[class*="upload"]')) return true;
  if (element.closest && element.closest('[class*="file"]')) return true;
  return false;
}

function removeDeprecatedAttributes(element: Element | null): void {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
  if (shouldSkipElement(element)) return;

  // Attributs HTML obsolètes de mise en forme
  ['align', 'bgcolor', 'color', 'face', 'size'].forEach((attr) => {
    if (element.hasAttribute(attr)) {
      element.removeAttribute(attr);
    }
  });
}

// --- Tests ---

describe('removeDeprecatedAttributes', () => {
  it('supprime align', () => {
    const el = document.createElement('p');
    el.setAttribute('align', 'center');
    removeDeprecatedAttributes(el);
    expect(el.hasAttribute('align')).toBe(false);
  });

  it('supprime bgcolor', () => {
    const td = document.createElement('td');
    td.setAttribute('bgcolor', '#ff0000');
    removeDeprecatedAttributes(td);
    expect(td.hasAttribute('bgcolor')).toBe(false);
  });

  it('supprime color', () => {
    const font = document.createElement('font');
    font.setAttribute('color', 'blue');
    removeDeprecatedAttributes(font);
    expect(font.hasAttribute('color')).toBe(false);
  });

  it('supprime face', () => {
    const font = document.createElement('font');
    font.setAttribute('face', 'Arial');
    removeDeprecatedAttributes(font);
    expect(font.hasAttribute('face')).toBe(false);
  });

  it('supprime size', () => {
    const font = document.createElement('font');
    font.setAttribute('size', '5');
    removeDeprecatedAttributes(font);
    expect(font.hasAttribute('size')).toBe(false);
  });

  it('supprime plusieurs attributs obsolètes en une passe', () => {
    const td = document.createElement('td');
    td.setAttribute('align', 'right');
    td.setAttribute('bgcolor', '#fff');
    td.setAttribute('color', 'red');

    removeDeprecatedAttributes(td);

    expect(td.hasAttribute('align')).toBe(false);
    expect(td.hasAttribute('bgcolor')).toBe(false);
    expect(td.hasAttribute('color')).toBe(false);
  });

  it('conserve les attributs non-obsolètes (class, id, data-*)', () => {
    const el = document.createElement('div');
    el.setAttribute('class', 'my-class');
    el.setAttribute('id', 'my-id');
    el.setAttribute('data-custom', 'value');
    el.setAttribute('align', 'center');

    removeDeprecatedAttributes(el);

    expect(el.getAttribute('class')).toBe('my-class');
    expect(el.getAttribute('id')).toBe('my-id');
    expect(el.getAttribute('data-custom')).toBe('value');
    expect(el.hasAttribute('align')).toBe(false);
  });

  it('ne fait rien sur un élément sans attributs obsolètes', () => {
    const el = document.createElement('div');
    el.setAttribute('class', 'fr-text');
    removeDeprecatedAttributes(el);
    expect(el.getAttribute('class')).toBe('fr-text');
  });

  it('ne touche pas un <img>', () => {
    const img = document.createElement('img');
    img.setAttribute('align', 'center');
    removeDeprecatedAttributes(img);
    expect(img.hasAttribute('align')).toBe(true);
  });

  it('ne touche pas un élément avec classe required-asterisk', () => {
    const el = document.createElement('span');
    el.classList.add('required-asterisk');
    el.setAttribute('color', 'red');
    removeDeprecatedAttributes(el);
    expect(el.hasAttribute('color')).toBe(true);
  });

  it('ne fait rien pour null', () => {
    expect(() => removeDeprecatedAttributes(null)).not.toThrow();
  });
});
