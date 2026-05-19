import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initStepperProgress } from '../../modules/theme-dsfr/src/ui/stepper-progress.js';

function buildStepper(steps: number | string, current: number | string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'fr-stepper__steps';
  el.setAttribute('data-fr-steps', String(steps));
  el.setAttribute('data-fr-current-step', String(current));
  document.body.appendChild(el);
  return el;
}

describe('initStepperProgress', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('calcule 0% pour la première étape', () => {
    const el = buildStepper(7, 0);
    initStepperProgress();
    expect(el.style.getPropertyValue('--fr-progress')).toBe('0%');
  });

  it('calcule (1/7)×100 ≈ 14.28% pour étape 1 sur 7', () => {
    const el = buildStepper(7, 1);
    initStepperProgress();
    const v = el.style.getPropertyValue('--fr-progress');
    expect(parseFloat(v)).toBeCloseTo(14.2857, 1);
  });

  it('calcule 100% sur la dernière étape', () => {
    const el = buildStepper(7, 7);
    initStepperProgress();
    expect(el.style.getPropertyValue('--fr-progress')).toBe('100%');
  });

  it('supporte 12 étapes (au-delà de la limite DSFR à 8)', () => {
    const el = buildStepper(12, 5);
    initStepperProgress();
    const v = el.style.getPropertyValue('--fr-progress');
    expect(parseFloat(v)).toBeCloseTo(41.666, 1);
  });

  it('supporte 20 étapes (largement au-delà de la limite DSFR)', () => {
    const el = buildStepper(20, 17);
    initStepperProgress();
    const v = el.style.getPropertyValue('--fr-progress');
    expect(parseFloat(v)).toBeCloseTo(85, 1);
  });

  it('clamp à 100% si current > total (état incohérent)', () => {
    const el = buildStepper(5, 10);
    initStepperProgress();
    expect(el.style.getPropertyValue('--fr-progress')).toBe('100%');
  });

  it('ignore les steppers avec total = 0', () => {
    const el = buildStepper(0, 0);
    initStepperProgress();
    expect(el.style.getPropertyValue('--fr-progress')).toBe('');
  });

  it('ignore les steppers avec total négatif', () => {
    const el = buildStepper(-3, 1);
    initStepperProgress();
    expect(el.style.getPropertyValue('--fr-progress')).toBe('');
  });

  it('ignore les data-attributs non numériques', () => {
    const el = buildStepper('abc', 'xyz');
    initStepperProgress();
    expect(el.style.getPropertyValue('--fr-progress')).toBe('');
  });

  it('ignore les steppers sans les data-attributs', () => {
    const el = document.createElement('div');
    el.className = 'fr-stepper__steps';
    document.body.appendChild(el);
    initStepperProgress();
    expect(el.style.getPropertyValue('--fr-progress')).toBe('');
  });

  it('traite plusieurs steppers indépendamment', () => {
    const a = buildStepper(8, 2);
    const b = buildStepper(15, 7);
    initStepperProgress();
    expect(parseFloat(a.style.getPropertyValue('--fr-progress'))).toBeCloseTo(25, 1);
    expect(parseFloat(b.style.getPropertyValue('--fr-progress'))).toBeCloseTo(46.666, 1);
  });

  it('peut être appelée plusieurs fois (idempotent)', () => {
    const el = buildStepper(10, 3);
    initStepperProgress();
    initStepperProgress();
    expect(parseFloat(el.style.getPropertyValue('--fr-progress'))).toBeCloseTo(30, 1);
  });
});
