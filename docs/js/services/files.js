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
