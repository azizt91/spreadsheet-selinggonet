// login.js
document.addEventListener('DOMContentLoaded', () => {
    // Jika user sudah login, langsung arahkan ke dashboard
    if (sessionStorage.getItem('loggedInUser')) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(window.AppConfig.getApiUrl('/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const result = await response.json();
            if (response.ok) {
                sessionStorage.setItem('loggedInUser', result.user);
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.textContent = result.message;
            }
        } catch (error) {
            errorMessage.textContent = 'Tidak dapat terhubung ke server.';
        }
    });
});