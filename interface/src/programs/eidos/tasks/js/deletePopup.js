

export class DeletePopup {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.elements = {};
        this.taskToDelete = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            popup: this.ui.getElementById('deletePopup'),
            closeBtn: this.ui.getElementById('closeDeletePopup'),
            taskNameEl: this.ui.getElementById('deleteTaskName'),
            cancelBtn: this.ui.getElementById('cancelDeleteBtn'),
            confirmBtn: this.ui.getElementById('confirmDeleteBtn'),
            popupOverlay: this.ui.scope.querySelector('#deletePopup .popup-overlay')
        };
    }

    bindEvents() {

        this.elements.closeBtn && this.elements.closeBtn.addEventListener('click', () => this.close());
        this.elements.cancelBtn && this.elements.cancelBtn.addEventListener('click', () => this.close());
        this.elements.popupOverlay && this.elements.popupOverlay.addEventListener('click', () => this.close());
        
        this.elements.confirmBtn && this.elements.confirmBtn.addEventListener('click', () => {
            this.handleConfirmDelete();
        });


        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.popup?.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    open(task) {
        this.taskToDelete = task;
        if (this.elements.taskNameEl) {
            this.elements.taskNameEl.textContent = `"${task.title}"`;
        }
        this.elements.popup?.classList.remove('hidden');
    }

    close() {
        this.elements.popup?.classList.add('hidden');
        this.taskToDelete = null;
    }

    handleConfirmDelete() {
        if (this.taskToDelete) {

            const event = new CustomEvent('taskDeleteConfirmed', { 
                detail: { taskId: this.taskToDelete.id } 
            });
            this.ui.scope.dispatchEvent(event);
            this.close();
        }
    }
}
