import { INKS } from './constants.js';

const tabs = ['identity', 'matchups', 'strategy', 'cards'];
const filterKeys = ['query', 'type', 'set', 'cost', 'sort', 'page'];

export function routeHash({ mode, current, tab, filters }) {
  if (mode === 'catalog') {
    const params = new URLSearchParams();
    for (const key of filterKeys) {
      const value = filters[key];
      if (value !== '' && !(key === 'sort' && value === 'set') && !(key === 'page' && value === 1))
        params.set(key, value);
    }
    if (filters.inks.length) params.set('inks', filters.inks.join(','));
    return '#/catalogue' + (params.size ? '?' + params : '');
  }
  if (mode === 'edit') return '#/modifier/' + encodeURIComponent(current.id) + '/' + tab;
  if (mode === 'read') return '#/fiche/' + encodeURIComponent(current.id);
  return '#/fiches';
}

export function parseRoute(hash) {
  try {
    const [path, query = ''] = hash.replace(/^#/, '').split('?');
    if (path === '/catalogue') {
      const params = new URLSearchParams(query);
      const filters = {};
      for (const key of filterKeys) if (params.has(key)) filters[key] = params.get(key);
      filters.page = Math.max(1, Math.floor(Number(filters.page) || 1));
      filters.inks = (params.get('inks') || '')
        .split(',')
        .filter((ink) => Object.hasOwn(INKS, ink));
      return { mode: 'catalog', filters };
    }
    const match = path.match(/^\/(fiche|modifier)\/([^/]+)(?:\/([^/]+))?$/);
    if (match)
      return {
        mode: match[1] === 'fiche' ? 'read' : 'edit',
        id: decodeURIComponent(match[2]),
        tab: tabs.includes(match[3]) ? match[3] : 'identity',
      };
  } catch {
    // A malformed link returns to the collection without changing saved decks.
  }
  return { mode: 'library' };
}
