import globalAuth from '/src/scaffold/shared/instance/js/globalAuth.js';
import { testHttpClientConfig, fetchSettings, updateSettings, resetAllSettings, deleteSettingItem } from './api.js';
import { showError as showErrorUi, showSuccess as showSuccessUi } from './ui.js';
import { ensureActionButtons as ensureActionButtonsDom, appendDynamicItem as appendDynamicItemDom } from './dom.js';
import { populateForm as populateFormUtil, getFormData as getFormDataUtil } from './form.js';
import { createConfirmationModal, openAddKeyModal as openAddKeyModalUtil, openRenameKeyModal as openRenameKeyModalUtil } from './modals.js';
import { setupEventListeners as setupEventListenersUtil } from './events.js';

class SettingsManager {
  constructor(container = null) {
    this.settingsMapping = {
      'local-path': 'LOCAL_PATH',
    };

    this.container = container || document;
    this.isInitialized = false;
    this.dynamicItemClass = 'dynamic-api-key-item';
    this._initCalled = false;

    setTimeout(() => {
      if (!this._initCalled) {
        this._initCalled = true;
        this.init();
      }
    }, 100);
  }

  getElementById(id) {
    if (this.container === document) {
      return document.getElementById(id);
    }
    return this.container.querySelector(`#${id}`);
  }

  querySelectorAll(selector) {
    return this.container.querySelectorAll(selector);
  }

  async init() {
    if (this.isInitialized) {
      console.log('SettingsManager already initialized');
      return;
    }
    if (this._initializing) {
      console.log('SettingsManager initialization already in progress');
      return;
    }
    
    this._initializing = true;
    try {
      this.setupEventListeners();

      await this.testHttpClientConfig();
      const authStatus = await globalAuth.checkAuthStatus();
      
      if (!authStatus?.authenticated) {
        this.setupRetryInit();
        this._initializing = false;
        return;
      }

      await this.loadSettings();
      this.isInitialized = true;
    } catch (error) {
      console.error('SettingsManager: Failed to initialize:', error);
      this.showError('Failed to initialize settings. Please refresh the page.');
    } finally {
      this._initializing = false;
    }
  }

  async testHttpClientConfig() {
    await testHttpClientConfig();
  }

