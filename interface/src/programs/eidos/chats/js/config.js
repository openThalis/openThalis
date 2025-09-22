// Configuration with dynamic loading
let config = null;

// Determine backend URL strictly from /config.js or /api/config
const getBackendUrl = async () => {
    // Prefer window.__BACKEND_URL__ injected by /config.js
    if (typeof window !== 'undefined' && window.__BACKEND_URL__) {
        return String(window.__BACKEND_URL__).replace(/\/$/, '');
    }
    // Fall-back to backend /api/config
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const data = await res.json();
                if (data && data.backend_url) {
                    return String(data.backend_url).replace(/\/$/, '');
                }
            }
        }
    } catch {}
    throw new Error('Backend URL is not configured');
};

// Build the config asynchronously; consumers import and can await readiness if needed
const backendUrlPromise = getBackendUrl();

backendUrlPromise.then((backendUrl) => {
    config = {
        apiBaseUrl: backendUrl,
        wsBaseUrl: backendUrl.replace('http:', 'ws:'),
        endpoints: {
            auth: '/api/auth',
            conversations: '/api/conversations',
            messages: '/api/messages'
        }
    };
}).catch((e) => {
    console.error('Chats config init failed:', e);
});

export default config;