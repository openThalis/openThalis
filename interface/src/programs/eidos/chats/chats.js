import { initializeWebSocket, closeWebSocket } from '/src/programs/eidos/chats/js/websocket.js';
import { appendMessage, setCurrentConversationId, getCurrentConversationId, updateMessageWithId } from '/src/programs/eidos/chats/components/conversation/conversation.js';
import { loadConversations, loadConversation, startNewChat, updateConversationTitle, forkConversation, deleteConversation } from '/src/programs/eidos/chats/components/left_bar/left_bar.js';
import { showError, setupMessageInput } from '/src/programs/eidos/chats/js/utils.js';
import { openConfirmModal, openPromptModal } from '/src/programs/eidos/chats/js/modals.js';
import globalAuth from '/src/scaffold/shared/instance/js/globalAuth.js';

// Per-instance registry
const instanceRegistry = new Map(); // instanceId -> { root }

// Track instances being moved during drag and drop to prevent premature cleanup
const instancesBeingMoved = new Set();

// Exported initializer that supports multi-tab by scoping to the given container
export function initializeChats(rootElement) {
    const root = rootElement || document.querySelector('.chats-component');
    if (!root) {
        console.error('Chats component container not found');
        return;
    }

    // Create unique instance id and mark the root
    const instanceId = `chats-${Math.random().toString(36).slice(2)}`;
    root.dataset.chatsInstanceId = instanceId;
    instanceRegistry.set(instanceId, { root });

    // Initialize UI within this root
    initializeChatsComponent(root, instanceId);

    // Cleanup when this root is removed from DOM
    const parent = root.parentNode;
    if (parent) {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                m.removedNodes.forEach((n) => {
                    if (n === root || (n.contains && n.contains(root))) {
                        // Skip cleanup if this instance is being moved during drag and drop
                        if (instancesBeingMoved.has(instanceId)) {
                            return;
                        }
                        // Root removed: cleanup
                        try { closeWebSocket(instanceId); } catch {}
                        instanceRegistry.delete(instanceId);
                        observer.disconnect();
                    }
                });
            }
        });
        observer.observe(parent, { childList: true, subtree: false });
    }

    return instanceId;
}

// Global cleanup hook when a tab is closed
document.addEventListener('tabs:removed', (e) => {
    try {
        const contentElement = e?.detail?.contentElement;
        if (!contentElement) return;
        const root = contentElement.querySelector('.chats-component');
        const instanceId = root?.dataset?.chatsInstanceId;
        if (instanceId) {
            // Skip cleanup if this instance is being moved during drag and drop
            if (instancesBeingMoved.has(instanceId)) {
                return;
            }
            closeWebSocket(instanceId);
            instanceRegistry.delete(instanceId);
        }
    } catch {}
});

// Export functions to manage drag and drop state
export function markInstanceAsBeingMoved(instanceId) {
    instancesBeingMoved.add(instanceId);
}

export function unmarkInstanceAsBeingMoved(instanceId) {
    instancesBeingMoved.delete(instanceId);
}

// Initialize DOM elements within the component (scoped)
function initializeChatsComponent(chatsContainer, instanceId) {
    const toggleLeft = chatsContainer.querySelector('#toggleLeft');
    const leftBar = chatsContainer.querySelector('.left-bar');
    const appContainer = chatsContainer.querySelector('.app-container');
    const settingsBtn = chatsContainer.querySelector('#chatSettingsBtn');
    const settingsMenu = chatsContainer.querySelector('#chatSettingsMenu');
    const chatHeader = chatsContainer.querySelector('.chat-header');
    const newChatBtn = chatsContainer.querySelector('#newChatBtn');

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => startNewChat(chatsContainer, instanceId));
    }
    
    // Show the app container (no need for login overlay since global auth handles it)
    if (appContainer) appContainer.style.display = 'flex';

    // Hide chat header until a conversation is selected
    if (chatHeader) chatHeader.style.display = 'none';

    // Setup sidebar toggles
    if (toggleLeft) {
        toggleLeft.addEventListener('click', () => {
            leftBar.classList.toggle('hidden');
        });
    }

    // Settings menu toggle and actions
    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
                settingsMenu.classList.remove('open');
            }
        });

        // Menu actions
        settingsMenu.addEventListener('click', async (e) => {
            const item = e.target.closest('.menu-item');
            if (!item) return;
            const action = item.dataset.action;
            const conversationId = getCurrentConversationId(instanceId);
            if (!conversationId) return;

            if (action === 'rename') {
                const currentTitle = chatsContainer.querySelector('.chat-title-text')?.textContent || '';
                const newTitle = await openPromptModal({
                    title: 'Rename Conversation',
                    message: 'Enter a new title for this conversation.',
                    placeholder: 'Conversation title',
                    initialValue: currentTitle,
                    confirmText: 'Rename',
                    validate: (value) => {
                        if (!value) return 'Title is required';
                        if (value.length > 200) return 'Title is too long';
                        if (value.startsWith('hidden_chat_')) return 'Titles starting with "hidden_chat_" are reserved and cannot be used';
                        return '';
                    }
                });
                if (newTitle) {
                    await updateConversationTitle(chatsContainer, instanceId, conversationId, newTitle);
                }
            } else if (action === 'fork') {
                await forkConversation(chatsContainer, instanceId, conversationId);
            } else if (action === 'delete') {
                const titleEl = chatsContainer.querySelector(`.conversation-item[data-id="${conversationId}"] .conversation-title`);
                const displayTitle = titleEl ? titleEl.textContent : 'this conversation';
                const confirmed = await openConfirmModal({
                    title: 'Delete Conversation',
                    message: `Are you sure you want to delete the conversation "${displayTitle}" ?`,
                    confirmText: 'Delete'
                });
                if (confirmed) {
                    await deleteConversation(chatsContainer, instanceId, conversationId, { skipConfirm: true });
                }
            }

            settingsMenu.classList.remove('open');
        });
    }

    // Initialize the authenticated app directly (scoped)
    initializeAuthenticatedApp(chatsContainer, instanceId);
}

