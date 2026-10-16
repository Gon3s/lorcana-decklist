import { createDeck, toggleSectionCard } from '../core/decks.js';
import {
  deckCardsFromResolution,
  deckInks,
  resolveDecklist,
  uniqueDeckCards,
} from '../core/decklist.js';
import { cleanText } from '../core/utils.js';
import { creationPage } from '../ui/creation.js';

function emptyResult() {
  return { entries: [], errors: [], rows: [], total: 0, matched: 0, unresolved: 0, ready: false };
}

export function createCreationController({
  state,
  app,
  query,
  setNavigation,
  save,
  library,
  editor,
  toast,
}) {
  const $ = query;

  function renderCreation({ scroll = true } = {}) {
    app.innerHTML = creationPage({
      deck: state.current,
      step: state.creationStep,
      input: state.creationInput,
      result: state.creationResult,
      error: state.creationError,
    });
    setNavigation();
    if (scroll) window.scrollTo(0, 0);
    const focusTarget =
      state.creationStep === 1
        ? '#create-name'
        : state.creationStep === 2
          ? '[data-action="create-next"]:not([disabled]), [data-action="create-back"]'
          : '[data-create-section]';
    $(focusTarget)?.focus();
  }

  function startCreation() {
    state.current = createDeck();
    state.mode = 'create';
    state.creationStep = 1;
    state.creationInput = '';
    state.creationResult = emptyResult();
    state.creationError = '';
    renderCreation();
  }

  function syncImportStep() {
    const next = $('[data-action="create-next"]');
    if (next) next.disabled = !(state.current.name.trim() && state.creationInput.trim());
    const error = $('.creation-error');
    if (error) {
      error.textContent = state.creationError;
      error.hidden = !state.creationError;
    }
  }

  function handleInput(event) {
    if (state.mode !== 'create' || !event.target.dataset.createField) return false;
    const value = cleanText(event.target.value);
    if (event.target.dataset.createField === 'name') state.current.name = value;
    else if (event.target.dataset.createField === 'decklist') state.creationInput = value;
    state.creationError = '';
    syncImportStep();
    return true;
  }

  function prepareReview() {
    if (!state.catalog || !state.cards.length) {
      state.creationError =
        'Le catalogue est encore en cours de chargement. Réessayez dans un instant.';
      syncImportStep();
      return;
    }
    const result = resolveDecklist(state.creationInput, state.cards);
    const cards = deckCardsFromResolution(result);
    const inks = deckInks(cards);
    state.current.decklist = cards;
    state.current.inks = inks;
    state.current.keys = [];
    state.current.core = [];
    let error = '';
    if (!result.entries.length) error = 'La decklist ne contient aucune ligne exploitable.';
    else if (result.errors.length || result.unresolved)
      error = 'Corrigez les lignes signalées avant de continuer.';
    else if (result.total < 60) error = 'Une decklist Lorcana doit contenir au moins 60 cartes.';
    else if (!inks.length || inks.length > 2)
      error = 'Les cartes rapprochées doivent utiliser une ou deux encres.';
    state.creationResult = { ...result, ready: !error };
    state.creationError = error;
    state.creationStep = 2;
    renderCreation();
  }

  function handleClick(data) {
    if (state.mode !== 'create' || !data.createSection || !data.cardId) return false;
    const card = uniqueDeckCards(state.current.decklist).find((row) => row.id === data.cardId);
    if (!card) return true;
    toggleSectionCard(state.current, data.createSection, card);
    renderCreation({ scroll: false });
    document
      .querySelector(`[data-create-section="${data.createSection}"][data-card-id="${data.cardId}"]`)
      ?.focus();
    return true;
  }

  function handleAction(action) {
    switch (action) {
      case 'new':
        startCreation();
        return true;
      case 'create-cancel':
        if (state.mode !== 'create') return false;
        library();
        return true;
      case 'create-next':
        if (state.mode !== 'create') return false;
        if (state.creationStep === 1) {
          if (!state.current.name.trim() || !state.creationInput.trim()) return true;
          prepareReview();
          return true;
        }
        if (state.creationStep === 2 && state.creationResult.ready) {
          state.creationStep = 3;
          state.creationError = '';
          renderCreation();
        }
        return true;
      case 'create-back':
        if (state.mode !== 'create') return false;
        state.creationStep = Math.max(1, state.creationStep - 1);
        state.creationError = '';
        renderCreation();
        return true;
      case 'create-finish':
        if (state.mode !== 'create' || state.creationStep !== 3 || !state.creationResult.ready)
          return false;
        if (save()) {
          editor.openEditor(state.current);
          state.tab = 'cards';
          editor.renderEditor();
          toast('Fiche créée depuis la decklist Duels.ink.');
        }
        return true;
      default:
        return false;
    }
  }

  return { handleInput, handleClick, handleAction };
}
