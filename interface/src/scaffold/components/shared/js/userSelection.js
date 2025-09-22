import globalAuth from '/src/scaffold/components/shared/js/globalAuth.js';

class UserSelection {
    constructor() {
        this.selectedEmail = null;
        this.users = [];
        this.isLoading = false;
        this.currentView = 'selection';
        this.defaultAgentConfig = null;

        this.initializeElements();
        this.bindEvents();
        this.setupStorageListener();
        this.cleanupDuplicateScripts();
    }

    initializeElements() {
        this.overlay = document.getElementById('global-login-overlay');
        this.selectionView = document.getElementById('user-selection-view');
        this.loginFormView = document.getElementById('login-form-view');
        this.userList = document.getElementById('user-selection-list');
        this.createNewButton = document.getElementById('user-selection-create-new');
        this.backButton = document.getElementById('login-form-back');
        this.loadingDiv = document.getElementById('user-selection-loading');
        this.errorDiv = document.getElementById('user-selection-error');
        this.loginForm = document.getElementById('global-login-form');
        this.instanceInput = document.getElementById('global-instance-input');
        this.loginButton = document.getElementById('global-login-button');
        this.loginErrorDiv = document.getElementById('global-login-error');
        this.loginLoadingDiv = document.getElementById('global-login-loading');
        
        this.apiKeysContainer = document.getElementById('instance-api-keys-container');
        this.addApiKeyButton = document.getElementById('instance-add-api-key');
        this.agentsContainer = document.getElementById('instance-agents-list');
        this.addAgentButton = document.getElementById('instance-add-agent');
        this.defaultAgentSelect = document.getElementById('instance-default-agent');
        this.providerSelect = document.getElementById('instance-provider-name');
        this.customProviderField = document.getElementById('custom-provider-field');
        this.customProviderInput = document.getElementById('instance-custom-provider');
        this.providerHint = document.getElementById('provider-api-keys-hint');
    }

    bindEvents() {
        this.createNewButton.addEventListener('click', async () => await this.showLoginForm());

        this.backButton.addEventListener('click', () => this.showSelectionView());
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        if (this.providerSelect) {
            this.providerSelect.addEventListener('change', () => this.toggleProviderHint());
        }

        if (this.addApiKeyButton) {
            this.addApiKeyButton.addEventListener('click', () => this.addApiKeyField());
        }

        if (this.addAgentButton) {
            this.addAgentButton.addEventListener('click', () => this.addAgentField());
        }
    }

