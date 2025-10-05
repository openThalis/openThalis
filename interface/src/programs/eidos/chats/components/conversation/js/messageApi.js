import { sendWebSocketMessage } from '/src/programs/eidos/chats/js/websocket.js';
import { getCurrentConversationId, setCurrentConversationId, clearCurrentConversationId } from './conversationState.js';
import { appendMessage } from './messageUI.js';
import globalAuth from '/src/scaffold/shared/instance/js/globalAuth.js';
import httpClient from '/src/scaffold/shared/utils/http/httpClient.js';

// Message CRUD operations
export async function updateMessageContent(messageId, content, instanceId) {
    if (!messageId) {
        console.error('Cannot update message: Message ID is undefined');
        return false;
    }

    try {
        const response = await httpClient.apiPut(`/messages/${messageId}`, {
            content,
            email: globalAuth.getEmail(),
            conversation_id: getCurrentConversationId(instanceId)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error updating message:', error);
        return false;
    }
}

export async function deleteMessage(messageId, _instanceId) {
    if (!messageId) {
        console.error('Cannot delete message: Message ID is undefined');
        return false;
    }

    try {
        const response = await httpClient.apiDelete(`/messages/${messageId}`);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            throw new Error(errorData.detail || 'Failed to delete message');
        }

        return true;
    } catch (error) {
        console.error('Error deleting message:', error);
        return false;
    }
}

export async function sendMessage(root, instanceId, content) {
    if (!content.trim()) return;

    let messageDiv = null;
    try {
        // Create a temporary message div
        messageDiv = appendMessage(root, 'user', content);
        
        const currentConversationId = getCurrentConversationId(instanceId);
        
        if (!currentConversationId) {
            // Create a new conversation first
            const response = await httpClient.apiPost('/conversations');
            
            if (!response.ok) {
                throw new Error('Failed to create conversation');
            }
            
            const data = await response.json();
            setCurrentConversationId(instanceId, data.conversation_id);
        }
        
        // Send the message through WebSocket only to avoid double-processing
        sendWebSocketMessage(instanceId, {
            type: 'message',
            content,
            conversation_id: getCurrentConversationId(instanceId),
            email: globalAuth.getEmail()
        });
    } catch (error) {
        console.error('Error in sendMessage:', error);
        // Remove the temporary message if there was an error
        if (messageDiv) {
            messageDiv.remove();
        }
        // Reset conversation ID if failed
        if (!getCurrentConversationId(instanceId)) {
            clearCurrentConversationId(instanceId);
        }
    }
} 