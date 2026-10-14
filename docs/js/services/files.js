export function downloadText(text, filename, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readJSONFile(file, maxBytes = 20 * 1024 * 1024) {
  if (!file || file.size > maxBytes)
    throw new Error(
      'Choisissez un fichier JSON de moins de ' + Math.round(maxBytes / 1024 / 1024) + ' Mo.',
    );
  return JSON.parse(await file.text());
}
export async function readDeckImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file?.type))
    throw new Error('Choisissez une image PNG, JPG ou WebP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('L’image dépasse 10 Mo.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.88);
  } finally {
    bitmap.close();
  }
}
