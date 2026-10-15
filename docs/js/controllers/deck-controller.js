import { createDeck, decodeDeckExport, encodeDeckExport, toggleInk } from '../core/decks.js';
import { createSampleDeck } from '../core/sample.js';
import { cleanText, normalize, uid } from '../core/utils.js';
import { loadDecks, saveDecks } from '../services/deck-store.js';
import { downloadText, readJSONFile } from '../services/files.js';
import { collectionPage, deckGrid } from '../ui/collection.js';
import { creationPage } from '../ui/creation.js';
import { openDialog, confirmAction } from '../ui/dialog.js';
import { esc } from '../ui/html.js';
import { sheet } from '../ui/sheet.js';

export function createDeckController({ state, app, query, toast, setNavigation, editor }) {
  const $ = query;

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
    return saved;
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

  function renderCreation() {
    app.innerHTML = creationPage({
      deck: state.current,
      step: state.creationStep,
      method: state.creationMethod,
      error: state.creationError,
    });
    setNavigation();
    window.scrollTo(0, 0);
    const focusTarget =
      state.creationStep === 1
        ? '#create-name'
        : state.creationStep === 2
          ? '[data-create-method]'
          : '[data-action="create-finish"]';
    $(focusTarget)?.focus();
  }

  function startCreation() {
    state.current = createDeck();
    state.mode = 'create';
    state.creationStep = 1;
    state.creationMethod = '';
    state.creationError = '';
    renderCreation();
  }

  function creationReady() {
    return Boolean(state.current?.name.trim() && state.current.inks.length);
  }

  function syncCreationBasics() {
    const next = $('#create-basics-next');
    if (next) next.disabled = !creationReady();
    const help = $('#create-ink-help');
    if (help) {
      const count = state.current.inks.length;
      help.textContent = count
        ? count + ' encre' + (count > 1 ? 's sélectionnées' : ' sélectionnée')
        : 'Sélectionnez au moins une encre.';
    }
    const error = $('#create-error');
    if (error) {
      error.textContent = state.creationError;
      error.hidden = !state.creationError;
    }
  }

  function handleInput(event) {
    if (state.mode !== 'create' || event.target.dataset.createField !== 'name') return false;
    state.current.name = cleanText(event.target.value);
    state.creationError = '';
    syncCreationBasics();
    return true;
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

  function handleClick(data) {
    if (state.mode === 'create' && data.ink) {
      try {
        toggleInk(state.current.inks, data.ink);
        state.creationError = '';
        const button = document.querySelector(`[data-ink="${data.ink}"]`);
        const selected = state.current.inks.includes(data.ink);
        button?.classList.toggle('selected', selected);
        button?.setAttribute('aria-pressed', String(selected));
      } catch (error) {
        state.creationError = error.message;
      }
      syncCreationBasics();
      return true;
    }
    if (state.mode === 'create' && data.createMethod) {
      state.creationMethod = data.createMethod;
      document.querySelectorAll('[data-create-method]').forEach((button) => {
        const selected = button.dataset.createMethod === state.creationMethod;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      $('#create-method-next').disabled = false;
      return true;
    }
    if (!data.filterInk) return false;
    state.inkFilter = state.inkFilter === data.filterInk ? '' : data.filterInk;
    syncInkFilter();
    return true;
  }

  function handleAction(action, id) {
    const deck = id ? state.decks.find((item) => item.id === id) : state.current;
    switch (action) {
      case 'new':
        startCreation();
        return true;
      case 'create-cancel':
        library();
        return true;
      case 'create-next':
        if (state.mode !== 'create') return false;
        if (state.creationStep === 1 && !creationReady()) {
          state.creationError = 'Ajoutez un nom et au moins une encre pour continuer.';
          syncCreationBasics();
          return true;
        }
        if (state.creationStep === 2 && !state.creationMethod) return true;
        state.creationStep += 1;
        state.creationError = '';
        renderCreation();
        return true;
      case 'create-back':
        if (state.mode !== 'create') return false;
        if (state.creationStep === 3 && state.creationMethod === 'later') state.creationMethod = '';
        state.creationStep = Math.max(1, state.creationStep - 1);
        state.creationError = '';
        renderCreation();
        return true;
      case 'create-skip':
        if (state.mode !== 'create') return false;
        state.creationMethod = 'later';
        state.creationStep = 3;
        renderCreation();
        return true;
      case 'create-finish': {
        if (state.mode !== 'create' || !creationReady() || !state.creationMethod) return false;
        const method = state.creationMethod;
        const saved = save();
        editor.openEditor(state.current);
        if (method === 'catalog') {
          state.tab = 'cards';
          editor.renderEditor();
        } else if (method === 'image') $('#image-file')?.click();
        if (saved) toast('Brouillon créé.');
        return true;
      }
      case 'home':
        if (state.mode === 'edit') save();
        library();
        return true;
      case 'read':
        read(deck);
        return true;
      case 'edit':
        editor.openEditor(deck);
        return true;
      case 'read-current':
        save();
        read(state.current);
        return true;
      case 'edit-current':
        editor.openEditor(state.current);
        return true;
      case 'remove-image':
        editor.removeImage();
        return true;
      case 'export':
        downloadText(
          encodeDeckExport(state.current),
          normalize(state.current.name || 'fiche-lorcana').replace(/[^a-z0-9]+/g, '-') + '.json',
        );
        toast('Fiche exportée, image comprise.');
        return true;
      case 'print':
        return (async () => {
          await document.fonts?.ready;
          window.print();
        })();
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
        editor.openEditor(copy);
        toast('Copie créée.');
        return true;
      }
      case 'delete':
        return (async () => {
          if (
            await confirmAction(
              'Supprimer cette fiche ?',
              'La fiche sera supprimée de cet appareil.',
              'Supprimer',
            )
          ) {
            state.decks = state.decks.filter((item) => item.id !== state.current.id);
            persist();
            library();
            toast('Fiche supprimée.');
          }
        })();
      case 'zoom': {
        const dialog = openDialog(
          `<img class="full-image" src="${esc(state.current.image)}" alt="Decklist agrandie">`,
          'image-dialog',
        );
        dialog.focus();
        return true;
      }
      default:
        return false;
    }
  }

  function bindImport() {
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
  }

  function loadInitial() {
    try {
      const loaded = loadDecks(localStorage, createSampleDeck);
      state.decks = loaded.decks;
      if (loaded.warnings.length)
        toast('Certaines fiches sont illisibles. La sauvegarde originale n’a pas été modifiée.');
    } catch {
      state.decks = [createSampleDeck()];
      toast('La sauvegarde locale est indisponible. Exportez vos fiches pour les conserver.');
    }
  }

  return {
    save,
    library,
    read,
    handleInput,
    handleClick,
    handleAction,
    bindImport,
    loadInitial,
  };
}
