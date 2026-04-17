import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// --- Reproduire la logique depuis custom.js (lines 4138-4253) ---

function fixTableAccessibility(): void {
  const tables = document.querySelectorAll(
    '.ls-answers table, .ls-table-wrapper table, .fr-table table'
  );

  tables.forEach(function (table) {
    // scope="row" sur les th de tbody
    const tbodyRows = table.querySelectorAll('tbody tr');
    tbodyRows.forEach(function (tr) {
      const th = tr.querySelector('th');
      if (th && !th.hasAttribute('scope')) {
        th.setAttribute('scope', 'row');
      }
    });

    // scope="col" sur les th de thead
    const theadThs = table.querySelectorAll('thead th');
    theadThs.forEach(function (th) {
      if (!th.hasAttribute('scope')) {
        th.setAttribute('scope', 'col');
      }
    });

    // headers sur les td des tableaux à double entrée (th avec id en col ET en ligne)
    const hasColHeaders = table.querySelectorAll('thead th[id]').length > 0;
    const hasRowHeaders = table.querySelectorAll('tbody th[id]').length > 0;

    if (hasColHeaders && hasRowHeaders) {
      const colHeaderIds: (string | null)[] = [];
      const headerRow = table.querySelector('thead tr:last-child');
      if (headerRow) {
        let thIndex = 0;
        headerRow.querySelectorAll('th').forEach(function (th) {
          if (th.id) colHeaderIds[thIndex] = th.id;
          thIndex++;
        });
      }

      tbodyRows.forEach(function (tr) {
        const rowTh = tr.querySelector('th[id]');
        if (!rowTh) return;
        const rowHeaderId = rowTh.id;
        let cellIndex = 0;
        tr.querySelectorAll('td, th').forEach(function (cell) {
          if (cell.tagName === 'TH') { cellIndex++; return; }
          if (!cell.hasAttribute('headers') && colHeaderIds[cellIndex]) {
            cell.setAttribute('headers', rowHeaderId + ' ' + colHeaderIds[cellIndex]);
          }
          cellIndex++;
        });
      });
    }

    // Cas sans id sur les th : en ajouter
    let needsIds = false;
    const allTheadThs = table.querySelectorAll('thead th');
    const allTbodyThs = table.querySelectorAll('tbody th');
    allTheadThs.forEach(function (th) {
      if (!th.id && th.textContent!.trim()) needsIds = true;
    });
    allTbodyThs.forEach(function (th) {
      if (!th.id && th.textContent!.trim()) needsIds = true;
    });

    if (needsIds) {
      const tableId = table.id || 'tbl-test';
      allTheadThs.forEach(function (th, i) {
        if (!th.id && th.textContent!.trim()) th.id = tableId + '-col-' + i;
      });

      tbodyRows.forEach(function (tr) {
        const th = tr.querySelector('th');
        if (!th) return;
        if (!th.id && th.textContent!.trim()) {
          const rowName = tr.id || 'row-' + Math.random().toString(36).substr(2, 6);
          th.id = tableId + '-' + rowName;
        }
        if (!th.id) return;

        let cellIndex = 0;
        const colIds: (string | null)[] = [];
        allTheadThs.forEach(function (headTh, i) {
          colIds[i] = headTh.id || null;
        });

        tr.querySelectorAll('td, th').forEach(function (cell) {
          if (cell.tagName === 'TH') { cellIndex++; return; }
          if (!cell.hasAttribute('headers') && colIds[cellIndex]) {
            cell.setAttribute('headers', th!.id + ' ' + colIds[cellIndex]);
          }
          cellIndex++;
        });
      });
    }
  });
}

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

  it('ne fait rien s\'il n\'y a pas de tableau ciblé', () => {
    document.body.innerHTML = '<div><table><tr><td>Pas ciblé</td></tr></table></div>';
    expect(() => fixTableAccessibility()).not.toThrow();
    expect(document.querySelector('td')!.hasAttribute('scope')).toBe(false);
  });
});
