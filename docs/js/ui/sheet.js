import { esc, inksHTML, colors } from './html.js';
import { safeURL } from '../core/utils.js';
export function sheet(d) {
  const cards = (k, title) =>
    d[k].length
      ? /* HTML */ `<section class="sheet-section">
          <h3>${title}</h3>
          ${d[k]
            .map(
              (c) =>
                /* HTML */ `<div class="sheet-card">
                  ${safeURL(c.image) ? /* HTML */ `<img src="${esc(safeURL(c.image))}" alt="${esc(c.name)}" loading="lazy" />` : ''}
                  <div>
                    <strong
                      ><span class="sheet-pill">${esc(c.qty)}×</span
                      >${esc(c.name || 'Carte à préciser')}</strong
                    >${c.note ? /* HTML */ `<p>${esc(c.note)}</p>` : ''}
                  </div>
                </div>`,
            )
            .join('')}
        </section>`
      : '';
  return /* HTML */ `<article class="sheet" style="${colors(d)}">
    <div class="sheet-head">
      <div class="sheet-running"><span>GRIMOIRE / LORCANA</span><span>NOTES DE JEU</span></div>
      <div class="eyebrow">GUIDE DE DECK ${d.example ? '· EXEMPLE' : ''}</div>
      <div>${inksHTML(d.inks)}</div>
      <h2>${esc(d.name || 'Le nom de votre deck')}</h2>
      <p>${esc(d.description || 'Votre plan de jeu en quelques mots…')}</p>
      <div class="deck-meta" style="margin:16px 0 0">
        <span class="tag">${esc(d.archetype)}</span
        >${d.format ? /* HTML */ `<span class="tag">${esc(d.format)}</span>` : ''}
      </div>
    </div>
    <div class="sheet-body">
      ${
        safeURL(d.image)
          ? /* HTML */ `<section class="sheet-section">
              <h3>La decklist</h3>
              <img
                class="decklist"
                src="${esc(safeURL(d.image))}"
                alt="Decklist ${esc(d.name)}"
                data-action="zoom"
              />
            </section>`
          : '<section class="sheet-section"><h3>La decklist</h3><div class="empty-block">Votre image de decklist apparaîtra ici.</div></section>'
      }${cards('keys', 'Cartes clés')}${cards('core', 'Core du deck')}${['favorable', 'unfavorable']
        .map((k) =>
          d[k].length
            ? /* HTML */ `<section class="sheet-section">
                <h3>${k === 'favorable' ? 'Matchups favorables' : 'Matchups défavorables'}</h3>
                ${d[k]
                  .map(
                    (r) =>
                      /* HTML */ `<div class="sheet-match ${k === 'unfavorable' ? 'bad' : ''}">
                        <div>${inksHTML(r.inks)}</div>
                        <strong style="display:block;margin-top:8px">${esc(r.name)}</strong>
                        <p>${esc(r.note)}</p>
                      </div>`,
                  )
                  .join('')}
              </section>`
            : '',
        )
        .join('')}${
        d.lines.length
          ? /* HTML */ `<section class="sheet-section">
              <h3>Lignes de jeu</h3>
              ${d.lines
                .map(
                  (r, i) =>
                    /* HTML */ `<strong style="font-size:12px"
                        >${i + 1}. ${esc(r.name || 'Séquence')}</strong
                      >
                      <p>${esc(r.note)}</p>`,
                )
                .join('')}
            </section>`
          : ''
      }${
        d.mulligan || d.mulliganMatchup
          ? /* HTML */ `<section class="sheet-section">
              <h3>Mulligan</h3>
              <p>${esc(d.mulligan)}</p>
              ${
                d.mulliganMatchup
                  ? /* HTML */ `<strong style="font-size:12px">Selon l’adversaire</strong>
                      <p>${esc(d.mulliganMatchup)}</p>`
                  : ''
              }
            </section>`
          : ''
      }${cards('tech', 'Techs & pistes')}${safeURL(d.source) && /^https?:/.test(d.source) ? /* HTML */ `<a class="btn small" href="${esc(d.source)}" target="_blank" rel="noopener noreferrer">Decklist d’origine ↗</a>` : ''}
    </div>
    <div class="sheet-footer">
      <span>✦ GRIMOIRE${d.author ? ' · ' + esc(d.author) : ''}</span
      ><span>v${esc(d.version)} · ${new Date(d.updated).toLocaleDateString('fr-FR')}</span>
    </div>
  </article>`;
}
