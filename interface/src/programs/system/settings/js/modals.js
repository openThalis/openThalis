import { renameSettingKey } from './api.js';

export function createConfirmationModal(title, message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'confirmation-modal-overlay';
  modal.innerHTML = `
    <div class="confirmation-modal">
      <div class="modal-header">
        <h3>${title}</h3>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-danger modal-confirm">Confirm</button>
      </div>
    </div>
  `;

  const cancelBtn = modal.querySelector('.modal-cancel');
  const confirmBtn = modal.querySelector('.modal-confirm');

  let isClosed = false;
  const closeModal = () => {
    if (isClosed) return;
    isClosed = true;
    modal.classList.remove('show');
    setTimeout(() => {
      if (modal && modal.parentNode) {
        try {
          document.body.removeChild(modal);
        } catch {}
      }
      document.removeEventListener('keydown', handleEscape);
      modal.removeEventListener('click', overlayClickHandler);
    }, 300);
  };

  cancelBtn.addEventListener('click', closeModal);

  confirmBtn.addEventListener('click', async () => {
    try {
      await onConfirm();
    } finally {
      closeModal();
    }
  });

  const overlayClickHandler = (e) => {
    if (e.target === modal) closeModal();
  };
  modal.addEventListener('click', overlayClickHandler);

  const handleEscape = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEscape);

  setTimeout(() => modal.classList.add('show'), 10);
  
  return modal;
}

export function openAddKeyModal({ getElementById, appendDynamicItem, markAsModified }) {
  const modal = document.createElement('div');
  modal.className = 'confirmation-modal-overlay';
  modal.innerHTML = `
    <div class="confirmation-modal">
      <div class="modal-header">
        <h3>Add API Key</h3>
      </div>
      <div class="modal-body">
        <p>Enter a key name (e.g., MY_VENDOR_API_KEY)</p>
        <input type="text" class="api-key-input" id="new-key-name-input" placeholder="MY_VENDOR_API_KEY" style="width:100%; margin-top:10px;" />
        <div class="modal-error" id="new-key-name-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary modal-confirm">Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  

  setTimeout(() => modal.classList.add('show'), 10);

  const inputEl = modal.querySelector('#new-key-name-input');
  const errorEl = modal.querySelector('#new-key-name-error');
  const cancelBtn = modal.querySelector('.modal-cancel');
  const confirmBtn = modal.querySelector('.modal-confirm');

  let isClosed = false;
  const closeModal = () => {
    if (isClosed) return;
    isClosed = true;
    modal.classList.remove('show');
    setTimeout(() => {
      try {
        document.body.removeChild(modal);
      } catch {}
      document.removeEventListener('keydown', handleEscape);
    }, 300);
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEscape);

  const submit = () => {
    let keyName = (inputEl.value || '').trim();
    if (!keyName) {
      errorEl.textContent = 'Key name is required';
      errorEl.style.display = 'block';
      return;
    }
    keyName = keyName.replace(/\s+/g, '_').replace(/-/g, '_').toUpperCase();
    if (keyName === 'LOCAL_PATH') {
      errorEl.textContent = 'This key name is reserved';
      errorEl.style.display = 'block';
      return;
    }
    const form = getElementById('api-keys-form');
    if (!form) return;
    const existing = form.querySelector(`.api-key-item[data-key-name="${keyName}"]`);
    if (existing) {
      errorEl.textContent = 'An item with this key name already exists';
      errorEl.style.display = 'block';
      return;
    }
    const item = appendDynamicItem(form, keyName, '');
    const input = item.querySelector('input.api-key-input');
    if (input) input.focus();
    markAsModified();
    closeModal();
  };

  confirmBtn.addEventListener('click', submit);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  setTimeout(() => inputEl.focus(), 0);
}

export function openRenameKeyModal({ showSuccess, markAsModified }, itemEl) {
  const currentKeyName = itemEl?.dataset?.keyName;
  if (!currentKeyName || currentKeyName === 'LOCAL_PATH') return;

  const modal = document.createElement('div');
  modal.className = 'confirmation-modal-overlay';
  modal.innerHTML = `
    <div class="confirmation-modal">
      <div class="modal-header">
        <h3>Rename API Key</h3>
      </div>
      <div class="modal-body">
        <p>Current: ${currentKeyName}</p>
        <input type="text" class="api-key-input" id="rename-key-input" placeholder="NEW_KEY_NAME" style="width:100%; margin-top:10px;" />
        <div class="modal-error" id="rename-key-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary modal-confirm">Rename</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  setTimeout(() => modal.classList.add('show'), 10);

  const inputEl = modal.querySelector('#rename-key-input');
  const errorEl = modal.querySelector('#rename-key-error');
  const cancelBtn = modal.querySelector('.modal-cancel');
  const confirmBtn = modal.querySelector('.modal-confirm');

  let isClosed = false;
  const closeModal = () => {
    if (isClosed) return;
    isClosed = true;
    modal.classList.remove('show');
    setTimeout(() => {
      try {
        document.body.removeChild(modal);
      } catch {}
      document.removeEventListener('keydown', handleEscape);
    }, 300);
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEscape);

  const submit = async () => {
    let newKey = (inputEl.value || '').trim();
    if (!newKey) {
      errorEl.textContent = 'New key name is required';
      errorEl.style.display = 'block';
      return;
    }
    newKey = newKey.replace(/\s+/g, '_').replace(/-/g, '_').toUpperCase();
    if (newKey === 'LOCAL_PATH') {
      errorEl.textContent = 'This key name is reserved';
      errorEl.style.display = 'block';
      return;
    }

    try {
      await renameSettingKey(currentKeyName, newKey);
      itemEl.dataset.keyName = newKey;
      const label = itemEl.querySelector('.api-key-label');
      if (label) label.textContent = newKey;
      markAsModified();
      showSuccess('Renamed successfully');
      closeModal();
    } catch (err) {
      console.error('Rename error:', err);
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  };

  confirmBtn.addEventListener('click', submit);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  setTimeout(() => inputEl.focus(), 0);
}


