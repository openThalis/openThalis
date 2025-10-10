class Config {
    constructor() {
        this.backendUrl = null;
        this.isInitialized = false;
        this.initPromise = null;
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
        if (this.isInitialized) {
            return this.backendUrl;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                if (window.__BACKEND_URL__) {
                    this.backendUrl = this.normalizeUrl(window.__BACKEND_URL__);
                    this.isInitialized = true;
                    return this.backendUrl;
                }

                await this.loadConfigJs();
                if (window.__BACKEND_URL__) {
                    this.backendUrl = this.normalizeUrl(window.__BACKEND_URL__);
                    this.isInitialized = true;
                    return this.backendUrl;
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
                            this.backendUrl = this.normalizeUrl(config.backend_url);
                            this.isInitialized = true;
                            return this.backendUrl;
                        }
                    }
                } catch (configError) {
                }

                throw new Error('Backend URL is not configured');
            } catch (error) {
                console.error('Failed to initialize config:', error);
                this.initPromise = null;
                throw error;
            }
        })();

        return this.initPromise;
    }

    async getBackendUrl() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.backendUrl;
    }

    getBackendUrlSync() {
        if (!this.backendUrl) {
            if (window.__BACKEND_URL__) {
                this.backendUrl = this.normalizeUrl(window.__BACKEND_URL__);
                this.isInitialized = true;
            } else {
                throw new Error('Backend URL is not configured. Call initialize() first.');
            }
        }
        return this.backendUrl;
    }

    normalizeUrl(url) {
        if (!url) return '';
        return String(url).replace(/\/$/, '');
    }

    async getWebSocketUrl() {
        const httpUrl = await this.getBackendUrl();
        const normalized = this.normalizeUrl(httpUrl);
        return normalized.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    }

    buildFullUrl(backendUrl, path) {
        let baseUrl = this.normalizeUrl(backendUrl);
        if (baseUrl.endsWith('/') && path.startsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        return path.startsWith('/') ? `${baseUrl}${path}` : path;
    }
}

const config = new Config();
export default config;

