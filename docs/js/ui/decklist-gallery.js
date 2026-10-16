import { safeURL } from '../core/utils.js';
import { esc } from './html.js';

export function decklistGallery(cards) {
  return /* HTML */ `<div class="decklist-gallery">
    ${cards
      .map((card) => {
        const image = safeURL(card.image);
        return /* HTML */ `<figure class="decklist-card">
          <div class="decklist-card-visual">
            ${
              image
                ? /* HTML */ `<img src="${esc(image)}" alt="${esc(card.name)}" loading="lazy" />`
                : /* HTML */ `<span class="decklist-card-fallback">${esc(card.name)}</span>`
            }
            <span class="decklist-quantity" aria-label="${esc(card.qty)} exemplaires"
              >${esc(card.qty)}×</span
            >
          </div>
          <figcaption>
            <strong>${esc(card.name)}</strong><small>${esc(card.printingCode)}</small>
          </figcaption>
        </figure>`;
      })
      .join('')}
  </div>`;
}
