export function setupEventListeners({
  getElementById,
  settingsMapping,
  ensureActionButtons,
  markAsModified,
  openAddKeyModal,
  onSave,
  onReset,
}) {
  const saveButton = getElementById('save-keys');
  const resetButton = getElementById('reset-keys');
  const addButton = getElementById('add-api-key');

  if (saveButton && !saveButton._settingsSaveBound) {
    saveButton.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await onSave();
      } catch (error) {
        console.error('Settings: Error in save button handler:', error);
      }
    });
    saveButton._settingsSaveBound = true;
  }

  if (resetButton && !resetButton._settingsResetBound) {
    resetButton.addEventListener('click', (e) => {
      e.preventDefault();
      onReset();
    });
    resetButton._settingsResetBound = true;
  }

  Object.entries(settingsMapping).forEach(([inputId, keyName]) => {
    const input = getElementById(inputId);
    if (!input) return;
    const parent = input.closest('.api-key-item') || input.parentElement;
    if (parent) {
      parent.dataset.keyName = keyName;
      ensureActionButtons(parent, input);
    }
    if (!input._settingsTracked) {
      input.addEventListener('input', () => markAsModified());
      input._settingsTracked = true;
    }
  });

  const inputs = document.querySelectorAll('.api-key-input');
  inputs.forEach((input) => {
    if (!input._settingsTracked) {
      input.addEventListener('input', () => markAsModified());
      input._settingsTracked = true;
    }
  });

  if (addButton && !addButton._settingsAddBound) {
    addButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        openAddKeyModal();
      } catch (error) {
        console.error('Error opening add key modal:', error);
      }
    }, true); 
    
    addButton._settingsAddBound = true;
  }
}


