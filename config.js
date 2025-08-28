// config.js - API Configuration
const config = {
    // GANTI URL DI BAWAH INI DENGAN WEB APP URL DARI GOOGLE APPS SCRIPT ANDA
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbzzFzuOKoY7I07h3RriLa5rZekGV8z0zxE5aw1WA15lJwac1EOIr6DAoEHwCd2py9MonQ/exec', // <-- GANTI DENGAN URL WEB APP ANDA
    
    
    // Fungsi untuk mendapatkan URL API
    getApiUrl: function(endpoint) {
        // Untuk Google Apps Script, endpoint akan dikirim sebagai parameter action
        return this.API_BASE_URL;
    }
};

// Make config available globally
window.AppConfig = config;
