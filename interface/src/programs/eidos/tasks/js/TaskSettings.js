import { FrequencyManager } from './components/frequencyManager.js';
import { FormManager } from './components/formManager.js';
import { AgentManager } from './components/agentManager.js';

export class TaskSettings {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.elements = {};
        this.currentTask = null;  // Track the current task being edited
        this.isEditMode = false;
        this.editingTaskId = null;

        // Initialize component managers
        this.frequencyManager = new FrequencyManager(this);
        this.formManager = new FormManager(this);
        this.agentManager = new AgentManager(this);

        this.initializeElements();
        this.bindEvents();
        this.frequencyManager.updateDateControls(); // Initialize visibility on startup
    }

    initializeElements() {
        this.elements = {
            panel: this.ui.getElementById('taskSettings'),
            sidebar: this.ui.getElementById('tasksSidebar'),
            closeBtn: this.ui.getElementById('closeTaskSettings'),
            errorBox: this.ui.getElementById('taskSettingsError'),
            titleInput: this.ui.getElementById('taskTitle'),
            descriptionInput: this.ui.getElementById('taskDescription'),
            agentSelect: this.ui.getElementById('taskAgent'),
            timeInput: this.ui.getElementById('taskTime'),
            dateInput: this.ui.getElementById('taskDate'),
            dayOfWeekSelect: this.ui.getElementById('dayOfWeek'),
            dayOfMonthSelect: this.ui.getElementById('dayOfMonth'),
            createBtn: this.ui.getElementById('createTaskBtn'),
            frequencyBtns: this.ui.scope.querySelectorAll('.frequency-btn'),
            nowOrDateChoice: this.ui.getElementById('nowOrDateChoice'),
            nowBtn: this.ui.getElementById('nowBtn'),
            scheduleDateBtn: this.ui.getElementById('scheduleDateBtn'),
            timeControl: this.ui.scope.querySelector('.time-control'),
            actionButtons: this.ui.getElementById('taskSettingsActionButtons'),
            runStopBtn: this.ui.getElementById('taskSettingsRunStopBtn'),
            runStopIcon: this.ui.getElementById('taskSettingsRunStopIcon'),
            runStopText: this.ui.getElementById('taskSettingsRunStopText'),
            cloneBtn: this.ui.getElementById('taskSettingsCloneBtn'),
            deleteBtn: this.ui.getElementById('taskSettingsDeleteBtn')
        };
    }

    bindEvents() {
        this.elements.closeBtn && this.elements.closeBtn.addEventListener('click', () => this.close());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.panel?.classList.contains('hidden')) {
                this.close();
            }
        });

        this.frequencyManager.bindFrequencyEvents();
        this.formManager.bindFormEvents();

        this.elements.createBtn && this.elements.createBtn.addEventListener('click', () => {
            this.handleCreateTask();
        });

        this.elements.titleInput && this.elements.titleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleCreateTask();
            }
        });

        // Run/stop button event
        this.elements.runStopBtn && this.elements.runStopBtn.addEventListener('click', () => {
            this.handleRunStop();
        });

        // Clone and delete button events
        this.elements.cloneBtn && this.elements.cloneBtn.addEventListener('click', () => {
            this.handleClone();
        });

        this.elements.deleteBtn && this.elements.deleteBtn.addEventListener('click', () => {
            this.handleDelete();
        });
    }

    async handleCreateTask() {
        const validation = this.formManager.validateForm();
        if (!validation.valid) {
            this.formManager.showError(validation.message);
            return;
        }

        const formData = this.formManager.getFormData();

        if (this.isEditMode) {
            const event = new CustomEvent('taskEdit', {
                detail: { taskId: this.editingTaskId, formData }
            });
            this.ui.scope.dispatchEvent(event);
        } else {
            const event = new CustomEvent('taskCreate', { detail: formData });
            this.ui.scope.dispatchEvent(event);
        }

        this.close();
    }

    async open() {
        // Hide task details panel if it's open
        const taskDetailsPanel = this.ui.getElementById('taskDetailsPopup');
        if (taskDetailsPanel) {
            taskDetailsPanel.classList.add('hidden');
        }

        // Show sidebar and task settings panel
        this.elements.sidebar?.classList.remove('hidden');
        this.elements.panel?.classList.remove('hidden');
        this.elements.titleInput?.focus();

        // Reload available agents
        await this.agentManager.loadAvailableAgents();
    }

    close() {
        this.elements.panel?.classList.add('hidden');
        this.elements.sidebar?.classList.add('hidden');
    }

    async openForEdit(task) {
        this.isEditMode = true;
        this.editingTaskId = task.id;
        this.currentTask = task;
        this.elements.createBtn.innerHTML = '<span class="btn-text">Update Task</span>';

        this.formManager.populateForm(task);
        this.updateRunStopButton(task);
        this.showActionButtons(true); // Show action buttons for editing
        await this.open();
    }

    async openForCreate() {
        this.isEditMode = false;
        this.editingTaskId = null;
        this.currentTask = null;
        this.elements.createBtn.innerHTML = '<span class="btn-text">Create Task</span>';

        this.formManager.reset();
        this.showActionButtons(false); // Hide action buttons for creating
        await this.open();
    }

    showActionButtons(show) {
        if (this.elements.actionButtons) {
            if (show) {
                this.elements.actionButtons.classList.remove('hidden');
            } else {
                this.elements.actionButtons.classList.add('hidden');
            }
        }
    }

    handleClone() {
        if (this.isEditMode && this.editingTaskId) {
            // Get current task data from the form and generate unique clone title
            const currentTitle = this.elements.titleInput.value || 'Untitled Task';
            const clonedTitle = this.generateUniqueCloneTitle(currentTitle);

            const currentTask = {
                id: this.editingTaskId,
                title: clonedTitle,
                description: this.elements.descriptionInput.value,
                assigned_agent: this.elements.agentSelect.value || null,
                schedule_summary: this.frequencyManager.generateScheduleText()
            };

            // Dispatch clone event with current form data
            const event = new CustomEvent('taskClone', { detail: currentTask });
            this.ui.scope.dispatchEvent(event);
            this.close();
        }
    }

    generateUniqueCloneTitle(baseTitle) {
        const existingTasks = this.ui.taskManager.getAllTasks();
        const existingTitles = existingTasks.map(task => task.title.trim().toLowerCase());
        
        // Try "baseTitle copy" first
        let cloneTitle = `${baseTitle} copy`;
        if (!existingTitles.includes(cloneTitle.toLowerCase())) {
            return cloneTitle;
        }
        
        // If that exists, try "baseTitle copy 2", "baseTitle copy 3", etc.
        let counter = 2;
        do {
            cloneTitle = `${baseTitle} copy ${counter}`;
            counter++;
        } while (existingTitles.includes(cloneTitle.toLowerCase()));
        
        return cloneTitle;
    }

    handleDelete() {
        if (this.isEditMode && this.editingTaskId) {
            // Dispatch delete event
            const event = new CustomEvent('taskDeleteFromPopup', {
                detail: { taskId: this.editingTaskId }
            });
            this.ui.scope.dispatchEvent(event);
            this.close();
        }
    }

    handleRunStop() {
        if (this.isEditMode && this.editingTaskId && this.currentTask) {
            // Toggle running status
            const newRunningStatus = !this.currentTask.running_status;

            // Dispatch run/stop event
            const event = new CustomEvent('taskRunStop', {
                detail: {
                    taskId: this.editingTaskId,
                    running_status: newRunningStatus
                }
            });
            this.ui.scope.dispatchEvent(event);
        }
    }

    updateRunStopButton(task) {
        if (!this.elements.runStopBtn || !this.elements.runStopIcon || !this.elements.runStopText) return;

        const isRunning = task && task.running_status;

        if (isRunning) {
            this.elements.runStopIcon.textContent = '⏹️';
            this.elements.runStopText.textContent = 'Stop';
            this.elements.runStopBtn.classList.add('running');
            this.elements.runStopBtn.title = 'Stop Task';
        } else {
            this.elements.runStopIcon.textContent = '🔄';
            this.elements.runStopText.textContent = 'Run';
            this.elements.runStopBtn.classList.remove('running');
            this.elements.runStopBtn.title = 'Run Task';
        }
    }
}
