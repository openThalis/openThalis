import globalAuth from '/src/scaffold/shared/instance/js/globalAuth.js';
import { testHttpClientConfig, fetchSettings, fetchSettingsList, updateSettings, resetAllSettings, deleteAgentKey } from './api.js';
import { showError as showErrorUi, showSuccess as showSuccessUi } from './ui.js';
import { appendAgentItem as appendAgentItemDom } from './dom.js';
import { populateForm as populateFormUtil, getFormData as getFormDataUtil } from './form.js';
import { createConfirmationModal, openAddAgentModal as openAddAgentModalUtil } from './modals.js';
import { setupEventListeners as setupEventListenersUtil } from './events.js';

class EidoManager {
  constructor(container = null) {
    this.keyMapping = {
      // Session
      'operatorName': 'OPERATOR_NAME',
      'purpose': 'PURPOSE',
      // Provider
      'providerName': 'PROVIDER_NAME',
      'modelName': 'MODEL_NAME',
      'modelMaxTokens': 'MODEL_MAX_TOKENS',
      'modelTemperature': 'MODEL_TEMPERATURE',
      // Agents
      'defaultAgent': 'DEFAULT_AGENT',
      // Modes
      'agentsMode': 'AGENTS_MODE',
      'awarenessMode': 'AWARENESS_MODE',
      'toolsMode': 'TOOLS_MODE',
      'localMode': 'LOCAL_MODE',
    };

    this.container = container || document;
    this.isInitialized = false;
    this.dynamicAgentItemClass = 'agent-item';
    this.agentKeyOrder = [];

    setTimeout(() => { this.init(); }, 100);
  }

  getElementById(id) {
    if (this.container && this.container !== document) {
      if (this.container.id === id) return this.container;
      return this.container.querySelector(`#${id}`);
    }
    return document.getElementById(id);
  }

  querySelectorAll(selector) {
    return this.container.querySelectorAll(selector);
  }

