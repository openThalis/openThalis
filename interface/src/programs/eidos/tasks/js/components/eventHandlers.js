export class EventHandlers {
    constructor(taskUI) {
        this.taskUI = taskUI;
    }

    bindEvents() {
        // Add task button click - show popup
        this.taskUI.elements.addTaskBtn.addEventListener('click', async () => {
            if (this.taskUI.taskSettings) {
                await this.taskUI.taskSettings.openForCreate();
            }
        });

        // Listen for task creation from popup
        this.taskUI.scope.addEventListener('taskCreate', (e) => {
            this.taskUI.apiHandlers.handleCreateTaskFromPopup(e.detail);
        });

        // Listen for task editing from popup
        this.taskUI.scope.addEventListener('taskEdit', (e) => {
            this.taskUI.apiHandlers.handleEditTaskFromPopup(e.detail.taskId, e.detail.formData);
        });

        // Listen for delete confirmation
        this.taskUI.scope.addEventListener('taskDeleteConfirmed', (e) => {
            this.taskUI.apiHandlers.handleDeleteTaskConfirmed(e.detail.taskId);
        });

        // Listen for clone from popup
        this.taskUI.scope.addEventListener('taskClone', (e) => {
            this.taskUI.apiHandlers.handleCloneTaskFromPopup(e.detail);
        });

        // Listen for delete from popup
        this.taskUI.scope.addEventListener('taskDeleteFromPopup', (e) => {
            this.taskUI.handleDeleteTask(e.detail.taskId);
        });

        // Listen for edit from task details popup
        this.taskUI.scope.addEventListener('taskEditFromDetails', (e) => {
            this.taskUI.handleEditTask(e.detail.taskId);
        });

        // Listen for response deletion from task details popup
        this.taskUI.scope.addEventListener('taskResponseDeleted', (e) => {
            this.taskUI.apiHandlers.handleTaskResponseDeleted(e.detail.updatedTask);
        });

        // Listen for run/stop from popup
        this.taskUI.scope.addEventListener('taskRunStop', (e) => {
            this.taskUI.apiHandlers.handleRunStopTask(e.detail.taskId, e.detail.running_status);
        });
    }

    async handleTaskClick(taskId, action) {
        switch (action) {
            case 'edit':
                await this.taskUI.handleEditTask(taskId);
                break;
            case 'run':
                await this.taskUI.handleRunTask(taskId);
                break;
        }

        this.taskUI.taskRenderer.renderTasks();
    }

    initialize() {
        // EventHandlers initialization - events are already bound in constructor
        // This method exists for compatibility with the main initialization flow
    }
}
