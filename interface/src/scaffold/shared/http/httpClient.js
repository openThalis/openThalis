import globalAuth from '../instance/js/globalAuth.js';
import config from '../config/config.js';

class HttpClient {
    constructor() {
        this.isInitialized = false;
        this.apiBaseUrl = null;
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            this.apiBaseUrl = await config.getBackendUrl();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize HTTP client:', error);
            throw error;
        }
    }

    async request(url, options = {}) {
        await this.initialize();

        await globalAuth.initialize();

        const fullUrl = config.buildFullUrl(this.apiBaseUrl, url);

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