// Login/logout functions removed - handled by global authentication system

async function initializeAuthenticatedApp(chatsContainer, instanceId) {
    try {
        await initializeApp(chatsContainer, instanceId);
    } catch (error) {
        console.error('Failed to initialize authenticated app:', error);
        showError(chatsContainer, 'Failed to initialize application. Please refresh the page.');
    }
}

// Initialize WebSocket with message handling (scoped)
function initializeApp(chatsContainer, instanceId) {
    return new Promise((resolve, reject) => {
        if (!globalAuth.isAuthenticated()) {
            reject(new Error('User not authenticated'));
            return;
        }

        const clientId = Math.random().toString(36).substring(7);
        
        try {
            initializeWebSocket(
                instanceId,
                clientId,
                (message) => {
                    if (!message) {
                        const errorDiv = chatsContainer.querySelector('.error-message');
                        if (errorDiv) {
                            errorDiv.textContent = 'Received invalid message from server';
                        }
                        return;
                    }

                    if (message.type === 'error') {
                        const errorDiv = chatsContainer.querySelector('.error-message');
                        if (errorDiv) {
                            errorDiv.textContent = message.content;
                        }
                        return;
                    }
                    
                    if (message.type === 'response') {
                        // Only handle messages for our conversation or new conversations we're creating
                        const currentConvId = getCurrentConversationId(instanceId);
                        if (message.conversation_id && currentConvId && message.conversation_id !== currentConvId) {
                            // This message is for a different conversation, ignore it
                            return;
                        }
                        
                        // Set conversation ID first if provided
                        if (message.conversation_id) {
                            setCurrentConversationId(instanceId, message.conversation_id);
                            // Ensure header title reflects selected item if available
                            const activeItem = chatsContainer.querySelector(`.conversation-item[data-id="${message.conversation_id}"] .conversation-title`);
                            const headerTitle = chatsContainer.querySelector('.chat-title-text');
                            if (headerTitle && activeItem) headerTitle.textContent = activeItem.textContent;
                            const headerEl = chatsContainer.querySelector('.chat-header');
                            if (headerEl) headerEl.style.display = 'flex';
                        }
                        
                        // Update the user's message with its ID if provided
                        if (message.user_message_id) {
                            updateMessageWithId(chatsContainer, message.user_message_id);
                            // Refresh conversations list after a new message is confirmed
                            loadConversations(chatsContainer, instanceId);
                        }
                        
                        // Append the assistant's response with its ID
                        if (message.content) {
                            appendMessage(chatsContainer, 'assistant', message.content, message.assistant_message_id);
                        }
                    }
                    
                    if (message.type === 'clear_chat') {
                        // Only clear if this message is for the currently displayed conversation
                        const currentConversationId = getCurrentConversationId(instanceId);
                        const targetConversationId = message.conversation_id;
                        
                        if (targetConversationId && currentConversationId === targetConversationId) {
                            // Clear the current conversation's messages from the UI
                            const messagesContainer = chatsContainer.querySelector('.messages-container');
                            if (messagesContainer) {
                                messagesContainer.innerHTML = '';
                                }
                            
                            loadConversations(chatsContainer, instanceId);
                        }
                    }
                },
                () => {
                    const errorDiv = chatsContainer.querySelector('.error-message');
                    if (errorDiv) {
                        errorDiv.textContent = 'Connection lost. Please refresh the page.';
                    }
                }
            );
            
            setupMessageInput(chatsContainer, instanceId);
            loadConversations(chatsContainer, instanceId);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// No longer needed: using getCurrentConversationId from conversation state

