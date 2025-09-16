export class GlobalTaskUpdater {
    constructor(taskUI) {
        this.taskUI = taskUI;
        this.updateInterval = null;
        this.isUpdating = false;
    }

    startUpdates() {
        this.stopUpdates(); // Clear any existing interval

        // Start polling for global task list updates every 3 seconds
        this.updateInterval = setInterval(() => {
            this.checkForUpdates();
        }, 3000);

    }

    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('🌐 Global task list updater stopped');
        }
    }

    async checkForUpdates() {
        if (this.isUpdating) return; // Prevent overlapping updates

        this.isUpdating = true;

        try {
            // Import the API function here to avoid circular dependencies
            const { listTasks } = await import('../api.js');

            // Fetch fresh task data
            const freshTasks = await listTasks();

            // Check if any tasks have changed
            if (this.haveTasksChanged(freshTasks)) {
                // Update task manager with fresh data
                this.taskUI.taskManager.loadTasks(freshTasks);

                // Refresh the main task list
                this.taskUI.taskRenderer.renderTasks();

            }
        } catch (error) {
            console.warn('Failed to check for global task updates:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    haveTasksChanged(freshTasks) {
        const currentTasks = this.taskUI.taskManager.getAllTasks();

        // Compare lengths first
        if (currentTasks.length !== freshTasks.length) {
            return true;
        }

        // Compare each task's last_run and running_status
        for (const freshTask of freshTasks) {
            const currentTask = currentTasks.find(t => String(t.id) === String(freshTask.id));
            if (!currentTask) {
                return true; // New task found
            }

            // Check if critical fields have changed
            if (currentTask.last_run !== freshTask.last_run ||
                currentTask.running_status !== freshTask.running_status) {
                return true;
            }
        }

        return false; // No changes detected
    }
}
