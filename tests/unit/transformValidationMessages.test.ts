import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { transformValidationMessages } from '../../modules/theme-dsfr/src/validation/validation-messages.js';

/**
 * Stub jQuery minimal : enregistre les handlers `on`/`off` par élément et
 * permet de les déclencher manuellement (équivalent de `.trigger()` côté EM).
 */
function makeJqueryStub() {
  const handlers = new Map<Element, Record<string, Array<() => void>>>();
  const $ = (el: Element) => ({
    on(events: string, cb: () => void) {
      const reg = handlers.get(el) ?? {};
      events.split(/\s+/).forEach((e) => { (reg[e] ??= []).push(cb); });
      handlers.set(el, reg);
    },
    off(events: string) {
      const reg = handlers.get(el);
      if (!reg) return;
      events.split(/\s+/).forEach((e) => { delete reg[e]; });
    },
  });
  const trigger = (el: Element, event: string) => {
    handlers.get(el)?.[event]?.forEach((cb) => cb());
  };
  return { $, trigger, handlers };
}

/**
 * jsdom interdit de forger un événement isTrusted=true : on capture les
 * listeners d'interaction posés par le module sur le conteneur question et
 * on les invoque avec un événement factice « trusted ».
 */
function captureInteractionListeners(question: Element) {
  const captured: Array<(e: { isTrusted: boolean }) => void> = [];
  const origAdd = question.addEventListener.bind(question);
  (question as any).addEventListener = (type: string, cb: any, opts: any) => {
    captured.push(cb);
    origAdd(type, cb, opts);
  };
  return {
    simulateTrustedInteraction() {
      captured.forEach((cb) => cb({ isTrusted: true }));
    },
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

// --- Tests ---

describe('transformValidationMessages', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).jQuery;
  });

  it('transforme un message d\'erreur LS en fr-message--error', () => {
    document.body.innerHTML = '<div class="ls-question-message ls-em-error" id="vmsg_42">Erreur de saisie</div>';

    transformValidationMessages();

    const msg = document.querySelector('.fr-message--error')!;
    expect(msg).not.toBeNull();
    expect(msg.textContent).toBe('Erreur de saisie');
    expect(msg.tagName).toBe('P');
    expect(msg.id).toBe('vmsg_42-dsfr');
  });

  it('transforme un message warning LS en fr-message--warning', () => {
    document.body.innerHTML = '<div class="ls-question-message ls-em-warning">Attention</div>';

    transformValidationMessages();

    expect(document.querySelector('.fr-message--warning')!.textContent).toBe('Attention');
  });

  it('transforme un message tip LS en fr-message--info', () => {
    document.body.innerHTML = '<div class="ls-question-message ls-em-tip">Saisissez un nombre</div>';

    transformValidationMessages();

    expect(document.querySelector('.fr-message--info')!.textContent).toBe('Saisissez un nombre');
  });

  it('transforme un message success LS en fr-message--info', () => {
    document.body.innerHTML = '<div class="ls-question-message ls-em-success">Valide</div>';

    transformValidationMessages();

    expect(document.querySelector('.fr-message--info')!.textContent).toBe('Valide');
  });

  it('transforme un message sans classe spécifique en fr-message--info (défaut)', () => {
    document.body.innerHTML = '<div class="ls-question-message">Info générique</div>';

    transformValidationMessages();

    expect(document.querySelector('.fr-message--info')!.textContent).toBe('Info générique');
  });

  it('ne retransforme pas un message déjà traité', () => {
    document.body.innerHTML = '<p class="fr-message fr-message--error ls-question-message">Déjà traité</p>';

    transformValidationMessages();

    // Le message a déjà fr-message → skip
    expect(document.querySelectorAll('.fr-message').length).toBe(1);
  });

  it('traite plusieurs messages en une passe', () => {
    document.body.innerHTML = `
      <div class="ls-question-message ls-em-error">Erreur 1</div>
      <div class="ls-question-message ls-em-tip">Tip 1</div>
      <div class="ls-question-message ls-em-warning">Warning 1</div>
    `;

    transformValidationMessages();

    expect(document.querySelectorAll('.fr-message').length).toBe(3);
    expect(document.querySelector('.fr-message--error')!.textContent).toBe('Erreur 1');
    expect(document.querySelector('.fr-message--info')!.textContent).toBe('Tip 1');
    expect(document.querySelector('.fr-message--warning')!.textContent).toBe('Warning 1');
  });

  it('strip les espaces dans le textContent', () => {
    document.body.innerHTML = '<div class="ls-question-message">  Avec   espaces  </div>';

    transformValidationMessages();

    expect(document.querySelector('.fr-message')!.textContent).toBe('Avec   espaces');
  });

  it('gère un id vide correctement', () => {
    document.body.innerHTML = '<div class="ls-question-message">Sans id</div>';

    transformValidationMessages();

    expect(document.querySelector('.fr-message')!.id).toBe('');
  });

  // --- Synchronisation EM (issue #42) ---

  it('conserve le nœud core masqué, strippé de toutes ses classes core, à côté du miroir', () => {
    document.body.innerHTML = '<div class="ls-question-message ls-em-tip em_default" id="vmsg_7_num_answers">Veuillez compléter 2 réponses.</div>';

    transformValidationMessages();

    const original = document.getElementById('vmsg_7_num_answers')!;
    expect(original).not.toBeNull();
    expect(original.style.display).toBe('none');
    // Plus aucun sélecteur core ne doit le matcher (.ls-em-tip, .em_default…),
    // sinon ranking.js core double le texte d'aide à sa seconde init.
    expect(original.className).toBe('dsfr-vmsg-core');
    expect(original.dataset.dsfrMirrored).toBe('1');
    expect(original.nextElementSibling).toBe(document.getElementById('vmsg_7_num_answers-dsfr'));
  });

  it('est idempotent : une seconde passe ne crée pas de second miroir', () => {
    document.body.innerHTML = '<div class="ls-question-message ls-em-tip" id="vmsg_7_x">Tip</div>';

    transformValidationMessages();
    transformValidationMessages();

    expect(document.querySelectorAll('.fr-message').length).toBe(1);
  });

  it('recopie les textes tailorés EM vers le miroir (MutationObserver)', async () => {
    document.body.innerHTML =
      '<div class="ls-question-message ls-em-tip" id="vmsg_7_sum">Somme actuelle : <span id="tailor_7">0</span></div>';

    transformValidationMessages();
    document.getElementById('tailor_7')!.textContent = '15';
    await tick();

    expect(document.getElementById('vmsg_7_sum-dsfr')!.textContent).toBe('Somme actuelle : 15');
  });

  it('débranche les handlers core (off) et relaie classChangeError après interaction réelle', () => {
    const { $, trigger, handlers } = makeJqueryStub();
    (window as any).jQuery = $;
    document.body.innerHTML = `
      <div class="question-container" id="question7">
        <input type="text">
        <div class="ls-question-message ls-em-tip" id="vmsg_7_num_answers">Veuillez compléter 2 réponses.</div>
      </div>`;
    const original = document.getElementById('vmsg_7_num_answers')!;
    // Handler « core » préexistant (template-core.js) qui doit être débranché
    let coreFired = false;
    $(original).on('classChangeError', () => { coreFired = true; });
    const interaction = captureInteractionListeners(document.getElementById('question7')!);

    transformValidationMessages();
    const mirror = document.getElementById('vmsg_7_num_answers-dsfr')!;

    // À froid (aucune interaction) : le signal EM est mémorisé mais pas relayé
    trigger(original, 'classChangeError');
    expect(coreFired).toBe(false);
    expect(mirror.classList.contains('fr-message--error')).toBe(false);
    expect(mirror.classList.contains('fr-message--info')).toBe(true);

    // Interaction réelle → l'état EM courant est matérialisé
    interaction.simulateTrustedInteraction();
    expect(mirror.classList.contains('fr-message--error')).toBe(true);

    // classChangeGood → retour à l'info
    trigger(original, 'classChangeGood');
    expect(mirror.classList.contains('fr-message--error')).toBe(false);
    expect(mirror.classList.contains('fr-message--info')).toBe(true);
  });

  it('ignore les événements synthétiques (non isTrusted) pour le flag interaction', () => {
    const { $, trigger } = makeJqueryStub();
    (window as any).jQuery = $;
    document.body.innerHTML = `
      <div class="question-container" id="question7">
        <input type="text">
        <div class="ls-question-message ls-em-tip" id="vmsg_7_num_answers">Tip</div>
      </div>`;

    transformValidationMessages();
    const original = document.getElementById('vmsg_7_num_answers')!;
    const mirror = document.getElementById('vmsg_7_num_answers-dsfr')!;

    trigger(original, 'classChangeError');
    document.querySelector('input')!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(mirror.classList.contains('fr-message--error')).toBe(false);
  });

  it('retente le câblage jQuery à la passe suivante si jQuery est absent', () => {
    document.body.innerHTML = `
      <div class="question-container">
        <input type="text">
        <div class="ls-question-message ls-em-tip" id="vmsg_9_x">Tip</div>
      </div>`;

    // Passe 1 sans jQuery : miroir créé, câblage différé
    transformValidationMessages();
    const original = document.getElementById('vmsg_9_x')!;
    expect(original.dataset.dsfrEmWired).toBeUndefined();
    expect(document.querySelectorAll('.fr-message').length).toBe(1);

    // Passe 2 avec jQuery : câblage effectué, toujours un seul miroir
    const { $, trigger } = makeJqueryStub();
    (window as any).jQuery = $;
    const interaction = captureInteractionListeners(document.querySelector('.question-container')!);
    transformValidationMessages();
    expect(original.dataset.dsfrEmWired).toBe('1');
    expect(document.querySelectorAll('.fr-message').length).toBe(1);

    interaction.simulateTrustedInteraction();
    trigger(original, 'classChangeError');
    expect(document.getElementById('vmsg_9_x-dsfr')!.classList.contains('fr-message--error')).toBe(true);
  });
});
