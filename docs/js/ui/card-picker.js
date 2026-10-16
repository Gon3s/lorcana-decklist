import { cardPrinting } from '../core/catalog.js';
import { CARD_SECTIONS, CARD_TYPES, INKS } from '../core/constants.js';
import { safeURL } from '../core/utils.js';
import { esc, inkIcon, inksHTML, selectOptions } from './html.js';

const PICKER_TITLES = Object.freeze({
  keys: 'Ajouter aux cartes clés',
  core: 'Ajouter au core du deck',
  tech: 'Ajouter aux techs et cartes potentielles',
});

function catalogSets(document) {
  const sets = new Map(document.sets.map((set) => [String(set.id), String(set.name)]));
  for (const card of [...document.cards, ...document.custom])
    for (const set of card.set) if (!sets.has(set)) sets.set(set, set);
  return [...sets].sort((a, b) => b[0].localeCompare(a[0], 'fr', { numeric: true }));
}

export function cardPicker({ document, filters, target, deck, filtersOpen = false }) {
  return /* HTML */ `<section class="card-picker" data-card-picker>
    <header class="card-picker-heading">
      <div>
        <div class="eyebrow">AJOUT DE CARTES</div>
        <h2 id="card-picker-title">${PICKER_TITLES[target]}</h2>
        <p>Recherchez et sélectionnez plusieurs cartes sans quitter votre fiche.</p>
      </div>
      <span class="card-picker-destination"
        >${deck[target].length} carte${deck[target].length === 1 ? '' : 's'}</span
      >
    </header>
    <div class="card-picker-search-row">
      <div class="field card-picker-search">
        <label for="card-picker-search">Nom, capacité ou texte de carte</label>
        <input
          id="card-picker-search"
          type="search"
          data-picker-filter="query"
          value="${esc(filters.query)}"
          placeholder="Ex. Merlin, pioche, défi..."
          autocomplete="off"
        />
      </div>
      <button
        type="button"
        class="btn card-picker-filter-toggle ${filtersOpen ? 'selected' : ''}"
        data-picker-toggle-filters
        aria-expanded="${filtersOpen}"
        aria-controls="card-picker-filters"
      >
        Filtres${filters.deckOnly || filters.inks.length || filters.type || filters.set || filters.cost ? ' · actifs' : ''}
      </button>
    </div>
    <div class="card-picker-quick-filters">
      <label class="checkbox-label">
        <input
          type="checkbox"
          data-picker-filter="deckOnly"
          ${filters.deckOnly ? 'checked' : ''}
          ${deck.inks.length ? '' : 'disabled'}
        />
        Encres du deck uniquement
      </label>
      <button type="button" class="text-button" data-picker-clear-filters>Réinitialiser</button>
    </div>
    <div id="card-picker-filters" class="card-picker-filters" ${filtersOpen ? '' : 'hidden'}>
      <fieldset class="catalog-ink-filters">
        <legend>Encres autorisées - sélection multiple</legend>
        <div class="catalog-ink-buttons">
          ${Object.entries(INKS)
            .map(
              ([ink, [name, color]]) =>
                /* HTML */ `<button
                  type="button"
                  class="ink-option ${filters.inks.includes(ink) ? 'selected' : ''}"
                  style="--ink:${color}"
                  data-picker-ink="${ink}"
                  aria-pressed="${filters.inks.includes(ink)}"
                >
                  ${inkIcon(ink)}${name}
                </button>`,
            )
            .join('')}
        </div>
      </fieldset>
      <div class="field">
        <label for="card-picker-type">Type</label>
        <select id="card-picker-type" data-picker-filter="type">
          ${selectOptions(Object.entries(CARD_TYPES), filters.type, 'Tous')}
        </select>
      </div>
      <div class="field">
        <label for="card-picker-set">Extension</label>
        <select id="card-picker-set" data-picker-filter="set">
          ${selectOptions(catalogSets(document), filters.set, 'Toutes')}
        </select>
      </div>
      <div class="field">
        <label for="card-picker-cost">Coût exact</label>
        <input
          id="card-picker-cost"
          type="number"
          min="0"
          max="99"
          data-picker-filter="cost"
          value="${esc(filters.cost)}"
          placeholder="Tous"
        />
      </div>
      <div class="field">
        <label for="card-picker-sort">Trier par</label>
        <select id="card-picker-sort" data-picker-filter="sort">
          ${selectOptions(
            [
              ['set', 'Extension puis numéro'],
              ['name', 'Nom'],
              ['cost', 'Coût puis nom'],
            ],
            filters.sort,
          )}
        </select>
      </div>
    </div>
    <div id="card-picker-result-count" class="card-picker-result-count" aria-live="polite"></div>
    <div class="card-picker-layout">
      <div class="card-picker-list-panel">
        <div id="card-picker-results" class="card-picker-results" role="list"></div>
        <div id="card-picker-pagination" class="catalog-pagination"></div>
      </div>
      <div id="card-picker-preview" class="card-picker-preview"></div>
    </div>
    <div id="card-picker-selection"></div>
  </section>`;
}

