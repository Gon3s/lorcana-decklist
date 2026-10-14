import { esc } from './html.js';

export function openDialog(content, className = '') {
  const dialog = document.createElement('dialog');
  dialog.className = 'app-dialog ' + className;
  dialog.innerHTML = `<button type="button" class="btn small dialog-close" data-close-dialog aria-label="Fermer">Fermer ×</button>${content}`;
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-dialog]')) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

export function confirmAction(title, message, button = 'Confirmer') {
  return new Promise((resolve) => {
    const dialog = openDialog(
      `<h2>${esc(title)}</h2><p>${esc(message)}</p><div class="actions"><button class="btn" data-close-dialog>Annuler</button><button class="btn primary" id="confirm-action">${esc(button)}</button></div>`,
    );
    dialog.querySelector('#confirm-action').onclick = () => {
      resolve(true);
      dialog.close();
    };
    dialog.addEventListener('close', () => resolve(false), { once: true });
  });
}
