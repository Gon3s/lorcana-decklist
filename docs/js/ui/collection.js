import { INKS } from '../core/constants.js';
import { esc, inkIcon, inksHTML, colors } from './html.js';
import { normalize, safeURL } from '../core/utils.js';
export function collectionPage({ query, inkFilter, typeFilter }) {
  return /* HTML */ `<section class="hero">
      <div class="hero-copy">
        <div class="eyebrow"><span class="tiny-cross">✦</span> LE GRIMOIRE DES ILLUMINEURS</div>
        <h1>Une idée.<br />Six encres.<br /><em>Votre légende.</em></h1>
        <p>
          Rassemblez vos cartes. Révélez leurs synergies.<br />Créez le guide qui fera vivre votre
          prochain deck.
        </p>
        <div class="hero-actions">
          <button class="btn primary" data-action="new">Créer ma fiche <span>✦</span></button
          ><a class="hero-link" href="#collection">Explorer mes decks ↓</a>
        </div>
        <span class="hero-caption">CARTES CLÉS · MATCHUPS · MULLIGAN · LIGNES DE JEU</span>
      </div>
      <div class="hero-art" aria-label="Glimmers de Lorcana : Elsa, Mickey et Stitch">
        <div class="magic-orbit orbit-outer"></div>
        <div class="magic-orbit orbit-inner"></div>
        <span class="orbit-glyph glyph-top">✦</span><span class="orbit-glyph glyph-left">✧</span
        ><span class="orbit-glyph glyph-right">✦</span>
        <div class="art-cards">
          <img
            class="art-card card-one"
            src="https://api.lorcana.ravensburger.com/images/fr/set5/48_9ae1df04043e47571bfedeb4f3edeefacbf40e15.jpg"
            alt="Elsa - Le cinquième esprit"
          /><img
            class="art-card card-two"
            src="https://api.lorcana.ravensburger.com/images/fr/set4/187_46a9b3a722ce799f8e5e39216049ab70420dbdbe.jpg"
            alt="Mickey Mouse - Sorcier espiègle"
          /><img
            class="art-card card-three"
            src="https://api.lorcana.ravensburger.com/images/fr/set3/89_167b46d6d5fb24ab6f368c08de8d968becf11f0c.jpg"
            alt="Stitch - Agent sous couverture"
          />
        </div>
        <div class="magic-seal"><span>✧</span> L’IMAGINATION PREND VIE</div>
      </div>
    </section>
    <section class="ink-compass" aria-label="Explorer par encre">
      <div class="ink-compass-heading">
        <span>CHOISISSEZ VOTRE ENCRE</span><small>Six façons d’écrire votre histoire.</small>
      </div>
      <div class="ink-lenses">
        ${Object.entries(INKS)
          .map(
            ([k, v]) =>
              /* HTML */ `<button
                class="ink-lens ${inkFilter === k ? 'selected' : ''}"
                style="--ink:${v[1]}"
                data-filter-ink="${k}"
                aria-pressed="${inkFilter === k}"
              >
                <span class="ink-jewel">${inkIcon(k)}</span><span>${v[0]}</span>
              </button>`,
          )
          .join('')}
      </div>
    </section>
    <section class="intro-strip" id="collection">
      <span class="collection-number">✧</span>
      <div>
        <div class="collection-eyebrow">VOTRE COLLECTION DE STRATÉGIES</div>
        <h2>Ouvrez un nouveau <em>chapitre.</em></h2>
        <p>Chaque deck cache une histoire. À vous de l’écrire.</p>
      </div>
      <span class="mini">✦ UN UNIVERS DE POSSIBILITÉS</span>
    </section>
    <div class="toolbar">
      <div class="filters">
        <div class="search">
          <span>⌕</span
          ><input
            id="search"
            aria-label="Rechercher une fiche"
            placeholder="Rechercher un deck…"
            value="${esc(query)}"
          />
        </div>
        <select id="ink-filter" aria-label="Filtrer par encre">
          <option value="">Toutes les encres</option>
          ${Object.entries(INKS)
            .map(
              ([k, v]) =>
                /* HTML */ `<option value="${k}" ${inkFilter === k ? 'selected' : ''}>
                  ${v[0]}
                </option>`,
            )
            .join('')}</select
        ><select id="type-filter" aria-label="Filtrer par archétype">
          <option value="">Tous les styles</option>
          ${['Aggro', 'Midrange', 'Contrôle', 'Combo', 'Tempo', 'Autre'].map((x) => /* HTML */ `<option ${typeFilter === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </div>
      <span class="count" id="count"></span>
    </div>
    <div class="deck-grid" id="grid"></div>
    <p class="bottom-tip">
      ✦ Vos fiches restent dans ce navigateur. Exportez-les pour les conserver ou les partager.
    </p>`;
}
export function deckGrid(decks, { query, inkFilter, typeFilter }) {
  const ds = decks.filter(
    (d) =>
      normalize(d.name + ' ' + d.description).includes(normalize(query)) &&
      (!inkFilter || d.inks.includes(inkFilter)) &&
      (!typeFilter || d.archetype === typeFilter),
  );
  const markup =
    ds
      .map(
        (d, index) =>
          /* HTML */ `<article class="deck-card">
            <div class="deck-issue">
              <span>GRIMOIRE / ${String(index + 1).padStart(2, '0')}</span
              ><span>NOTES PERSONNELLES</span>
            </div>
            <div
              class="deck-cover"
              style="${colors(d)}"
              data-action="read"
              data-id="${esc(d.id)}"
              role="button"
              tabindex="0"
              aria-label="Ouvrir ${esc(d.name)}"
            >
              ${
                d.keys.some((c) => safeURL(c.image))
                  ? '<div class="cover-cards">' +
                    d.keys
                      .filter((c) => safeURL(c.image))
                      .slice(0, 3)
                      .map((c) => '<img src="' + esc(safeURL(c.image)) + '" alt="" loading="lazy">')
                      .join('') +
                    '</div>'
                  : '<span class="cover-glyph">✦</span>'
              }
              <div class="cover-label">${inksHTML(d.inks)}</div>
            </div>
            <div class="deck-body">
              <div class="deck-meta">
                <span class="tag">${esc(d.archetype)}</span><span class="tag">Duels.ink</span>
              </div>
              <h3 data-action="read" data-id="${esc(d.id)}">${esc(d.name || 'Sans titre')}</h3>
              <p>${esc(d.description || 'Votre stratégie reste à écrire.')}</p>
              <div class="deck-bottom">
                <span
                  >${d.keys.length} cartes clés ·
                  ${new Date(d.updated).toLocaleDateString('fr-FR')}</span
                ><button data-action="edit" data-id="${esc(d.id)}">Éditer la fiche ↗</button>
              </div>
            </div>
          </article>`,
      )
      .join('') +
    /* HTML */ `<button class="new-card" data-action="new">
      <span class="new-kicker">VOTRE PROCHAINE AVENTURE</span><b>＋</b
      ><strong>Un nouveau<br /><em>chapitre.</em></strong
      ><span>Créer une fiche de deck ↗</span>
    </button>`;
  return { markup, count: ds.length };
}
