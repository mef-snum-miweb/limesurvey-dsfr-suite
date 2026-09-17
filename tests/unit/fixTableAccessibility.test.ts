import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixTableAccessibility } from '../../modules/theme-dsfr/src/a11y/table-accessibility.js';

// --- Tests ---

describe('fixTableAccessibility', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('ajoute scope="row" sur les th de tbody', () => {
    document.body.innerHTML = `
      <div class="ls-answers">
        <table>
          <tbody>
            <tr><th>Ligne 1</th><td>A</td></tr>
            <tr><th>Ligne 2</th><td>B</td></tr>
          </tbody>
        </table>
      </div>
    `;

    fixTableAccessibility();

    document.querySelectorAll('tbody th').forEach((th) => {
      expect(th.getAttribute('scope')).toBe('row');
    });
  });

  it('ajoute scope="col" sur les th de thead', () => {
    document.body.innerHTML = `
      <div class="ls-answers">
        <table>
          <thead><tr><th>Col A</th><th>Col B</th></tr></thead>
          <tbody><tr><td>1</td><td>2</td></tr></tbody>
        </table>
      </div>
    `;

    fixTableAccessibility();

    document.querySelectorAll('thead th').forEach((th) => {
      expect(th.getAttribute('scope')).toBe('col');
    });
  });

  it('ne remplace pas un scope existant', () => {
    document.body.innerHTML = `
      <div class="ls-answers">
        <table>
          <thead><tr><th scope="colgroup">Groupe</th></tr></thead>
          <tbody><tr><th scope="rowgroup">Bloc</th><td>X</td></tr></tbody>
        </table>
      </div>
    `;

    fixTableAccessibility();

    expect(document.querySelector('thead th')!.getAttribute('scope')).toBe('colgroup');
    expect(document.querySelector('tbody th')!.getAttribute('scope')).toBe('rowgroup');
  });

  it('ajoute headers sur les td d\'un tableau à double entrée (th avec id)', () => {
    document.body.innerHTML = `
      <div class="ls-answers">
        <table>
          <thead><tr><th></th><th id="col-a">A</th><th id="col-b">B</th></tr></thead>
          <tbody>
            <tr><th id="row-1">L1</th><td>1A</td><td>1B</td></tr>
            <tr><th id="row-2">L2</th><td>2A</td><td>2B</td></tr>
          </tbody>
        </table>
      </div>
    `;

    fixTableAccessibility();

    const cells = document.querySelectorAll('tbody td');
    expect(cells[0].getAttribute('headers')).toBe('row-1 col-a');
    expect(cells[1].getAttribute('headers')).toBe('row-1 col-b');
    expect(cells[2].getAttribute('headers')).toBe('row-2 col-a');
    expect(cells[3].getAttribute('headers')).toBe('row-2 col-b');
  });

  it('ne remplace pas un headers existant', () => {
    document.body.innerHTML = `
      <div class="ls-answers">
        <table>
          <thead><tr><th></th><th id="c1">Col</th></tr></thead>
          <tbody>
            <tr><th id="r1">Row</th><td headers="custom">Val</td></tr>
          </tbody>
        </table>
      </div>
    `;

    fixTableAccessibility();

    expect(document.querySelector('td')!.getAttribute('headers')).toBe('custom');
  });

  it('génère des id sur les th qui n\'en ont pas', () => {
    document.body.innerHTML = `
      <div class="ls-answers">
        <table id="tbl-q1">
          <thead><tr><th></th><th>Oui</th><th>Non</th></tr></thead>
          <tbody>
            <tr><th>Sous-question 1</th><td><input type="radio"></td><td><input type="radio"></td></tr>
          </tbody>
        </table>
      </div>
    `;

    fixTableAccessibility();

    const theadThs = document.querySelectorAll('thead th');
    // Le premier th est vide, pas d'id
    expect(theadThs[1].id).toMatch(/^tbl-q1-col-/);
    expect(theadThs[2].id).toMatch(/^tbl-q1-col-/);

    const tbodyTh = document.querySelector('tbody th')!;
    expect(tbodyTh.id).toMatch(/^tbl-q1-/);
  });

  it('fonctionne aussi avec .fr-table', () => {
    document.body.innerHTML = `
      <div class="fr-table">
        <table>
          <thead><tr><th>Col</th></tr></thead>
          <tbody><tr><th>Row</th><td>Val</td></tr></tbody>
        </table>
      </div>
    `;

    fixTableAccessibility();

    expect(document.querySelector('thead th')!.getAttribute('scope')).toBe('col');
    expect(document.querySelector('tbody th')!.getAttribute('scope')).toBe('row');
  });

  it('double échelle : headers pointe la bonne échelle malgré les <td> vides du thead (#58)', () => {
    // Markup du template dualscale/answer_dropdown : le <thead> intercale des
    // <td> vides (colonne des libellés, séparateur), et le corps a un <td>
    // séparateur entre les deux échelles.
    document.body.innerHTML = `
      <div class="fr-table">
        <table id="tbl">
          <thead>
            <tr class="ls-heading">
              <td></td>
              <th class="left-header" id="left-header-q1">Échelle 1</th>
              <td></td>
              <th class="right-header" id="right-header-q1">Échelle 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" id="answertext-sq1">Sous-question 1</th>
              <td class="answer-item" id="cell-scale-0"><select></select></td>
              <td class="ddarrayseparator"></td>
              <td class="answer-item" id="cell-scale-1"><select></select></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    fixTableAccessibility();

    // Avant le correctif : `right-header-q1` atterrissait sur la première
    // cellule, l'index ne comptant que les <th> du thead.
    expect(document.getElementById('cell-scale-0')!.getAttribute('headers'))
      .toBe('answertext-sq1 left-header-q1');
    expect(document.getElementById('cell-scale-1')!.getAttribute('headers'))
      .toBe('answertext-sq1 right-header-q1');
    // Le séparateur est décoratif : pas de headers inventé.
    expect(document.querySelector('.ddarrayseparator')!.hasAttribute('headers')).toBe(false);
  });

  it('ne fait rien s\'il n\'y a pas de tableau ciblé', () => {
    document.body.innerHTML = '<div><table><tr><td>Pas ciblé</td></tr></table></div>';
    expect(() => fixTableAccessibility()).not.toThrow();
    expect(document.querySelector('td')!.hasAttribute('scope')).toBe(false);
  });
});
