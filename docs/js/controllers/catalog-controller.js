import { CARD_SECTIONS } from '../core/constants.js';
import { addCatalogCards } from '../core/decks.js';
import { createCardIndex, effectiveCards, searchCatalog } from '../core/catalog.js';
import { uid } from '../core/utils.js';
import { CatalogRepository } from '../services/catalog-store.js';
import { downloadText, readJSONFile } from '../services/files.js';
import { cardSections } from '../ui/editor.js';
import { openDialog, confirmAction } from '../ui/dialog.js';
import {
  catalogPage,
  catalogBrowser,
  catalogResults,
  catalogPagination,
  catalogSelection,
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

  function browserMarkup() {
    return catalogBrowser({
      document: state.catalog,
      filters: state.filters,
      context: state.mode === 'edit' ? 'picker' : 'manage',
      target: state.target,
      deck: state.current,
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
    const target =
      state.mode === 'catalog'
        ? $('#catalog-browser')
        : state.mode === 'edit' && state.tab === 'cards'
          ? $('.catalog-browser')
          : null;
    if (!target) return;
    if (state.mode === 'catalog') target.innerHTML = browserMarkup();
    else target.outerHTML = browserMarkup();
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
      ' · ' +
      (state.mode === 'edit' ? CARD_SECTIONS[state.target] : 'Catalogue');
    $('#catalog-results').innerHTML = catalogResults(result, {
      context: state.mode === 'edit' ? 'picker' : 'manage',
      target: state.target,
      deck: state.current,
      selectedSet: state.filters.set,
      selection: state.cardSelection,
    });
    $('#catalog-selection').innerHTML = catalogSelection(selectedCatalogCards(), state.target);
    $('#catalog-pagination').innerHTML = catalogPagination(result);
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

  function selectedCardsChanged() {
    save();
    if ($('#selected-card-sections'))
      $('#selected-card-sections').innerHTML = cardSections(state.current);
    else renderForm();
    renderBrowser();
  }

  function handleFilter(event) {
    const key = event.target.dataset.cardFilter;
    if (!key) return false;
    if (key === 'deckOnly') {
      state.filters.deckOnly = event.target.checked;
      state.filters.inks = event.target.checked ? [...(state.current?.inks || [])] : [];
      state.filters.page = 1;
      renderBrowser();
      $('#card-deck-only')?.focus();
      return true;
    }
    state.filters[key] =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    state.filters.page = 1;
    renderResults();
    return true;
  }

  function handleClick(data) {
    if (data.cardTarget) {
      state.target = data.cardTarget;
      state.cardSelection = (state.cardSelection || []).filter(
        (id) => !state.current[state.target].some((row) => row.id === id),
      );
      renderBrowser();
      document.querySelector(`[data-card-target="${data.cardTarget}"]`)?.focus();
      return true;
    }
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
      state.target = data.pickSection;
      state.cardSelection = [];
      renderBrowser();
      $('#card-search').focus();
      return true;
    }
    if (data.selectCard) {
      const selected = new Set(state.cardSelection || []);
      if (selected.has(data.selectCard)) selected.delete(data.selectCard);
      else selected.add(data.selectCard);
      state.cardSelection = [...selected];
      renderResults();
      document.querySelector(`[data-select-card="${data.selectCard}"]`)?.focus();
      return true;
    }
    if (data.clearCardSelection !== undefined) {
      state.cardSelection = [];
      renderResults();
      return true;
    }
    if (data.addCardSelection !== undefined) {
      const added = addCatalogCards(state.current, state.target, selectedCatalogCards());
      state.cardSelection = [];
      if (added) {
        selectedCardsChanged();
        toast(
          added +
            ' carte' +
            (added === 1 ? '' : 's') +
            ' ajoutée' +
            (added === 1 ? '' : 's') +
            ' : ' +
            CARD_SECTIONS[state.target] +
            '.',
        );
      } else renderResults();
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
