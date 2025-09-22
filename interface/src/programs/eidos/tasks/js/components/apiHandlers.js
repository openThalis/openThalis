import { createTask, updateTask, deleteTask, getAvailableAgents } from '../api.js';

export class ApiHandlers {
    constructor(taskUI) {
        this.taskUI = taskUI;
    }

    async handleCreateTaskFromPopup(formData) {
        try {
            const created = await createTask(formData);
            this.taskUI.taskManager.addTaskFromServer(created);
            this.taskUI.taskRenderer.renderTasks();
        } catch (e) {
            this.taskUI.showError('Failed to create task');
        }
    }

    async handleEditTaskFromPopup(taskId, formData) {
        try {
            const updated = await updateTask(taskId, formData);
            const local = this.taskUI.taskManager.getTask(taskId);
            if (local) {
                Object.assign(local, updated);
            }
            this.taskUI.taskRenderer.renderTasks();
        } catch (e) {
            this.taskUI.showError('Failed to update task');
        }
    }

    async handleDeleteTaskConfirmed(taskId) {
        try {
            await deleteTask(taskId);
            this.taskUI.taskManager.removeTask(taskId);
            this.taskUI.taskRenderer.renderTasks();
        } catch (e) {
            this.taskUI.showError('Failed to delete task');
        }
    }

    async handleCloneTaskFromPopup(taskData) {
        try {
            // Create new task with cloned data, excluding the original ID
            const { id, ...cloneData } = taskData;
            const created = await createTask(cloneData);
            this.taskUI.taskManager.addTaskFromServer(created);
            this.taskUI.taskRenderer.renderTasks();
        } catch (e) {
            this.taskUI.showError('Failed to clone task');
        }
    }

    async handleRunStopTask(taskId, runningStatus) {
        try {
            const updated = await updateTask(taskId, { running_status: runningStatus });
            const local = this.taskUI.taskManager.getTask(taskId);
            if (local) {
                Object.assign(local, updated);
                // Update the current task in popup if it's open for editing
                if (this.taskUI.taskSettings && this.taskUI.taskSettings.isEditMode && this.taskUI.taskSettings.editingTaskId === taskId) {
                    this.taskUI.taskSettings.currentTask = local;
                    this.taskUI.taskSettings.updateRunStopButton(local);
                }
            }
            this.taskUI.taskRenderer.renderTasks();

        } catch (e) {
            this.taskUI.showError('Failed to update task status');
            console.error('Error updating task run status:', e);
        }
    }

    async loadAvailableAgents() {
        try {
            const agentSelect = this.taskUI.getElementById('taskAgent');
            if (!agentSelect) return;

            const { agents, defaultAgent } = await getAvailableAgents();

            // Clear existing options
            agentSelect.innerHTML = '';

            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select an agent';
            agentSelect.appendChild(defaultOption);

            // Add agent options
            Object.entries(agents).forEach(([agentName, agentDescription]) => {
                const option = document.createElement('option');
                option.value = agentName;
                option.textContent = agentName;
                option.title = agentDescription; // Show description as tooltip
                agentSelect.appendChild(option);
            });

            // Set default agent if available
            if (defaultAgent && agents[defaultAgent]) {
                agentSelect.value = defaultAgent;
            }

        } catch (e) {
            console.warn('Failed to load available agents:', e);
            // Set a fallback message in the dropdown
            const agentSelect = this.taskUI.getElementById('taskAgent');
            if (agentSelect) {
                agentSelect.innerHTML = '<option value="">No agents available</option>';
            }
        }
    }

    handleTaskResponseDeleted(updatedTask) {
        // Update the task in the task manager
        const local = this.taskUI.taskManager.getTask(updatedTask.id);
        if (local) {
            Object.assign(local, updatedTask);
            this.taskUI.taskRenderer.renderTasks();
        }
    }
}
