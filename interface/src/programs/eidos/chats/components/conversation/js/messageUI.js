import { deleteMessage, updateMessageContent } from './messageApi.js';

// UI operations
export function appendMessage(root, role, content, messageId = null) {
    const messagesContainer = root.querySelector('.messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    if (messageId) {
        messageDiv.dataset.messageId = messageId;
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    messageDiv.appendChild(contentDiv);

    if (messageId) {
        buildMessageActionsMenu(messageDiv);
    } else {
        const loading = document.createElement('span');
        loading.className = 'loading-actions';
        loading.textContent = 'Loading...';
        messageDiv.appendChild(loading);
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
}

export function updateMessageWithId(root, messageId) {
    const messages = root.querySelectorAll('.message');
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && !lastMessage.dataset.messageId) {
        lastMessage.dataset.messageId = messageId;
        // Attach dropdown actions now that we have an ID
        attachMessageActions(lastMessage);
    }
}

export function startEditing(messageDiv) {
    // Don't allow editing if we don't have a message ID
    if (!messageDiv.dataset.messageId) {
        console.warn('Cannot edit message: waiting for message ID');
        return;
    }

    const contentDiv = messageDiv.querySelector('.message-content');
    const originalContent = contentDiv.textContent;

    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.value = originalContent;
    contentDiv.textContent = '';
    contentDiv.appendChild(textarea);

    // Hide menu while editing
    const trigger = messageDiv.querySelector('.message-menu-trigger');
    const dropdown = messageDiv.querySelector('.message-actions-dropdown');
    if (trigger) trigger.style.display = 'none';
    if (dropdown) dropdown.classList.remove('open');

    // Create inline edit controls
    const controls = document.createElement('div');
    controls.className = 'message-edit-controls';

    const saveButton = document.createElement('button');
    saveButton.className = 'save-message';
    saveButton.textContent = 'Save';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-edit';
    cancelButton.textContent = 'Cancel';

    controls.appendChild(saveButton);
    controls.appendChild(cancelButton);
    messageDiv.appendChild(controls);

    // Handle save
    saveButton.onclick = async () => {
        const newContent = textarea.value.trim();
        const messageId = messageDiv.dataset.messageId;
        const root = messageDiv.closest('.chats-component');
        const instanceId = root?.dataset.chatsInstanceId;
        
        if (!messageId) {
            console.error('Cannot save edit: Message ID is missing');
            finishEditing(messageDiv, originalContent);
            return;
        }
        
        const updated = await updateMessageContent(messageId, newContent, instanceId);
        finishEditing(messageDiv, updated ? newContent : originalContent);
    };

    // Handle cancel
    cancelButton.onclick = () => {
        finishEditing(messageDiv, originalContent);
    };

    textarea.focus();
}

function finishEditing(messageDiv, content) {
    const contentDiv = messageDiv.querySelector('.message-content');
    const messageId = messageDiv.dataset.messageId;

    // Remove edit controls if present
    const controls = messageDiv.querySelector('.message-edit-controls');
    if (controls) controls.remove();

    // Restore content
    contentDiv.textContent = content;

    // Restore menu if we have a message ID
    if (messageId) {
        let trigger = messageDiv.querySelector('.message-menu-trigger');
        if (!trigger) {
            buildMessageActionsMenu(messageDiv);
        } else {
            trigger.style.display = 'inline-flex';
        }
    }
}

export function attachMessageActions(messageDiv) {
    // Remove loading if present and attach menu
    const loading = messageDiv.querySelector('.loading-actions');
    if (loading) loading.remove();
    if (!messageDiv.querySelector('.message-menu-trigger')) {
        buildMessageActionsMenu(messageDiv);
    }
}

function buildMessageActionsMenu(messageDiv) {
    // Prevent duplicates
    if (messageDiv.querySelector('.message-menu-trigger')) return;

    const trigger = document.createElement('button');
    trigger.className = 'message-menu-trigger';
    trigger.setAttribute('title', 'Message actions');
    trigger.innerHTML = '<span class="material-icons">edit</span>';

    const dropdown = document.createElement('div');
    dropdown.className = 'message-actions-dropdown';

    const makeItem = (label, className) => {
        const btn = document.createElement('button');
        btn.className = `menu-item ${className || ''}`.trim();
        btn.textContent = label;
        return btn;
    };

    const editItem = makeItem('Edit');
    editItem.onclick = (e) => { e.stopPropagation(); closeDropdown(); startEditing(messageDiv); };

    const deleteItem = makeItem('Delete', 'danger');
    deleteItem.onclick = async (e) => {
        e.stopPropagation();
        closeDropdown();
        const messageId = messageDiv.dataset.messageId;
        const root = messageDiv.closest('.chats-component');
        const instanceId = root?.dataset.chatsInstanceId;
        if (messageId && await deleteMessage(messageId, instanceId)) {
            messageDiv.remove();
        }
    };

    dropdown.appendChild(editItem);
    dropdown.appendChild(deleteItem);

    let isOpen = false;
    let removeOutsideClick = null;
    let removeResize = null;
    let removeScroll = null;

    const root = messageDiv.closest('.chats-component');
    const messagesContainer = root?.querySelector('.messages-container');

    function positionDropdown() {
        if (!isOpen) return;
        // Prepare for measurement without flicker
        const prevPosition = dropdown.style.position;
        const prevVisibility = dropdown.style.visibility;
        const prevLeft = dropdown.style.left;
        const prevTop = dropdown.style.top;
        const prevRight = dropdown.style.right;

        dropdown.style.position = 'fixed';
        dropdown.style.visibility = 'hidden';
        dropdown.style.left = '0px';
        dropdown.style.top = '0px';
        dropdown.style.right = 'auto';
        dropdown.style.zIndex = '9999';
        dropdown.classList.add('open');

        // Measure
        const triggerRect = trigger.getBoundingClientRect();
        const menuRect = dropdown.getBoundingClientRect();
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const margin = 8;

        // Preferred: below trigger, right-aligned to trigger
        let left = Math.min(
            Math.max(triggerRect.right - menuRect.width, margin),
            viewportW - menuRect.width - margin
        );
        let top = triggerRect.bottom + margin;

        // If overflow bottom, place above
        if (top + menuRect.height > viewportH - margin) {
            const above = triggerRect.top - menuRect.height - margin;
            top = Math.max(margin, above);
        }

        // Ensure within viewport vertically
        if (top < margin) top = margin;

        // Ensure within viewport horizontally
        if (left < margin) left = margin;

        // Apply
        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${top}px`;
        dropdown.style.visibility = 'visible';

        // Restore non-needed saved values (we keep fixed/left/top/zIndex)
        if (prevPosition && prevPosition !== 'fixed') {
            // noop, we intentionally keep fixed while open
        }
        if (prevRight) {
            // ensure right isn't re-applied
        }
        if (prevLeft) {
            // ensure left now set to computed
        }
        if (prevTop) {
            // ensure top now set to computed
        }
        if (prevVisibility) {
            // visibility now visible
        }
    }

    function openDropdown() {
        if (isOpen) return;
        isOpen = true;
        dropdown.classList.add('open');
        // Switch to viewport-fixed overlay to avoid clipping
        dropdown.style.position = 'fixed';
        dropdown.style.right = 'auto';
        dropdown.style.zIndex = '9999';
        positionDropdown();

        // Outside click
        const outsideClick = (e) => {
            if (!messageDiv.contains(e.target) && !dropdown.contains(e.target)) {
                closeDropdown();
            }
        };
        document.addEventListener('click', outsideClick);
        removeOutsideClick = () => document.removeEventListener('click', outsideClick);

        // Re-position on resize
        const onResize = () => positionDropdown();
        window.addEventListener('resize', onResize);
        removeResize = () => window.removeEventListener('resize', onResize);

        // Re-position on scroll of container and window (in case of page scroll)
        const onScroll = () => positionDropdown();
        if (messagesContainer) messagesContainer.addEventListener('scroll', onScroll);
        window.addEventListener('scroll', onScroll, true);
        removeScroll = () => {
            if (messagesContainer) messagesContainer.removeEventListener('scroll', onScroll);
            window.removeEventListener('scroll', onScroll, true);
        };
    }

    function closeDropdown() {
        if (!isOpen) return;
        isOpen = false;
        dropdown.classList.remove('open');
        // Restore default positioning rules
        dropdown.style.position = '';
        dropdown.style.left = '';
        dropdown.style.top = '';
        dropdown.style.right = '';
        dropdown.style.zIndex = '';

        if (removeOutsideClick) { removeOutsideClick(); removeOutsideClick = null; }
        if (removeResize) { removeResize(); removeResize = null; }
        if (removeScroll) { removeScroll(); removeScroll = null; }
    }

    trigger.onclick = (e) => {
        e.stopPropagation();
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    };

    // Select message on click (and manage showing trigger by CSS)
    messageDiv.addEventListener('click', (e) => {
        // Ignore clicks that originate from the dropdown or trigger
        if (e.target.closest('.message-actions-dropdown') || e.target.closest('.message-menu-trigger')) return;
        const root = messageDiv.closest('.chats-component');
        root?.querySelectorAll('.messages-container .message.selected').forEach(m => {
            if (m !== messageDiv) m.classList.remove('selected');
        });
        messageDiv.classList.add('selected');
    });

    // Ensure clicking trigger also selects this message
    trigger.addEventListener('click', () => {
        const root = messageDiv.closest('.chats-component');
        root?.querySelectorAll('.messages-container .message.selected').forEach(m => {
            if (m !== messageDiv) m.classList.remove('selected');
        });
        messageDiv.classList.add('selected');
    });

    // Close dropdown and deselect when clicking outside the entire component
    // (extra safety in addition to the open-state handler)
    document.addEventListener('click', (e) => {
        if (!messageDiv.contains(e.target) && isOpen) {
            closeDropdown();
            messageDiv.classList.remove('selected');
        }
    });

    messageDiv.appendChild(trigger);
    messageDiv.appendChild(dropdown);
}

// Removed insert-below behavior as requested