import { downloadBlob } from '../services/files.js';
import { openDialog } from './dialog.js';
import { esc } from './html.js';

export function openShareImageDialog(blob, filename) {
  const url = URL.createObjectURL(blob);
  const file =
    typeof File === 'function' ? new File([blob], filename, { type: 'image/png' }) : null;
  const canShare = Boolean(file && navigator.share && navigator.canShare?.({ files: [file] }));
  const dialog = openDialog(
    /* HTML */ `<div class="share-image-heading">
        <div class="eyebrow">IMAGE À PARTAGER</div>
        <h2>Votre deck est prêt.</h2>
        <p>Téléchargez le PNG ou partagez-le directement depuis votre appareil.</p>
      </div>
      <img class="share-image-preview" src="${esc(url)}" alt="Aperçu de l’image du deck" />
      <p class="share-image-status muted" role="status"></p>
      <div class="actions share-image-actions">
        <button class="btn" type="button" data-download-share-image>Télécharger le PNG</button>
        ${canShare ? '<button class="btn primary" type="button" data-native-share-image>Partager</button>' : ''}
      </div>`,
    'share-image-dialog',
  );
  dialog.querySelector('[data-download-share-image]').onclick = () => downloadBlob(blob, filename);
  const shareButton = dialog.querySelector('[data-native-share-image]');
  if (shareButton)
    shareButton.onclick = async () => {
      try {
        await navigator.share({ files: [file], title: 'Mon deck Lorcana - Grimoire' });
      } catch (error) {
        if (error.name !== 'AbortError')
          dialog.querySelector('.share-image-status').textContent =
            'Partage impossible. Vous pouvez télécharger le PNG.';
      }
    };
  dialog.addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
  return dialog;
}
