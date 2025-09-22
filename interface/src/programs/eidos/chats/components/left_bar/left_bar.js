import { getCurrentConversationId, setCurrentConversationId, appendMessage } from '../conversation/conversation.js';
import { showError } from '/src/programs/eidos/chats/js/utils.js';
import httpClient from '/src/scaffold/components/shared/js/httpClient.js';

// Core conversation list functions
export async function loadConversations(root, instanceId) {
    try {
        const response = await httpClient.apiGet('/conversations');
        if (!response.ok) throw new Error('Failed to load conversations');
        
        const data = await response.json();
        const container = root.querySelector('.conversations-container');
        container.innerHTML = '';
        
        // Filter out hidden conversations from the chats program display
        const filteredConversations = data.conversations.filter(conv => {
            // Hide conversations that start with 'hidden_chat_' prefix
            const title = conv.title || '';
            return !title.startsWith('hidden_chat_');
        });
        
        filteredConversations.forEach(conv => {
            const div = document.createElement('div');
            div.className = 'conversation-item';
            div.dataset.id = conv.id;
            if (conv.id === getCurrentConversationId(instanceId)) {
                div.classList.add('active');
            }
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'conversation-title';
            titleSpan.textContent = conv.title || new Date(conv.created_at).toLocaleString();
            titleSpan.onclick = () => loadConversation(root, instanceId, conv.id);
            div.appendChild(titleSpan);
            container.appendChild(div);
        });

        // Update the chat header title and visibility with the active conversation title
        const currentId = getCurrentConversationId(instanceId);
        const headerTitle = root.querySelector('.chat-title-text');
        const chatHeader = root.querySelector('.chat-header');
        
        // Check if current conversation is visible (not an altar conversation)
        const currentConvVisible = currentId && filteredConversations.some(conv => conv.id === currentId);
        
        if (currentConvVisible) {
            const activeTitleEl = container.querySelector(`.conversation-item[data-id="${currentId}"] .conversation-title`);
            if (activeTitleEl && headerTitle) {
                headerTitle.textContent = activeTitleEl.textContent;
            }
            if (chatHeader) chatHeader.style.display = 'flex';
        } else {
            // If current conversation is altar or doesn't exist, hide header
            if (chatHeader) chatHeader.style.display = 'none';
            if (headerTitle) headerTitle.textContent = '';
        }
    } catch (error) {
        showError(root, 'Failed to load conversations');
    }
}

// CRUD operations for conversations
export async function startNewChat(root, instanceId) {
    try {
        const response = await httpClient.apiPost('/conversations');
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create conversation');
        }
        
        const data = await response.json();
        setCurrentConversationId(instanceId, data.conversation_id);
        root.querySelector('.messages-container').innerHTML = '';
        await loadConversation(root, instanceId, data.conversation_id);
        loadConversations(root, instanceId);
    } catch (error) {
        showError(root, 'Failed to create new conversation: ' + error.message);
    }
}

export async function loadConversation(root, instanceId, conversationId) {
    try {
        const response = await httpClient.apiGet(`/conversations/${conversationId}`);
        if (!response.ok) throw new Error('Failed to load conversation');
        
        const data = await response.json();
        
        // Prevent loading hidden conversations in the chats program
        const title = data.title || '';
        if (title.startsWith('hidden_chat_')) {
            showError(root, 'This conversation is hidden and cannot be opened in the chats program.');
            return;
        }
        const container = root.querySelector('.messages-container');
        container.innerHTML = '';
        
        data.history.forEach(msg => {
            appendMessage(root, msg.role, msg.content, msg.id);
        });
        
        setCurrentConversationId(instanceId, conversationId);
        root.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === conversationId);
        });

        // Update chat header title and ensure header is visible
        const headerTitle = root.querySelector('.chat-title-text');
        const chatHeader = root.querySelector('.chat-header');
        if (headerTitle) {
            if (data.title) {
                headerTitle.textContent = data.title;
            } else {
                const activeItem = root.querySelector(`.conversation-item[data-id="${conversationId}"] .conversation-title`);
                headerTitle.textContent = activeItem ? activeItem.textContent : 'Conversation';
            }
        }
        if (chatHeader) chatHeader.style.display = 'flex';
    } catch (error) {
        showError(root, 'Failed to load conversation');
    }
}

export async function updateConversationTitle(root, _instanceId, conversationId, newTitle) {
    try {
        const response = await httpClient.apiPut(`/conversations/${conversationId}/title`, { title: newTitle });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update title');
        }
        // Update header title optimistically
        const headerTitle = root.querySelector('.chat-title-text');
        if (headerTitle) headerTitle.textContent = newTitle;
        loadConversations(root, _instanceId);
    } catch (error) {
        showError(root, error.message || 'Failed to update conversation title');
    }
}

export async function deleteConversation(root, instanceId, conversationId, _options = {}) {
    try {
        const response = await httpClient.apiDelete(`/conversations/${conversationId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete conversation');
        }
        
        if (getCurrentConversationId(instanceId) === conversationId) {
            setCurrentConversationId(instanceId, null);
            root.querySelector('.messages-container').innerHTML = '';
            // Hide chat header when no conversation is selected
            const chatHeader = root.querySelector('.chat-header');
            if (chatHeader) chatHeader.style.display = 'none';
            const headerTitle = root.querySelector('.chat-title-text');
            if (headerTitle) headerTitle.textContent = '';
        }
        
        loadConversations(root, instanceId);
    } catch (error) {
        console.error('Error deleting conversation:', error);
        showError(root, `Failed to delete conversation: ${error.message}`);
    }
}

// Additional conversation operations
export async function forkConversation(root, instanceId, conversationId) {
    try {
        const response = await httpClient.apiPost(`/conversations/${conversationId}/fork`);
        
        if (!response.ok) throw new Error('Failed to fork conversation');
        
        const data = await response.json();
        setCurrentConversationId(instanceId, data.conversation_id);
        loadConversations(root, instanceId);
        loadConversation(root, instanceId, data.conversation_id);
    } catch (error) {
        showError(root, 'Failed to fork conversation');
    }
}