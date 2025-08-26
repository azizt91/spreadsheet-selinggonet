// login.js
document.addEventListener('DOMContentLoaded', () => {
    // Jika user sudah login, langsung arahkan ke dashboard
    if (sessionStorage.getItem('loggedInUser')) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    
    // Loading Management Functions
    function showLoading(text = 'Memproses...') {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }

    function hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    function setButtonLoading(button, loading, originalText) {
        if (loading) {
            button.dataset.originalText = originalText || button.textContent;
            button.innerHTML = '<span class="loading-spinner"></span>Masuk...';
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.innerHTML = button.dataset.originalText || originalText || 'Masuk';
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = event.target.querySelector('button[type="submit"]');
        errorMessage.textContent = '';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Show loading state
        setButtonLoading(submitButton, true);
        showLoading('Memverifikasi login...');

        try {
            const response = await fetch(window.AppConfig.API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'login',
                    username: username,
                    password: password
                })
            });
            const result = await response.json();
            
            // Hide loading before processing result
            hideLoading();
            setButtonLoading(submitButton, false);
            
            if (response.ok) {
                sessionStorage.setItem('loggedInUser', result.user);
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.textContent = result.message;
            }
        } catch (error) {
            // Hide loading before showing error
            hideLoading();
            setButtonLoading(submitButton, false);
            errorMessage.textContent = 'Tidak dapat terhubung ke server.';
        }
    });
});