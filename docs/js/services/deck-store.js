import { DECK_STORAGE_KEY } from '../core/constants.js';
import { validateDeck } from '../core/decks.js';

/** Keep the legacy key so existing users retain their collection after the refactor. */
export function loadDecks(storage, fallback) {
  const raw = storage.getItem(DECK_STORAGE_KEY);
  if (raw === null) return { decks: [fallback()], warnings: [] };
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('La sauvegarde des fiches est invalide.');
  const decks = [],
    warnings = [];
  for (const value of parsed) {
    try {
      decks.push(validateDeck(value));
    } catch (error) {
      warnings.push('Fiche ignorée : ' + error.message);
    }
  }
  // Do not overwrite a partially unreadable collection automatically.
  return { decks, warnings };
}
export function saveDecks(storage, decks) {
  storage.setItem(DECK_STORAGE_KEY, JSON.stringify(decks));
}
