import { parseRoute, routeHash } from './js/core/routes.js';
import {
  createCardFilters,
  createCardPickerController,
} from './js/controllers/card-picker-controller.js';
import { createDeckController } from './js/controllers/deck-controller.js';
import { createEditorController } from './js/controllers/editor-controller.js';
import { createCreationController } from './js/controllers/creation-controller.js';

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
  filters: createCardFilters(),
  target: 'keys',
  cardSelection: [],
  creationStep: 1,
  creationInput: '',
  creationResult: null,
  creationError: '',
};
let toastTimer;
let restoringRoute = false;
let deck;

const cardPicker = createCardPickerController({
  state,
  query: $,
  toast,
  save: () => deck.save(),
  renderForm: () => editor.renderForm(),
});
const editor = createEditorController({
  state,
  app,
  query: $,
  setNavigation,
  save: () => deck.save(),
});
deck = createDeckController({ state, app, query: $, toast, setNavigation, editor });
const creation = createCreationController({
  state,
  app,
  query: $,
  toast,
  setNavigation,
  save: () => deck.save(),
  library: () => deck.library(),
  editor,
});

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
  $('#nav-library').classList.add('active');
}

function restoreRoute() {
  if (state.mode === 'edit') deck.save();
  document.querySelectorAll('.app-dialog').forEach((dialog) => dialog.close());
  const route = parseRoute(window.location.hash);
  restoringRoute = true;
  try {
    if (route.mode === 'edit' || route.mode === 'read') {
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
  if (!creation.handleInput(event)) editor.handleInput(event);
});
app.addEventListener('change', (event) => {
  editor.handleChange(event);
});
app.addEventListener('click', async (event) => {
  const button = event.target.closest('button,[data-action]');
  if (!button || button.disabled) return;
  try {
    if (
      cardPicker.handleClick(button.dataset) ||
      editor.handleClick(button.dataset) ||
      creation.handleClick(button.dataset) ||
      deck.handleClick(button.dataset)
    )
      return;
    await handleAction(button.dataset.action, button.dataset.id);
  } catch (error) {
    toast(error.message || 'Cette action n’a pas pu aboutir.');
  }
});
app.addEventListener('keydown', (event) => {
  if (event.target.matches('[role="tab"][data-tab]')) {
    const tabs = [...document.querySelectorAll('[role="tab"][data-tab]')];
    const current = tabs.indexOf(event.target);
    const destinations = {
      ArrowLeft: (current - 1 + tabs.length) % tabs.length,
      ArrowRight: (current + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (Object.hasOwn(destinations, event.key)) {
      event.preventDefault();
      tabs[destinations[event.key]].focus();
      tabs[destinations[event.key]].click();
      return;
    }
  }
  if (event.key === 'Enter' && event.target.matches('[role="button"][data-action]'))
    event.target.click();
});

async function handleAction(action, id) {
  const creationAction = creation.handleAction(action);
  if (creationAction) {
    await creationAction;
    return;
  }
  const deckAction = deck.handleAction(action, id);
  if (deckAction) await deckAction;
}

$('#nav-library').onclick = () => handleAction('home');
$('.brand').onclick = (event) => {
  event.preventDefault();
  handleAction('home');
};

deck.bindImport();
deck.loadInitial();
restoreRoute();
cardPicker.load();