    toggleProviderHint() {
        if (!this.providerHint) return;

        const selectedProvider = this.providerSelect?.value?.trim();

        // Show/hide custom provider input field
        if (selectedProvider === 'other') {
            this.customProviderField.style.display = 'block';
            this.customProviderInput.required = true;
        } else {
            this.customProviderField.style.display = 'none';
            this.customProviderInput.required = false;
            this.customProviderInput.value = '';
        }

        // Only show hint for providers that require API keys (xai, openai, other)
        if (selectedProvider === 'xai' || selectedProvider === 'openai' || selectedProvider === 'other') {
            this.providerHint.style.display = 'block';
        } else {
            this.providerHint.style.display = 'none';
        }
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
        if (this.defaultAgentConfig) return this.defaultAgentConfig;

        try {
            if (window.__DEFAULT_AGENT_NAME__ && window.__DEFAULT_SYSTEM_PROMPT__) {
                this.defaultAgentConfig = {
                    name: window.__DEFAULT_AGENT_NAME__,
                    prompt: window.__DEFAULT_SYSTEM_PROMPT__
                };
                return this.defaultAgentConfig;
            }

            await this.loadConfigJs();
            if (window.__DEFAULT_AGENT_NAME__ && window.__DEFAULT_SYSTEM_PROMPT__) {
                this.defaultAgentConfig = {
                    name: window.__DEFAULT_AGENT_NAME__,
                    prompt: window.__DEFAULT_SYSTEM_PROMPT__
                };
                return this.defaultAgentConfig;
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
                        this.defaultAgentConfig = {
                            name: config.DEFAULT_AGENT_NAME,
                            prompt: config.DEFAULT_SYSTEM_PROMPT
                        };
                        return this.defaultAgentConfig;
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

    async loadUsers() {
        this.setLoading(true);
        this.hideError();

        try {
            let baseUrl = globalAuth.apiBaseUrl;
            if (baseUrl && baseUrl.endsWith('/')) {
                baseUrl = baseUrl.slice(0, -1);
            }

            const response = await fetch(`${baseUrl}/api/auth/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.users = data.emails || [];
                this.renderUsers();
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load instances. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    truncateEmail(email) {
        if (email.length <= 25) {
            return email;
        }
        return email.substring(0, 25) + '...';
    }

    renderUsers() {
        this.userList.innerHTML = '';

        if (this.users.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'user-selection-empty';
            emptyMessage.textContent = 'No instances found. Create your first instance!';
            this.userList.appendChild(emptyMessage);
            return;
        }

        this.users.forEach(email => {
            const userItem = document.createElement('div');
            userItem.className = 'user-selection-item';
            userItem.dataset.email = email;
            const truncatedEmail = this.truncateEmail(email);

            userItem.innerHTML = `
                <span class="user-selection-email">${truncatedEmail}</span>
                <div class="user-dropdown-container" data-email="${email}"></div>
            `;

            const emailSpan = userItem.querySelector('.user-selection-email');
            emailSpan.addEventListener('click', () => this.selectUser(email));

            emailSpan.addEventListener('dblclick', (e) => {
                e.preventDefault();
                if (this.selectedEmail === email) {
                    this.handleContinue();
                } else {
                    this.selectUser(email);
                    setTimeout(() => this.handleContinue(), 100);
                }
            });

            this.initializeUserDropdown(userItem, email);

            this.userList.appendChild(userItem);
        });
    }

    selectUser(email) {
        const previousSelected = this.userList.querySelector('.user-selection-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        const selectedItem = this.userList.querySelector(`[data-email="${email}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        this.selectedEmail = email;
    }

    addApiKeyField() {
        if (!this.apiKeysContainer) return;

        const apiKeyItem = document.createElement('div');
        apiKeyItem.className = 'api-key-item';
        
        apiKeyItem.innerHTML = `
            <input 
                type="text" 
                class="api-key-name-input" 
                placeholder="Key name"
                required
            >
            <input 
                type="text" 
                class="api-key-value-input" 
                placeholder="Key value"
                required
            >
            <button type="button" class="remove-key-button">×</button>
        `;

        const removeButton = apiKeyItem.querySelector('.remove-key-button');
        removeButton.addEventListener('click', () => {
            apiKeyItem.remove();
        });

        this.apiKeysContainer.appendChild(apiKeyItem);
    }

    addAgentField(defaultName = '', defaultPrompt = '') {
        if (!this.agentsContainer) return;

        const agentItem = document.createElement('div');
        agentItem.className = 'agent-item';
        
        agentItem.innerHTML = `
            <input 
                type="text" 
                class="agent-name-input" 
                placeholder="Agent name"
                required
            >
            <textarea 
                class="agent-prompt-input" 
                placeholder="Agent prompt/description"
                rows="3"
                required
            ></textarea>
            <button type="button" class="remove-agent-button">×</button>
        `;

        const nameInput = agentItem.querySelector('.agent-name-input');
        const promptTextarea = agentItem.querySelector('.agent-prompt-input');
        
        if (nameInput && defaultName) {
            nameInput.value = defaultName;
        }
        
        if (promptTextarea && defaultPrompt) {
            promptTextarea.value = defaultPrompt;
        }

        const removeButton = agentItem.querySelector('.remove-agent-button');
        removeButton.addEventListener('click', () => {
            agentItem.remove();
            this.updateDefaultAgentOptions();
        });

        nameInput.addEventListener('input', () => {
            this.updateDefaultAgentOptions();
        });

        this.agentsContainer.appendChild(agentItem);
        this.updateDefaultAgentOptions();

        return agentItem;
    }

    updateDefaultAgentOptions() {
        if (!this.defaultAgentSelect || !this.agentsContainer) return;

        const currentValue = this.defaultAgentSelect.value;
        this.defaultAgentSelect.innerHTML = '<option value="">Select default agent</option>';

        const agentItems = this.agentsContainer.querySelectorAll('.agent-item');
        agentItems.forEach(item => {
            const nameInput = item.querySelector('.agent-name-input');
            const agentName = nameInput?.value?.trim();
            if (agentName) {
                const option = document.createElement('option');
                option.value = agentName;
                option.textContent = agentName;
                this.defaultAgentSelect.appendChild(option);
            }
        });

        if (currentValue) {
            const optionExists = this.defaultAgentSelect.querySelector(`option[value="${currentValue}"]`);
            if (optionExists) {
                this.defaultAgentSelect.value = currentValue;
            }
        }
    }

    async collectFormData() {
        const settingsData = {};
        const eidoData = {};

        const localPath = document.getElementById('instance-local-path')?.value?.trim();
        if (localPath) settingsData['LOCAL_PATH'] = localPath;

        if (this.apiKeysContainer) {
            const apiKeyItems = this.apiKeysContainer.querySelectorAll('.api-key-item');
            apiKeyItems.forEach(item => {
                const nameInput = item.querySelector('.api-key-name-input');
                const valueInput = item.querySelector('.api-key-value-input');
                const name = nameInput?.value?.trim();
                const value = valueInput?.value?.trim();
                if (name && value) {
                    settingsData[name.toUpperCase()] = value;
                }
            });
        }
        const operatorName = document.getElementById('instance-operator-name')?.value?.trim();
        const purpose = document.getElementById('instance-purpose')?.value?.trim();

        if (operatorName) eidoData['OPERATOR_NAME'] = operatorName;
        if (purpose) eidoData['PURPOSE'] = purpose;

        const providerName = document.getElementById('instance-provider-name')?.value?.trim();
        const customProviderName = document.getElementById('instance-custom-provider')?.value?.trim();
        const modelName = document.getElementById('instance-model-name')?.value?.trim();

        // Use custom provider name if "other" is selected, otherwise use the selected provider
        const finalProviderName = providerName === 'other' ? customProviderName : providerName;

        if (finalProviderName) eidoData['PROVIDER_NAME'] = finalProviderName;
        if (modelName) eidoData['MODEL_NAME'] = modelName;

        const modelConfig = await this.loadModelConfig();
        eidoData['MODEL_TEMPERATURE'] = modelConfig.temperature;
        eidoData['MODEL_MAX_TOKENS'] = modelConfig.maxTokens;


        const defaultAgent = this.defaultAgentSelect?.value?.trim();
        if (defaultAgent) eidoData['DEFAULT_AGENT'] = defaultAgent;

        const agents = {};
        if (this.agentsContainer) {
            const agentItems = this.agentsContainer.querySelectorAll('.agent-item');
            agentItems.forEach(item => {
                const nameInput = item.querySelector('.agent-name-input');
                const promptInput = item.querySelector('.agent-prompt-input');
                const name = nameInput?.value?.trim();
                const prompt = promptInput?.value?.trim();
                if (name && prompt) {
                    agents[name] = prompt;
                }
            });
        }
        
        if (Object.keys(agents).length > 0) {
            eidoData['agents'] = agents;
        }

        const agentsMode = document.getElementById('instance-agents-mode')?.checked;
        const awarenessMode = document.getElementById('instance-awareness-mode')?.checked;
        const toolsMode = document.getElementById('instance-tools-mode')?.checked;
        const localMode = document.getElementById('instance-local-mode')?.checked;

        eidoData['AGENTS_MODE'] = Boolean(agentsMode).toString();
        eidoData['AWARENESS_MODE'] = Boolean(awarenessMode).toString();
        eidoData['TOOLS_MODE'] = Boolean(toolsMode).toString();
        eidoData['LOCAL_MODE'] = Boolean(localMode).toString();

        return { settingsData, eidoData };
    }

    async saveInstanceConfiguration(accessToken) {
        const { settingsData, eidoData } = await this.collectFormData();
        const savePromises = [];

        if (Object.keys(settingsData).length > 0) {
            const settingsPromise = this.saveSettings(accessToken, settingsData);
            savePromises.push(settingsPromise);
        }

        if (Object.keys(eidoData).length > 0) {
            const eidoPromise = this.saveEidoSettings(accessToken, eidoData);
            savePromises.push(eidoPromise);
        }

        if (savePromises.length > 0) {
            await Promise.all(savePromises);
        }
    }

    async saveSettings(accessToken, settings) {
        let baseUrl = globalAuth.apiBaseUrl;
        if (baseUrl && baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        const response = await fetch(`${baseUrl}/api/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ settings })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save settings: ${response.status} - ${errorText}`);
        }
    }

    async saveEidoSettings(accessToken, settings) {
        let baseUrl = globalAuth.apiBaseUrl;
        if (baseUrl && baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        const response = await fetch(`${baseUrl}/api/eido`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ settings })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save eido settings: ${response.status} - ${errorText}`);
        }
    }

    async handleContinue() {
        if (!this.selectedEmail) return;

        this.setLoading(true);
        this.hideError();

        try {
            await globalAuth.login(this.selectedEmail);
            this.hide();
            this.onLoginSuccess?.();
        } catch (error) {
            console.error('Login failed:', error);
            this.showError(error.message || 'Login failed. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    async showLoginForm() {
        this.currentView = 'login-form';
        this.selectionView.style.display = 'none';
        this.loginFormView.style.display = 'flex';
        this.instanceInput.focus();

        setTimeout(() => this.toggleProviderHint(), 0);

        await this.loadAndSetupDefaultAgent();
    }

    async loadAndSetupDefaultAgent() {
        try {
            const defaultAgentConfig = await this.loadDefaultAgentConfig();
            
            if (defaultAgentConfig && defaultAgentConfig.name && defaultAgentConfig.prompt) {
                if (this.agentsContainer) {
                    this.agentsContainer.innerHTML = '';
                }

                const agentItem = this.addAgentField(defaultAgentConfig.name, defaultAgentConfig.prompt);
                
                if (agentItem) {
                    setTimeout(() => {
                        if (this.defaultAgentSelect) {
                            this.defaultAgentSelect.value = defaultAgentConfig.name;
                        }
                    }, 200);
                }
            }
        } catch (error) {
            console.warn('Failed to setup default agent:', error);
        }
    }

    showSelectionView() {
        this.currentView = 'selection';
        this.loginFormView.style.display = 'none';
        this.selectionView.style.display = 'flex';
        this.selectedEmail = null;

        const selectedItem = this.userList.querySelector('.user-selection-item.selected');
        if (selectedItem) {
            selectedItem.classList.remove('selected');
        }
    }

    async handleLogin(event) {
        event.preventDefault();

        const instanceName = this.instanceInput.value.trim();
        if (!instanceName) {
            this.showLoginError('Please enter an instance name');
            return;
        }

        const instanceNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
        if (!instanceNameRegex.test(instanceName)) {
            this.showLoginError('Instance name can only contain letters, numbers, spaces, hyphens, and underscores');
            return;
        }

        if (instanceName.length < 2 || instanceName.length > 50) {
            this.showLoginError('Instance name must be between 2 and 50 characters');
            return;
        }

        const operatorName = document.getElementById('instance-operator-name')?.value?.trim();
        if (!operatorName) {
            this.showLoginError('Please enter an operator name');
            return;
        }

        const providerName = document.getElementById('instance-provider-name')?.value?.trim();
        const customProviderName = document.getElementById('instance-custom-provider')?.value?.trim();

        if (!providerName) {
            this.showLoginError('Please select a provider');
            return;
        }

        // Validate custom provider name if "other" is selected
        if (providerName === 'other' && !customProviderName) {
            this.showLoginError('Please enter a custom provider name');
            return;
        }

        const modelName = document.getElementById('instance-model-name')?.value?.trim();
        if (!modelName) {
            this.showLoginError('Please enter a model name');
            return;
        }


        const localPath = document.getElementById('instance-local-path')?.value?.trim();
        if (!localPath) {
            this.showLoginError('Please enter a local path');
            return;
        }

        this.setLoginLoading(true);
        this.hideLoginError();

        try {
            await globalAuth.register(instanceName);

            try {
                const accessToken = globalAuth.getToken();
                if (accessToken) {
                    await this.saveInstanceConfiguration(accessToken);
                }
            } catch (configError) {
                console.error('Failed to save instance configuration:', configError);
                this.showLoginError(`Instance created but configuration failed to save: ${configError.message || 'Unknown error'}`);
                return;
            }

            this.selectedEmail = instanceName;
            this.hide();
            this.onLoginSuccess?.();
        } catch (error) {
            this.showLoginError(error.message || 'Registration failed. Please try again.');
        } finally {
            this.setLoginLoading(false);
        }
    }

    show() {
        this.overlay.style.display = 'flex';
        this.currentView = 'selection';
        this.selectionView.style.display = 'flex';
        this.loginFormView.style.display = 'none';

        this.loadUsers();

        setTimeout(() => {
            const firstUser = this.userList.querySelector('.user-selection-item');
            if (firstUser) {
                firstUser.focus();
            } else {
                this.createNewButton.focus();
            }
        }, 100);
    }

    hide() {
        this.overlay.style.display = 'none';
        this.selectedEmail = null;
    }

    setLoading(loading) {
        this.isLoading = loading;
        if (loading) {
            this.loadingDiv.classList.add('show');
            this.createNewButton.disabled = true;
        } else {
            this.loadingDiv.classList.remove('show');
            this.createNewButton.disabled = false;
        }
    }

    setLoginLoading(loading) {
        if (loading) {
            this.loginButton.disabled = true;
            this.loginLoadingDiv.classList.add('show');
        } else {
            this.loginButton.disabled = false;
            this.loginLoadingDiv.classList.remove('show');
        }
    }

    showError(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.classList.add('show');
        setTimeout(() => {
            this.errorDiv.classList.remove('show');
        }, 5000);
    }

    hideError() {
        this.errorDiv.classList.remove('show');
    }

    showLoginError(message) {
        this.loginErrorDiv.textContent = message;
        this.loginErrorDiv.classList.add('show');
        setTimeout(() => {
            this.loginErrorDiv.classList.remove('show');
        }, 10000);
    }

    hideLoginError() {
        this.loginErrorDiv.classList.remove('show');
    }

    initializeUserDropdown(userItem, email) {
        try {
            const container = userItem.querySelector('.user-dropdown-container');
            if (container && window.UserDropdown) {
                new window.UserDropdown(container, {
                    email: email,
                    onDelete: (email) => this.handleUserDelete(email),
                    onRename: (email) => this.handleUserRename(email),
                    onHide: (email) => this.handleUserHide(email),
                    showHideName: false
                });
            } else if (!window.UserDropdown) {
                console.error('UserDropdown class not found. Please refresh the page if this persists.');
                setTimeout(() => {
                    if (!window.UserDropdown || !window.ConfirmationModal) {
                        console.warn('Required components still missing. Refreshing page...');
                        window.location.reload();
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to initialize user dropdown:', error);
        }
    }

    async handleUserRename(email) {
        if (!window.ConfirmationModal) {
            console.error('ConfirmationModal not loaded');
            return;
        }

        const modal = window.ConfirmationModal.showRenameUserConfirmation(
            email,
            async (newEmail) => {
                try {
                    await this.renameUser(email, newEmail);
                    return true;
                } catch (error) {
                    console.error('Failed to rename user:', error);
                    this.showError(error.message || 'Failed to rename user. Please try again.');
                    return false;
                }
            },
            () => {
            }
        );
    }

    async handleUserDelete(email) {
        if (!window.ConfirmationModal) {
            console.error('ConfirmationModal not loaded');
            return;
        }

        const modal = window.ConfirmationModal.showDeleteUserConfirmation(
            email,
            async () => {
                try {
                    await this.deleteUser(email);
                    return true;
                } catch (error) {
                    console.error('Failed to delete user:', error);
                    this.showError(error.message || 'Failed to delete user. Please try again.');
                    return false;
                }
            },
            () => {
            }
        );
    }

    handleUserHide(email) {
        // The hide functionality is handled entirely within the UserDropdown component
        // This handler is here for consistency and future extensibility
        console.log('Name visibility toggled for:', email);
    }

    async deleteUser(email) {
        let baseUrl = globalAuth.apiBaseUrl;
        if (baseUrl && baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        const response = await fetch(`${baseUrl}/api/auth/users/${encodeURIComponent(email)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to delete user: ${response.status}`);
        }

        this.users = this.users.filter(u => u !== email);
        this.renderUsers();

        if (this.selectedEmail === email) {
            this.selectedEmail = null;
        }

        this.notifyUserDeleted(email);
    }

    async renameUser(oldEmail, newEmail) {
        let baseUrl = globalAuth.apiBaseUrl;
        if (baseUrl && baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        const response = await fetch(`${baseUrl}/api/auth/users/${encodeURIComponent(oldEmail)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ new_email: newEmail })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to rename user: ${response.status}`);
        }

        const userIndex = this.users.indexOf(oldEmail);
        if (userIndex !== -1) {
            this.users[userIndex] = newEmail;
        }
        
        this.renderUsers();

        if (this.selectedEmail === oldEmail) {
            this.selectedEmail = newEmail;
            this.displaySelectedEmail();
        }

        this.notifyUserRenamed(oldEmail, newEmail);
    }

    notifyUserRenamed(oldEmail, newEmail) {
        const event = {
            type: 'user_renamed',
            oldEmail: oldEmail,
            newEmail: newEmail,
            timestamp: Date.now()
        };
        
        localStorage.setItem('user_management_event', JSON.stringify(event));
        
        setTimeout(() => {
            localStorage.removeItem('user_management_event');
        }, 100);
    }

    notifyUserDeleted(email) {
        const event = {
            type: 'user_deleted',
            email: email,
            timestamp: Date.now()
        };
        
        localStorage.setItem('user_management_event', JSON.stringify(event));
        
        setTimeout(() => {
            localStorage.removeItem('user_management_event');
        }, 100);
    }

    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'user_management_event' && e.newValue) {
                try {
                    const event = JSON.parse(e.newValue);
                    if (event.type === 'user_deleted') {
                        if (this.users.includes(event.email)) {
                            this.users = this.users.filter(u => u !== event.email);
                            this.renderUsers();
                            
                            if (this.selectedEmail === event.email) {
                                this.selectedEmail = null;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error parsing storage event:', error);
                }
            }
        });
    }

    cleanupDuplicateScripts() {
        const scriptPaths = [
            '/src/scaffold/components/shared/js/userDropdown.js',
            '/src/scaffold/components/shared/js/confirmationModal.js'
        ];
        
        scriptPaths.forEach(scriptPath => {
            const scripts = document.querySelectorAll(`script[src="${scriptPath}"]`);
            for (let i = 1; i < scripts.length; i++) {
                scripts[i].remove();
            }
        });
    }

    setOnLoginSuccess(callback) {
        this.onLoginSuccess = callback;
    }
}

export default UserSelection;
