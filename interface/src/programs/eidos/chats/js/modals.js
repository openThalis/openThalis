// Simple modal utilities for Chats program

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'chats-modal-overlay';
  return overlay;
}

function buildModal({ title, bodyHtml, confirmText = 'Confirm', cancelText = 'Cancel' }) {
  const overlay = createOverlay();
  overlay.innerHTML = `
    <div class="chats-modal">
      <div class="modal-header"><h3>${title}</h3></div>
      <div class="modal-body">${bodyHtml}<div class="modal-error" style="display:none"></div></div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">${cancelText}</button>
        <button class="btn btn-primary modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;
  return overlay;
}

export function openConfirmModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const overlay = buildModal({ title, bodyHtml: `<p>${message || ''}</p>`, confirmText, cancelText });
    const close = () => { try { document.body.removeChild(overlay); } catch {} };
    overlay.querySelector('.modal-cancel')?.addEventListener('click', () => { close(); resolve(false); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { close(); resolve(false); } });
    overlay.querySelector('.modal-confirm')?.addEventListener('click', () => { close(); resolve(true); });
    document.body.appendChild(overlay);
    // Focus the confirm button for quick action
    setTimeout(() => overlay.querySelector('.modal-confirm')?.focus(), 0);
  });
}

export function openPromptModal({ title, message = '', placeholder = '', initialValue = '', confirmText = 'Save', cancelText = 'Cancel', validate } = {}) {
  return new Promise((resolve) => {
    const bodyHtml = `
      ${message ? `<p>${message}</p>` : ''}
      <input type="text" class="chats-modal-input" placeholder="${placeholder}" value="${initialValue?.replace(/"/g, '&quot;') || ''}" />
    `;
    const overlay = buildModal({ title, bodyHtml, confirmText, cancelText });
    const input = overlay.querySelector('.chats-modal-input');
    const errorEl = overlay.querySelector('.modal-error');
    const close = () => { try { document.body.removeChild(overlay); } catch {} };

    const submit = () => {
      const value = (input?.value || '').trim();
      if (validate) {
        const error = validate(value);
        if (error) {
          if (errorEl) {
            errorEl.textContent = error;
            errorEl.style.display = 'block';
          }
          return;
        }
      }
      close();
      resolve(value || null);
    };

    overlay.querySelector('.modal-cancel')?.addEventListener('click', () => { close(); resolve(null); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { close(); resolve(null); } });
    overlay.querySelector('.modal-confirm')?.addEventListener('click', submit);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

    document.body.appendChild(overlay);
    setTimeout(() => input?.focus(), 0);
  });
}


