import config from '../../config/config.js';

class GlobalAuth {
    constructor() {
        this.accessToken = null;
        this.userEmail = null;
        this.apiBaseUrl = null;
        this.isInitialized = false;
        this.storagePrefix = 'thalis_auth_';
    }

    _setStorage(key, value) {
        try {
            localStorage.setItem(this.storagePrefix + key, value);
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    _getStorage(key) {
        try {
            return localStorage.getItem(this.storagePrefix + key);
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return null;
        }
    }

    _removeStorage(key) {
        try {
            localStorage.removeItem(this.storagePrefix + key);
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
        }
    }

    _loadFromStorage() {
        const token = this._getStorage('access_token');
        const email = this._getStorage('user_email');
        
        if (token && email) {
            this.accessToken = token;
            this.userEmail = email;
            return true;
        }
        return false;
    }

    _saveToStorage() {
        if (this.accessToken && this.userEmail) {
            this._setStorage('access_token', this.accessToken);
            this._setStorage('user_email', this.userEmail);
        }
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            this.apiBaseUrl = await config.getBackendUrl();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize global auth:', error);
            throw error;
        }
    }

    async checkAuthStatus() {
        await this.initialize();
        
        if (!this.accessToken || !this.userEmail) {
            this._loadFromStorage();
        }
        
        if (!this.accessToken || !this.userEmail) {
            return { authenticated: false };
        }

        try {
            const fullUrl = config.buildFullUrl(this.apiBaseUrl, '/api/auth/verify');

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                this.clearSession();
                return { authenticated: false };
            }

            const result = await response.json();
            return { 
                authenticated: true, 
                email: result.email || this.userEmail 
            };
        } catch (error) {
            console.error('Auth status check failed:', error);
            this.clearSession();
            return { authenticated: false };
        }
    }

    async login(email) {
        await this.initialize();
        
        try {
            const fullUrl = config.buildFullUrl(this.apiBaseUrl, '/api/auth/login');

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Backend error response:', response.status, errorData);
                throw new Error(errorData.detail || 'Login failed');
            }

            const data = await response.json();
            
            if (data.status === 'success' && data.access_token) {
                this.accessToken = data.access_token;
                this.userEmail = email;
                
                this._saveToStorage();
                
                return { success: true, email: email };
            } else {
                throw new Error('Invalid login response');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    async register(email) {
        await this.initialize();
        
        try {
            const fullUrl = config.buildFullUrl(this.apiBaseUrl, '/api/auth/register');

            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Registration failed');
            }

            const data = await response.json();
            
            if (data.status === 'success' && data.access_token) {
                this.accessToken = data.access_token;
                this.userEmail = email;
                
                // Save to localStorage for persistence
                this._saveToStorage();
                
                return { success: true, email: email };
            } else {
                throw new Error('Invalid registration response');
            }
        } catch (error) {
            throw error;
        }
    }

    async logout() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.accessToken && this.apiBaseUrl) {
            const fullUrl = config.buildFullUrl(this.apiBaseUrl, '/api/auth/logout');

            fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            }).catch(error => {
                console.warn('Server logout request failed:', error);
            });
        }

        // Immediately clear local session
        this.clearSession();
    }

    clearSession() {
        this.accessToken = null;
        this.userEmail = null;
        
        this._removeStorage('access_token');
        this._removeStorage('user_email');
    }

    getToken() {
        return this.accessToken;
    }

    getEmail() {
        return this.userEmail;
    }

    isAuthenticated() {
        return !!(this.accessToken && this.userEmail);
    }

    async makeAuthenticatedRequest(url, options = {}) {
        await this.initialize();

        if (!this.accessToken) {
            throw new Error('No access token available');
        }

        const fullUrl = config.buildFullUrl(this.apiBaseUrl, url);

        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(fullUrl, {
            ...options,
            headers
        });

        if (response.status === 401) {
            this.clearSession();
            window.location.reload();
            throw new Error('Authentication expired');
        }

        return response;
    }
}

const globalAuth = new GlobalAuth();
export default globalAuth; 