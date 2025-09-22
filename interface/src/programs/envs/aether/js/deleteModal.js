export class DeleteModal {
    constructor(uiInstance) {
        this.ui = uiInstance;
        this.elements = {};
        this.programToDelete = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            modal: this.ui.getElementById('deleteProgramModal'),
            closeBtn: this.ui.getElementById('closeDeleteModal'),
            programNameEl: this.ui.getElementById('deleteConfirmName'),
            cancelBtn: this.ui.getElementById('cancelDeleteBtn'),
            confirmBtn: this.ui.getElementById('confirmDeleteBtn'),
            modalOverlay: this.ui.scope.querySelector('#deleteProgramModal')
        };
    }

    bindEvents() {
        // Close button
        this.elements.closeBtn && this.elements.closeBtn.addEventListener('click', () => this.close());
        
        // Cancel button
        this.elements.cancelBtn && this.elements.cancelBtn.addEventListener('click', () => this.close());
        
        // Confirm delete button
        this.elements.confirmBtn && this.elements.confirmBtn.addEventListener('click', () => {
            this.handleConfirmDelete();
        });

        // Click outside modal to close
        this.elements.modalOverlay && this.elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.modalOverlay) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.elements.modal?.classList.contains('hidden')) {
                this.close();
            }
        });
    }

    open(program) {
        this.programToDelete = program;
        if (this.elements.programNameEl) {
            this.elements.programNameEl.textContent = program.name || 'Unnamed Program';
        }
        this.elements.modal?.classList.remove('hidden');
    }

    close() {
        this.elements.modal?.classList.add('hidden');
        this.programToDelete = null;
    }

    handleConfirmDelete() {
        if (this.programToDelete) {
            // Dispatch delete confirmed event
            const event = new CustomEvent('programDeleteConfirmed', { 
                detail: { programId: this.programToDelete.id } 
            });
            this.ui.scope.dispatchEvent(event);
            this.close();
        }
    }
}
