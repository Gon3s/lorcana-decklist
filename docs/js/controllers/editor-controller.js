import { moveRow, toggleInk } from '../core/decks.js';
import { quantity, cleanText } from '../core/utils.js';
import { editorPage, identityForm, matchupsForm, strategyForm, cardsForm } from '../ui/editor.js';
import { createCardFilters } from './card-picker-controller.js';

export function createEditorController({ state, app, query, setNavigation, save }) {
  const $ = query;

  function openEditor(deck) {
    if (!deck) return;
    state.current = deck;
    state.mode = 'edit';
    state.tab = 'identity';
    state.cardSelection = [];
    state.filters = { ...createCardFilters(), deckOnly: true, inks: [...deck.inks] };
    renderEditor();
    window.scrollTo(0, 0);
  }

  function renderEditor() {
    app.innerHTML = editorPage(state.current, state.tab);
    setNavigation();
    renderForm();
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
      state.tab === 'cards' ? cardsForm(state.current) : forms[state.tab](state.current);
  }

  function handleInput(event) {
    if (state.mode !== 'edit') return false;
    const { field, list, index, prop } = event.target.dataset;
    if (field) {
      state.current[field] = cleanText(event.target.value);
      save();
    }
    if (list) {
      state.current[list][index][prop] =
        prop === 'qty' ? quantity(event.target.value) : cleanText(event.target.value);
      save();
    }
    return Boolean(field || list);
  }

  function handleChange(event) {
    if (state.mode !== 'edit' || !event.target.dataset.field) return false;
    state.current[event.target.dataset.field] = cleanText(event.target.value);
    save();
    return true;
  }

  function handleClick(data) {
    if (state.mode !== 'edit') return false;
    if (data.tab) {
      if (state.tab === 'cards' && data.tab !== 'cards') state.cardSelection = [];
      state.tab = data.tab;
      renderEditor();
      return true;
    }
    if (data.ink) {
      const [section, index] = data.inkTarget.split(':');
      toggleInk(state.current[section][Number(index)].inks, data.ink);
      save();
      renderForm();
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
      return true;
    }
    if (data.remove) {
      const [section, index] = data.remove.split(':');
      state.current[section].splice(Number(index), 1);
      save();
      renderForm();
      return true;
    }
    if (data.move) {
      const [section, index, direction] = data.move.split(':');
      moveRow(state.current[section], Number(index), Number(direction));
      save();
      renderForm();
      return true;
    }
    return false;
  }

  return {
    openEditor,
    renderEditor,
    renderForm,
    handleInput,
    handleChange,
    handleClick,
  };
}