  async init() {
    if (this.isInitialized) return;
    try {
      await this.testHttpClientConfig();
      this.setupEventListeners();

      const authStatus = await globalAuth.checkAuthStatus();
      if (!authStatus?.authenticated) {
        this.setupRetryInit();
        return;
      }

      await this.loadSettings();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Eido:', error);
      this.showError('Failed to initialize Eido. Please refresh the page.');
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
    setTimeout(() => clearInterval(retryInterval), 30000);
  }

  setupEventListeners() {
    setupEventListenersUtil({
      getElementById: (id) => this.getElementById(id),
      markAsModified: () => this.markAsModified(),
      openAddAgentModal: () => this.openAddAgentModal(),
      onSave: () => this.saveSettings(),
      onReset: () => this.resetSettings(),
    });
  }

  populateForm(settings) {
    populateFormUtil({
      keyMapping: this.keyMapping,
      getElementById: (id) => this.getElementById(id),
      dynamicAgentItemClass: this.dynamicAgentItemClass,
      appendAgentItem: ({ listEl, keyName, value }) => this.appendAgentItem(listEl, keyName, value),
      clearModifiedState: () => this.clearModifiedState(),
    }, settings || {});

    const selectedDefault = (settings || {})[this.keyMapping['defaultAgent']] || '';
    this.refreshDefaultAgentOptions(selectedDefault);
  }

  getFormData() {
    return getFormDataUtil({
      keyMapping: this.keyMapping,
      getElementById: (id) => this.getElementById(id),
      dynamicAgentItemClass: this.dynamicAgentItemClass,
    });
  }

  async loadSettings() {
    try {
      const settings = await fetchSettings();
      const agents = (settings && settings['agents'] && typeof settings['agents'] === 'object') ? settings['agents'] : {};
      this.agentKeyOrder = Object.keys(agents);
      this.populateForm(settings);
    } catch (error) {
      console.error('Eido: Error loading settings:', error);
      this.showError('Failed to load eido configuration. Using defaults.');
    }
  }

  async saveSettings() {
    const form = this.getElementById('configForm');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
      }
      const settings = this.getFormData();
      await updateSettings(settings);
      this.showSuccess('Configuration saved');
      await this.loadSettings();
    } catch (error) {
      console.error('Eido: Error saving settings:', error);
      this.showError(`Failed to save: ${error.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save';
      }
    }
  }

  async resetSettings() {
    const resetButton = this.getElementById('resetBtn');
    const originalText = resetButton?.textContent || 'Reset';

    try {
      if (resetButton) { resetButton.disabled = true; resetButton.textContent = 'Resetting...'; }

      const confirmed = await this.showResetConfirmation();
      if (!confirmed) {
        if (resetButton) {
          resetButton.disabled = false;
          resetButton.textContent = originalText;
        }
        return;
      }

      await resetAllSettings();

      const defaultSettings = await this.loadDefaultSettingsAfterReset();
      this.populateForm(defaultSettings);

      await updateSettings(defaultSettings);
      this.clearModifiedState();
      this.showSuccess('Configuration reset successfully!');
    } catch (error) {
      console.error('Eido: Error resetting settings:', error);
      this.showError('Failed to reset configuration');
    } finally {
      if (resetButton) { resetButton.disabled = false; resetButton.textContent = originalText; }
    }
  }

  async showResetConfirmation() {
    const { createConfirmationModal } = await import('./modals.js');

    return new Promise((resolve) => {
      const modal = createConfirmationModal(
        'Reset Eido',
        'Are you sure you want to reset all Eido configuration? This will clear all your current settings and restore default agent and model configuration from environment variables.',
        async () => {
          resolve(true);
        }
      );
      document.body.appendChild(modal);

      modal.querySelector('.modal-cancel')?.addEventListener('click', () => {
        resolve(false);
      });


      document.addEventListener('keydown', function handleEscape(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', handleEscape);
          resolve(false);
        }
      });
    });
  }

  async loadDefaultSettingsAfterReset() {
    const settings = {};
    
    try {
      const defaultAgentConfig = await this.loadDefaultAgentConfig();
      if (defaultAgentConfig && defaultAgentConfig.name && defaultAgentConfig.prompt) {
        settings['agents'] = {
          [defaultAgentConfig.name]: defaultAgentConfig.prompt
        };
        settings['DEFAULT_AGENT'] = defaultAgentConfig.name;
      }

      const modelConfig = await this.loadModelConfig();
      if (modelConfig) {
        settings['MODEL_TEMPERATURE'] = modelConfig.temperature.toString();
        settings['MODEL_MAX_TOKENS'] = modelConfig.maxTokens.toString();
      }
    } catch (error) {
      console.warn('Failed to load default settings after reset:', error);
    }

    return settings;
  }

  async loadConfigJs() {
    return new Promise((resolve) => {
      try {
        const existing = document.querySelector('script[data-thalis-config]');
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = '/config.js';
        script.async = true;
        script.setAttribute('data-thalis-config', 'true');
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);

        setTimeout(() => resolve(), 3000);
      } catch {
        resolve();
      }
    });
  }

  async loadDefaultAgentConfig() {
    try {
      if (window.__DEFAULT_AGENT_NAME__ && window.__DEFAULT_SYSTEM_PROMPT__) {
        return {
          name: window.__DEFAULT_AGENT_NAME__,
          prompt: window.__DEFAULT_SYSTEM_PROMPT__
        };
      }

      await this.loadConfigJs();
      if (window.__DEFAULT_AGENT_NAME__ && window.__DEFAULT_SYSTEM_PROMPT__) {
        return {
          name: window.__DEFAULT_AGENT_NAME__,
          prompt: window.__DEFAULT_SYSTEM_PROMPT__
        };
      }

      try {
        await globalAuth.initialize();
        let baseUrl = globalAuth.apiBaseUrl;
        if (baseUrl && baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1);
        }

        const response = await fetch(`${baseUrl}/api/config`);
        if (response.ok) {
          const config = await response.json();
          if (config.DEFAULT_AGENT_NAME && config.DEFAULT_SYSTEM_PROMPT) {
            return {
              name: config.DEFAULT_AGENT_NAME,
              prompt: config.DEFAULT_SYSTEM_PROMPT
            };
          }
        }
      } catch (configError) {
        console.warn('Could not load default agent config from API:', configError);
      }

      return null;
    } catch (error) {
      console.warn('Failed to load default agent configuration:', error);
      return null;
    }
  }

  async loadModelConfig() {
    try {
      if (window.__MODEL_MAX_TOKENS__ !== undefined && window.__MODEL_TEMPERATURE__ !== undefined) {
        return {
          maxTokens: parseInt(window.__MODEL_MAX_TOKENS__, 10),
          temperature: parseFloat(window.__MODEL_TEMPERATURE__)
        };
      }

      await this.loadConfigJs();
      if (window.__MODEL_MAX_TOKENS__ !== undefined && window.__MODEL_TEMPERATURE__ !== undefined) {
        return {
          maxTokens: parseInt(window.__MODEL_MAX_TOKENS__, 10),
          temperature: parseFloat(window.__MODEL_TEMPERATURE__)
        };
      }

      try {
        await globalAuth.initialize();
        let baseUrl = globalAuth.apiBaseUrl;
        if (baseUrl && baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1);
        }

        const response = await fetch(`${baseUrl}/api/config`);
        if (response.ok) {
          const config = await response.json();
          if (config.MODEL_MAX_TOKENS !== undefined && config.MODEL_TEMPERATURE !== undefined) {
            return {
              maxTokens: parseInt(config.MODEL_MAX_TOKENS, 10),
              temperature: parseFloat(config.MODEL_TEMPERATURE)
            };
          }
        }
      } catch (configError) {
        console.warn('Could not load model config from API:', configError);
      }

      throw new Error('MODEL_MAX_TOKENS and MODEL_TEMPERATURE must be defined in environment variables');
    } catch (error) {
      console.error('Failed to load model configuration:', error);
      throw error;
    }
  }

  markAsModified() {
    const form = this.getElementById('configForm');
    if (!form) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.classList.add('modified');
  }

  clearModifiedState() {
    const form = this.getElementById('configForm');
    if (!form) return;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.classList.remove('modified');
  }

  showSuccess(message) { showSuccessUi(message); }
  showError(message) { showErrorUi(message); }

  appendAgentItem(listEl, keyName, value) {
    return appendAgentItemDom({
      listEl,
      keyName,
      value,
      dynamicItemClass: this.dynamicAgentItemClass,
      onDelete: (itemEl) => this.confirmDeleteAgentItem(itemEl),
      markAsModified: () => this.markAsModified(),
    });
  }

  confirmDeleteAgentItem(itemEl) {
    const nameInput = itemEl?.querySelector('input.agent-name-input');
    const keyName = nameInput?.value || '';
    if (!keyName) return;
    const modal = createConfirmationModal('Delete Agent', `Are you sure you want to delete '${keyName}'?`, async () => {
      try {
        await deleteAgentKey(keyName);
        itemEl.remove();
        this.showSuccess('Agent deleted');
        this.markAsModified();
        this.refreshDefaultAgentOptions();
      } catch (err) {
        console.error('Eido: Delete agent error:', err);
        this.showError(`Failed to delete: ${err.message}`);
      }
    });
    document.body.appendChild(modal);
  }

  openAddAgentModal() {
    openAddAgentModalUtil({
      getElementById: (id) => this.getElementById(id),
      keyMapping: this.keyMapping,
      dynamicAgentItemClass: this.dynamicAgentItemClass,
      appendAgentItem: (listEl, keyName, value) => this.appendAgentItem(listEl, keyName, value),
      markAsModified: () => this.markAsModified(),
      onAdded: (newKey) => {
        const selectEl = this.getElementById('defaultAgent');
        const desired = selectEl?.value || '';
        const nextSelection = desired || newKey;
        this.refreshDefaultAgentOptions(nextSelection);
      },
    });
  }



  refreshDefaultAgentOptions(selectedValue = null) {
    const selectEl = this.getElementById('defaultAgent');
    const list = this.getElementById('agentsList');
    if (!selectEl) return;

    const agentKeys = [];
    if (list) {
      list
        .querySelectorAll(`.${this.dynamicAgentItemClass}`)
        .forEach((item) => {
          const nameInput = item.querySelector('input.agent-name-input');
          const key = nameInput?.value || '';
          if (key) agentKeys.push(key);
        });
    }

    const previous = selectEl.value || '';
    const desiredSelection = selectedValue !== null ? selectedValue : previous;

    selectEl.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select default agent';
    selectEl.appendChild(placeholder);

    agentKeys.forEach((key) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      selectEl.appendChild(opt);
    });

    if (desiredSelection && agentKeys.includes(desiredSelection)) {
      selectEl.value = desiredSelection;
    } else if (agentKeys.length > 0) {
      selectEl.value = agentKeys[0];
      this.markAsModified();
    } else {
      selectEl.value = '';
    }
  }
}

export default EidoManager;
export function createEidoManager() { return new EidoManager(); }


