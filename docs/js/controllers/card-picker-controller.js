import { CARD_SECTIONS } from '../core/constants.js';
import { addCatalogCards } from '../core/decks.js';
import { createCardIndex, effectiveCards, searchCatalog } from '../core/catalog.js';
import { CatalogRepository } from '../services/catalog-store.js';
import {
  cardPicker,
  cardPickerPagination,
  cardPickerPreview,
  cardPickerResults,
  cardPickerSelection,
} from '../ui/card-picker.js';
import { openDialog } from '../ui/dialog.js';
import { cardSections } from '../ui/editor.js';

export function createCardFilters() {
  return {
    query: '',
    inks: [],
    type: '',
    set: '',
    cost: '',
    sort: 'set',
    page: 1,
    deckOnly: false,
  };
}

export function createCardPickerController({
  state,
  query,
  toast,
  save,
  renderForm,
  repository = new CatalogRepository(),
}) {
  const $ = query;
  let pickerDialog = null;
  let pickerFiltersOpen = false;
  let pickerPreview = '';

  function pickerQuery(selector) {
    return pickerDialog?.querySelector(selector) || null;
  }

  function pickerMarkup() {
    return cardPicker({
      document: state.catalog,
      filters: state.filters,
      target: state.target,
      deck: state.current,
      filtersOpen: pickerFiltersOpen,
    });
  }

  function renderPicker() {
    const current = pickerQuery('[data-card-picker]');
    if (!current) return;
    current.outerHTML = pickerMarkup();
    renderPickerResults();
  }

  function renderPickerResults() {
    if (!pickerDialog) return;
    const result = searchCatalog(state.index, {
      ...state.filters,
      deckInks: state.current?.inks || [],
      pageSize: 8,
    });
    state.filters.page = result.page;
    const visiblePreview = result.cards.find((card) => card.id === pickerPreview);
    pickerPreview = visiblePreview?.id || result.cards[0]?.id || '';
    pickerQuery('#card-picker-result-count').textContent =
      result.total.toLocaleString('fr-FR') +
      ' carte' +
      (result.total === 1 ? '' : 's') +
      ' disponible' +
      (result.total === 1 ? '' : 's');
    pickerQuery('#card-picker-results').innerHTML = cardPickerResults(result, {
      deck: state.current,
      target: state.target,
      selection: state.cardSelection,
    });
    pickerQuery('#card-picker-preview').innerHTML = cardPickerPreview(
      state.cards.find((card) => card.id === pickerPreview),
      state.filters.set,
    );
    pickerQuery('#card-picker-pagination').innerHTML = cardPickerPagination(result);
    pickerQuery('#card-picker-selection').innerHTML = cardPickerSelection(
      selectedCatalogCards(),
      state.target,
    );
  }

  function openPicker(target) {
    if (!state.catalog) {
      toast('Les cartes sont encore indisponibles.');
      return;
    }
    state.target = target;
    state.cardSelection = [];
    state.filters = {
      ...createCardFilters(),
      deckOnly: true,
      inks: [...state.current.inks],
    };
    pickerFiltersOpen = false;
    pickerPreview = '';
    pickerDialog = openDialog(pickerMarkup(), 'card-picker-dialog');
    pickerDialog.setAttribute('aria-labelledby', 'card-picker-title');
    pickerDialog.addEventListener('input', handlePickerFilter);
    pickerDialog.addEventListener('change', handlePickerFilter);
    pickerDialog.addEventListener('click', handlePickerClick);
    pickerDialog.addEventListener(
      'close',
      () => {
        pickerDialog = null;
        state.cardSelection = [];
      },
      { once: true },
    );
    renderPickerResults();
    pickerQuery('#card-picker-search')?.focus();
  }

  function handlePickerFilter(event) {
    const key = event.target.dataset.pickerFilter;
    if (!key) return;
    if (key === 'deckOnly') {
      state.filters.deckOnly = event.target.checked;
      state.filters.inks = event.target.checked ? [...state.current.inks] : [];
      state.filters.page = 1;
      renderPicker();
      pickerQuery('[data-picker-filter="deckOnly"]')?.focus();
      return;
    }
    state.filters[key] = event.target.value;
    state.filters.page = 1;
    renderPickerResults();
  }

  function handlePickerClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (data.pickerToggleFilters !== undefined) {
      pickerFiltersOpen = !pickerFiltersOpen;
      renderPicker();
      pickerQuery('[data-picker-toggle-filters]')?.focus();
      return;
    }
    if (data.pickerInk) {
      state.filters.deckOnly = false;
      const index = state.filters.inks.indexOf(data.pickerInk);
      if (index >= 0) state.filters.inks.splice(index, 1);
      else state.filters.inks.push(data.pickerInk);
      state.filters.page = 1;
      renderPicker();
      pickerQuery(`[data-picker-ink="${data.pickerInk}"]`)?.focus();
      return;
    }
    if (data.pickerClearFilters !== undefined) {
      state.filters = {
        ...createCardFilters(),
        deckOnly: true,
        inks: [...state.current.inks],
      };
      renderPicker();
      pickerQuery('#card-picker-search')?.focus();
      return;
    }
    if (data.pickerPreview) {
      pickerPreview = data.pickerPreview;
      pickerQuery('#card-picker-preview').innerHTML = cardPickerPreview(
        state.cards.find((card) => card.id === pickerPreview),
        state.filters.set,
      );
      return;
    }
    if (data.pickerSelect) {
      const selected = new Set(state.cardSelection);
      if (selected.has(data.pickerSelect)) selected.delete(data.pickerSelect);
      else selected.add(data.pickerSelect);
      state.cardSelection = [...selected];
      pickerPreview = data.pickerSelect;
      renderPickerResults();
      pickerQuery(`[data-picker-select="${data.pickerSelect}"]`)?.focus();
      return;
    }
    if (data.pickerClearSelection !== undefined) {
      state.cardSelection = [];
      renderPickerResults();
      return;
    }
    if (data.pickerPage) {
      state.filters.page = Number(data.pickerPage);
      renderPickerResults();
      pickerQuery('#card-picker-results button')?.focus();
      return;
    }
    if (data.pickerAdd !== undefined) addPickerSelection();
  }

  function addPickerSelection() {
    const added = addCatalogCards(state.current, state.target, selectedCatalogCards());
    if (!added) return;
    const target = CARD_SECTIONS[state.target];
    state.cardSelection = [];
    save();
    if ($('#selected-card-sections'))
      $('#selected-card-sections').innerHTML = cardSections(state.current);
    else renderForm();
    pickerDialog?.close();
    toast(
      added +
        ' carte' +
        (added === 1 ? '' : 's') +
        ' ajoutée' +
        (added === 1 ? '' : 's') +
        ' : ' +
        target +
        '.',
    );
  }

  function selectedCatalogCards() {
    const cards = new Map(state.cards.map((card) => [card.id, card]));
    return (state.cardSelection || []).map((id) => cards.get(id)).filter(Boolean);
  }

  async function load() {
    try {
      state.catalog = await repository.load();
      state.cards = effectiveCards(state.catalog);
      state.index = createCardIndex(state.cards);
      if (state.mode === 'edit' && state.tab === 'cards') renderForm();
    } catch (error) {
      toast('Cartes indisponibles : ' + error.message);
    }
  }

  function handleClick(data) {
    if (!data.pickSection) return false;
    openPicker(data.pickSection);
    return true;
  }

  return { load, handleClick };
}
