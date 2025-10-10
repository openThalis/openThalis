import config from '/src/scaffold/shared/config/config.js';

const getBackendUrl = async () => {
    return await config.getBackendUrl();
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