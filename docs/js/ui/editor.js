import { TABS, CARD_SECTIONS } from '../core/constants.js';
import { esc, inkOptions } from './html.js';
import { safeURL } from '../core/utils.js';
function field(current, label, key, placeholder = '', area = false) {
  return /* HTML */ `<div class="field"><label for="f-${key}">${label}</label><${area ? 'textarea' : 'input'} id="f-${key}" data-field="${key}" placeholder="${esc(placeholder)}" ${area ? '' : 'value="' + esc(current[key]) + '"'}>${area ? esc(current[key]) : ''}${area ? '</textarea>' : ''}</div>`;
}
export function rowTools(current, k, i) {
  return /* HTML */ `<div class="row-tools">
    <button
      class="iconbtn"
      data-move="${k}:${i}:-1"
      aria-label="Monter"
      ${i === 0 ? 'disabled' : ''}
    >
      ↑</button
    ><button
      class="iconbtn"
      data-move="${k}:${i}:1"
      aria-label="Descendre"
      ${i === current[k].length - 1 ? 'disabled' : ''}
    >
      ↓</button
    ><button class="iconbtn" data-remove="${k}:${i}" aria-label="Retirer">×</button>
  </div>`;
}
export function identityForm(current) {
  return (
    field(current, 'Nom du deck *', 'name', 'Ex. Saphir Acier · Ramp') +
    /* HTML */ `<div class="field">
      <label>Encres du deck * <small>- 1 ou 2 maximum</small></label
      >${inkOptions(current.inks)}
    </div>` +
    field(current, 'En quelques mots', 'description', 'Quel est le plan de votre deck ?', true) +
    /* HTML */ `<div class="two-cols">
        <div class="field">
          <label for="archetype">Archétype</label
          ><select id="archetype" data-field="archetype">
            ${['Aggro', 'Midrange', 'Contrôle', 'Combo', 'Tempo', 'Autre'].map((t) => /* HTML */ `<option ${current.archetype === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        ${field(current, 'Format / extension', 'format', 'Ex. Construit · extension…')}
      </div>
      <div class="field">
        <label>Image de la decklist</label>
        <div
          class="dropzone"
          id="drop"
          tabindex="0"
          role="button"
          aria-label="Ajouter une image de decklist"
        >
          ${safeURL(current.image) ? /* HTML */ `<img src="${esc(safeURL(current.image))}" alt="Decklist importée" />` : '<span style="font-size:28px;color:var(--accent)">⇧</span>'}<strong
            >${current.image ? 'Remplacer la decklist' : 'Déposez votre image ici'}</strong
          >
          <p>
            Cliquez pour choisir, ou collez avec Ctrl / ⌘ + V<br />PNG, JPG, WebP · 10 Mo maximum
          </p>
        </div>
        <input
          id="image-file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
        />${current.image ? '<button class="btn small ghost" style="margin-top:8px" data-action="remove-image">Retirer l’image</button>' : ''}
      </div>` +
    field(current, 'Lien vers la decklist d’origine', 'source', 'https://…') +
    /* HTML */ `<div class="two-cols">
        ${field(current, 'Auteur', 'author', 'Votre pseudo')}${field(current, 'Version', 'version', '1.0')}
      </div>
      <p class="source-note">
        Un brouillon peut rester incomplet. Ajoutez un nom, une ou deux encres et une image avant de
        finaliser votre fiche.
      </p>`
  );
}
export function matchupsForm(current) {
  return /* HTML */ `<h3>Anticipez l’adversaire.</h3>
    <p class="field-help">
      Renseignez les encres et, si utile, l’archétype. Les appréciations reflètent vos observations.
    </p>
    ${['favorable', 'unfavorable']
      .map(
        (k) =>
          /* HTML */ `<div class="section-heading" style="margin-top:25px">
              <h3>${k === 'favorable' ? '↗ Favorables' : '↘ Défavorables'}</h3>
              <button class="btn small" data-add="${k}">＋ Ajouter</button>
            </div>
            ${
              current[k]
                .map(
                  (r, i) =>
                    /* HTML */ `<div class="repeat-row">
                      <div class="row-head">
                        <span class="muted">Matchup ${i + 1}</span>${rowTools(current, k, i)}
                      </div>
                      ${inkOptions(r.inks, k + ':' + i)}<input
                        style="margin-top:12px"
                        aria-label="Archétype adverse"
                        data-list="${k}"
                        data-index="${i}"
                        data-prop="name"
                        value="${esc(r.name)}"
                        placeholder="Archétype adverse (facultatif)"
                      /><textarea
                        aria-label="Conseils de matchup"
                        data-list="${k}"
                        data-index="${i}"
                        data-prop="note"
                        placeholder="Pourquoi ? Quel plan adopter ?"
                      >
${esc(r.note)}</textarea>
                    </div>`,
                )
                .join('') || '<div class="empty-block">Ajoutez votre premier matchup.</div>'
            }`,
      )
      .join('')}`;
}
export function strategyForm(current) {
  return /* HTML */ `<div class="section-heading">
      <h3>Lignes de jeu</h3>
      <button class="btn small" data-add="lines">＋ Ajouter</button>
    </div>
    <p class="field-help">
      Décrivez la situation, la séquence et l’objectif. Réordonnez les lignes avec les flèches.
    </p>
    ${current.lines
      .map(
        (r, i) =>
          /* HTML */ `<div class="repeat-row">
            <div class="row-head">
              <span class="muted">Séquence ${i + 1}</span>${rowTools(current, 'lines', i)}
            </div>
            <input
              aria-label="Titre de la séquence"
              data-list="lines"
              data-index="${i}"
              data-prop="name"
              value="${esc(r.name)}"
              placeholder="Ex. Début de partie"
            /><textarea
              aria-label="Détails de la séquence"
              data-list="lines"
              data-index="${i}"
              data-prop="note"
              placeholder="Situation → Séquence → Objectif"
            >
${esc(r.note)}</textarea>
          </div>`,
      )
      .join('')}
    <div style="margin-top:28px">
      ${field(current, 'Mulligan · garder / renvoyer', 'mulligan', 'Quelles cartes chercher dans la main de départ ? Que renvoyer ?', true)}${field(current, 'Adapter le mulligan à l’adversaire', 'mulliganMatchup', 'Sur le play / sur la draw, face à aggro, contrôle…', true)}
    </div>`;
}

export function editorPage(deck, tab) {
  return /* HTML */ ` <div class="workspace-top">
      <button class="back" data-action="home">← Mes fiches</button>
      <div class="actions">
        <span id="save-status" class="muted">● Enregistré sur cet appareil</span>
        <button class="btn small" data-action="read-current">Aperçu</button>
        <button class="btn small" data-action="export">Exporter</button>
      </div>
    </div>
    <h1 class="workspace-title">${deck.name ? 'Éditer votre fiche' : 'Une nouvelle stratégie.'}</h1>
    <div class="editor-layout">
      <section class="editor-panel">
        <div class="tabs" aria-label="Rubriques de la fiche">
          ${TABS.map(
            ([id, label]) =>
              /* HTML */ ` <button
                class="tab ${tab === id ? 'active' : ''}"
                data-tab="${id}"
                aria-pressed="${tab === id}"
              >
                ${label}
              </button>`,
          ).join('')}
        </div>
        <div class="form-body" id="form"></div>
      </section>
      <aside class="preview-panel">
        <div class="preview-label"><span>APERÇU EN DIRECT</span><span>✦ VOTRE GRIMOIRE</span></div>
        <div id="preview"></div>
      </aside>
    </div>`;
}

export function cardSections(deck) {
  return Object.entries(CARD_SECTIONS)
    .map(
      ([section, label]) =>
        /* HTML */ ` <section class="deck-card-section" id="section-${section}">
          <div class="section-heading">
            <h3>${label} <span class="section-count">${deck[section].length}</span></h3>
            <div class="actions">
              <button class="btn small" data-pick-section="${section}">⌕ Rechercher</button>
              <button class="btn small ghost" data-add="${section}">＋ Libre</button>
            </div>
          </div>
          ${
            deck[section]
              .map(
                (card, index) =>
                  /* HTML */ ` <div class="repeat-row selected-card">
                    ${safeURL(card.image) ? /* HTML */ `<img class="selected-card-image" src="${esc(safeURL(card.image))}" alt="" loading="lazy" />` : ''}
                    <div class="selected-card-fields">
                      <div class="row-head">
                        <span class="muted"
                          >${card.id ? 'Catalogue' : 'Carte libre'} ${index + 1}</span
                        >${rowTools(deck, section, index)}
                      </div>
                      <div class="row-fields">
                        <label class="sr-only" for="qty-${section}-${index}">Quantité</label>
                        <input
                          id="qty-${section}-${index}"
                          type="number"
                          min="1"
                          max="99"
                          data-list="${section}"
                          data-index="${index}"
                          data-prop="qty"
                          value="${esc(card.qty)}"
                        />
                        <label class="sr-only" for="name-${section}-${index}">Nom de carte</label>
                        <input
                          id="name-${section}-${index}"
                          data-list="${section}"
                          data-index="${index}"
                          data-prop="name"
                          value="${esc(card.name)}"
                          placeholder="Nom de la carte"
                        />
                      </div>
                      <label class="sr-only" for="note-${section}-${index}">Rôle de la carte</label>
                      <textarea
                        id="note-${section}-${index}"
                        data-list="${section}"
                        data-index="${index}"
                        data-prop="note"
                        placeholder="${section === 'tech' ? 'Quel problème résout-elle ? Quelle carte remplacer ?' : 'Rôle, synergie, importance…'}"
                      >
${esc(card.note)}</textarea>
                    </div>
                  </div>`,
              )
              .join('') ||
            '<div class="empty-block">Choisissez une carte dans le catalogue ou ajoutez une entrée libre.</div>'
          }
        </section>`,
    )
    .join('');
}
export function cardsForm(deck, browser) {
  return /* HTML */ `<h3 class="catalog-editor-title">Vos cartes, leurs rôles.</h3>
    <p class="field-help">
      Recherchez une carte puis ajoutez-la aux cartes clés, au core ou aux techs. Une carte peut
      appartenir à plusieurs rubriques.
    </p>
    ${browser}
    <div id="selected-card-sections">${cardSections(deck)}</div>`;
}