export function cardPickerResults(result, { deck, target, selection = [] }) {
  const selected = new Set(selection);
  return (
    result.cards
      .map((card) => {
        const present = deck[target].some((row) => row.id === card.id);
        const pending = selected.has(card.id);
        return /* HTML */ `<article class="card-picker-result ${pending ? 'selected' : ''}">
          <button
            type="button"
            class="card-picker-result-main"
            data-picker-preview="${esc(card.id)}"
            aria-label="Voir ${esc(card.name)}"
          >
            <span class="card-picker-thumbnail">
              ${safeURL(card.image) ? /* HTML */ `<img src="${esc(safeURL(card.image))}" alt="" loading="lazy" decoding="async" />` : '<span>✧</span>'}
            </span>
            <span class="card-picker-result-copy">
              <strong>${esc(card.name)}</strong>
              <span>${esc(CARD_TYPES[card.type])} · Coût ${card.cost}</span>
              <span class="card-picker-result-inks">${inksHTML(card.inks)}</span>
            </span>
          </button>
          <button
            type="button"
            class="btn small ${pending ? 'selected' : 'ghost'}"
            data-picker-select="${esc(card.id)}"
            aria-pressed="${pending}"
            ${present ? 'disabled' : ''}
          >
            ${present ? 'Déjà ajoutée' : pending ? 'Sélectionnée' : 'Sélectionner'}
          </button>
        </article>`;
      })
      .join('') ||
    '<div class="empty-block">Aucune carte ne correspond. Modifiez les filtres ou utilisez une carte libre.</div>'
  );
}

export function cardPickerPreview(card, selectedSet = '') {
  if (!card)
    return '<div class="empty-block">Sélectionnez un résultat pour afficher ses détails.</div>';
  const printing = cardPrinting(card, selectedSet);
  return /* HTML */ `<article class="card-picker-preview-card">
    <div class="card-picker-preview-visual">
      ${safeURL(card.image) ? /* HTML */ `<img src="${esc(safeURL(card.image))}" alt="${esc(card.name)}" />` : '<span>✧<small>Sans illustration</small></span>'}
    </div>
    <div class="card-picker-preview-copy">
      <div class="eyebrow">${esc(CARD_TYPES[card.type])}</div>
      <h3>${esc(card.name)}</h3>
      <p>
        Coût ${card.cost} ·
        ${esc(printing.set)}${printing.number !== null ? ' · #' + printing.number : ''}
      </p>
      <div>${inksHTML(card.inks)}</div>
      ${card.text ? /* HTML */ `<p class="card-picker-rules">${esc(card.text)}</p>` : ''}
    </div>
  </article>`;
}

export function cardPickerSelection(cards, target) {
  return /* HTML */ `<footer class="card-picker-selection" aria-live="polite">
    <div class="card-picker-selection-copy">
      <strong
        >${cards.length} carte${cards.length === 1 ? '' : 's'}
        sélectionnée${cards.length === 1 ? '' : 's'}</strong
      >
      <span
        >${cards.length ? cards.map((card) => esc(card.name)).join(' · ') : 'Destination : ' + CARD_SECTIONS[target]}</span
      >
    </div>
    <div class="card-picker-selection-actions">
      <button
        type="button"
        class="btn small ghost"
        data-picker-clear-selection
        ${cards.length ? '' : 'disabled'}
      >
        Effacer
      </button>
      <button
        type="button"
        class="btn small primary"
        data-picker-add
        ${cards.length ? '' : 'disabled'}
      >
        Ajouter${cards.length ? ' ' + cards.length + ' carte' + (cards.length === 1 ? '' : 's') : ''}
      </button>
    </div>
  </footer>`;
}

export function cardPickerPagination(result) {
  return /* HTML */ `<button
      type="button"
      class="btn small"
      data-picker-page="${result.page - 1}"
      ${result.page <= 1 ? 'disabled' : ''}
    >
      Précédent
    </button>
    <span>Page ${result.page} / ${result.pages}</span>
    <button
      type="button"
      class="btn small"
      data-picker-page="${result.page + 1}"
      ${result.page >= result.pages ? 'disabled' : ''}
    >
      Suivant
    </button>`;
}
