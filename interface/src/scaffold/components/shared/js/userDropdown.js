class UserDropdown {
    constructor(containerElement, options = {}) {
        this.container = containerElement;
        this.options = {
            onDelete: options.onDelete || null,
            onRename: options.onRename || null,
            onHide: options.onHide || null,
            email: options.email || '',
            showHideName: options.showHideName !== false,
            showRename: options.showRename !== false,
            showDelete: options.showDelete !== false,
            ...options
        };

        this.dropdown = null;
        this.trigger = null;
        this.menu = null;
        this.backdrop = null;
        this.isOpen = false;

        this.init();
        this.bindEvents();
    }
    
    init() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'instance-settings';

        this.trigger = document.createElement('div');
        this.trigger.className = 'instance-settings-trigger';
        this.trigger.title = 'Instance settings';

        this.menu = document.createElement('div');
        this.menu.className = 'instance-settings-menu';

        this.backdrop = document.createElement('div');
        this.backdrop.className = 'instance-settings-backdrop';

        if (this.options.showHideName) {
            const hideItem = document.createElement('div');
            hideItem.className = 'instance-settings-item hide';
            hideItem.innerHTML = `
                <span class="instance-settings-text">Hide name</span>
            `;

            this.hideItem = hideItem;
            this.hideItemText = hideItem.querySelector('.instance-settings-text');

            hideItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleHideName();
            });

            this.menu.appendChild(hideItem);
        }

        if (this.options.showRename) {
            const renameItem = document.createElement('div');
            renameItem.className = 'instance-settings-item rename';
            renameItem.innerHTML = `
                <span class="instance-settings-text">Rename Instance</span>
            `;

            renameItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleRename();
            });

            this.menu.appendChild(renameItem);
        }

        if (this.options.showDelete) {
            const deleteItem = document.createElement('div');
            deleteItem.className = 'instance-settings-item delete';
            deleteItem.innerHTML = `
                <span class="instance-settings-text">Delete Instance</span>
            `;

            deleteItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDelete();
            });

            this.menu.appendChild(deleteItem);
        }
        this.dropdown.appendChild(this.trigger);
        this.container.appendChild(this.dropdown);

        document.body.appendChild(this.backdrop);
        document.body.appendChild(this.menu);

        if (this.options.showHideName) {
            this.updateHideNameLabel();
        }
    }
    
    bindEvents() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        this.backdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            this.close();
        });

        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.dropdown.contains(e.target) && !this.menu.contains(e.target)) {
                this.close();
            }
        });

        this.menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        if (this.options.showHideName) {
            this.updateHideNameLabel();
        }
        document.querySelectorAll('.instance-settings-menu.show').forEach(menu => {
            if (menu !== this.menu) {
                menu.classList.remove('show');
            }
        });

        document.querySelectorAll('.instance-settings-backdrop.show').forEach(backdrop => {
            if (backdrop !== this.backdrop) {
                backdrop.classList.remove('show');
            }
        });

        requestAnimationFrame(() => {
            this.backdrop.classList.add('show');
            requestAnimationFrame(() => {
                this.menu.classList.add('show');
                this.isOpen = true;
            });
        });
    }
    
    close() {
        this.menu.classList.remove('show');
        this.backdrop.classList.remove('show');
        this.isOpen = false;
    }
    
    handleRename() {
        this.close();
        
        if (this.options.onRename) {
            this.options.onRename(this.options.email);
        }
    }
    
    handleDelete() {
        this.close();

        if (this.options.onDelete) {
            this.options.onDelete(this.options.email);
        }
    }

    handleHideName() {
        const email = this.options.email;
        const instanceTitle = document.getElementById('instance_title');
        if (!instanceTitle) return;
        
        const currentlyHidden = instanceTitle.classList.contains('hidden');
        const nextHidden = !currentlyHidden;

        try {
            const key = this.getVisibilityKey(email);
            localStorage.setItem(key, String(nextHidden));
        } catch (err) {
            console.error('Failed to persist name visibility:', err);
        }

        this.applyTopBarVisibility(nextHidden);
        if (this.options.showHideName) {
            this.updateHideNameLabel();
        }
        this.close();

        if (this.options.onHide) {
            this.options.onHide(this.options.email);
        }
    }
    
    updateEmail(email) {
        this.options.email = email;
        if (this.options.showHideName) {
            this.updateHideNameLabel();
        }
    }
    
    destroy() {
        if (this.dropdown && this.dropdown.parentNode) {
            this.dropdown.parentNode.removeChild(this.dropdown);
        }
        if (this.backdrop && this.backdrop.parentNode) {
            this.backdrop.parentNode.removeChild(this.backdrop);
        }
        if (this.menu && this.menu.parentNode) {
            this.menu.parentNode.removeChild(this.menu);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserDropdown;
}

if (typeof window !== 'undefined') {
    window.UserDropdown = UserDropdown;
}

UserDropdown.prototype.getVisibilityKey = function(email) {
    const safeEmail = email || this.options.email || '';
    return `topbar:nameHidden:${encodeURIComponent(safeEmail)}`;
};

UserDropdown.prototype.isNameHidden = function() {
    try {
        const key = this.getVisibilityKey(this.options.email);
        return localStorage.getItem(key) === 'true';
    } catch (_) {
        return false;
    }
};

UserDropdown.prototype.updateHideNameLabel = function() {
    if (!this.hideItemText) return;
    
    // Check if the instance title is currently hidden in the DOM
    const instanceTitle = document.getElementById('instance_title');
    const isCurrentlyHidden = instanceTitle && instanceTitle.classList.contains('hidden');
    
    this.hideItemText.textContent = isCurrentlyHidden ? 'Show name' : 'Hide name';
};

UserDropdown.prototype.applyTopBarVisibility = function(hidden) {
    try {
        const instanceTitle = document.getElementById('instance_title');
        if (!instanceTitle) return;
        const currentName = instanceTitle.textContent && instanceTitle.textContent.trim();
        const email = this.options.email;
        if (!email) return;
        if (currentName === email) {
            if (hidden) {
                instanceTitle.classList.add('hidden');
            } else {
                instanceTitle.classList.remove('hidden');
            }
        }
    } catch (_) {
        // noop
    }
};
