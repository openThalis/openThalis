import { validateProgramName, validateProgramDescription } from './utils.js';

export class FeedbackModal {
    constructor(programSettings) {
        this.programSettings = programSettings;
        this.elements = {};
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Create modal elements
        this.createModalElements();
    }

    createModalElements() {
        // Remove any existing feedback modals to prevent duplicates
        const existingModals = document.querySelectorAll('.feedback-modal-overlay');
        existingModals.forEach(modal => modal.remove());
        
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'feedback-modal-overlay hidden';
        this.overlay.innerHTML = `
            <div class="feedback-modal-content">
                <div class="feedback-modal-header">
                    <h3 class="feedback-modal-title">Feeedback</h3>
                    <button class="feedback-close-btn" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="feedback-modal-body">
                    <label class="feedback-label" for="feedback-text">Provide feedback here to improve the program and the AI will implement it</label>
                    <textarea
                        id="feedback-text"
                        class="feedback-textarea"
                        placeholder="Examples: fix this bug, add this feature, improve this part...""
                        rows="4"
                    ></textarea>
                </div>
                <div class="feedback-modal-footer">
                    <button class="feedback-cancel-btn">Cancel</button>
                    <button class="feedback-send-btn">Send Request</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Get references to elements
        this.elements = {
            overlay: this.overlay,
            closeBtn: this.overlay.querySelector('.feedback-close-btn'),
            textarea: this.overlay.querySelector('#feedback-text'),
            cancelBtn: this.overlay.querySelector('.feedback-cancel-btn'),
            sendBtn: this.overlay.querySelector('.feedback-send-btn')
        };
    }

    bindEvents() {
        // Close button
        this.elements.closeBtn && this.elements.closeBtn.addEventListener('click', () => this.close());

        // Cancel button
        this.elements.cancelBtn && this.elements.cancelBtn.addEventListener('click', () => this.close());

        // Send button
        this.elements.sendBtn && this.elements.sendBtn.addEventListener('click', () => this.handleSend());

        // Click outside modal to close
        this.elements.overlay && this.elements.overlay.addEventListener('click', (e) => {
            if (e.target === this.elements.overlay) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.overlay.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    open() {
        this.elements.overlay.classList.remove('hidden');
        this.elements.textarea?.focus();
    }

    close() {
        this.elements.overlay.classList.add('hidden');
        if (this.elements.textarea) {
            this.elements.textarea.value = '';
        }
    }

    // Clean up the modal and remove it from DOM
    destroy() {
        if (this.overlay && this.overlay.parentElement) {
            this.overlay.remove();
        }
        this.elements = {};
    }



    async handleSend() {
        const feedback = this.elements.textarea?.value.trim();

        if (!feedback) {
            alert('Please enter a description for the AI to generate code.');
            return;
        }

        if (!this.programSettings.currentProgram) {
            alert('No program selected. Please open a program first.');
            return;
        }

        try {
            // Show loading state
            this.elements.sendBtn.disabled = true;
            this.elements.sendBtn.textContent = 'Sending...';

            // Send feedback to backend
            const formData = {
                feedback: feedback,
                status: 'update'
            };

            const event = new CustomEvent('programUpdateFeedback', {
                detail: {
                    programId: this.programSettings.currentProgram.id,
                    formData
                }
            });
            this.programSettings.ui.scope.dispatchEvent(event);

            // Close the feedback modal
            this.close();

            // Close the program settings panel
            this.programSettings.close();

        } catch (error) {
            console.error('Failed to send feedback:', error);
            alert('Failed to send feedback. Please try again.');
        } finally {
            // Reset button state
            if (this.elements.sendBtn) {
                this.elements.sendBtn.disabled = false;
                this.elements.sendBtn.textContent = 'Send Request';
            }
        }
    }
}

export class ProgramSettings {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.elements = {};
        this.currentProgram = null;
        this.isEditMode = false;
        this.originalProgramData = null;
        this.feedbackModal = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            panel: this.ui.getElementById('programSettings'),
            sidebar: this.ui.getElementById('aetherSidebar'),
            closeBtn: this.ui.getElementById('closeProgramSettings'),
            magicWandBtn: this.ui.getElementById('magicWandBtn'),
            title: this.ui.getElementById('programSettingsTitle'),
            errorBox: this.ui.getElementById('programSettingsError'),
            nameInput: this.ui.getElementById('programName'),
            descriptionInput: this.ui.getElementById('programDescription'),
            saveBtn: this.ui.getElementById('saveProgramBtn'),
            deleteBtn: this.ui.getElementById('deleteProgramBtn'),
            cloneBtn: this.ui.getElementById('cloneProgramBtn'),
            // Source code elements
            htmlCodeInput: this.ui.getElementById('html-code'),
            cssCodeInput: this.ui.getElementById('css-code'),
            jsCodeInput: this.ui.getElementById('js-code'),
            // Help elements
            sourceCodeHelpBtn: this.ui.getElementById('sourceCodeHelpBtn')
        };
    }

    bindEvents() {
        // Magic wand button
        this.elements.magicWandBtn && this.elements.magicWandBtn.addEventListener('click', () => {
            this.openFeedbackModal();
        });

        // Close button
        this.elements.closeBtn && this.elements.closeBtn.addEventListener('click', () => this.close());

        // Save button
        this.elements.saveBtn && this.elements.saveBtn.addEventListener('click', () => this.handleSave());

        // Delete button
        this.elements.deleteBtn && this.elements.deleteBtn.addEventListener('click', () => this.handleDelete());

        // Clone button
        this.elements.cloneBtn && this.elements.cloneBtn.addEventListener('click', () => this.handleClone());

        // Enter key on name input
        this.elements.nameInput && this.elements.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSave();
            }
        });

        // Clear error on input changes and auto-resize textarea
        ['input', 'change'].forEach(evt => {
            this.elements.nameInput && this.elements.nameInput.addEventListener(evt, () => this.clearError());
            this.elements.descriptionInput && this.elements.descriptionInput.addEventListener(evt, () => {
                this.clearError();
                this.autoResizeTextarea(this.elements.descriptionInput);
            });
        });

        // Setup source code tabs
        this.setupSourceCodeTabs();

        // Setup source code toggle
        this.setupSourceCodeToggle();

        // Setup help tooltip
        this.setupHelpTooltip();

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.panel?.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    openForCreate() {
        this.isEditMode = false;
        this.currentProgram = null;
        this.elements.title.textContent = 'Create Program';
        this.elements.saveBtn.innerHTML = '<span class="btn-text">Create</span>';
        this.elements.deleteBtn?.classList.add('hidden');
        this.elements.cloneBtn?.classList.add('hidden');
        
        this.resetForm();
        this.open();
    }

    openForEdit(program) {
        this.isEditMode = true;
        this.currentProgram = program;
        this.elements.title.textContent = 'Edit Program';
        this.elements.saveBtn.innerHTML = '<span class="btn-text">Update</span>';
        this.elements.deleteBtn?.classList.remove('hidden');
        this.elements.cloneBtn?.classList.remove('hidden');

        // Store original program data for change detection (only description)
        this.originalProgramData = {
            description: program.description || ''
        };

        this.populateForm(program);
        this.open();
    }

    open() {
        this.elements.sidebar?.classList.remove('hidden');
        this.elements.panel?.classList.remove('hidden');
        this.elements.nameInput?.focus();
        
        // Auto-resize textarea on open
        if (this.elements.descriptionInput) {
            setTimeout(() => this.autoResizeTextarea(this.elements.descriptionInput), 0);
        }
    }

    close() {
        this.elements.panel?.classList.add('hidden');
        this.elements.sidebar?.classList.add('hidden');
        this.currentProgram = null;
        this.isEditMode = false;
        this.originalProgramData = null;
        
        // Clean up feedback modal if it exists
        if (this.feedbackModal) {
            this.feedbackModal.destroy();
            this.feedbackModal = null;
        }
    }

    // Create and open feedback modal only when magic wand is clicked
    openFeedbackModal() {
        if (!this.feedbackModal) {
            this.feedbackModal = new FeedbackModal(this);
        }
        this.feedbackModal.open();
    }

    resetForm() {
        if (this.elements.nameInput) this.elements.nameInput.value = '';
        if (this.elements.descriptionInput) {
            this.elements.descriptionInput.value = '';
            // Reset to minimum height after clearing
            setTimeout(() => this.autoResizeTextarea(this.elements.descriptionInput), 0);
        }
        // Reset source code fields
        if (this.elements.htmlCodeInput) this.elements.htmlCodeInput.value = '';
        if (this.elements.cssCodeInput) this.elements.cssCodeInput.value = '';
        if (this.elements.jsCodeInput) this.elements.jsCodeInput.value = '';
        this.clearError();
    }

    populateForm(program) {
        if (this.elements.nameInput) this.elements.nameInput.value = program.name || '';
        if (this.elements.descriptionInput) {
            this.elements.descriptionInput.value = program.description || '';
            // Auto-resize after populating
            setTimeout(() => this.autoResizeTextarea(this.elements.descriptionInput), 0);
        }
        // Populate source code fields
        const sourceCode = program.source_code || {};
        if (this.elements.htmlCodeInput) this.elements.htmlCodeInput.value = sourceCode.html || '';
        if (this.elements.cssCodeInput) this.elements.cssCodeInput.value = sourceCode.css || '';
        if (this.elements.jsCodeInput) this.elements.jsCodeInput.value = sourceCode.js || '';
        this.clearError();
    }

    getFormData() {
        const formData = {
            name: this.elements.nameInput?.value.trim() || '',
            description: this.elements.descriptionInput?.value.trim() || '',
            config: {}
        };

        // Always include source_code to allow clearing existing code
        const htmlCode = this.elements.htmlCodeInput?.value || '';
        const cssCode = this.elements.cssCodeInput?.value || '';
        const jsCode = this.elements.jsCodeInput?.value || '';

        formData.source_code = {
            html: htmlCode,
            css: cssCode,
            js: jsCode
        };

        if (!this.isEditMode) {
            formData.status = 'update';
        } else if (this.isEditMode && this.hasDescriptionChanged()) {
            formData.status = 'update';
        }

        return formData;
    }

    hasDescriptionChanged() {
        if (!this.originalProgramData) return false;

        const currentDescription = this.elements.descriptionInput?.value.trim() || '';
        const originalDescription = this.originalProgramData.description || '';
        return currentDescription !== originalDescription;
    }

    validateForm() {
        const name = this.elements.nameInput?.value.trim() || '';
        const nameError = validateProgramName(name);
        if (nameError) {
            return { valid: false, message: nameError };
        }

        const description = this.elements.descriptionInput?.value.trim() || '';
        const descriptionError = validateProgramDescription(description);
        if (descriptionError) {
            return { valid: false, message: descriptionError };
        }

        return { valid: true };
    }

    async handleSave() {
        const validation = this.validateForm();
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        const formData = this.getFormData();
        
        if (this.isEditMode && this.currentProgram) {
            // Dispatch edit event
            const event = new CustomEvent('programEdit', { 
                detail: { programId: this.currentProgram.id, formData } 
            });
            this.ui.scope.dispatchEvent(event);
        } else {
            const event = new CustomEvent('programCreate', { 
                detail: formData 
            });
            this.ui.scope.dispatchEvent(event);
        }
        
        this.close();
    }

    handleDelete() {
        if (this.isEditMode && this.currentProgram) {
            // Dispatch delete event
            const event = new CustomEvent('programDeleteFromSettings', { 
                detail: { programId: this.currentProgram.id } 
            });
            this.ui.scope.dispatchEvent(event);
            this.close();
        }
    }

    handleClone() {
        if (this.isEditMode && this.currentProgram) {
            const cloneData = {
                name: this.currentProgram.name + ' (Copy)',
                description: this.currentProgram.description,
                source_code: { ...this.currentProgram.source_code },
                config: { ...this.currentProgram.config }
            };

            // Dispatch clone event
            const event = new CustomEvent('programClone', {
                detail: cloneData
            });
            this.ui.scope.dispatchEvent(event);
            this.close();
        }
    }

    autoResizeTextarea(textarea) {
        if (!textarea) return;
        
        // Reset height to auto to get the natural height
        textarea.style.height = 'auto';
        
        // Set height to scrollHeight to fit all content
        const newHeight = Math.max(textarea.scrollHeight, 120); // Min height of 120px
        textarea.style.height = newHeight + 'px';
    }

    showError(message) {
        const box = this.elements.errorBox;
        if (!box) return;
        box.textContent = message;
        box.classList.remove('hidden');
    }

    clearError() {
        const box = this.elements.errorBox;
        if (!box) return;
        box.textContent = '';
        box.classList.add('hidden');
    }

    setupSourceCodeTabs() {
        const navBtns = this.ui.scope.querySelectorAll('.source-nav-btn');
        const tabContents = this.ui.scope.querySelectorAll('.source-tab-content');

        if (navBtns.length === 0 || tabContents.length === 0) {
            console.warn('Source code tabs not found, skipping setup');
            return;
        }

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                if (!tabName) {
                    console.warn('Tab button missing data-tab attribute');
                    return;
                }

                try {
                    // Remove active class from all buttons and contents
                    navBtns.forEach(b => b.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));

                    // Add active class to clicked button and corresponding content
                    btn.classList.add('active');
                    const targetContent = this.ui.scope.querySelector(`.source-tab-content[data-tab="${tabName}"]`);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    } else {
                        console.warn(`Target tab content not found for: ${tabName}`);
                    }
                } catch (error) {
                    console.error('Error switching tabs:', error);
                }
            });
        });
    }

    setupSourceCodeToggle() {
        const toggleBtn = this.ui.getElementById('sourceCodeToggleBtn');
        if (!toggleBtn) {
            console.warn('Source code toggle button not found');
            return;
        }

        toggleBtn.addEventListener('click', () => {
            const sourceNav = this.ui.scope.querySelector('.source-code-nav');
            const sourceContent = this.ui.scope.querySelector('.source-code-content');
            const isCollapsed = sourceNav?.classList.contains('collapsed');

            if (isCollapsed) {
                // Expand
                sourceNav?.classList.remove('collapsed');
                sourceContent?.classList.remove('collapsed');
                toggleBtn.classList.add('expanded');
                toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                // Collapse
                sourceNav?.classList.add('collapsed');
                sourceContent?.classList.add('collapsed');
                toggleBtn.classList.remove('expanded');
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    setupHelpTooltip() {
        if (!this.elements.sourceCodeHelpBtn) {
            console.warn('Source code help button not found');
            return;
        }

        let tooltip = null;
        let hideTimeout = null;

        const showTooltip = () => {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            if (!tooltip) {
                tooltip = this.createHelpTooltip();
                document.body.appendChild(tooltip);
            }

            // Position the tooltip
            const btnRect = this.elements.sourceCodeHelpBtn.getBoundingClientRect();
            tooltip.style.left = `${btnRect.left + btnRect.width / 2 - 150}px`; // Center above button
            tooltip.style.top = `${btnRect.top - 10}px`; // Just above button

            // Show tooltip
            requestAnimationFrame(() => {
                tooltip.classList.add('visible');
            });
        };

        const hideTooltip = () => {
            if (tooltip) {
                tooltip.classList.remove('visible');
                hideTimeout = setTimeout(() => {
                    if (tooltip && tooltip.parentElement) {
                        tooltip.remove();
                        tooltip = null;
                    }
                }, 300); // Wait for animation to complete
            }
        };

        // Mouse events
        this.elements.sourceCodeHelpBtn.addEventListener('mouseenter', showTooltip);
        this.elements.sourceCodeHelpBtn.addEventListener('mouseleave', hideTooltip);

        // Click to toggle (for mobile/touch devices)
        this.elements.sourceCodeHelpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (tooltip && tooltip.classList.contains('visible')) {
                hideTooltip();
            } else {
                showTooltip();
            }
        });

        // Hide tooltip when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (tooltip && !this.elements.sourceCodeHelpBtn.contains(e.target) && !tooltip.contains(e.target)) {
                hideTooltip();
            }
        });

        // Hide tooltip on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && tooltip && tooltip.classList.contains('visible')) {
                hideTooltip();
            }
        });
    }

    createHelpTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'help-tooltip';
        tooltip.innerHTML = `
            <h4>About Source Code</h4>
            <p>The source code sections will be generated by the language model you configured in the eido section, you can create/edit them manually too. (This feature will be enhanced in the future) </p>
        `;
        return tooltip;
    }
}
