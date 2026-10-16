import { CARD_SECTIONS } from '../core/constants.js';
import { addCatalogCards } from '../core/decks.js';
import { createCardIndex, effectiveCards, searchCatalog } from '../core/catalog.js';
import { uid } from '../core/utils.js';
import { CatalogRepository } from '../services/catalog-store.js';
import { downloadText, readJSONFile } from '../services/files.js';
import { cardSections } from '../ui/editor.js';
import { openDialog, confirmAction } from '../ui/dialog.js';
import {
  cardPicker,
  cardPickerPagination,
  cardPickerPreview,
  cardPickerResults,
  cardPickerSelection,
} from '../ui/card-picker.js';
import {
  catalogPage,
  catalogBrowser,
  catalogResults,
  catalogPagination,
  catalogCardForm,
  cardDetail,
} from '../ui/catalog.js';

export function createCatalogFilters() {
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

export function createCatalogController({
  state,
  app,
  query,
  toast,
  syncRoute,
  setNavigation,
  save,
  renderForm,
  repository = new CatalogRepository(),
}) {
  const $ = query;
  let pickerDialog = null;
  let pickerFiltersOpen = false;
  let pickerPreview = '';

  function browserMarkup() {
    return catalogBrowser({
      document: state.catalog,
      filters: state.filters,
    });
  }

  function renderCatalog() {
    state.cardSelection = [];
    state.mode = 'catalog';
    setNavigation();
    app.innerHTML = catalogPage({
      document: state.catalog,
      count: state.cards.length,
      warning: state.catalogWarning,
      busy: state.catalogBusy,
    });
    renderBrowser();
  }

  function renderBrowser() {
    const target = state.mode === 'catalog' ? $('#catalog-browser') : null;
    if (!target) return;
    target.innerHTML = browserMarkup();
    renderResults();
  }

  function renderResults() {
    if (!$('#catalog-results')) return;
    const result = searchCatalog(state.index, {
      ...state.filters,
      deckInks: state.current?.inks || [],
    });
    state.filters.page = result.page;
    if (state.mode === 'catalog') syncRoute(true);
    $('#catalog-result-count').textContent =
      result.total.toLocaleString('fr-FR') +
      ' carte' +
      (result.total === 1 ? '' : 's') +
      ' · Catalogue';
    $('#catalog-results').innerHTML = catalogResults(result, {
      selectedSet: state.filters.set,
    });
    $('#catalog-pagination').innerHTML = catalogPagination(result);
  }

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
      toast('Le catalogue est encore indisponible.');
      return;
    }
    state.target = target;
    state.cardSelection = [];
    state.filters = {
      ...createCatalogFilters(),
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
        ...createCatalogFilters(),
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

  function syncCatalog(document) {
    state.catalog = document;
    state.cards = effectiveCards(document);
    state.index = createCardIndex(state.cards);
    state.catalogWarning = repository.warning;
  }

  async function load() {
    try {
      syncCatalog(await repository.load());
    } catch (error) {
      state.catalogWarning = 'Catalogue indisponible : ' + error.message;
    }
    if (state.mode === 'catalog') renderCatalog();
    else if (state.mode === 'edit' && state.tab === 'cards') renderForm();
  }

  async function operation(callback, success) {
    if (state.catalogBusy) return;
    state.catalogBusy = true;
    if (state.mode === 'catalog') renderCatalog();
    try {
      syncCatalog(await callback());
      toast(success);
    } catch (error) {
      state.catalogWarning =
        'Aucune modification enregistrée. ' + (error.message || 'Opération impossible.');
      toast(state.catalogWarning);
    } finally {
      state.catalogBusy = false;
      if (state.mode === 'catalog') renderCatalog();
      else if (state.mode === 'edit' && state.tab === 'cards') renderForm();
    }
  }

  function editCard(card) {
    const dialog = openDialog(catalogCardForm(card), 'catalog-edit-dialog');
    const form = dialog.querySelector('form');
    form.onsubmit = async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const next = {
        ...card,
        id: card?.id || 'custom-' + uid(),
        name: data.get('name'),
        inks: data.getAll('inks'),
        type: data.get('type'),
        cost: Number(data.get('cost')),
        number: data.get('number') ? Number(data.get('number')) : null,
        printings: undefined,
        image: data.get('image'),
        set: data
          .get('set')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        rarity: data.get('rarity'),
        text: data.get('text'),
      };
      if (card && card.number === next.number && card.set.join(',') === next.set.join(','))
        next.printings = card.printings;
      const submit = form.querySelector('[type=submit]');
      submit.disabled = true;
      try {
        syncCatalog(await repository.upsert(next));
        dialog.close();
        renderCatalog();
        toast('Carte enregistrée dans votre catalogue.');
      } catch (error) {
        dialog.querySelector('#catalog-card-error').textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    };
  }

  function handleFilter(event) {
    const key = event.target.dataset.cardFilter;
    if (!key) return false;
    state.filters[key] =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    state.filters.page = 1;
    renderResults();
    return true;
  }

  function handleClick(data) {
    if (data.catalogInk) {
      state.filters.deckOnly = false;
      const index = state.filters.inks.indexOf(data.catalogInk);
      if (index >= 0) state.filters.inks.splice(index, 1);
      else state.filters.inks.push(data.catalogInk);
      state.filters.page = 1;
      renderBrowser();
      document.querySelector(`[data-catalog-ink="${data.catalogInk}"]`)?.focus();
      return true;
    }
    if (data.pickSection) {
      openPicker(data.pickSection);
      return true;
    }
    if (data.catalogPage) {
      state.filters.page = Number(data.catalogPage);
      if (state.mode === 'catalog') syncRoute();
      renderResults();
      return true;
    }
    if (data.cardPreview) {
      const card = state.cards.find((card) => card.id === data.cardPreview);
      if (card) openDialog(cardDetail(card), 'card-detail-dialog');
      return true;
    }
    if (data.editCatalogCard) {
      editCard(state.cards.find((card) => card.id === data.editCatalogCard));
      return true;
    }
    if (data.hideCatalogCard) {
      return (async () => {
        if (
          await confirmAction(
            'Retirer cette carte ?',
            'Elle sera masquée du catalogue local. Les fiches existantes restent inchangées.',
            'Retirer',
          )
        )
          await operation(
            () => repository.remove(data.hideCatalogCard),
            'Carte retirée du catalogue local.',
          );
      })();
    }
    return false;
  }

  function handleAction(action) {
    switch (action) {
      case 'catalog-manage':
        if (state.mode === 'edit') save();
        state.cardSelection = [];
        state.filters = createCatalogFilters();
        renderCatalog();
        window.scrollTo(0, 0);
        return true;
      case 'catalog-retry':
        return load();
      case 'catalog-clear-filters':
        state.filters = {
          ...createCatalogFilters(),
          deckOnly: state.mode === 'edit',
          inks: state.mode === 'edit' ? [...state.current.inks] : [],
        };
        renderBrowser();
        return true;
      case 'catalog-new':
        editCard();
        return true;
      case 'catalog-import':
        $('#catalog-import-file').click();
        return true;
      case 'catalog-export':
        downloadText(JSON.stringify(state.catalog, null, 2), 'grimoire-catalogue.json');
        toast('Catalogue exporté avec vos modifications.');
        return true;
      default:
        return false;
    }
  }

  function bindImportInput(input) {
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const raw = await readJSONFile(file);
        if (
          await confirmAction(
            'Importer ce catalogue ?',
            'Le catalogue local sera remplacé par le contenu du fichier. Les fiches restent inchangées.',
            'Importer',
          )
        )
          await operation(
            () => repository.import(raw),
            'Catalogue importé et enregistré sur cet appareil.',
          );
      } catch (error) {
        toast('Import impossible : ' + error.message);
      } finally {
        event.target.value = '';
      }
    };
  }

  return {
    browserMarkup,
    renderCatalog,
    renderResults,
    load,
    handleFilter,
    handleClick,
    handleAction,
    bindImportInput,
  };
}
