// Per-instance conversation state management
const conversationIdByInstance = new Map(); // instanceId -> conversationId

export function setCurrentConversationId(instanceId, id) {
    conversationIdByInstance.set(instanceId, id);
}

export function getCurrentConversationId(instanceId) {
    return conversationIdByInstance.get(instanceId) || null;
}

export function clearCurrentConversationId(instanceId) {
    conversationIdByInstance.delete(instanceId);
}