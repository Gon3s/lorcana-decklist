import { parseRoute, routeHash } from './js/core/routes.js';
import {
  createCatalogController,
  createCatalogFilters,
} from './js/controllers/catalog-controller.js';
import { createDeckController } from './js/controllers/deck-controller.js';
import { createEditorController } from './js/controllers/editor-controller.js';

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
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
  filters: createCatalogFilters(),
  target: 'keys',
  catalogBusy: false,
  catalogWarning: '',
  cardSelection: [],
  creationStep: 1,
  creationMethod: '',
  creationError: '',
};
let toastTimer;
let restoringRoute = false;
let deck;

const catalog = createCatalogController({
  state,
  app,
  query: $,
  toast,
  syncRoute,
  setNavigation,
  save: () => deck.save(),
  renderForm: () => editor.renderForm(),
});
const editor = createEditorController({
  state,
  app,
  query: $,
  toast,
  setNavigation,
  catalog,
  save: () => deck.save(),
});
deck = createDeckController({ state, app, query: $, toast, setNavigation, editor });

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4200);
}

function syncRoute(replace = false) {
  if (restoringRoute) return;
  const hash = routeHash(state);
  if (window.location.hash === hash) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', hash);
}

function setNavigation() {
  syncRoute();
  $('#nav-library').classList.toggle('active', state.mode !== 'catalog');
  $('#nav-catalog').classList.toggle('active', state.mode === 'catalog');
}

function restoreRoute() {
  if (state.mode === 'edit') deck.save();
  document.querySelectorAll('.app-dialog').forEach((dialog) => dialog.close());
  const route = parseRoute(window.location.hash);
  restoringRoute = true;
  try {
    if (route.mode === 'catalog') {
      state.current = null;
      state.filters = { ...createCatalogFilters(), ...route.filters };
      catalog.renderCatalog();
    } else if (route.mode === 'edit' || route.mode === 'read') {
      const selected = state.decks.find((item) => item.id === route.id);
      if (!selected) {
        deck.library();
        toast(
          'Cette fiche n’est pas enregistrée sur cet appareil. Importez son fichier JSON pour la consulter.',
        );
      } else if (route.mode === 'read') deck.read(selected);
      else {
        editor.openEditor(selected);
        state.tab = route.tab;
        editor.renderEditor();
      }
    } else deck.library();
  } finally {
    restoringRoute = false;
  }
  syncRoute(true);
}

window.addEventListener('popstate', restoreRoute);
window.addEventListener('hashchange', restoreRoute);

app.addEventListener('input', (event) => {
  if (!catalog.handleFilter(event) && !deck.handleInput(event)) editor.handleInput(event);
});
app.addEventListener('change', (event) => {
  if (!catalog.handleFilter(event)) editor.handleChange(event);
});
app.addEventListener('click', async (event) => {
  const button = event.target.closest('button,[data-action]');
  if (!button || button.disabled) return;
  try {
    const catalogClick = catalog.handleClick(button.dataset);
    if (catalogClick) {
      await catalogClick;
      return;
    }
    if (editor.handleClick(button.dataset) || deck.handleClick(button.dataset)) return;
    await handleAction(button.dataset.action, button.dataset.id);
  } catch (error) {
    toast(error.message || 'Cette action n’a pas pu aboutir.');
  }
});
app.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('[role="button"][data-action]'))
    event.target.click();
});

async function handleAction(action, id) {
  const catalogAction = catalog.handleAction(action);
  if (catalogAction) {
    await catalogAction;
    return;
  }
  const deckAction = deck.handleAction(action, id);
  if (deckAction) await deckAction;
}

$('#nav-library').onclick = () => handleAction('home');
$('#nav-catalog').onclick = () => handleAction('catalog-manage');
$('.brand').onclick = (event) => {
  event.preventDefault();
  handleAction('home');
};

deck.bindImport();
editor.bindPaste();
catalog.bindImportInput($('#catalog-import-file'));
deck.loadInitial();
restoreRoute();
catalog.load();
