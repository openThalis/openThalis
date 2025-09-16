class ConfirmationModal {
    constructor(options = {}) {
        this.options = {
            title: options.title || 'Confirm Action',
            message: options.message || '',
            confirmText: options.confirmText || 'Confirm',
            cancelText: options.cancelText || 'Cancel',
            confirmButtonType: options.confirmButtonType || 'destructive',
            modalType: options.modalType || 'destructive',
            onConfirm: options.onConfirm || null,
            onCancel: options.onCancel || null,
            highlightText: options.highlightText || null,
            showInput: options.showInput || false,
            inputPlaceholder: options.inputPlaceholder || '',
            inputValue: options.inputValue || '',
            inputValidation: options.inputValidation || null,
            ...options
        };
        
        this.overlay = null;
        this.modal = null;
        this.confirmButton = null;
        this.cancelButton = null;
        this.inputField = null;
        this.errorElement = null;
        this.isOpen = false;
        this.isLoading = false;
        
        this.init();
        this.bindEvents();
    }
    
    init() {
        this.overlay = document.createElement('div');
        this.overlay.className = `confirmation-modal-overlay confirmation-modal-${this.options.modalType}`;
        
        this.modal = document.createElement('div');
        this.modal.className = 'confirmation-modal';
        
        this.modal.innerHTML = `
            <div class="confirmation-modal-header">
                <h3 class="confirmation-modal-title">${this.options.title}</h3>
            </div>
            <div class="confirmation-modal-body">
                ${this.options.highlightText ? `<div class="confirmation-modal-email">${this.options.highlightText}</div>` : ''}
                ${this.options.showInput ? `
                    <div class="confirmation-modal-input-group">
                        <input type="email" 
                               class="confirmation-modal-input" 
                               placeholder="${this.options.inputPlaceholder}" 
                               value="${this.options.inputValue}">
                        <div class="confirmation-modal-input-error"></div>
                    </div>
                ` : ''}
                <div class="confirmation-modal-loading">
                    <div class="confirmation-modal-spinner"></div>
                    <span>Processing...</span>
                </div>
                <div class="confirmation-modal-actions">
                    <button class="confirmation-modal-button cancel">${this.options.cancelText}</button>
                    <button class="confirmation-modal-button ${this.options.confirmButtonType}">${this.options.confirmText}</button>
                </div>
            </div>
        `;
        
        this.overlay.appendChild(this.modal);
        
        this.confirmButton = this.modal.querySelector('.confirmation-modal-button.' + this.options.confirmButtonType);
        this.cancelButton = this.modal.querySelector('.confirmation-modal-button.cancel');
        this.loadingElement = this.modal.querySelector('.confirmation-modal-loading');
        this.actionsElement = this.modal.querySelector('.confirmation-modal-actions');
        this.inputField = this.modal.querySelector('.confirmation-modal-input');
        this.errorElement = this.modal.querySelector('.confirmation-modal-input-error');
    }
    
    bindEvents() {
        this.confirmButton.addEventListener('click', () => {
            this.handleConfirm();
        });
        
        this.cancelButton.addEventListener('click', () => {
            this.handleCancel();
        });
        
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.handleCancel();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen && !this.isLoading) {
                this.handleCancel();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.isOpen && !this.isLoading) {
                this.handleConfirm();
            }
        });
        
        // Add input validation
        if (this.inputField) {
            this.inputField.addEventListener('input', () => {
                this.validateInput();
            });
            
            this.inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.handleConfirm();
                }
            });
        }
    }
    
    validateInput() {
        if (!this.inputField || !this.options.inputValidation) return true;
        
        const value = this.inputField.value;
        const result = this.options.inputValidation(value);
        
        if (result === true) {
            this.errorElement.textContent = '';
            this.errorElement.style.display = 'none';
            this.confirmButton.disabled = false;
            return true;
        } else {
            this.errorElement.textContent = result;
            this.errorElement.style.display = 'block';
            this.confirmButton.disabled = true;
            return false;
        }
    }
    
    async handleConfirm() {
        if (this.isLoading) return;
        
        // Validate input if present
        if (this.inputField && !this.validateInput()) {
            return;
        }
        
        if (this.options.onConfirm) {
            this.setLoading(true);
            
            try {
                const inputValue = this.inputField ? this.inputField.value : null;
                const result = await this.options.onConfirm(inputValue);
                
                if (result !== false) {
                    this.close();
                }
            } catch (error) {
                console.error('Confirmation action failed:', error);
                this.setLoading(false);
            }
        } else {
            this.close();
        }
    }
    
    handleCancel() {
        if (this.isLoading) return;
        
        if (this.options.onCancel) {
            this.options.onCancel();
        }
        this.close();
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.confirmButton.disabled = true;
            this.cancelButton.disabled = true;
            this.loadingElement.classList.add('show');
            this.actionsElement.style.opacity = '0.5';
        } else {
            this.confirmButton.disabled = false;
            this.cancelButton.disabled = false;
            this.loadingElement.classList.remove('show');
            this.actionsElement.style.opacity = '1';
        }
    }
    
    open() {
        if (this.isOpen) return;
        
        document.body.appendChild(this.overlay);
        this.isOpen = true;
        
        requestAnimationFrame(() => {
            this.overlay.classList.add('show');
        });
        
        setTimeout(() => {
            this.confirmButton.focus();
        }, 300);
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.overlay.classList.remove('show');
        this.isOpen = false;
        
        setTimeout(() => {
            if (this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
        }, 300);
    }
    
    updateOptions(options) {
        this.options = { ...this.options, ...options };
        
        if (options.title) {
            const titleElement = this.modal.querySelector('.confirmation-modal-title');
            if (titleElement) titleElement.textContent = options.title;
        }
        
        if (options.message) {
            const messageElement = this.modal.querySelector('.confirmation-modal-message');
            if (messageElement) messageElement.textContent = options.message;
        }
        
        if (options.highlightText) {
            const emailElement = this.modal.querySelector('.confirmation-modal-email');
            if (emailElement) {
                emailElement.textContent = options.highlightText;
            } else {
                const messageElement = this.modal.querySelector('.confirmation-modal-message');
                const emailDiv = document.createElement('div');
                emailDiv.className = 'confirmation-modal-email';
                emailDiv.textContent = options.highlightText;
                messageElement.parentNode.insertBefore(emailDiv, messageElement.nextSibling);
            }
        }
    }
    
    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.isOpen = false;
    }
    
    static show(options) {
        const modal = new ConfirmationModal(options);
        modal.open();
        return modal;
    }
    
    static showRenameUserConfirmation(oldEmail, onConfirm, onCancel) {
        return ConfirmationModal.show({
            title: 'Rename Instance',
            highlightText: oldEmail,
            confirmText: 'Rename',
            cancelText: 'Cancel',
            confirmButtonType: 'edit',
            modalType: 'edit',
            showInput: true,
            inputPlaceholder: 'Enter new instance name',
            inputValue: oldEmail,
            inputValidation: (value) => {
                const instanceNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
                if (!value.trim()) return 'Instance name is required';
                if (!instanceNameRegex.test(value)) return 'Instance name can only contain letters, numbers, spaces, hyphens, and underscores';
                if (value.length < 2 || value.length > 50) return 'Instance name must be between 2 and 50 characters';
                if (value === oldEmail) return 'New instance name must be different from current instance name';
                return true;
            },
            onConfirm: (inputValue) => onConfirm(inputValue),
            onCancel: onCancel
        });
    }
    
    static showDeleteUserConfirmation(email, onConfirm, onCancel) {
        return ConfirmationModal.show({
            title: 'Delete Instance',
            highlightText: email,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmButtonType: 'destructive',
            modalType: 'destructive',
            onConfirm: onConfirm,
            onCancel: onCancel
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfirmationModal;
}

if (typeof window !== 'undefined') {
    window.ConfirmationModal = ConfirmationModal;
}
