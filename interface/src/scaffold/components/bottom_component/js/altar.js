import globalAuth from '/src/scaffold/shared/instance/js/globalAuth.js';
import config from '/src/scaffold/shared/config/config.js';
import { getWebSocketUrl } from '/src/scaffold/shared/config/websocket.js';

export class AltarTerminal {
    constructor(spotlightAddress) {
        this.spotlightAddress = null;
        this.isInitialized = false;
        this.chatContainer = document.getElementById('altar-chat-container');
        this.userInput = document.getElementById('altar-user-input');
        this.sendButton = document.getElementById('altar-send-button');
        this.pingButton = document.getElementById('altar-ping-button');
        this.toolbar = {
            audio: document.getElementById('altar-toggle-audio'),
            mic: document.getElementById('altar-toggle-mic'),
            screen: document.getElementById('altar-toggle-screen'),
            cam: document.getElementById('altar-toggle-cam'),
            square: document.getElementById('altar-toggle-square'),
            trash: document.getElementById('altar-toggle-trash'),
        };
        this.conversationId = null;
        this.pendingScrollToBottom = false;

        this.sendMessage = this.sendMessage.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);

        window.altarTerminalInstance = this;
        
        this.setupEventListeners();
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            const backendUrl = await config.getBackendUrl();
            this.spotlightAddress = String(backendUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');
            this.isInitialized = true;
            await this.ensureConversation();
            this.setupWebSocket();
        } catch (error) {
            console.error('Failed to initialize AltarTerminal:', error);
            this.addMessageToChat('Failed to initialize: ' + error.message, 'altar');
            throw error;
        }
    }

    setupEventListeners() {
        // Remove any existing listeners
        this.sendButton.removeEventListener('click', this.sendMessage);
        this.userInput.removeEventListener('keydown', this.handleKeyPress);
        
        // Add new listeners
        this.sendButton.addEventListener('click', this.sendMessage);
        this.userInput.addEventListener('keydown', this.handleKeyPress);
        this.pingButton.addEventListener('click', () => this.pingThalis());

        // Toolbar toggles
        Object.entries(this.toolbar).forEach(([key, button]) => {
            if (!button) return;
            // Keep handler in place for future enablement but prevent action when disabled
            button.addEventListener('click', (e) => {
                if (button.disabled) return;
                
                // Special handling for trash button
                if (key === 'trash') {
                    this.sendClearChatCommand();
                    return;
                }
                
                this.toggleToolbar(key);
            });
        });
    }

	    sleep(ms) {
	    	return new Promise((resolve) => setTimeout(resolve, ms));
	    }

	    async fetchWithRetries(url, options = {}, retries = 3, baseDelayMs = 400) {
	    	for (let attempt = 0; attempt <= retries; attempt++) {
	    		try {
	    			const response = await fetch(url, options);
	    			// Retry on typical transient server errors
	    			if (!response.ok && [500, 502, 503, 504].includes(response.status) && attempt < retries) {
	    				this.addMessageToChat(`Server busy (HTTP ${response.status}). Retrying...`, 'altar');
	    				await this.sleep(baseDelayMs * (attempt + 1));
	    				continue;
	    			}
	    			return response;
	    		} catch (err) {
	    			// Network-level failures (e.g., connection reset) — retry
	    			if (attempt < retries) {
	    				this.addMessageToChat('Server temporarily unavailable (network error). Retrying...', 'altar');
	    				await this.sleep(baseDelayMs * (attempt + 1));
	    				continue;
	    			}
	    			throw err;
	    		}
	    	}
	    }

    toggleToolbar(key) {
        const button = this.toolbar[key];
        if (!button) return;
        const isActive = button.getAttribute('aria-pressed') === 'true';
        const next = (!isActive).toString();
        button.setAttribute('aria-pressed', next);
        button.classList.toggle('active', next === 'true');
        this.addMessageToChat(`${key} ${next === 'true' ? 'enabled' : 'disabled'}`, 'altar');
        // Hook: place any side-effects here (e.g., start/stop streams)
    }



    async ensureConversation() {
        await this.initialize();
        
        try {
            const token = globalAuth.getToken();
            const email = globalAuth.getEmail();
            if (!token || !email) return;
            
            const base = `http://${this.spotlightAddress}`.replace(/\/$/, '');
            
            // First, try to find existing altar conversation by querying for the reserved title
            try {
                const conversationsResp = await fetch(`${base}/api/conversations`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (conversationsResp.ok) {
                    const data = await conversationsResp.json();
                    const altarConv = data.conversations.find(conv =>
                        conv.title === 'hidden_chat_altar'
                    );
                    
                    if (altarConv) {
                        // Found existing altar conversation, use it
                        this.conversationId = altarConv.id;
                        await this.loadConversationHistory();
                        return;
                    }
                }
            } catch (e) {
                console.warn('Error finding existing altar conversation:', e);
            }
            
            // If we have a conversation ID, validate it still exists
            if (this.conversationId) {
                try {
                    const checkResp = await fetch(`${base}/api/conversations/${this.conversationId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (checkResp.ok) {
                        const data = await checkResp.json();
                        // Make sure it's actually an altar conversation
                        if (data.title === 'hidden_chat_altar') {
                            await this.loadConversationHistory();
                            return;
                        } else {
                            // Not an altar conversation, reset
                            this.conversationId = null;
                        }
                    } else {
                        // Invalid conversation ID, reset
                        this.conversationId = null;
                    }
                } catch (e) {
                    // Error checking, reset
                    this.conversationId = null;
                }
            }
            
            // Create new altar conversation
            const resp = await fetch(`${base}/api/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (resp.ok) {
                const data = await resp.json();
                this.conversationId = data.conversation_id;
                
                // Update the conversation title to the reserved altar title
                try {
                    const titleResp = await fetch(`${base}/api/conversations/${this.conversationId}/title`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            title: 'hidden_chat_altar'
                        })
                    });
                    if (!titleResp.ok) {
                        console.warn('Failed to update altar conversation title');
                    }
                } catch (e) {
                    console.warn('Error updating altar conversation title:', e);
                }
                
                // Load conversation history for new conversation (will be empty, but good for consistency)
                await this.loadConversationHistory();
            }
        } catch (e) {
            console.warn('Failed to initialize altar conversation:', e);
        }
    }

    async loadConversationHistory() {
        if (!this.conversationId) return;

        try {
            const token = globalAuth.getToken();
            if (!token) return;

            const base = `http://${this.spotlightAddress}`.replace(/\/$/, '');
            const response = await fetch(`${base}/api/conversations/${this.conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.warn(`Failed to load conversation history: HTTP ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.history && Array.isArray(data.history)) {
                // Clear existing messages first
                this.chatContainer.innerHTML = '';
                
                if (data.history.length === 0) {
                    // No messages in history - conversation is empty
                    return;
                }
                
                // Load historical messages in chronological order
                data.history.forEach(msg => {
                    // Map role to display type - 'assistant' messages are treated as altar messages
                    const displayType = msg.role === 'assistant' ? 'altar' : msg.role;
                    this.addHistoricalMessageToChat(msg.content, displayType);
                });
                
                // Scroll to bottom to show the most recent messages
                this.scrollToBottom();
            }
        } catch (error) {
            console.warn('Error loading conversation history:', error);
        }
    }

    handleKeyPress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!this.isHandlingInputRequest) {
                this.sendMessage();
            }
        }
    }

    async setupWebSocket() {
        if (!this.spotlightAddress) {
            console.error('Cannot setup WebSocket: spotlightAddress not initialized');
            return;
        }
        
        const clientId = 'altar_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const token = globalAuth.getToken();
        
        if (!token) {
            console.error('No authentication token available for WebSocket connection');
            return;
        }
        
        const wsBaseUrl = await getWebSocketUrl();
        const wsUrl = `${wsBaseUrl}/ws/${clientId}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            // Token is now passed as query parameter, no need to send it as message
            // Set up heartbeat
            this.heartbeatInterval = setInterval(() => {
                if (this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: 'heartbeat' }));
                }
            }, 15000);
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'clear_chat') {
                this.handleClearChatSignal(data);
            } else if (data.type === 'response') {
                this.handleResponseMessage(data);
            }
        };

        this.ws.onclose = (event) => {
            if (event.code === 1008) {
                this.addMessageToChat(`Connection closed: ${event.reason} (Auth error?)`, 'altar');
            }
            // Clear the heartbeat interval
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            // Attempt to reconnect after a delay
            setTimeout(async () => {
                try {
                    await this.initialize();
                    this.setupWebSocket();
                } catch (error) {
                    console.error('Failed to reconnect WebSocket:', error);
                }
            }, 5000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            // Clear the heartbeat interval
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
        };
    }

    async pingThalis() {
        await this.initialize();
        
        try {
            const response = await fetch(`http://${this.spotlightAddress}/ping_server`);
            const data = await response.text();
            this.addMessageToChat(`Ping response: ${data}`, 'altar');
        } catch (error) {
            console.error('Ping error:', error);
            this.addMessageToChat(`Failed to ping thalis: ${error.message}`, 'altar');
        }
    }

    async sendClearChatCommand() {
        if (this.isHandlingInputRequest) return;
        
        await this.initialize();
        
        // Require conversationId
        if (!this.conversationId) {
            this.addMessageToChat('No conversation initialized. Please wait for initialization.', 'altar');
            return;
        }

        // Add user message to chat to show what command was sent
        this.addMessageToChat('/cch', 'user');

        try {
            const response = await this.fetchWithRetries(`http://${this.spotlightAddress}/process_request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: '/cch',
                    spotlight_address: this.spotlightAddress,
                    token: globalAuth.getToken(),
                    conversation_id: this.conversationId
                })
            }, 3, 500);

            const data = await response.json();
            if (data && data.conversation_id) {
                this.conversationId = data.conversation_id;
            }
            
            // Handle the response
            if (data && data.error) {
                this.addMessageToChat(`Error: ${data.error}`, 'altar');
            } else if (data && 'response' in data) {
                const resp = data.response;
                if (typeof resp === 'object') {
                    this.addMessageToChat(JSON.stringify(resp, null, 2), 'altar');
                } else if (resp && resp.trim()) {
                    // Only display non-empty responses, empty ones will come via WebSocket
                    this.addMessageToChat(resp, 'altar');
                }
                // Skip displaying empty responses since WebSocket will provide the real content
            } else {
                this.addMessageToChat(JSON.stringify(data, null, 2), 'altar');
            }
        } catch (error) {
            console.error('Error:', error);
            this.addMessageToChat('Error connecting to server: ' + error.message, 'altar');
        }
    }

	    async sendMessage() {
        if (this.isHandlingInputRequest) return;
        const message = this.userInput.value.trim();
        if (!message) return;

        await this.initialize();

        // Require conversationId
        if (!this.conversationId) {
            this.addMessageToChat('No conversation initialized. Please wait for initialization.', 'altar');
            return;
        }

        // Add user message to chat
        this.addMessageToChat(message, 'user');
        this.userInput.value = '';

	    	try {
	    		const response = await this.fetchWithRetries(`http://${this.spotlightAddress}/process_request`, {
	    			method: 'POST',
	    			headers: {
	    				'Content-Type': 'application/json',
	    			},
	    			body: JSON.stringify({
	    				input: message,
	    				spotlight_address: this.spotlightAddress,
	    				token: globalAuth.getToken(),
	    				conversation_id: this.conversationId
	    			})
	    		}, 3, 500);

	    		const data = await response.json();
	            if (data && data.conversation_id) {
	                this.conversationId = data.conversation_id;
	            }
            
            // Handle the response
            if (data && data.error) {
                this.addMessageToChat(`Error: ${data.error}`, 'altar');
            } else if (data && 'response' in data) {
                const resp = data.response;
                if (typeof resp === 'object') {
                    this.addMessageToChat(JSON.stringify(resp, null, 2), 'altar');
                } else if (resp && resp.trim()) {
                    // Only display non-empty responses, empty ones will come via WebSocket
                    this.addMessageToChat(resp, 'altar');
                }
                // Skip displaying empty responses since WebSocket will provide the real content
            } else {
                this.addMessageToChat(JSON.stringify(data, null, 2), 'altar');
            }
        } catch (error) {
            console.error('Error:', error);
            this.addMessageToChat('Error connecting to server: ' + error.message, 'altar');
        }
    }


    addMessageToChat(message, type) {
        const messageDiv = document.createElement('pre');
        const messageType = type === 'altar' ? 'entity' : type;
        messageDiv.className = `altar-message altar-${messageType}-message`;
        messageDiv.textContent = message;
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addHistoricalMessageToChat(message, type) {
        const messageDiv = document.createElement('pre');
        const messageType = type === 'altar' ? 'entity' : type;
        messageDiv.className = `altar-message altar-${messageType}-message`;
        messageDiv.textContent = message;
        messageDiv.style.opacity = '0.8'; // Slightly dimmed to indicate historical message
        this.chatContainer.appendChild(messageDiv);
    }

    scrollToBottom() {
        if (!this.chatContainer) return;
        
        // Check if the altar component is currently minimized
        const altarBar = document.querySelector('.altar-bar');
        if (altarBar && altarBar.classList.contains('minimized')) {
            // Component is minimized - defer scroll until it's expanded
            this.pendingScrollToBottom = true;
            return;
        }
        
        // Component is visible - perform scroll
        requestAnimationFrame(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
            this.pendingScrollToBottom = false;
        });
    }

    // Method to be called when the altar component is expanded
    handleAltarExpanded() {
        if (this.pendingScrollToBottom) {
            this.scrollToBottom();
        } else if (this.chatContainer && this.chatContainer.children.length > 0) {
            // If there are messages but we're not scrolled to bottom, scroll now
            // This handles cases where history was loaded while minimized
            const isAtTop = this.chatContainer.scrollTop < 50; // Allow some tolerance
            if (isAtTop) {
                this.scrollToBottom();
            }
        }
    }
    
    async handleClearChatSignal(messageData) {
        // Only clear if this message is for our specific conversation
        const targetConversationId = messageData?.conversation_id;
        
        if (targetConversationId && this.conversationId === targetConversationId) {
            // Clear the visual container first
            this.clearChatVisually();
            
            // Ensure conversation is still valid and reload history
            try {
                // Re-validate the conversation exists after clear
                await this.ensureConversation();
            } catch (error) {
                console.warn('Failed to ensure conversation after clear:', error);
            }
        }
    }
    
    clearChatVisually() {
        // Clear the visual chat container
        this.chatContainer.innerHTML = '';
    }

    handleResponseMessage(messageData) {
        // Only handle messages for our conversation
        if (messageData.conversation_id && messageData.conversation_id !== this.conversationId) {
            // This message is for a different conversation, ignore it
            return;
        }
        
        // Update conversation ID if provided (in case it's a new conversation)
        if (messageData.conversation_id) {
            this.conversationId = messageData.conversation_id;
        }
        
        // Display the assistant's response content if provided
        if (messageData.content) {
            this.addMessageToChat(messageData.content, 'altar');
        }
    }
} 