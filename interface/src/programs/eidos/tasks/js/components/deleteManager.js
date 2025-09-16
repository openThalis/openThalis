export class DeleteManager {
    constructor(taskDetailsPopup) {
        this.taskDetailsPopup = taskDetailsPopup;
        this.deleteConfirmationTimeout = null;
        this.isDeletingResponse = false;
    }

    async handleDeleteResponse() {
        if (!this.taskDetailsPopup.currentTask || this.taskDetailsPopup.responses.length === 0 ||
            this.taskDetailsPopup.responseManager.currentResponseIndex < 0) {
            console.warn('⚠️ No response selected for deletion');
            return;
        }

        if (this.isDeletingResponse) {
            console.log('⏳ Delete operation already in progress, ignoring click');
            return;
        }

        const deleteBtn = this.taskDetailsPopup.elements.deleteResponseBtn;
        if (!deleteBtn) return;

        // Check if we're already in confirmation mode
        if (deleteBtn.classList.contains('confirm-delete')) {
            // User confirmed, proceed with deletion
            await this.confirmDeleteResponse();
        } else {
            // Enter confirmation mode
            this.enterDeleteConfirmation();
        }
    }

    enterDeleteConfirmation() {
        const deleteBtn = this.taskDetailsPopup.elements.deleteResponseBtn;
        if (!deleteBtn) return;

        // Change button to confirmation state
        deleteBtn.classList.add('confirm-delete');
        deleteBtn.innerHTML = '✓';
        deleteBtn.title = 'Click to confirm deletion';

        // Clear any existing timeout
        if (this.deleteConfirmationTimeout) {
            clearTimeout(this.deleteConfirmationTimeout);
        }

        // Set timeout to revert back to normal state after 3 seconds
        this.deleteConfirmationTimeout = setTimeout(() => {
            this.exitDeleteConfirmation();
        }, 3000);
    }

    exitDeleteConfirmation() {
        const deleteBtn = this.taskDetailsPopup.elements.deleteResponseBtn;
        if (!deleteBtn) return;

        // Clear any existing classes
        deleteBtn.classList.remove('confirm-delete', 'deleting-response');

        // Revert button to normal state
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete response';

        if (this.deleteConfirmationTimeout) {
            clearTimeout(this.deleteConfirmationTimeout);
            this.deleteConfirmationTimeout = null;
        }
    }

    setDeleteButtonLoading() {
        const deleteBtn = this.taskDetailsPopup.elements.deleteResponseBtn;
        if (!deleteBtn) return;

        deleteBtn.classList.add('deleting-response');
        deleteBtn.innerHTML = '⏳';
        deleteBtn.title = 'Deleting response...';
        deleteBtn.disabled = true;
    }

    clearDeleteButtonLoading() {
        const deleteBtn = this.taskDetailsPopup.elements.deleteResponseBtn;
        if (!deleteBtn) return;

        deleteBtn.classList.remove('deleting-response');
        deleteBtn.disabled = false;

        // Revert to normal state
        this.exitDeleteConfirmation();
    }

    async confirmDeleteResponse() {
        const responseNumber = this.taskDetailsPopup.responseManager.currentResponseIndex + 1;

        // Set loading state
        this.isDeletingResponse = true;
        this.setDeleteButtonLoading();

        try {
            // Import the deleteTaskResponse function
            const { deleteTaskResponse } = await import('../api.js');

            // Call API to delete the response
            const updatedTask = await deleteTaskResponse(this.taskDetailsPopup.currentTask.id, this.taskDetailsPopup.responseManager.currentResponseIndex);

            // Update local task data
            this.taskDetailsPopup.currentTask = updatedTask;
            this.taskDetailsPopup.responses = updatedTask.responses || [];

            // Adjust current response index if necessary
            if (this.taskDetailsPopup.responses.length === 0) {
                this.taskDetailsPopup.responseManager.currentResponseIndex = 0;
            } else if (this.taskDetailsPopup.responseManager.currentResponseIndex >= this.taskDetailsPopup.responses.length) {
                this.taskDetailsPopup.responseManager.currentResponseIndex = this.taskDetailsPopup.responses.length - 1;
            }

            // Update the display
            this.taskDetailsPopup.responseManager.updateResponseDisplay();

            // Dispatch event to update main task list
            const event = new CustomEvent('taskResponseDeleted', {
                detail: { updatedTask: updatedTask }
            });
            this.taskDetailsPopup.ui.scope.dispatchEvent(event);

        } catch (error) {
            console.error('❌ Failed to delete response:', error.message);
            alert('Failed to delete response. Please try again.');
        } finally {
            // Always clear loading state
            this.isDeletingResponse = false;
            this.clearDeleteButtonLoading();
        }
    }

    bindDeleteEvents() {
        // Delete response button event
        this.taskDetailsPopup.elements.deleteResponseBtn && this.taskDetailsPopup.elements.deleteResponseBtn.addEventListener('click', () => {
            this.handleDeleteResponse();
        });
    }
}
