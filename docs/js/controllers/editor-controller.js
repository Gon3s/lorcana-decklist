import { moveRow, toggleInk } from '../core/decks.js';
import { quantity, cleanText } from '../core/utils.js';
import { readDeckImage } from '../services/files.js';
import { editorPage, identityForm, matchupsForm, strategyForm, cardsForm } from '../ui/editor.js';
import { sheet } from '../ui/sheet.js';
import { createCatalogFilters } from './catalog-controller.js';

export function createEditorController({ state, app, query, toast, setNavigation, catalog, save }) {
  const $ = query;

  function preview() {
    if ($('#preview') && state.current) $('#preview').innerHTML = sheet(state.current);
  }

  function openEditor(deck) {
    if (!deck) return;
    state.current = deck;
    state.mode = 'edit';
    state.tab = 'identity';
    state.filters = { ...createCatalogFilters(), deckOnly: true, inks: [...deck.inks] };
    renderEditor();
    window.scrollTo(0, 0);
  }

  function renderEditor() {
    app.innerHTML = editorPage(state.current, state.tab);
    setNavigation();
    renderForm();
    preview();
  }

  function renderForm() {
    if (state.mode === 'edit' && state.filters.deckOnly)
      state.filters.inks = [...state.current.inks];
    const forms = {
      identity: identityForm,
      matchups: matchupsForm,
      strategy: strategyForm,
    };
    $('#form').innerHTML =
      state.tab === 'cards'
        ? cardsForm(state.current, catalog.browserMarkup())
        : forms[state.tab](state.current);
    if (state.tab === 'cards') catalog.renderResults();
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

  function removeImage() {
    state.current.image = '';
    save();
    renderForm();
    preview();
  }

  function handleInput(event) {
    if (state.mode !== 'edit') return false;
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
    return Boolean(field || list);
  }

  function handleChange(event) {
    if (state.mode !== 'edit' || !event.target.dataset.field) return false;
    state.current[event.target.dataset.field] = cleanText(event.target.value);
    save();
    preview();
    return true;
  }

  function handleClick(data) {
    if (data.tab) {
      state.tab = data.tab;
      renderEditor();
      return true;
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
      return true;
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
      return true;
    }
    if (data.remove) {
      const [section, index] = data.remove.split(':');
      state.current[section].splice(Number(index), 1);
      save();
      renderForm();
      preview();
      return true;
    }
    if (data.move) {
      const [section, index, direction] = data.move.split(':');
      moveRow(state.current[section], Number(index), Number(direction));
      save();
      renderForm();
      preview();
      return true;
    }
    return false;
  }

  function bindPaste() {
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
  }

  return {
    preview,
    openEditor,
    renderEditor,
    renderForm,
    removeImage,
    handleInput,
    handleChange,
    handleClick,
    bindPaste,
  };
}
