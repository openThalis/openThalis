import config from './config.js';

export async function getWebSocketUrl() {
    return await config.getWebSocketUrl();
}

export async function buildWebSocketConnection(path) {
    const wsBaseUrl = await getWebSocketUrl();
    const normalizedBase = wsBaseUrl.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}

