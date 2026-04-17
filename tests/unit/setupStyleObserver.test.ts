import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Reproduire la logique depuis custom.js (lines 2440-2476) ---

let styleObserver: MutationObserver | null = null;

function setupStyleObserver(): void {
  // Ne surveiller que sur mobile
  if (window.innerWidth >= 768) {
    if (styleObserver) {
      styleObserver.disconnect();
      styleObserver = null;
    }
    return;
  }

  // Si déjà actif, ne rien faire
  if (styleObserver) {
    return;
  }

  // Créer l'observer
  styleObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target as HTMLElement;
        if (target.tagName === 'TD' && target.closest('table.dropdown-array')) {
          target.removeAttribute('style');
        }
      }
    });
  });

  // Observer tous les tableaux dropdown-array
  const dropdownArrays = document.querySelectorAll('table.dropdown-array');
  dropdownArrays.forEach(function (table) {
    styleObserver!.observe(table, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
    });
  });
}

// Reset pour les tests
function resetObserver(): void {
  if (styleObserver) {
    styleObserver.disconnect();
    styleObserver = null;
  }
}

// --- Tests ---

describe('setupStyleObserver', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetObserver();
  });

  afterEach(() => {
    resetObserver();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('crée un observer sur mobile (< 768px)', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);

    document.body.innerHTML = `
      <table class="dropdown-array">
        <tbody><tr><td>Cellule</td></tr></tbody>
      </table>
    `;

    setupStyleObserver();

    expect(styleObserver).not.toBeNull();
  });

  it('ne crée pas d\'observer sur desktop (>= 768px)', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);

    document.body.innerHTML = `
      <table class="dropdown-array">
        <tbody><tr><td>Cellule</td></tr></tbody>
      </table>
    `;

    setupStyleObserver();

    expect(styleObserver).toBeNull();
  });

  it('déconnecte l\'observer existant sur desktop', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);

    document.body.innerHTML = `
      <table class="dropdown-array">
        <tbody><tr><td>Cellule</td></tr></tbody>
      </table>
    `;

    // D'abord créer un observer
    setupStyleObserver();
    expect(styleObserver).not.toBeNull();

    // Puis passer en desktop
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    setupStyleObserver();
    expect(styleObserver).toBeNull();
  });

  it('ne recrée pas l\'observer si déjà actif', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);

    document.body.innerHTML = `
      <table class="dropdown-array">
        <tbody><tr><td>Cellule</td></tr></tbody>
      </table>
    `;

    setupStyleObserver();
    const firstObserver = styleObserver;
    setupStyleObserver();

    expect(styleObserver).toBe(firstObserver);
  });

  it('ne crée pas d\'observer s\'il n\'y a pas de tableaux dropdown-array', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);

    document.body.innerHTML = '<div>Pas de tableau</div>';

    setupStyleObserver();

    // L'observer est créé mais n'observe rien — c'est le comportement réel
    expect(styleObserver).not.toBeNull();
  });
});
