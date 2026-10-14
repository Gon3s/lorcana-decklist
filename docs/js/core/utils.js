/** Project typography policy: only the ASCII hyphen is allowed. */
export function cleanText(value) {
  return String(value ?? '').replace(/[\u2013\u2014]/g, '-');
}
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'");
}
export function safeURL(value) {
  if (typeof value !== 'string') return '';
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=\s]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
export function quantity(value) {
  return Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));
}
export function uid() {
  return globalThis.crypto.randomUUID();
}
export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Non renseignée' : date.toLocaleDateString('fr-FR');
}
