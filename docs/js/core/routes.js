const tabs = ['identity', 'matchups', 'strategy', 'cards'];

export function routeHash({ mode, current, tab }) {
  if (mode === 'edit') return '#/modifier/' + encodeURIComponent(current.id) + '/' + tab;
  if (mode === 'read') return '#/fiche/' + encodeURIComponent(current.id);
  return '#/fiches';
}

export function parseRoute(hash) {
  try {
    const path = hash.replace(/^#/, '').split('?')[0];
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
