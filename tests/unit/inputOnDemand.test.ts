import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// --- Reproduire les fonctions depuis custom.js (lines 70-101) ---

function restoreVisibleLines(): void {
  const containers = document.querySelectorAll('[id^="selector--inputondemand-"]');

  containers.forEach((container) => {
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
  const containers = document.querySelectorAll('[id^="selector--inputondemand-"]');

  containers.forEach((container) => {
    const button = container.querySelector('.selector--inputondemand-addlinebutton') as HTMLElement;
    const itemsList = container.querySelector('.selector--inputondemand-list');

    if (!button || !itemsList) return;

    const hiddenItems = itemsList.querySelectorAll('.selector--inputondemand-list-item.d-none');
    button.style.display = hiddenItems.length > 0 ? '' : 'none';
  });
}

// --- Helpers ---

function buildInputOnDemandDOM(options: {
  itemCount: number;
  hiddenCount: number;
}): void {
  const items = [];
  for (let i = 0; i < options.itemCount; i++) {
    const hidden = i >= options.itemCount - options.hiddenCount ? ' d-none' : '';
    items.push(
      `<div class="selector--inputondemand-list-item${hidden}"><input type="text" value=""></div>`
    );
  }

  document.body.innerHTML = `
    <div id="selector--inputondemand-q42">
      <div class="selector--inputondemand-list">
        ${items.join('\n')}
      </div>
      <button class="selector--inputondemand-addlinebutton">Ajouter une ligne</button>
    </div>
  `;
}

// --- Tests ---

describe('restoreVisibleLines', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('affiche la première ligne si toutes sont masquées', () => {
    buildInputOnDemandDOM({ itemCount: 3, hiddenCount: 3 });

    restoreVisibleLines();

    const items = document.querySelectorAll('.selector--inputondemand-list-item');
    expect(items[0].classList.contains('d-none')).toBe(false);
    expect(items[1].classList.contains('d-none')).toBe(true);
    expect(items[2].classList.contains('d-none')).toBe(true);
  });

  it('ne fait rien si au moins une ligne est visible', () => {
    buildInputOnDemandDOM({ itemCount: 3, hiddenCount: 2 });

    restoreVisibleLines();

    const hidden = document.querySelectorAll('.selector--inputondemand-list-item.d-none');
    expect(hidden.length).toBe(2);
  });

  it('ne fait rien s\'il n\'y a aucun item', () => {
    document.body.innerHTML = `
      <div id="selector--inputondemand-q42">
        <div class="selector--inputondemand-list"></div>
      </div>
    `;

    expect(() => restoreVisibleLines()).not.toThrow();
  });

  it('ne fait rien si aucune ligne n\'est masquée', () => {
    buildInputOnDemandDOM({ itemCount: 3, hiddenCount: 0 });

    restoreVisibleLines();

    const hidden = document.querySelectorAll('.selector--inputondemand-list-item.d-none');
    expect(hidden.length).toBe(0);
  });
});

describe('updateAddButtonVisibility', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('affiche le bouton s\'il reste des lignes masquées', () => {
    buildInputOnDemandDOM({ itemCount: 3, hiddenCount: 2 });

    updateAddButtonVisibility();

    const btn = document.querySelector('.selector--inputondemand-addlinebutton') as HTMLElement;
    expect(btn.style.display).toBe('');
  });

  it('masque le bouton si toutes les lignes sont visibles', () => {
    buildInputOnDemandDOM({ itemCount: 3, hiddenCount: 0 });

    updateAddButtonVisibility();

    const btn = document.querySelector('.selector--inputondemand-addlinebutton') as HTMLElement;
    expect(btn.style.display).toBe('none');
  });

  it('ne fait rien s\'il manque le bouton', () => {
    document.body.innerHTML = `
      <div id="selector--inputondemand-q42">
        <div class="selector--inputondemand-list">
          <div class="selector--inputondemand-list-item d-none"><input></div>
        </div>
      </div>
    `;

    expect(() => updateAddButtonVisibility()).not.toThrow();
  });
});
