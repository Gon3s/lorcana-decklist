import { INKS } from '../core/constants.js';
import { uniqueDeckCards } from '../core/decklist.js';
import { esc } from './html.js';

function progress(step) {
  return /* HTML */ `<ol class="creation-steps" aria-label="Progression de la création">
    ${[
      ['Decklist', 'Coller la liste'],
      ['Vérifier', 'Rapprocher les cartes'],
      ['Stratégie', 'Choisir les rôles'],
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

function errorMessage(error) {
  return /* HTML */ `<p class="error creation-error" role="alert" ${error ? '' : 'hidden'}>
    ${esc(error)}
  </p>`;
}

function importStep(deck, input, error) {
  const ready = deck.name.trim() && input.trim();
  return /* HTML */ `<div class="creation-section">
    <h2>Importez votre decklist Duels.ink</h2>
    <p class="field-help">
      Collez la liste complète. Le code entre parenthèses identifie précisément les impressions
      standards et promotionnelles.
    </p>
    <div class="field">
      <label for="create-name">Nom du deck *</label>
      <input
        id="create-name"
        data-create-field="name"
        value="${esc(deck.name)}"
        placeholder="Ex. Émeraude Acier - Tempo"
        autocomplete="off"
        required
      />
    </div>
    <div class="field">
      <label for="create-decklist">Decklist Duels.ink *</label>
      <textarea
        id="create-decklist"
        class="creation-decklist-input"
        data-create-field="decklist"
        placeholder="Collez ici la liste exportée depuis Duels.ink"
        spellcheck="false"
        required
      >
${esc(input)}</textarea>
      <p class="field-help creation-field-help">
        Une carte par ligne : quantité, nom, puis code entre parenthèses.
      </p>
    </div>
    ${errorMessage(error)}
    <div class="creation-actions">
      <button class="btn" data-action="create-cancel">Annuler</button>
      <button class="btn primary" data-action="create-next" ${ready ? '' : 'disabled'}>
        Rapprocher les cartes →
      </button>
    </div>
  </div>`;
}

function reviewStatus(result) {
  const problems = result.errors.length + result.unresolved;
  return /* HTML */ `<div class="creation-review-stats">
    <span><strong>${result.total}</strong> cartes</span>
    <span><strong>${result.matched}</strong> lignes rapprochées</span>
    <span class="${problems ? 'problem' : 'success'}"
      ><strong>${problems}</strong> problème${problems === 1 ? '' : 's'}</span
    >
  </div>`;
}

function reviewRows(result) {
  const parseErrors = result.errors.map(
    (error) =>
      /* HTML */ `<li class="creation-review-row problem">
        <span class="creation-review-qty">L${error.line}</span>
        <span><strong>${esc(error.input)}</strong><small>${esc(error.message)}</small></span>
        <span class="creation-review-state">À corriger</span>
      </li>`,
  );
  const rows = result.rows.map((row) => {
    const matched = row.status === 'matched';
    const detail = matched
      ? row.card.name
      : row.status === 'ambiguous'
        ? 'Plusieurs cartes correspondent à ce code.'
        : 'Impression absente du catalogue intégré.';
    return /* HTML */ `<li class="creation-review-row ${matched ? '' : 'problem'}">
      <span class="creation-review-qty">${row.qty}×</span>
      <span>
        <strong>${esc(row.importedName)}</strong>
        <small>${esc(row.printingCode)} · ${esc(detail)}</small>
      </span>
      <span class="creation-review-state">${matched ? 'Reconnue' : 'À corriger'}</span>
    </li>`;
  });
  return /* HTML */ `<ul class="creation-review-list">
    ${[...parseErrors, ...rows].join('')}
  </ul>`;
}

function reviewStep(deck, result, error) {
  const inks = deck.inks.map((ink) => INKS[ink]?.[0]).filter(Boolean);
  return /* HTML */ `<div class="creation-section creation-section-wide">
    <h2>Vérifiez le rapprochement</h2>
    <p class="field-help">
      Les noms peuvent différer entre Duels.ink et le catalogue français. Le code d’impression fait
      foi.
    </p>
    ${reviewStatus(result)}
    ${inks.length ? /* HTML */ `<p class="creation-detected-inks">Encres détectées : <strong>${esc(inks.join(' + '))}</strong></p>` : ''}
    ${reviewRows(result)} ${errorMessage(error)}
    <div class="creation-actions">
      <button class="btn" data-action="create-back">Corriger la decklist</button>
      <button class="btn primary" data-action="create-next" ${result.ready ? '' : 'disabled'}>
        Choisir les cartes stratégiques →
      </button>
    </div>
  </div>`;
}

function selectionButton(section, card, selected) {
  return /* HTML */ `<button
    class="btn small creation-role ${selected ? 'selected' : ''}"
    data-create-section="${section}"
    data-card-id="${esc(card.id)}"
    aria-pressed="${selected}"
  >
    ${section === 'keys' ? 'Clé' : 'Core'}
  </button>`;
}

function strategyStep(deck, error) {
  const cards = uniqueDeckCards(deck.decklist);
  return /* HTML */ `<div class="creation-section creation-section-wide">
    <h2>Quelles cartes définissent le deck ?</h2>
    <p class="field-help">
      Sélectionnez les cartes clés et le core directement dans la decklist. Une carte peut
      appartenir aux deux rubriques. Les notes et les techs restent modifiables ensuite.
    </p>
    <div class="creation-role-summary">
      <span
        ><strong>${deck.keys.length}</strong> carte${deck.keys.length === 1 ? '' : 's'}
        clé${deck.keys.length === 1 ? '' : 's'}</span
      >
      <span
        ><strong>${deck.core.length}</strong> carte${deck.core.length === 1 ? '' : 's'} core</span
      >
    </div>
    <ul class="creation-strategy-list">
      ${cards
        .map(
          (card) =>
            /* HTML */ `<li class="creation-strategy-card">
              ${card.image ? `<img src="${esc(card.image)}" alt="" loading="lazy" />` : ''}
              <span>
                <strong>${card.qty}× ${esc(card.name)}</strong>
                <small>${esc(card.printingCode)}</small>
              </span>
              <span class="creation-role-actions">
                ${selectionButton(
                  'keys',
                  card,
                  deck.keys.some((row) => row.id === card.id),
                )}
                ${selectionButton(
                  'core',
                  card,
                  deck.core.some((row) => row.id === card.id),
                )}
              </span>
            </li>`,
        )
        .join('')}
    </ul>
    ${errorMessage(error)}
    <div class="creation-actions">
      <button class="btn" data-action="create-back">Retour</button>
      <button class="btn primary" data-action="create-finish">Créer et ouvrir la fiche ✦</button>
    </div>
  </div>`;
}

export function creationPage({ deck, step, input, result, error }) {
  const content =
    step === 1
      ? importStep(deck, input, error)
      : step === 2
        ? reviewStep(deck, result, error)
        : strategyStep(deck, error);
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
