import { cardPrinting } from '../core/catalog.js';
import { CARD_SECTIONS, CARD_TYPES, INKS } from '../core/constants.js';
import { esc, inkIcon, inksHTML, selectOptions } from './html.js';
import { safeURL } from '../core/utils.js';

export function catalogPage({ document, count, warning, busy }) {
  return /* HTML */ ` <div class="workspace-top">
      <button class="back" data-action="home">← Mes fiches</button>
      <div class="actions">
        <button
          class="btn small"
          data-action="catalog-export"
          ${!document || busy ? 'disabled' : ''}
        >
          Exporter JSON
        </button>
        <button class="btn small" data-action="catalog-import" ${busy ? 'disabled' : ''}>
          Importer JSON
        </button>
        <button
          class="btn primary small"
          data-action="catalog-new"
          ${!document || busy ? 'disabled' : ''}
        >
          ＋ Nouvelle carte
        </button>
      </div>
    </div>
    <div class="catalog-heading">
      <div>
        <div class="eyebrow">LA BIBLIOTHÈQUE DES ILLUMINEURS</div>
        <h1 class="workspace-title">Le catalogue de cartes.</h1>
        <p>Explorez les cartes et préparez vos prochaines synergies.</p>
      </div>
      <div class="catalog-summary">
        <strong>${count.toLocaleString('fr-FR')}</strong><span>cartes disponibles</span>
      </div>
    </div>
    <p class="catalog-feedback ${warning ? 'error' : ''}" role="status">${esc(warning)}</p>
    <div id="catalog-browser"></div>
    <p class="source-note">
      Catalogue officiel français Ravensburger et modifications locales. L’import JSON remplace
      votre catalogue local.
    </p>`;
}

export function catalogBrowser({ document, filters, context = 'manage', target = 'keys', deck }) {
  if (!document)
    return /* HTML */ `<div class="empty-block">
      Catalogue indisponible.
      <button class="btn small" data-action="catalog-retry">Réessayer</button>
    </div>`;
  const sets = new Map(document.sets.map((set) => [String(set.id), String(set.name)]));
  for (const card of [...document.cards, ...document.custom])
    for (const set of card.set) if (!sets.has(set)) sets.set(set, set);
  return /* HTML */ `<section class="catalog-browser" aria-label="Recherche de cartes">
    ${
      context === 'picker'
        ? /* HTML */ `<div class="catalog-picker-heading">
              <strong>Ajouter depuis le catalogue</strong
              ><button class="btn small ghost" data-action="catalog-manage">
                Gérer le catalogue ↗
              </button>
            </div>
            <div class="field">
              <label for="card-target">Ajouter à la rubrique</label
              ><select id="card-target">
                ${selectOptions(Object.entries(CARD_SECTIONS), target)}
              </select>
            </div>`
        : ''
    }
    <div class="catalog-filters">
      <div class="field catalog-search">
        <label for="card-search">Nom ou texte de carte</label>
        <input
          id="card-search"
          type="search"
          data-card-filter="query"
          value="${esc(filters.query)}"
          placeholder="Ex. Merlin, pioche, défi…"
          autocomplete="off"
        />
      </div>
      <fieldset class="catalog-ink-filters">
        <legend>Encres autorisées - sélection multiple</legend>
        <div class="catalog-ink-buttons">
          ${Object.entries(INKS)
            .map(
              ([ink, [name, color]]) => `
          <button type="button" class="ink-option ${filters.inks?.includes(ink) ? 'selected' : ''}"
            style="--ink:${color}" data-catalog-ink="${ink}" aria-pressed="${filters.inks?.includes(ink) || false}">${inkIcon(ink)}${name}</button>`,
            )
            .join('')}
        </div>
        <p class="field-help">
          Sans sélection, toutes les encres sont affichées. Une carte bicolore doit utiliser deux
          encres sélectionnées.
        </p>
      </fieldset>
      <div class="field">
        <label for="card-type">Type</label
        ><select id="card-type" data-card-filter="type">
          ${selectOptions(Object.entries(CARD_TYPES), filters.type, 'Tous')}
        </select>
      </div>
      <div class="field">
        <label for="card-set">Extension</label
        ><select id="card-set" data-card-filter="set">
          ${selectOptions(
            [...sets].sort((a, b) => b[0].localeCompare(a[0], 'fr', { numeric: true })),
            filters.set,
            'Toutes',
          )}
        </select>
      </div>
      <div class="field">
        <label for="card-cost">Coût exact</label
        ><input
          id="card-cost"
          type="number"
          min="0"
          max="99"
          data-card-filter="cost"
          value="${esc(filters.cost)}"
          placeholder="Tous"
        />
      </div>
      <div class="field">
        <label for="card-sort">Trier par</label
        ><select id="card-sort" data-card-filter="sort">
          ${selectOptions(
            [
              ['set', 'Extension décroissante, numéro croissant'],
              ['name', 'Nom'],
              ['cost', 'Coût puis nom'],
            ],
            filters.sort,
          )}
        </select>
      </div>
    </div>
    <div class="catalog-search-footer">
      ${context === 'picker' ? /* HTML */ `<label class="checkbox-label"><input id="card-deck-only" type="checkbox" data-card-filter="deckOnly" ${filters.deckOnly ? 'checked' : ''} ${deck?.inks.length ? '' : 'disabled'} /> Encres du deck uniquement</label>` : '<span></span>'}
      <button class="text-button" data-action="catalog-clear-filters">
        Réinitialiser les filtres
      </button>
    </div>
    <div id="catalog-result-count" class="catalog-result-count" aria-live="polite"></div>
    <div id="catalog-results" class="catalog-card-grid"></div>
    <div id="catalog-pagination" class="catalog-pagination"></div>
  </section>`;
}

