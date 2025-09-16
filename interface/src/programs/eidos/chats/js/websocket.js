import globalAuth from '/src/scaffold/components/shared/js/globalAuth.js';

// Manage a separate WebSocket per Chats instance
const socketByInstance = new Map(); // instanceId -> WebSocket
const attemptsByInstance = new Map(); // instanceId -> number
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000;

async function getWsBaseUrl() {
    // Prefer /config.js injection
    if (typeof window !== 'undefined' && window.__BACKEND_URL__) {
        const httpBase = String(window.__BACKEND_URL__).replace(/\/$/, '');
        return httpBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    }
    // Fall-back to /api/config
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const data = await res.json();
                if (data && data.backend_url) {
                    const httpBase = String(data.backend_url).replace(/\/$/, '');
                    return httpBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
                }
            }
        }
    } catch {}
    throw new Error('Backend URL is not configured');
}

export async function initializeWebSocket(instanceId, clientId, messageHandler, onClose) {
    const email = globalAuth.getEmail();
    const token = globalAuth.getToken();

    if (!email || !token) {
        console.error('No email or token available for WebSocket connection');
        if (onClose) onClose();
        return null;
    }

    let wsBaseUrl;
    try {
        wsBaseUrl = await getWsBaseUrl();
    } catch (e) {
        console.error('Failed to resolve WebSocket base URL:', e);
        if (onClose) onClose();
        return null;
    }
    const wsUrl = `${wsBaseUrl}/ws/${clientId}?token=${encodeURIComponent(token)}`;

    try {
        // Close existing socket for this instance if any
        const existing = socketByInstance.get(instanceId);
        if (existing) {
            try { existing.close(); } catch {}
            socketByInstance.delete(instanceId);
        }

        const ws = new WebSocket(wsUrl);
        socketByInstance.set(instanceId, ws);

        ws.onopen = () => {
            attemptsByInstance.set(instanceId, 0);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'error') {
                    console.error('Server error:', data.content);
                    return;
                }

                messageHandler(data);
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        ws.onclose = (event) => {
            // If socket removed manually (e.g., on cleanup), do not attempt reconnect
            if (!socketByInstance.has(instanceId)) {
                if (onClose) onClose();
                return;
            }

            socketByInstance.delete(instanceId);

            // Handle authentication errors
            if (event.code === 4000 || event.code === 4001) {
                console.error('Authentication error:', event.reason);
                if (onClose) onClose();
                return;
            }

            const attempts = attemptsByInstance.get(instanceId) || 0;
            if (attempts < MAX_RECONNECT_ATTEMPTS) {
                const next = attempts + 1;
                attemptsByInstance.set(instanceId, next);
                setTimeout(() => {
                    initializeWebSocket(instanceId, clientId, messageHandler, onClose);
                }, RECONNECT_DELAY);
            } else if (onClose) {
                onClose();
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return ws;
    } catch (error) {
        console.error('Error initializing WebSocket:', error);
        if (onClose) onClose();
        return null;
    }
}

export function sendWebSocketMessage(instanceId, message) {
    const email = globalAuth.getEmail();
    if (!email) {
        console.error('No email available for sending message');
        return;
    }

    const ws = socketByInstance.get(instanceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            const messageWithEmail = { ...message, email };
            ws.send(JSON.stringify(messageWithEmail));
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
        }
    } else {
        console.warn('WebSocket is not connected for instance', instanceId);
    }
}

export function closeWebSocket(instanceId) {
    const ws = socketByInstance.get(instanceId);
    if (ws) {
        try { ws.close(); } catch {}
        socketByInstance.delete(instanceId);
        attemptsByInstance.delete(instanceId);
    }
}

// Utility: wait until a socket for an instance is OPEN (returns true) or timeout (returns false)
export function waitForSocketReady(instanceId, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const poll = () => {
            const ws = socketByInstance.get(instanceId);
            if (ws && ws.readyState === WebSocket.OPEN) {
                resolve(true);
                return;
            }
            if ((Date.now() - start) >= timeoutMs) {
                resolve(false);
                return;
            }
            setTimeout(poll, 50);
        };
        poll();
    });
}