export class LiveUpdates {
    constructor(taskDetailsPopup) {
        this.taskDetailsPopup = taskDetailsPopup;
        this.liveUpdateInterval = null;
        this.lastResponseCount = 0;
        this.currentPollingTaskId = null;
    }

    startLiveUpdates() {
        this.stopLiveUpdates();

        // Set the current polling task ID to prevent race conditions
        this.currentPollingTaskId = this.taskDetailsPopup.currentTask ? this.taskDetailsPopup.currentTask.id : null;

        // Reset tracking state
        this.lastResponseCount = this.taskDetailsPopup.responses.length;
        this.taskDetailsPopup.hasNewResponses = false;

        // Start polling every 3 seconds
        this.liveUpdateInterval = setInterval(() => {
            this.checkForUpdates();
        }, 3000);

    }

    stopLiveUpdates() {
        if (this.liveUpdateInterval) {
            clearInterval(this.liveUpdateInterval);
            this.liveUpdateInterval = null;
            this.currentPollingTaskId = null;
        }
    }

    async checkForUpdates() {
        if (!this.taskDetailsPopup.currentTask || !this.currentPollingTaskId) return;

        // Store the task ID we're about to poll for to validate against later
        const pollingTaskId = this.currentPollingTaskId;
        
        try {
            // Import the API function here to avoid circular dependencies
            const { getTask } = await import('../api.js');

            // Check if we have a getTask function, if not we'll need to add it
            if (typeof getTask === 'function') {
                const updatedTask = await getTask(pollingTaskId);
                
                // CRITICAL: Validate that this response is still for the current task
                // This prevents race conditions when switching between tasks
                if (!updatedTask || 
                    updatedTask.id !== this.currentPollingTaskId || 
                    !this.taskDetailsPopup.currentTask ||
                    updatedTask.id !== this.taskDetailsPopup.currentTask.id) {
                    console.log('🚫 Ignoring outdated task update response for task:', updatedTask?.id);
                    return;
                }
                
                if (this.hasTaskChanged(updatedTask)) {
                    this.updateTaskDetails(updatedTask);
                }
            }
        } catch (error) {
            console.warn('Failed to check for task updates:', error);
        }
    }

    hasTaskChanged(updatedTask) {
        // Check if responses have changed
        const currentResponseCount = this.taskDetailsPopup.responses.length;
        const updatedResponseCount = (updatedTask.responses || []).length;

        // Check if last_run has changed
        const currentLastRun = this.taskDetailsPopup.currentTask.last_run;
        const updatedLastRun = updatedTask.last_run;

        // Check if running status has changed
        const currentRunningStatus = this.taskDetailsPopup.currentTask.running_status;
        const updatedRunningStatus = updatedTask.running_status;

        return currentResponseCount !== updatedResponseCount ||
               currentLastRun !== updatedLastRun ||
               currentRunningStatus !== updatedRunningStatus;
    }

    updateTaskDetails(updatedTask) {
        // Additional safeguard: validate the task ID one more time before updating
        if (!updatedTask || 
            !this.taskDetailsPopup.currentTask ||
            updatedTask.id !== this.taskDetailsPopup.currentTask.id) {
            console.warn('🚫 Blocked invalid task update in updateTaskDetails');
            return;
        }

        const previousResponseCount = this.taskDetailsPopup.responses.length;
        const newResponseCount = (updatedTask.responses || []).length;

        // Preserve the user's current response index position
        const currentIndex = this.taskDetailsPopup.responseManager.currentResponseIndex;

        // Update current task in popup
        this.taskDetailsPopup.currentTask = updatedTask;
        this.taskDetailsPopup.responses = updatedTask.responses || [];

        // CRITICAL: Also update the task in the main task manager 
        // This ensures that when the popup is closed and reopened, 
        // it gets the latest data instead of stale data
        const taskInManager = this.taskDetailsPopup.ui.taskManager.getTask(updatedTask.id);
        if (taskInManager) {
            Object.assign(taskInManager, updatedTask);
            
            // Also refresh the main task list to show updated "last run" times
            this.taskDetailsPopup.ui.taskRenderer.renderTasks();
        }

        // Check if we got new responses
        if (newResponseCount > previousResponseCount) {
            this.taskDetailsPopup.hasNewResponses = true;
            this.showNewResponseIndicator();
        }

        // Update UI but preserve user's current position
        this.taskDetailsPopup.populateTaskDetails(updatedTask, true, currentIndex);
    }

    showNewResponseIndicator() {
        // Add visual indicator to the latest response button
        if (this.taskDetailsPopup.elements.latestResponseBtn) {
            this.taskDetailsPopup.elements.latestResponseBtn.classList.add('has-new-responses');
            // Use a more stable approach to add the indicator
            if (!this.taskDetailsPopup.elements.latestResponseBtn.querySelector('.new-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'new-indicator';
                indicator.textContent = 'NEW';
                this.taskDetailsPopup.elements.latestResponseBtn.appendChild(indicator);
            }
        }

        // Add notification badge to response counter
        if (this.taskDetailsPopup.elements.responseCounter) {
            this.taskDetailsPopup.elements.responseCounter.classList.add('has-updates');
        }
    }

    hideNewResponseIndicator() {
        // Remove visual indicators
        if (this.taskDetailsPopup.elements.latestResponseBtn) {
            this.taskDetailsPopup.elements.latestResponseBtn.classList.remove('has-new-responses');
            const indicator = this.taskDetailsPopup.elements.latestResponseBtn.querySelector('.new-indicator');
            if (indicator) {
                indicator.remove();
            }
        }

        if (this.taskDetailsPopup.elements.responseCounter) {
            this.taskDetailsPopup.elements.responseCounter.classList.remove('has-updates');
        }
    }
}
