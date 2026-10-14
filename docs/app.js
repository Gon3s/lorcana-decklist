import { CARD_SECTIONS } from './js/core/constants.js';
import {
  createDeck,
  decodeDeckExport,
  encodeDeckExport,
  addCatalogCard,
  moveRow,
  toggleInk,
} from './js/core/decks.js';
import { createSampleDeck } from './js/core/sample.js';
import { createCardIndex, effectiveCards, searchCatalog } from './js/core/catalog.js';
import { normalize, quantity, uid, cleanText } from './js/core/utils.js';
import { loadDecks, saveDecks } from './js/services/deck-store.js';
import { CatalogRepository } from './js/services/catalog-store.js';
import { downloadText, readJSONFile, readDeckImage } from './js/services/files.js';
import { esc } from './js/ui/html.js';
import { collectionPage, deckGrid } from './js/ui/collection.js';
import { sheet } from './js/ui/sheet.js';
import {
  editorPage,
  identityForm,
  matchupsForm,
  strategyForm,
  cardsForm,
  cardSections,
} from './js/ui/editor.js';
import {
  catalogPage,
  catalogBrowser,
  catalogResults,
  catalogPagination,
  catalogCardForm,
  cardDetail,
} from './js/ui/catalog.js';

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const repository = new CatalogRepository();
const defaultFilters = () => ({
  query: '',
  inks: [],
  type: '',
  set: '',
  cost: '',
  sort: 'set',
  page: 1,
  deckOnly: false,
});
const state = {
  decks: [],
  current: null,
  mode: 'library',
  tab: 'identity',
  query: '',
  inkFilter: '',
  typeFilter: '',
  catalog: null,
  cards: [],
  index: [],
  filters: defaultFilters(),
  target: 'keys',
  catalogBusy: false,
  catalogWarning: '',
};
let toastTimer;

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4200);
}
function setNavigation() {
  $('#nav-library').classList.toggle('active', state.mode !== 'catalog');
  $('#nav-catalog').classList.toggle('active', state.mode === 'catalog');
}
function persist() {
  try {
    saveDecks(localStorage, state.decks);
    return true;
  } catch {
    toast('Sauvegarde locale impossible. Exportez vos fiches pour les conserver.');
    return false;
  }
}
function save() {
  if (!state.current) return;
  state.current.updated = new Date().toISOString();
  const index = state.decks.findIndex((deck) => deck.id === state.current.id);
  if (index < 0) state.decks.unshift(state.current);
  else state.decks[index] = state.current;
  const saved = persist();
  if ($('#save-status'))
    $('#save-status').textContent = saved
      ? '● Enregistré sur cet appareil'
      : '⚠ Exportez pour sauvegarder';
}
function renderGrid() {
  const result = deckGrid(state.decks, state);
  $('#grid').innerHTML = result.markup;
  $('#count').textContent = result.count + ' fiche' + (result.count === 1 ? '' : 's');
}
function library() {
  state.mode = 'library';
  state.current = null;
  app.innerHTML = collectionPage(state);
  setNavigation();
  renderGrid();
  $('#search').oninput = (event) => {
    state.query = event.target.value;
    renderGrid();
  };
  $('#ink-filter').onchange = (event) => {
    state.inkFilter = event.target.value;
    syncInkFilter();
  };
  $('#type-filter').onchange = (event) => {
    state.typeFilter = event.target.value;
    renderGrid();
  };
}
function syncInkFilter() {
  $('#ink-filter').value = state.inkFilter;
  document.querySelectorAll('.ink-lens').forEach((button) => {
    const selected = button.dataset.filterInk === state.inkFilter;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  renderGrid();
}
function preview() {
  if ($('#preview') && state.current) $('#preview').innerHTML = sheet(state.current);
}
function openEditor(deck) {
  if (!deck) return;
  state.current = deck;
  state.mode = 'edit';
  state.tab = 'identity';
  state.filters = { ...defaultFilters(), deckOnly: true, inks: [...deck.inks] };
  renderEditor();
  window.scrollTo(0, 0);
}
function renderEditor() {
  app.innerHTML = editorPage(state.current, state.tab);
  setNavigation();
  renderForm();
  preview();
}
function browserMarkup() {
  return catalogBrowser({
    document: state.catalog,
    filters: state.filters,
    context: state.mode === 'edit' ? 'picker' : 'manage',
    target: state.target,
    deck: state.current,
  });
}
function renderForm() {
  if (state.mode === 'edit' && state.filters.deckOnly) state.filters.inks = [...state.current.inks];
  const forms = {
    identity: identityForm,
    matchups: matchupsForm,
    strategy: strategyForm,
  };
  $('#form').innerHTML =
    state.tab === 'cards'
      ? cardsForm(state.current, browserMarkup())
      : forms[state.tab](state.current);
  if (state.tab === 'cards') renderResults();
  if ($('#drop')) {
    const drop = $('#drop');
    drop.onclick = () => $('#image-file').click();
    drop.onkeydown = (event) => {
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        $('#image-file').click();
      }
    };
    $('#image-file').onchange = (event) => loadImage(event.target.files[0]);
    drop.ondragover = (event) => {
      event.preventDefault();
      drop.classList.add('dragover');
    };
    drop.ondragleave = () => drop.classList.remove('dragover');
    drop.ondrop = (event) => {
      event.preventDefault();
      loadImage(event.dataTransfer.files[0]);
    };
  }
}
function read(deck) {
  if (!deck) return;
  state.current = deck;
  state.mode = 'read';
  setNavigation();
  app.innerHTML = `<div class="workspace-top"><button class="back" data-action="home">← Mes fiches</button>
    <div class="actions"><button class="btn small" data-action="duplicate">Dupliquer</button>
      <button class="btn small" data-action="export">Exporter JSON</button>
      <button class="btn small" data-action="print">Imprimer / PDF</button>
      <button class="btn small" data-action="delete">Supprimer</button>
      <button class="btn primary small" data-action="edit-current">Modifier</button></div></div>
    <div class="read-layout">${sheet(deck)}</div>`;
  window.scrollTo(0, 0);
}
async function loadImage(file) {
  if (!file) return;
  try {
    const deck = state.current;
    const image = await readDeckImage(file);
    if (state.current !== deck || state.mode !== 'edit') return;
    deck.image = image;
    save();
    renderForm();
    preview();
    toast('Decklist ajoutée.');
  } catch (error) {
    toast(error.message || 'Impossible de lire cette image.');
  }
}
function renderCatalog() {
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
  });
  $('#catalog-pagination').innerHTML = catalogPagination(result);
}
function syncCatalog(document) {
  state.catalog = document;
  state.cards = effectiveCards(document);
  state.index = createCardIndex(state.cards);
  state.catalogWarning = repository.warning;
}
async function loadCatalog() {
  try {
    syncCatalog(await repository.load());
  } catch (error) {
    state.catalogWarning = 'Catalogue indisponible : ' + error.message;
  }
  if (state.mode === 'catalog') renderCatalog();
  else if (state.mode === 'edit' && state.tab === 'cards') renderForm();
}
async function catalogOperation(operation, success) {
  if (state.catalogBusy) return;
  state.catalogBusy = true;
  if (state.mode === 'catalog') renderCatalog();
  try {
    syncCatalog(await operation());
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
function openDialog(content, className = '') {
  const dialog = document.createElement('dialog');
  dialog.className = 'app-dialog ' + className;
  dialog.innerHTML = `<button type="button" class="btn small dialog-close" data-close-dialog aria-label="Fermer">Fermer ×</button>${content}`;
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-dialog]')) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
function confirmAction(title, message, button = 'Confirmer') {
  return new Promise((resolve) => {
    const dialog = openDialog(
      `<h2>${esc(title)}</h2><p>${esc(message)}</p><div class="actions"><button class="btn" data-close-dialog>Annuler</button><button class="btn primary" id="confirm-action">${esc(button)}</button></div>`,
    );
    dialog.querySelector('#confirm-action').onclick = () => {
      resolve(true);
      dialog.close();
    };
    dialog.addEventListener('close', () => resolve(false), { once: true });
  });
}
function editCatalogCard(card) {
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
  renderResults();
  preview();
}

function handleCardFilter(event) {
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
  state.filters[key] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
  state.filters.page = 1;
  renderResults();
  return true;
}
app.addEventListener('input', (event) => {
  if (handleCardFilter(event)) return;
  if (state.mode !== 'edit') return;
  const { field, list, index, prop } = event.target.dataset;
  if (field) {
    state.current[field] = cleanText(event.target.value);
    save();
    preview();
  }
  if (list) {
    state.current[list][index][prop] =
      prop === 'qty' ? quantity(event.target.value) : cleanText(event.target.value);
    save();
    preview();
  }
});
app.addEventListener('change', (event) => {
  if (handleCardFilter(event)) return;
  if (event.target.id === 'card-target') {
    state.target = event.target.value;
    renderResults();
  }
  if (state.mode === 'edit' && event.target.dataset.field) {
    state.current[event.target.dataset.field] = cleanText(event.target.value);
    save();
    preview();
  }
});
app.addEventListener('click', async (event) => {
  const button = event.target.closest('button,[data-action]');
  if (!button || button.disabled) return;
  const data = button.dataset;
  try {
    if (data.catalogInk) {
      state.filters.deckOnly = false;
      const index = state.filters.inks.indexOf(data.catalogInk);
      if (index >= 0) state.filters.inks.splice(index, 1);
      else state.filters.inks.push(data.catalogInk);
      state.filters.page = 1;
      renderBrowser();
      document.querySelector(`[data-catalog-ink="${data.catalogInk}"]`)?.focus();
      return;
    }
    if (data.filterInk) {
      state.inkFilter = state.inkFilter === data.filterInk ? '' : data.filterInk;
      syncInkFilter();
      return;
    }
    if (data.tab) {
      state.tab = data.tab;
      renderEditor();
      return;
    }
    if (data.ink) {
      const [section, index] = data.inkTarget.split(':');
      toggleInk(
        section === 'deck' ? state.current.inks : state.current[section][Number(index)].inks,
        data.ink,
      );
      save();
      renderForm();
      preview();
      return;
    }
    if (data.pickSection) {
      state.target = data.pickSection;
      $('#card-target').value = state.target;
      renderResults();
      $('#card-search').focus();
      return;
    }
    if (data.selectCard) {
      const card = state.cards.find((card) => card.id === data.selectCard);
      if (card && addCatalogCard(state.current, state.target, card)) {
        selectedCardsChanged();
        toast('Carte ajoutée : ' + CARD_SECTIONS[state.target] + '.');
      }
      return;
    }
    if (data.catalogPage) {
      state.filters.page = Number(data.catalogPage);
      renderResults();
      return;
    }
    if (data.cardPreview) {
      const card = state.cards.find((card) => card.id === data.cardPreview);
      if (card) openDialog(cardDetail(card), 'card-detail-dialog');
      return;
    }
    if (data.editCatalogCard) {
      editCatalogCard(state.cards.find((card) => card.id === data.editCatalogCard));
      return;
    }
    if (data.hideCatalogCard) {
      if (
        await confirmAction(
          'Retirer cette carte ?',
          'Elle sera masquée du catalogue local. Les fiches existantes restent inchangées.',
          'Retirer',
        )
      )
        await catalogOperation(
          () => repository.remove(data.hideCatalogCard),
          'Carte retirée du catalogue local.',
        );
      return;
    }
    if (data.add) {
      const section = data.add;
      state.current[section].push(
        ['favorable', 'unfavorable'].includes(section)
          ? { name: '', note: '', inks: [] }
          : section === 'lines'
            ? { name: '', note: '' }
            : { name: '', qty: 1, note: '', image: '' },
      );
      save();
      renderForm();
      preview();
      return;
    }
    if (data.remove) {
      const [section, index] = data.remove.split(':');
      state.current[section].splice(Number(index), 1);
      save();
      renderForm();
      preview();
      return;
    }
    if (data.move) {
      const [section, index, direction] = data.move.split(':');
      moveRow(state.current[section], Number(index), Number(direction));
      save();
      renderForm();
      preview();
      return;
    }
    await handleAction(data.action, data.id);
  } catch (error) {
    toast(error.message || 'Cette action n’a pas pu aboutir.');
  }
});

async function handleAction(action, id) {
  const deck = id ? state.decks.find((deck) => deck.id === id) : state.current;
  switch (action) {
    case 'new':
      state.current = createDeck();
      save();
      openEditor(state.current);
      break;
    case 'home':
      if (state.mode === 'edit') save();
      library();
      break;
    case 'read':
      read(deck);
      break;
    case 'edit':
      openEditor(deck);
      break;
    case 'read-current':
      save();
      read(state.current);
      break;
    case 'edit-current':
      openEditor(state.current);
      break;
    case 'remove-image':
      state.current.image = '';
      save();
      renderForm();
      preview();
      break;
    case 'export':
      downloadText(
        encodeDeckExport(state.current),
        normalize(state.current.name || 'fiche-lorcana').replace(/[^a-z0-9]+/g, '-') + '.json',
      );
      toast('Fiche exportée, image comprise.');
      break;
    case 'print':
      await document.fonts?.ready;
      window.print();
      break;
    case 'duplicate': {
      const copy = structuredClone(state.current);
      Object.assign(copy, {
        id: uid(),
        name: copy.name + ' (copie)',
        example: false,
        updated: new Date().toISOString(),
      });
      state.decks.unshift(copy);
      persist();
      openEditor(copy);
      toast('Copie créée.');
      break;
    }
    case 'delete':
      if (
        await confirmAction(
          'Supprimer cette fiche ?',
          'La fiche sera supprimée de cet appareil.',
          'Supprimer',
        )
      ) {
        state.decks = state.decks.filter((deck) => deck.id !== state.current.id);
        persist();
        library();
        toast('Fiche supprimée.');
      }
      break;
    case 'zoom': {
      const dialog = openDialog(
        `<img class="full-image" src="${esc(state.current.image)}" alt="Decklist agrandie">`,
        'image-dialog',
      );
      dialog.focus();
      break;
    }
    case 'catalog-manage':
      if (state.mode === 'edit') save();
      state.filters = defaultFilters();
      renderCatalog();
      window.scrollTo(0, 0);
      break;
    case 'catalog-retry':
      await loadCatalog();
      break;
    case 'catalog-clear-filters':
      state.filters = {
        ...defaultFilters(),
        deckOnly: state.mode === 'edit',
        inks: state.mode === 'edit' ? [...state.current.inks] : [],
      };
      renderBrowser();
      break;
    case 'catalog-new':
      editCatalogCard();
      break;
    case 'catalog-import':
      $('#catalog-import-file').click();
      break;
    case 'catalog-export':
      downloadText(JSON.stringify(state.catalog, null, 2), 'grimoire-catalogue.json');
      toast('Catalogue exporté avec vos modifications.');
      break;
    case 'catalog-reset':
      if (
        await confirmAction(
          'Restaurer le catalogue d’origine ?',
          'Les ajouts, corrections et cartes masquées seront retirés du catalogue local. Exportez-le si vous souhaitez les conserver. Les fiches restent inchangées.',
          'Restaurer',
        )
      )
        await catalogOperation(() => repository.reset(), 'Catalogue intégré restauré.');
      break;
  }
}

app.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('[role="button"][data-action]'))
    event.target.click();
});
$('#nav-library').onclick = () => handleAction('home');
$('#nav-catalog').onclick = () => handleAction('catalog-manage');
$('.brand').onclick = (event) => {
  event.preventDefault();
  handleAction('home');
};
$('#import-top').onclick = () => $('#import-file').click();
$('#import-file').onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const document = await readJSONFile(file, 15 * 1024 * 1024);
    const deck = decodeDeckExport(JSON.stringify(document));
    state.decks.unshift(deck);
    persist();
    read(deck);
    toast('Fiche importée sur cet appareil.');
  } catch (error) {
    toast('Import impossible : ' + error.message);
  } finally {
    event.target.value = '';
  }
};
$('#catalog-import-file').onchange = async (event) => {
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
      await catalogOperation(
        () => repository.import(raw),
        'Catalogue importé et enregistré sur cet appareil.',
      );
  } catch (error) {
    toast('Import impossible : ' + error.message);
  } finally {
    event.target.value = '';
  }
};
document.addEventListener('paste', (event) => {
  if (state.mode !== 'edit' || state.tab !== 'identity') return;
  const file = [...(event.clipboardData?.items || [])]
    .find((item) => item.type.startsWith('image/'))
    ?.getAsFile();
  if (file) {
    event.preventDefault();
    loadImage(file);
  }
});

try {
  const loaded = loadDecks(localStorage, createSampleDeck);
  state.decks = loaded.decks;
  if (loaded.warnings.length)
    toast('Certaines fiches sont illisibles. La sauvegarde originale n’a pas été modifiée.');
} catch {
  state.decks = [createSampleDeck()];
  toast('La sauvegarde locale est indisponible. Exportez vos fiches pour les conserver.');
}
library();
loadCatalog();
