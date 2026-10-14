import { INKS } from '../core/constants.js';
export function esc(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}
export function inkIcon(ink) {
  return INKS[ink]
    ? /* HTML */ `<img
        class="ink-icon"
        src="assets/inks/${ink}.png"
        alt=""
        aria-hidden="true"
        width="24"
        height="24"
      />`
    : '';
}
export function inksHTML(inks) {
  return inks
    .filter((ink) => INKS[ink])
    .map((ink) => /* HTML */ `<span class="ink-dot">${inkIcon(ink)}${INKS[ink][0]}</span>`)
    .join('');
}
export function colors(deck) {
  return `--c1:${INKS[deck.inks[0]]?.[1] || '#615375'}77;--c2:${INKS[deck.inks[1]]?.[1] || '#353242'}55`;
}
export function inkOptions(selected, target = 'deck') {
  return /* HTML */ `<div class="ink-options">
    ${Object.entries(INKS)
      .map(
        ([ink, [name, color]]) =>
          /* HTML */ ` <button
            type="button"
            class="ink-option ${selected.includes(ink) ? 'selected' : ''}"
            style="--ink:${color}"
            data-ink="${ink}"
            data-ink-target="${esc(target)}"
            aria-pressed="${selected.includes(ink)}"
          >
            ${inkIcon(ink)}${name}
          </button>`,
      )
      .join('')}
  </div>`;
}
export function selectOptions(values, selected, empty) {
  return (
    (empty ? /* HTML */ `<option value="">${esc(empty)}</option>` : '') +
    values
      .map(
        ([value, label]) =>
          /* HTML */ `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>
            ${esc(label)}
          </option>`,
      )
      .join('')
  );
}
