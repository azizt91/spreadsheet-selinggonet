// config.js - API Configuration
const config = {
    // Detect if we're running on Netlify or locally
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000'  // Local development
        : '',  // Production (Netlify) - use relative URLs
    
    // API endpoints
    getApiUrl: function(endpoint) {
        return this.API_BASE_URL + endpoint;
    }
};

// Make config available globally
window.AppConfig = config;