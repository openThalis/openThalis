import globalAuth from './globalAuth.js';

class HttpClient {
    constructor() {
        this.isInitialized = false;
        this.apiBaseUrl = null;
    }

    async loadConfigJs() {
        return new Promise((resolve) => {
            try {
                const existing = document.querySelector('script[data-thalis-config]');
                if (existing) {
                    existing.addEventListener('load', () => resolve());
                    existing.addEventListener('error', () => resolve());
                    return;
                }
                const script = document.createElement('script');
                script.src = '/config.js';
                script.async = true;
                script.setAttribute('data-thalis-config', 'true');
                script.onload = () => resolve();
                script.onerror = () => resolve();
                document.head.appendChild(script);
            } catch {
                resolve();
            }
        });
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            if (window.__BACKEND_URL__) {
                this.apiBaseUrl = window.__BACKEND_URL__;
                this.isInitialized = true;
                return;
            }

            await this.loadConfigJs();
            if (window.__BACKEND_URL__) {
                this.apiBaseUrl = window.__BACKEND_URL__;
                this.isInitialized = true;
                return;
            }

            try {
                const response = await fetch('/api/config');
                if (response.ok) {
                    const ct = response.headers.get('content-type') || '';
                    if (!ct.includes('application/json')) {
                        throw new Error('Non-JSON response');
                    }
                    const config = await response.json();
                    if (config.backend_url) {
                        this.apiBaseUrl = config.backend_url;
                        this.isInitialized = true;
                        return;
                    }
                }
            } catch (configError) {
            }

            throw new Error('Backend URL is not configured');
        } catch (error) {
            console.error('Failed to initialize HTTP client:', error);
            throw error;
        }
    }

    async request(url, options = {}) {
        await this.initialize();

        await globalAuth.initialize();

        let baseUrl = this.apiBaseUrl;
        if (baseUrl.endsWith('/') && url.startsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = globalAuth.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers
            });
            
            if (response.status === 401) {
                console.warn('Authentication expired, redirecting to login');
                globalAuth.clearSession();
                window.location.reload();
                throw new Error('Authentication expired');
            }
            
            return response;
        } catch (error) {
            console.error('HTTP request failed:', error);
            throw error;
        }
    }

    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    async post(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined
        });
    }

    async put(url, data, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined
        });
    }

    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }

    async api(endpoint, options = {}) {
        return this.request(`/api${endpoint}`, options);
    }

    async apiGet(endpoint, options = {}) {
        return this.api(endpoint, { ...options, method: 'GET' });
    }

    async apiPost(endpoint, data, options = {}) {
        return this.api(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined
        });
    }

    async apiPut(endpoint, data, options = {}) {
        return this.api(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined
        });
    }

    async apiDelete(endpoint, options = {}) {
        return this.api(endpoint, { ...options, method: 'DELETE' });
    }
}

const httpClient = new HttpClient();
export default httpClient; 