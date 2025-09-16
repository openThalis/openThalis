import { TaskRenderer } from './components/taskRenderer.js';
import { EventHandlers } from './components/eventHandlers.js';
import { TaskSettings } from './TaskSettings.js';
import { DeletePopup } from './deletePopup.js';
import { TaskDetailsPopup } from './TaskDetailsPopup.js';
import { ApiHandlers } from './components/apiHandlers.js';

export class TaskUI {
    constructor(taskManager, scope = document) {
        this.taskManager = taskManager;
        this.scope = scope;
        this.elements = {};

        // Initialize component managers
        this.taskRenderer = new TaskRenderer(this);
        this.eventHandlers = new EventHandlers(this);
        this.apiHandlers = new ApiHandlers(this);

        this.initializeElements();
        this.eventHandlers.bindEvents();
    }

    getElementById(id) {
        if (this.scope === document) {
            return document.getElementById(id);
        }
        return this.scope.querySelector(`#${id}`);
    }

    initializeElements() {
        this.elements = {
            addTaskBtn: this.getElementById('addTaskBtn'),
            taskList: this.getElementById('taskList')
        };
    }

    async handleEditTask(taskId) {
        const task = this.taskManager.getTask(taskId);
        if (!task) return;

        if (this.taskSettings) {
            await this.taskSettings.openForEdit(task);
        }
    }

    async handleDeleteTask(taskId) {
        const task = this.taskManager.getTask(taskId);
        if (!task) return;

        if (this.deletePopup) {
            this.deletePopup.open(task);
        }
    }

    async handleRunTask(taskId) {
        const task = this.taskManager.getTask(taskId);
        if (task) {
            // Toggle running status when run is clicked
            const newRunningStatus = !task.running_status;
            await this.apiHandlers.handleRunStopTask(taskId, newRunningStatus);
        } else {
            console.log(`⚠️ Task not found: ${taskId}`);
        }
    }

    async handleShowTaskDetails(taskId) {
        const task = this.taskManager.getTask(taskId);
        if (!task) return;

        if (this.taskDetailsPopup) {
            await this.taskDetailsPopup.open(task);
        }
    }

    showError(message) {
        alert(message);
    }

    async initialize() {
        try {
            const { listTasks } = await import('./api.js');
            const tasks = await listTasks();
            this.taskManager.loadTasks(tasks);
            this.taskRenderer.renderTasks();
            await this.apiHandlers.loadAvailableAgents();
        } catch (e) {
            this.showError('Failed to load tasks from server');
            console.error('Failed to load tasks:', e);
            await this.apiHandlers.loadAvailableAgents();
        }
    }

    async handleTaskClick(taskId, action) {
        switch (action) {
            case 'edit':
                await this.handleEditTask(taskId);
                break;
            case 'run':
                await this.handleRunTask(taskId);
                break;
        }

        this.taskRenderer.renderTasks();
    }

    // Set references to other components (called by main initialization)
    setComponents(taskSettings, deletePopup, taskDetailsPopup) {
        this.taskSettings = taskSettings;
        this.deletePopup = deletePopup;
        this.taskDetailsPopup = taskDetailsPopup;
    }
}