export function catalogResults(result, { context, target, deck, selectedSet }) {
  return (
    result.cards
      .map((card) => {
        const printing = cardPrinting(card, selectedSet);
        const present = context === 'picker' && deck?.[target]?.some((row) => row.id === card.id);
        return /* HTML */ `<article class="catalog-card">
          <button
            class="catalog-card-visual"
            data-card-preview="${esc(card.id)}"
            aria-label="Voir ${esc(card.name)}"
          >
            ${safeURL(card.image) ? /* HTML */ `<img src="${esc(safeURL(card.image))}" alt="${esc(card.name)}" loading="lazy" decoding="async" />` : '<span>✧<small>Sans illustration</small></span>'}
          </button>
          <div class="catalog-card-info">
            <h3>${esc(card.name)}</h3>
            <p>${esc(CARD_TYPES[card.type])} · Coût ${card.cost}</p>
            <p>${esc(printing.set)}${printing.number !== null ? ' · #' + printing.number : ''}</p>
            <div class="catalog-card-inks">${inksHTML(card.inks)}</div>
          </div>
          <div class="catalog-card-actions">
            ${
              context === 'picker'
                ? /* HTML */ `<button
                    class="btn small ${present ? 'ghost' : 'primary'}"
                    data-select-card="${esc(card.id)}"
                    ${present ? 'disabled' : ''}
                  >
                    ${present ? '✓ Déjà ajoutée' : '＋ ' + CARD_SECTIONS[target]}
                  </button>`
                : /* HTML */ ` <button class="btn small" data-edit-catalog-card="${esc(card.id)}">
                      Modifier
                    </button>
                    <button
                      class="btn small ghost"
                      data-hide-catalog-card="${esc(card.id)}"
                      aria-label="Masquer ${esc(card.name)}"
                    >
                      Retirer
                    </button>`
            }
          </div>
        </article>`;
      })
      .join('') ||
    '<div class="empty-block catalog-empty">Aucune carte ne correspond. Modifiez vos filtres ou ajoutez une carte manuellement.</div>'
  );
}
export function catalogPagination(result) {
  return /* HTML */ `<button
      class="btn small"
      data-catalog-page="${result.page - 1}"
      ${result.page <= 1 ? 'disabled' : ''}
    >
      ← Précédent
    </button>
    <span>Page ${result.page} / ${result.pages}</span>
    <button
      class="btn small"
      data-catalog-page="${result.page + 1}"
      ${result.page >= result.pages ? 'disabled' : ''}
    >
      Suivant →
    </button>`;
}
export function catalogCardForm(card = {}) {
  return /* HTML */ `<form id="catalog-card-form" class="catalog-card-form">
    <h2>${card.id ? 'Modifier la carte' : 'Ajouter une carte'}</h2>
    <p class="field-help">
      Cette modification concerne votre catalogue local. Les fiches existantes conservent leurs
      données.
    </p>
    <div class="field">
      <label for="edit-card-name">Nom complet *</label
      ><input
        id="edit-card-name"
        name="name"
        required
        maxlength="300"
        value="${esc(card.name)}"
        placeholder="Personnage - Version"
      />
    </div>
    <fieldset class="catalog-ink-fieldset">
      <legend>Encres * - 1 ou 2 maximum</legend>
      ${Object.entries(INKS)
        .map(
          ([id, [name]]) =>
            /* HTML */ `<label class="checkbox-label"
              ><input
                type="checkbox"
                name="inks"
                value="${id}"
                ${card.inks?.includes(id) ? 'checked' : ''}
              />${name}</label
            >`,
        )
        .join('')}
    </fieldset>
    <div class="two-cols">
      <div class="field">
        <label for="edit-card-type">Type *</label
        ><select id="edit-card-type" name="type">
          ${selectOptions(Object.entries(CARD_TYPES), card.type || 'characters')}
        </select>
      </div>
      <div class="field">
        <label for="edit-card-cost">Coût *</label
        ><input
          id="edit-card-cost"
          name="cost"
          type="number"
          min="0"
          max="99"
          required
          value="${card.cost ?? 0}"
        />
      </div>
    </div>
    <div class="field">
      <label for="edit-card-number">Numéro dans l’extension</label
      ><input
        id="edit-card-number"
        name="number"
        type="number"
        min="0"
        value="${card.number ?? ''}"
        placeholder="Non renseigné"
      />
    </div>
    <div class="field">
      <label for="edit-card-image">Illustration (URL HTTPS)</label
      ><input
        id="edit-card-image"
        name="image"
        type="url"
        value="${esc(card.image)}"
        placeholder="https://…"
      />
    </div>
    <div class="two-cols">
      <div class="field">
        <label for="edit-card-set">Extensions (séparées par une virgule)</label
        ><input
          id="edit-card-set"
          name="set"
          value="${esc(card.set?.join(', '))}"
          placeholder="set14"
        />
      </div>
      <div class="field">
        <label for="edit-card-rarity">Rareté</label
        ><input id="edit-card-rarity" name="rarity" value="${esc(card.rarity)}" />
      </div>
    </div>
    <div class="field">
      <label for="edit-card-text">Texte de la carte</label
      ><textarea id="edit-card-text" name="text">${esc(card.text)}</textarea>
    </div>
    <p id="catalog-card-error" class="error" role="alert"></p>
    <div class="actions">
      <button class="btn" type="button" data-close-dialog>Annuler</button
      ><button class="btn primary" type="submit">Enregistrer</button>
    </div>
  </form>`;
}
export function cardDetail(card) {
  return /* HTML */ `<div class="card-detail">
    ${safeURL(card.image) ? /* HTML */ `<img src="${esc(safeURL(card.image))}" alt="${esc(card.name)}" />` : ''}
    <div>
      <h2>${esc(card.name)}</h2>
      <p>${esc(CARD_TYPES[card.type])} · Coût ${card.cost}</p>
      <div>${inksHTML(card.inks)}</div>
      <p class="card-rules">${esc(card.text || 'Texte non renseigné dans ce catalogue.')}</p>
      <p class="source-note">
        ${esc(card.set.join(', '))}${card.rarity ? ' · ' + esc(card.rarity) : ''}
      </p>
    </div>
  </div>`;
}
