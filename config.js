// config.js - API Configuration
const config = {
    // GANTI URL DI BAWAH INI DENGAN WEB APP URL DARI GOOGLE APPS SCRIPT ANDA
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbxJLeCl9405M-qTOYELrZMpXcDdvIG-P1hFLQavSEhitNMINxFcaHlYDxCknulGjT92Vw/exec', // <-- GANTI DENGAN URL WEB APP ANDA
    
    
    // Fungsi untuk mendapatkan URL API
    getApiUrl: function(endpoint) {
        // Untuk Google Apps Script, endpoint akan dikirim sebagai parameter action
        return this.API_BASE_URL;
    }
};

// Make config available globally
window.AppConfig = config;
