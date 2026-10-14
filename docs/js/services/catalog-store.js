import { CATALOG_SNAPSHOT_URL } from '../core/constants.js';
import {
  normalizeCatalog,
  withCard,
  withoutCard,
  upgradeLegacyPrintings,
  needsPrintingUpgrade,
} from '../core/catalog.js';

/** One IndexedDB document; large catalogues don't consume the deck localStorage quota. */
export function createCatalogCache(indexedDB = globalThis.indexedDB) {
  let connection;
  function open() {
    if (!indexedDB) return Promise.reject(new Error('IndexedDB indisponible dans ce navigateur.'));
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open('grimoire-catalog', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('catalog');
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          connection = null;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        connection = null;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = null;
        reject(new Error('Fermez les autres onglets Grimoire puis réessayez.'));
      };
    });
    return connection;
  }
  async function transaction(mode, operation) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('catalog', mode);
      const request = operation(tx.objectStore('catalog'));
      let result;
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () =>
        reject(tx.error || new Error('Échec de la sauvegarde du catalogue.'));
    });
  }
  return {
    read: () => transaction('readonly', (store) => store.get('current')),
    write: (document) => transaction('readwrite', (store) => store.put(document, 'current')),
  };
}

export class CatalogRepository {
  constructor({ cache = createCatalogCache(), fetcher = globalThis.fetch.bind(globalThis) } = {}) {
    this.cache = cache;
    this.fetcher = fetcher;
    this.document = null;
    this.warning = '';
  }
  async fetchDocument(url, timeoutMs = 25000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetcher(url, {
        signal: controller.signal,
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error('Chargement impossible (HTTP ' + response.status + ').');
      return normalizeCatalog(await response.json());
    } finally {
      clearTimeout(timeout);
    }
  }
  async load() {
    try {
      const cached = await this.cache.read();
      if (cached) {
        this.document = normalizeCatalog(cached);
        if (needsPrintingUpgrade(cached)) {
          try {
            const reference = await this.fetchDocument(CATALOG_SNAPSHOT_URL, 5000);
            const upgraded = upgradeLegacyPrintings(cached, reference);
            await this.cache.write(upgraded);
            this.document = upgraded;
          } catch {
            this.warning =
              'Catalogue conservé. Les anciens numéros de réimpression n’ont pas pu être actualisés. Réessayez lors de votre prochaine visite.';
          }
        }
        return this.document;
      }
    } catch {
      this.warning = 'Le cache local est indisponible. Le catalogue intégré reste consultable.';
    }
    this.document = await this.fetchDocument(CATALOG_SNAPSHOT_URL);
    return this.document;
  }
  async commit(document) {
    const valid = normalizeCatalog(document);
    // A failed write must not make the interface claim that edits were saved.
    await this.cache.write(valid);
    this.document = valid;
    this.warning = '';
    return valid;
  }
  async import(raw) {
    return this.commit(normalizeCatalog(raw));
  }
  async upsert(card) {
    return this.commit(withCard(this.document, card));
  }
  async remove(id) {
    return this.commit(withoutCard(this.document, id));
  }
}
