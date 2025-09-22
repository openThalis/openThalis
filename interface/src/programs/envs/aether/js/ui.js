import { listPrograms, createProgram, updateProgram, deleteProgram } from './api.js';
import { sanitizeHTML, formatDateTime, truncateText } from './utils.js';
import { ProgramSettings } from './programSettings.js';
import { DeleteModal } from './deleteModal.js';

export class ProgramUI {
    constructor(programManager, scope = document) {
        this.programManager = programManager;
        this.scope = scope;
        this.elements = {};
        this.programSettings = new ProgramSettings(this);
        this.deleteModal = new DeleteModal(this);
        this.initializeElements();
        this.bindEvents();
    }

    getElementById(id) {
        if (this.scope === document) {
            return document.getElementById(id);
        }
        return this.scope.querySelector(`#${id}`);
    }

    initializeElements() {
        this.elements = {
            createBtn: this.getElementById('createProgramBtn'),
            programsGrid: this.getElementById('programsGrid')
        };
    }

    bindEvents() {
        // Create program button click
        this.elements.createBtn && this.elements.createBtn.addEventListener('click', () => {
            this.programSettings.openForCreate();
        });

        // Listen for program creation from settings
        this.scope.addEventListener('programCreate', (e) => {
            this.handleCreateProgram(e.detail);
        });

        // Listen for program editing from settings
        this.scope.addEventListener('programEdit', (e) => {
            this.handleEditProgram(e.detail.programId, e.detail.formData);
        });

        // Listen for delete confirmation
        this.scope.addEventListener('programDeleteConfirmed', (e) => {
            this.handleDeleteProgramConfirmed(e.detail.programId);
        });

        // Listen for delete from settings panel
        this.scope.addEventListener('programDeleteFromSettings', (e) => {
            const program = this.programManager.getProgram(e.detail.programId);
            if (program) {
                this.deleteModal.open(program);
            }
        });

        // Listen for program cloning from settings
        this.scope.addEventListener('programClone', (e) => {
            this.handleCreateProgram(e.detail);
        });

        // Listen for feedback updates
        this.scope.addEventListener('programUpdateFeedback', (e) => {
            this.handleUpdateFeedback(e.detail.programId, e.detail.formData);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.programSettings.openForCreate();
            }
        });

    }

    async handleCreateProgram(formData) {
        try {
            const created = await createProgram(formData);
            this.programManager.addProgram(created);
            this.renderPrograms();
        } catch (e) {
            this.showError('Failed to create program: ' + e.message);
            console.error('Failed to create program:', e);
        }
    }

    async handleEditProgram(programId, formData) {
        try {
            const updated = await updateProgram(programId, formData);
            this.programManager.updateProgram(programId, updated);
            this.renderPrograms();
        } catch (e) {
            this.showError('Failed to update program: ' + e.message);
            console.error('Failed to update program:', e);
        }
    }

    async handleDeleteProgramConfirmed(programId) {
        try {
            await deleteProgram(programId);
            const program = this.programManager.getProgram(programId);
            this.programManager.removeProgram(programId);
            this.renderPrograms();
        } catch (e) {
            this.showError('Failed to delete program: ' + e.message);
            console.error('Failed to delete program:', e);
        }
    }

    async handleUpdateFeedback(programId, formData) {
        try {
            const updated = await updateProgram(programId, formData);
            this.programManager.updateProgram(programId, updated);
            this.renderPrograms();
        } catch (e) {
            this.showError('Failed to send feedback: ' + e.message);
            console.error('Failed to update feedback:', e);
        }
    }

    handleEditButtonClick(programId) {
        const program = this.programManager.getProgram(programId);
        if (!program) return;
        this.programSettings.openForEdit(program);
    }

    handleOpenProgramClick(programId) {
        const program = this.programManager.getProgram(programId);
        if (!program) {
            console.error('Program not found:', programId);
            this.showError('Program not found');
            return;
        }
        
        // Open program inside the current tab content (embed iframe like Local)
        try {
            const url = `/src/programs/envs/aether/renderer/program.html?id=${encodeURIComponent(program.id)}`;

            // If we have a scoped container (tab content), replace its content with an iframe
            if (this.scope && this.scope !== document) {
                const wrapper = document.createElement('div');
                wrapper.className = 'program-iframe-wrapper';
                wrapper.style.cssText = 'width:100%;height:100%;position:relative;';
                
                const iframe = document.createElement('iframe');
                iframe.src = url;
                iframe.style.cssText = 'width:100%;height:100%;border:0;display:block;';
                iframe.title = `${program.name} - Aether Program`;
                
                wrapper.appendChild(iframe);
                this.scope.innerHTML = '';
                this.scope.appendChild(wrapper);

                // Update the tab title to reflect the program name
                try {
                    window.top && window.top.postMessage({ 
                        __thalis__: true, 
                        type: 'update-tab-title', 
                        title: program.name || 'Program' 
                    }, '*');
                } catch (titleError) {
                    console.warn('Failed to update tab title:', titleError);
                }
            } else {
                // When running as a full document (inside an iframe), navigate within the same iframe/tab
                try {
                    window.location.href = url;
                } catch (navError) {
                    console.error('Failed to navigate to program renderer:', navError);
                    this.showError('Failed to navigate to program');
                }
            }
        } catch (e) {
            console.error('Failed to open program:', e);
            this.showError('Failed to open program: ' + e.message);
        }
    }

    renderPrograms() {
        const programs = this.programManager.getAllPrograms();
        
        if (!this.elements.programsGrid) {
            console.error('ProgramUI: programsGrid element not found, cannot render programs');
            return;
        }
        
        if (programs.length === 0) {
            this.elements.programsGrid.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 0.9rem; color: #6b7280; line-height: 1.5;">
                        💡 Tip: You can create interactive web applications, games, calculators, and more!
                    </div>
                </div>
            `;
            return;
        }

        // Sort programs by updated_at (newest first)
        const sortedPrograms = programs.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0);
            const dateB = new Date(b.updated_at || b.created_at || 0);
            return dateB - dateA; // Descending order (newest first)
        });

        this.elements.programsGrid.innerHTML = sortedPrograms.map(program => this.renderProgramCard(program)).join('');
        this.bindProgramEvents();
    }

    renderProgramCard(program) {
        const description = truncateText(program.description || '', 120);
        const updatedDate = formatDateTime(program.updated_at || program.created_at);
        const sourceCode = program.source_code || {};

        const isUpdating = program.status === 'update' || program.status === 'processing';
        const loadingOverlay = isUpdating ? `
            <div class="program-loading-overlay">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="loading-text">Updating...</div>
            </div>
        ` : '';

        return `
            <div class="program-card ${isUpdating ? 'updating' : ''}" data-program-id="${program.id}">
                <div class="program-card-header">
                    <h3 class="program-card-title">${sanitizeHTML(program.name)}</h3>
                    <div class="program-card-indicators">
                        <button class="program-edit-btn edit-btn ${isUpdating ? 'disabled' : ''}" title="${isUpdating ? 'Program is updating...' : 'Edit Program'}" data-program-id="${program.id}" ${isUpdating ? 'disabled' : ''}>
                            <span>⚙️</span>
                        </button>
                    </div>
                </div>

                <div class="program-card-body">
                    <p class="program-card-description">${sanitizeHTML(description)}</p>
                    <p class="program-card-date">Last updated: ${updatedDate}</p>
                </div>
                ${loadingOverlay}
            </div>
        `;
    }

    bindProgramEvents() {
        // Edit buttons
        this.scope.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const button = e.currentTarget;
                const programId = button.dataset.programId;

                // Prevent interaction if button is disabled or card is updating
                if (button.disabled || button.classList.contains('disabled')) {
                    return;
                }

                if (programId) {
                    this.handleEditButtonClick(programId);
                }
            });
        });

        // Card click to open program
        this.scope.querySelectorAll('.program-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Prevent interaction if card is updating
                if (card.classList.contains('updating')) {
                    return;
                }

                // Only trigger if not clicking on action buttons
                if (!e.target.closest('.program-edit-btn')) {
                    const programId = card.dataset.programId;
                    if (programId) {
                        this.handleOpenProgramClick(programId);
                    }
                }
            });
        });
    }

    showError(message) {
        console.error('Error:', message);
        alert('Error: ' + message); // TODO: Replace with better notification system
    }

    async initialize() {
        try {
            const programs = await listPrograms();
            this.programManager.loadPrograms(programs);
            this.renderPrograms();
            this.startStatusPolling();
        } catch (e) {
            this.showError('Failed to load programs: ' + e.message);
            console.error('Failed to load programs:', e);
        }
    }

    startStatusPolling() {
        // Clear any existing polling interval
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
        }

        // Start polling every 3 seconds
        this.statusPollingInterval = setInterval(() => {
            this.checkAndUpdateProgramStatuses();
        }, 3000);
    }

    async checkAndUpdateProgramStatuses() {
        try {
            const programs = await listPrograms();
            let hasUpdates = false;

            // Check each program for status changes
            programs.forEach(updatedProgram => {
                const existingProgram = this.programManager.getProgram(updatedProgram.id);

                if (existingProgram && existingProgram.status !== updatedProgram.status) {
                    // Status has changed, update the program
                    this.programManager.updateProgram(updatedProgram.id, updatedProgram);
                    hasUpdates = true;

                    // If status changed from 'update' or 'processing' to 'ready', we might want to show a success indicator
                    if ((existingProgram.status === 'update' || existingProgram.status === 'processing') && updatedProgram.status === 'ready') {
                        console.log(`Program "${updatedProgram.name}" is now ready!`);
                    }
                }
            });

            // Re-render programs if any status changed
            if (hasUpdates) {
                this.renderPrograms();
            }
        } catch (e) {
            console.warn('Failed to check program statuses:', e);
        }
    }

    // Clean up polling when component is destroyed
    destroy() {
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
            this.statusPollingInterval = null;
        }
    }
}
