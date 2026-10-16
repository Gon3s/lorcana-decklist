import { INKS } from '../core/constants.js';
import { cleanText, normalize } from '../core/utils.js';

export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1350;

function loadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
}

function drawCover(context, image, width, height) {
  if (!image) return;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(
    image,
    (image.naturalWidth - sourceWidth) / 2,
    (image.naturalHeight - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  );
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function fittedText(context, value, maxWidth, forceEllipsis = false) {
  const text = cleanText(value);
  if (!forceEllipsis && context.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && context.measureText(result + '…').width > maxWidth)
    result = result.slice(0, -1);
  return result.trimEnd() + '…';
}

function wrapText(context, value, maxWidth, maxLines = 2) {
  const words = cleanText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const [index, word] of words.entries()) {
    const candidate = line ? line + ' ' + word : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      if (lines.length === maxLines - 1) {
        lines.push(fittedText(context, [line, ...words.slice(index)].join(' '), maxWidth, true));
        return lines;
      }
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawLabel(context, label, x, y) {
  context.fillStyle = '#d8b774';
  context.font = '700 22px "DM Sans", Arial, sans-serif';
  context.letterSpacing = '2px';
  context.fillText(label.toUpperCase(), x, y);
  context.letterSpacing = '0px';
}

function drawDeckRows(context, cards, x, y, width) {
  const visible = cards.slice(0, 20);
  const columns = 2;
  const rows = Math.ceil(visible.length / columns);
  const columnWidth = width / columns;
  const rowHeight = 54;
  visible.forEach((card, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    const rowX = x + column * columnWidth;
    const rowY = y + row * rowHeight;
    context.fillStyle = '#e9cb8b';
    context.font = '800 25px "DM Sans", Arial, sans-serif';
    context.fillText(String(card.qty) + '×', rowX, rowY);
    context.fillStyle = '#f1f3fa';
    context.font = '600 24px "DM Sans", Arial, sans-serif';
    context.fillText(fittedText(context, card.name, columnWidth - 75), rowX + 58, rowY);
  });
  if (cards.length > visible.length) {
    context.fillStyle = '#9eabc6';
    context.font = '500 22px "DM Sans", Arial, sans-serif';
    context.fillText(
      '+' + (cards.length - visible.length) + ' autres cartes',
      x,
      y + rows * rowHeight,
    );
  }
}

function drawHighlights(context, title, cards, x, y, width) {
  roundedRect(context, x, y, width, 142, 12);
  context.fillStyle = '#101d38e8';
  context.fill();
  context.strokeStyle = '#64789a';
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = '#d8b774';
  context.font = '700 21px "DM Sans", Arial, sans-serif';
  context.fillText(title.toUpperCase(), x + 24, y + 34);
  context.fillStyle = '#eef1f8';
  context.font = '600 22px "DM Sans", Arial, sans-serif';
  const names = cards.length ? cards.slice(0, 3).map((card) => card.name) : ['À compléter'];
  names.forEach((name, index) => {
    context.fillText(fittedText(context, name, width - 48), x + 24, y + 70 + index * 28);
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("L'image n'a pas pu être générée."))),
      'image/png',
    );
  });
}

export function shareImageFilename(deck) {
  const slug = normalize(deck?.name || 'deck-lorcana')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug + '-grimoire.png';
}

export async function createShareImage(deck) {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_IMAGE_WIDTH;
  canvas.height = SHARE_IMAGE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error("La création d'image n'est pas disponible dans ce navigateur.");

  const inkIds = (deck.inks || []).filter((ink) => INKS[ink]);
  const [background, logo, ...inkImages] = await Promise.all([
    loadImage('assets/nebula.jpg'),
    loadImage('assets/grimoire-logo.png'),
    ...inkIds.map((ink) => loadImage('assets/inks/' + ink + '.png')),
  ]);

  context.fillStyle = '#070d1f';
  context.fillRect(0, 0, SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT);
  drawCover(context, background, SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT);
  const veil = context.createLinearGradient(0, 0, 0, SHARE_IMAGE_HEIGHT);
  veil.addColorStop(0, '#071022d9');
  veil.addColorStop(0.48, '#09132af2');
  veil.addColorStop(1, '#050a18fa');
  context.fillStyle = veil;
  context.fillRect(0, 0, SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT);

  context.strokeStyle = '#d8b774';
  context.lineWidth = 3;
  context.strokeRect(34, 34, SHARE_IMAGE_WIDTH - 68, SHARE_IMAGE_HEIGHT - 68);
  if (logo) context.drawImage(logo, 68, 62, 92, 92);
  context.fillStyle = '#f4e5c2';
  context.font = '600 31px Cinzel, Georgia, serif';
  context.fillText('GRIMOIRE', 180, 103);
  context.fillStyle = '#a8b4cb';
  context.font = '600 20px "DM Sans", Arial, sans-serif';
  context.fillText('LE REPAIRE DES ILLUMINEURS', 180, 135);

  context.fillStyle = '#f4e6c8';
  context.font = '600 58px Cinzel, Georgia, serif';
  const titleLines = wrapText(context, deck.name || 'Deck sans nom', 830, 2);
  titleLines.forEach((line, index) => context.fillText(line, 68, 224 + index * 66));
  const metaY = 260 + titleLines.length * 66;

  inkImages.forEach((image, index) => {
    if (image) context.drawImage(image, 68 + index * 58, metaY - 33, 42, 42);
  });
  context.fillStyle = '#c3ccdc';
  context.font = '500 23px "DM Sans", Arial, sans-serif';
  const inkNames = inkIds.map((ink) => INKS[ink][0]).join(' + ');
  const meta = [inkNames, deck.archetype, deck.format].filter(Boolean).join('  ·  ');
  const metaX = 68 + inkImages.length * 58;
  context.fillText(fittedText(context, meta, 805 - metaX), metaX, metaY - 4);
  context.fillStyle = '#d8b774';
  context.font = '700 24px "DM Sans", Arial, sans-serif';
  const total = (deck.decklist || []).reduce((sum, card) => sum + card.qty, 0);
  context.textAlign = 'right';
  context.fillText(total + ' CARTES', 1012, metaY - 4);
  context.textAlign = 'left';

  const decklistY = metaY + 70;
  drawLabel(context, 'Decklist', 68, decklistY);
  context.strokeStyle = '#546783';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(68, decklistY + 18);
  context.lineTo(1012, decklistY + 18);
  context.stroke();
  drawDeckRows(context, deck.decklist || [], 68, decklistY + 65, 944);

  const highlightY = 1088;
  drawHighlights(context, 'Cartes clés', deck.keys || [], 68, highlightY, 456);
  drawHighlights(context, 'Core du deck', deck.core || [], 556, highlightY, 456);

  context.fillStyle = '#98a7c0';
  context.font = '500 20px "DM Sans", Arial, sans-serif';
  context.fillText(
    [deck.author, deck.version ? 'v' + deck.version : ''].filter(Boolean).join('  ·  '),
    68,
    1292,
  );
  context.textAlign = 'right';
  context.fillStyle = '#d8b774';
  context.font = '600 20px "DM Sans", Arial, sans-serif';
  context.fillText('GRIMOIRE / LORCANA', 1012, 1292);
  context.textAlign = 'left';

  return canvasBlob(canvas);
}
