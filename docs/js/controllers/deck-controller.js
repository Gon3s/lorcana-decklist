import { decodeDeckExport, encodeDeckExport } from '../core/decks.js';
import { normalize, uid } from '../core/utils.js';
import { loadDecks, saveDecks } from '../services/deck-store.js';
import { downloadText, readJSONFile } from '../services/files.js';
import { createShareImage, shareImageFilename } from '../services/share-image.js';
import { collectionPage, deckGrid } from '../ui/collection.js';
import { confirmAction } from '../ui/dialog.js';
import { sheet } from '../ui/sheet.js';
import { openShareImageDialog } from '../ui/share-image-dialog.js';

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
        <button class="btn small" data-action="share-image">Image à partager</button>
        <button class="btn small" data-action="delete">Supprimer</button>
        <button class="btn primary small" data-action="edit-current">Modifier</button></div></div>
      <div class="read-layout">${sheet(deck)}</div>`;
    window.scrollTo(0, 0);
  }

  function handleClick(data) {
    if (!data.filterInk) return false;
    state.inkFilter = state.inkFilter === data.filterInk ? '' : data.filterInk;
    syncInkFilter();
    return true;
  }

  function handleAction(action, id) {
    const deck = id ? state.decks.find((item) => item.id === id) : state.current;
    switch (action) {
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
      case 'export':
        downloadText(
          encodeDeckExport(state.current),
          normalize(state.current.name || 'fiche-lorcana').replace(/[^a-z0-9]+/g, '-') + '.json',
        );
        toast('Fiche exportée.');
        return true;
      case 'print':
        return (async () => {
          await document.fonts?.ready;
          const images = [...document.querySelectorAll('.sheet img')];
          images.forEach((image) => (image.loading = 'eager'));
          await Promise.race([
            Promise.all(
              images.map((image) =>
                image.complete
                  ? image.decode?.().catch(() => {})
                  : new Promise((resolve) => {
                      image.addEventListener('load', resolve, { once: true });
                      image.addEventListener('error', resolve, { once: true });
                    }),
              ),
            ),
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]);
          window.print();
        })();
      case 'share-image':
        return (async () => {
          toast('Création de l’image en cours…');
          const blob = await createShareImage(state.current);
          openShareImageDialog(blob, shareImageFilename(state.current));
          toast('Image prête à partager.');
        })();
      case 'duplicate': {
        const copy = structuredClone(state.current);
        Object.assign(copy, {
          id: uid(),
          name: copy.name + ' (copie)',
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
      const loaded = loadDecks(localStorage);
      state.decks = loaded.decks;
      if (loaded.warnings.length)
        toast('Certaines fiches sont illisibles. La sauvegarde originale n’a pas été modifiée.');
    } catch {
      state.decks = [];
      toast('La sauvegarde locale est indisponible. Exportez vos fiches pour les conserver.');
    }
  }

  return {
    save,
    library,
    read,
    handleClick,
    handleAction,
    bindImport,
    loadInitial,
  };
}
