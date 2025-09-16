// Main conversation module - imports and re-exports from smaller modules
export { setCurrentConversationId, getCurrentConversationId } from './js/conversationState.js';
export { updateMessageContent, deleteMessage, sendMessage } from './js/messageApi.js';
export { appendMessage, startEditing, attachMessageActions, updateMessageWithId } from './js/messageUI.js';