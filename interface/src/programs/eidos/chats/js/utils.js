import { sendMessage } from '../components/conversation/conversation.js';

export function showError(root, message) {
    const errorMessage = root?.querySelector('.error-message') || document.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}

export function setupMessageInput(root, instanceId) {
    const textarea = root.querySelector('textarea');
    const sendButton = root.querySelector('.send-button');

    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(root, instanceId, textarea.value);
            textarea.value = '';
            sendButton.disabled = true;
        }
    });

    textarea.addEventListener('input', (e) => {
        sendButton.disabled = !e.target.value.trim();
    });

    sendButton.addEventListener('click', () => {
        sendMessage(root, instanceId, textarea.value);
        textarea.value = '';
        sendButton.disabled = true;
    });
}

// Login overlay functions removed - handled by global authentication system 