  setupRetryInit() {
    const retryInterval = setInterval(async () => {
      const authStatus = await globalAuth.checkAuthStatus();
      if (authStatus?.authenticated) {
        clearInterval(retryInterval);
        await this.init();
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(retryInterval);
    }, 30000);
  }

  setupEventListeners() {
    setupEventListenersUtil({
      getElementById: (id) => this.getElementById(id),
      settingsMapping: this.settingsMapping,
      ensureActionButtons: (itemEl, inputEl) => this.ensureActionButtons(itemEl, inputEl),
      markAsModified: () => this.markAsModified(),
      openAddKeyModal: () => this.openAddKeyModal(),
      onSave: () => this.saveSettings(),
      onReset: () => this.showResetConfirmation(),
    });
  }

  ensureActionButtons(itemEl, inputEl) {
    ensureActionButtonsDom(itemEl, inputEl, {
      onRename: (targetItem) => this.openRenameKeyModal(targetItem),
      onDelete: (targetItem) => this.confirmDeleteItem(targetItem),
    });
  }

  async loadSettings() {
    try {
      const settings = await fetchSettings();
      this.populateForm(settings);
    } catch (error) {
      console.error('Settings: Error loading settings:', error);
      this.showError('Failed to load settings. Using default values.');
    }
  }

  populateForm(settings) {
    populateFormUtil(
      {
        settingsMapping: this.settingsMapping,
        getElementById: (id) => this.getElementById(id),
        dynamicItemClass: this.dynamicItemClass,
        ensureActionButtons: (itemEl, inputEl) => this.ensureActionButtons(itemEl, inputEl),
        clearModifiedState: () => this.clearModifiedState(),
      },
      settings || {}
    );
  }

  getFormData() {
    return getFormDataUtil({
      settingsMapping: this.settingsMapping,
      getElementById: (id) => this.getElementById(id),
      dynamicItemClass: this.dynamicItemClass,
    });
  }

  async saveSettings() {
    try {
      const saveButton = this.getElementById('save-keys');
      if (!saveButton) throw new Error('Save button not found');

      saveButton.textContent = 'Saving...';
      saveButton.disabled = true;

      const settings = this.getFormData();
      await updateSettings(settings);

      this.showSuccess('Settings saved successfully!');
      this.clearModifiedState();
      await this.loadSettings();
    } catch (error) {
      console.error('Settings: Error saving settings:', error);
      this.showError(`Failed to save settings: ${error.message}`);
    } finally {
      const saveButton = this.getElementById('save-keys');
      if (saveButton) {
        saveButton.textContent = 'Save';
        saveButton.disabled = false;
      }
    }
  }

  openAddKeyModal() {
    openAddKeyModalUtil({
      getElementById: (id) => this.getElementById(id),
      appendDynamicItem: (form, keyName, value) =>
        this.appendDynamicItem(form, keyName, value),
      markAsModified: () => this.markAsModified(),
    });
  }

  openRenameKeyModal(itemEl) {
    openRenameKeyModalUtil({
      showSuccess: (msg) => this.showSuccess(msg),
      markAsModified: () => this.markAsModified(),
    }, itemEl);
  }

  appendDynamicItem(form, keyName, value) {
    return appendDynamicItemDom({
      form,
      keyName,
      value,
      dynamicItemClass: this.dynamicItemClass,
      ensureButtons: (itemEl, inputEl) => this.ensureActionButtons(itemEl, inputEl),
      markAsModified: () => this.markAsModified(),
    });
  }

  async confirmDeleteItem(itemEl) {
    const keyNameFromDataset = itemEl?.dataset?.keyName;
    if (!keyNameFromDataset) {
      const input = itemEl.querySelector('input.api-key-input');
      if (input) {
        const mapped = Object.entries(this.settingsMapping).find(
          ([id]) => this.getElementById(id) === input
        );
        if (mapped) itemEl.dataset.keyName = mapped[1];
      }
    }
    const resolvedKeyName = itemEl?.dataset?.keyName;
    if (!resolvedKeyName) return;

    const modal = createConfirmationModal(
      'Delete API Key',
      `Are you sure you want to delete '${resolvedKeyName}'?`,
      async () => {
        try {
          await deleteSettingItem(resolvedKeyName);
          const isDynamic = itemEl.classList.contains(this.dynamicItemClass);
          if (isDynamic) {
            itemEl.remove();
          } else {
            const input = itemEl.querySelector('input.api-key-input');
            if (input) input.value = '';
          }
          this.showSuccess('Deleted successfully');
        } catch (err) {
          console.error('Delete error:', err);
          this.showError(`Failed to delete: ${err.message}`);
        }
      }
    );
    document.body.appendChild(modal);
  }

  showResetConfirmation() {
    const modal = createConfirmationModal(
      'Reset Settings',
      'Are you sure you want to reset all settings? This action cannot be undone.',
      () => this.resetSettings()
    );
    document.body.appendChild(modal);
  }

  async resetSettings() {
    try {
      const resetButton = this.getElementById('reset-keys');
      const originalText = resetButton?.textContent || 'Reset';
      if (resetButton) {
        resetButton.textContent = 'Resetting...';
        resetButton.disabled = true;
      }

      await resetAllSettings();
      this.populateForm({});
      this.showSuccess('Settings reset successfully!');
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showError('Failed to reset settings. Please try again.');
    } finally {
      const resetButton = this.getElementById('reset-keys');
      if (resetButton) {
        resetButton.textContent = 'Reset';
        resetButton.disabled = false;
      }
    }
  }

  markAsModified() {
    const saveButton = this.getElementById('save-keys');
    if (saveButton) saveButton.classList.add('modified');
  }

  clearModifiedState() {
    const saveButton = this.getElementById('save-keys');
    if (saveButton) saveButton.classList.remove('modified');
  }

  showSuccess(message) {
    showSuccessUi(message);
  }

  showError(message) {
    showErrorUi(message);
  }
}

export default SettingsManager;

export function createSettingsManager() {
  return new SettingsManager();
}


