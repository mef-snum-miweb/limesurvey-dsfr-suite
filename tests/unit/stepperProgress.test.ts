import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initStepperProgress,
  buildSegmentedGradient,
} from '../../modules/theme-dsfr/src/ui/stepper-progress.js';

function buildStepper(steps: number | string, current: number | string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'fr-stepper__steps';
  el.setAttribute('data-fr-steps', String(steps));
  el.setAttribute('data-fr-current-step', String(current));
  document.body.appendChild(el);
  return el;
}

/** Compte les segments « actifs » et « disabled » dans une string linear-gradient. */
function countSegments(gradient: string): { active: number; disabled: number } {
  const active = (gradient.match(/--background-active-blue-france/g) || []).length;
  const disabled = (gradient.match(/--background-disabled-grey/g) || []).length;
  // Chaque segment apparaît 2 fois dans les stops (début + fin).
  return { active: active / 2, disabled: disabled / 2 };
}

describe('buildSegmentedGradient — génération du linear-gradient', () => {
  it('produit un linear-gradient(to right, …)', () => {
    const g = buildSegmentedGradient(7, 3);
    expect(g).toMatch(/^linear-gradient\(to right,/);
  });

  it('génère 7 segments dont 3 actifs et 4 disabled pour 3/7', () => {
    const g = buildSegmentedGradient(7, 3);
    expect(countSegments(g)).toEqual({ active: 3, disabled: 4 });
  });

  it('génère 15 segments dont 8 actifs pour 8/15 (au-delà de la limite DSFR)', () => {
    const g = buildSegmentedGradient(15, 8);
    expect(countSegments(g)).toEqual({ active: 8, disabled: 7 });
  });

  it('génère uniquement des segments disabled pour 0/N (rien commencé)', () => {
    const g = buildSegmentedGradient(5, 0);
    expect(countSegments(g)).toEqual({ active: 0, disabled: 5 });
  });

  it('génère uniquement des segments actifs pour N/N (terminé)', () => {
    const g = buildSegmentedGradient(5, 5);
    expect(countSegments(g)).toEqual({ active: 5, disabled: 0 });
  });

  it('clamp current à total si current > total (état incohérent)', () => {
    const g = buildSegmentedGradient(5, 10);
    expect(countSegments(g)).toEqual({ active: 5, disabled: 0 });
  });

  it('insère un séparateur transparent entre chaque segment (N-1 séparateurs)', () => {
    const g = buildSegmentedGradient(5, 2);
    // Chaque séparateur apparaît 2 fois dans les stops (début + fin).
    const transparentStops = (g.match(/transparent/g) || []).length;
    expect(transparentStops).toBe((5 - 1) * 2);
  });

  it('pas de séparateur final (après le dernier segment)', () => {
    const g = buildSegmentedGradient(3, 1);
    // Vérifie que la string ne se termine pas par "transparent X%)"
    expect(g).not.toMatch(/transparent[^,]+\)$/);
  });
});

describe('initStepperProgress — application au DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('pose un background-image linear-gradient sur le stepper', () => {
    const el = buildStepper(7, 1);
    initStepperProgress();
    expect(el.style.backgroundImage).toMatch(/^linear-gradient\(to right,/);
  });

  it('supporte 14 étapes (cas Galileo BNA)', () => {
    const el = buildStepper(14, 4);
    initStepperProgress();
    expect(countSegments(el.style.backgroundImage)).toEqual({ active: 4, disabled: 10 });
  });

  it('supporte 20 étapes', () => {
    const el = buildStepper(20, 17);
    initStepperProgress();
    expect(countSegments(el.style.backgroundImage)).toEqual({ active: 17, disabled: 3 });
  });

  it('ignore les steppers avec total = 0', () => {
    const el = buildStepper(0, 0);
    initStepperProgress();
    expect(el.style.backgroundImage).toBe('');
  });

  it('ignore les steppers avec total négatif', () => {
    const el = buildStepper(-3, 1);
    initStepperProgress();
    expect(el.style.backgroundImage).toBe('');
  });

  it('ignore les data-attributs non numériques', () => {
    const el = buildStepper('abc', 'xyz');
    initStepperProgress();
    expect(el.style.backgroundImage).toBe('');
  });

  it('ignore les steppers sans les data-attributs', () => {
    const el = document.createElement('div');
    el.className = 'fr-stepper__steps';
    document.body.appendChild(el);
    initStepperProgress();
    expect(el.style.backgroundImage).toBe('');
  });

  it('traite plusieurs steppers indépendamment', () => {
    const a = buildStepper(8, 2);
    const b = buildStepper(15, 7);
    initStepperProgress();
    expect(countSegments(a.style.backgroundImage)).toEqual({ active: 2, disabled: 6 });
    expect(countSegments(b.style.backgroundImage)).toEqual({ active: 7, disabled: 8 });
  });

  it('peut être appelée plusieurs fois (idempotent)', () => {
    const el = buildStepper(10, 3);
    initStepperProgress();
    const firstResult = el.style.backgroundImage;
    initStepperProgress();
    expect(el.style.backgroundImage).toBe(firstResult);
  });
});
