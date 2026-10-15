import { INKS } from '../core/constants.js';
import { esc, inkOptions } from './html.js';

const METHOD_LABELS = {
  image: 'Importer une image',
  catalog: 'Composer avec le catalogue',
  later: 'À ajouter plus tard',
};

function progress(step) {
  return /* HTML */ `<ol class="creation-steps" aria-label="Progression de la création">
    ${[
      ['Les bases', 'Nom et encres'],
      ['Decklist', 'Image ou catalogue'],
      ['Finaliser', 'Créer la fiche'],
    ]
      .map(
        ([title, detail], index) =>
          /* HTML */ `<li
            class="creation-step ${index + 1 === step ? 'active' : ''} ${index + 1 < step ? 'done' : ''}"
            ${index + 1 === step ? 'aria-current="step"' : ''}
          >
            <strong>${index + 1}. ${title}</strong><span>${detail}</span>
          </li>`,
      )
      .join('')}
  </ol>`;
}

function basics(deck, error) {
  const ready = deck.name.trim() && deck.inks.length > 0;
  return /* HTML */ `<div class="creation-section">
    <h2>Posez les bases</h2>
    <p class="field-help">Deux informations suffisent pour commencer.</p>
    <div class="field">
      <label for="create-name">Nom du deck *</label>
      <input
        id="create-name"
        data-create-field="name"
        value="${esc(deck.name)}"
        placeholder="Ex. Saphir Acier · Ramp"
        autocomplete="off"
        required
      />
    </div>
    <div class="field">
      <label>Encres du deck * <small>- 1 ou 2 maximum</small></label>
      ${inkOptions(deck.inks, 'create')}
      <p id="create-ink-help" class="field-help creation-field-help">
        ${deck.inks.length ? deck.inks.length + ' encre' + (deck.inks.length > 1 ? 's sélectionnées' : ' sélectionnée') : 'Sélectionnez au moins une encre.'}
      </p>
    </div>
    <p id="create-error" class="error creation-error" role="alert" ${error ? '' : 'hidden'}>
      ${esc(error)}
    </p>
    <div class="creation-actions">
      <button class="btn" data-action="create-cancel">Annuler</button>
      <button
        class="btn primary"
        id="create-basics-next"
        data-action="create-next"
        ${ready ? '' : 'disabled'}
      >
        Continuer vers la decklist →
      </button>
    </div>
  </div>`;
}

function decklist(method) {
  return /* HTML */ `<div class="creation-section">
    <h2>Comment ajouter votre decklist ?</h2>
    <p class="field-help">
      Choisissez le chemin le plus rapide. Vous pourrez toujours changer de méthode dans l’éditeur.
    </p>
    <div class="creation-choices">
      <button
        class="creation-choice ${method === 'image' ? 'selected' : ''}"
        data-create-method="image"
        aria-pressed="${method === 'image'}"
      >
        <span class="creation-choice-icon">⇧</span><strong>Importer une image</strong>
        <span>Le sélecteur de fichier s’ouvrira après la création.</span>
      </button>
      <button
        class="creation-choice ${method === 'catalog' ? 'selected' : ''}"
        data-create-method="catalog"
        aria-pressed="${method === 'catalog'}"
      >
        <span class="creation-choice-icon">⌕</span><strong>Composer avec le catalogue</strong>
        <span>Accédez directement à la recherche de cartes.</span>
      </button>
    </div>
    <div class="creation-actions creation-actions-three">
      <button class="btn" data-action="create-back">Retour</button>
      <button class="btn ghost" data-action="create-skip">Passer pour l’instant</button>
      <button
        class="btn primary"
        id="create-method-next"
        data-action="create-next"
        ${method && method !== 'later' ? '' : 'disabled'}
      >
        Continuer →
      </button>
    </div>
  </div>`;
}

function summary(deck, method) {
  const inks = deck.inks.map((ink) => INKS[ink][0]).join(' + ');
  return /* HTML */ `<div class="creation-section">
    <h2>Votre brouillon est prêt</h2>
    <p class="field-help">
      Les cartes clés, matchups et lignes de jeu restent disponibles dans l’éditeur.
    </p>
    <dl class="creation-summary">
      <div>
        <dt>Nom</dt>
        <dd>${esc(deck.name)}</dd>
      </div>
      <div>
        <dt>Encres</dt>
        <dd>${esc(inks)}</dd>
      </div>
      <div>
        <dt>Decklist</dt>
        <dd>${METHOD_LABELS[method]}</dd>
      </div>
    </dl>
    <div class="creation-actions">
      <button class="btn" data-action="create-back">Retour</button>
      <button class="btn primary" data-action="create-finish">Créer et ouvrir la fiche ✦</button>
    </div>
  </div>`;
}

export function creationPage({ deck, step, method, error }) {
  const content =
    step === 1 ? basics(deck, error) : step === 2 ? decklist(method) : summary(deck, method);
  return /* HTML */ `<div class="workspace-top">
      <button class="back" data-action="create-cancel">← Mes fiches</button>
      <span class="muted">La fiche sera enregistrée à la dernière étape.</span>
    </div>
    <h1 class="workspace-title">Une nouvelle stratégie.</h1>
    ${progress(step)}
    <section class="editor-panel creation-panel">
      <div class="form-body">${content}</div>
    </section>`;
}
