

export function createConfirmationModal(title, message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'confirmation-modal-overlay';
  modal.innerHTML = `
    <div class="confirmation-modal">
      <div class="modal-header"><h3>${title}</h3></div>
      <div class="modal-body"><p>${message}</p><div class="modal-error" style="display:none"></div></div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-danger modal-confirm">Confirm</button>
      </div>
    </div>`;

  const close = () => { 
    modal.classList.remove('show');
    setTimeout(() => {
      try { document.body.removeChild(modal); } catch {}
    }, 300);
  };
  modal.querySelector('.modal-cancel')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('.modal-confirm')?.addEventListener('click', async () => {
    try { await onConfirm?.(); } finally { close(); }
  });
  
  setTimeout(() => modal.classList.add('show'), 10);
  
  return modal;
}

export function openAddAgentModal({ getElementById, keyMapping, dynamicAgentItemClass, appendAgentItem, markAsModified, onAdded }) {
  const modal = document.createElement('div');
  modal.className = 'confirmation-modal-overlay';
  modal.innerHTML = `
    <div class="confirmation-modal">
      <div class="modal-header"><h3>Add Agent</h3></div>
      <div class="modal-body">
        <p>Enter a unique agent name. (It will be saved in lowercase.)</p>
        <input type="text" class="api-key-input" id="new-agent-key-input" placeholder="my_agent" style="width:100%; margin-top:10px;" />
        <div class="modal-error" id="new-agent-key-error" style="display:none"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-cancel">Cancel</button>
        <button class="btn btn-primary modal-confirm">Add</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  
  setTimeout(() => modal.classList.add('show'), 10);

  const inputEl = modal.querySelector('#new-agent-key-input');
  const errorEl = modal.querySelector('#new-agent-key-error');
  const close = () => { 
    modal.classList.remove('show');
    setTimeout(() => {
      try { document.body.removeChild(modal); } catch {}
    }, 300);
  };

  modal.querySelector('.modal-cancel')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  const submit = () => {
    let keyName = (inputEl.value || '').trim();
    if (!keyName) {
      errorEl.textContent = 'Key name is required';
      errorEl.style.display = 'block';
      return;
    }
    keyName = keyName.replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase();
    const reserved = new Set(Object.values(keyMapping).map((k) => k.toLowerCase()));
    if (reserved.has(keyName)) {
      errorEl.textContent = 'This name is reserved';
      errorEl.style.display = 'block';
      return;
    }
          const list = getElementById('agentsList');
      if (!list) return;
      const agentItems = list.querySelectorAll(`.${dynamicAgentItemClass}`);
      let exists = false;
      agentItems.forEach((item) => {
        const nameInput = item.querySelector('input.agent-name-input');
        if (nameInput?.value === keyName) {
          exists = true;
        }
      });
      if (exists) {
        errorEl.textContent = 'An agent with this key name already exists';
        errorEl.style.display = 'block';
        return;
      }
    const item = appendAgentItem(list, keyName, '');
    item.querySelector('textarea.agent-textarea')?.focus();
    markAsModified();
    try { onAdded?.(keyName); } catch {}
    close();
  };

  modal.querySelector('.modal-confirm')?.addEventListener('click', submit);
  inputEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  setTimeout(() => inputEl?.focus(), 0);
}




