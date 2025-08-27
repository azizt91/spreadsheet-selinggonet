// login.js
document.addEventListener('DOMContentLoaded', () => {
    // --- PERUBAHAN 1: Logika pengalihan otomatis yang lebih cerdas ---
    // Jika user sudah login, arahkan ke dasbor yang sesuai dengan levelnya.
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const userLevel = sessionStorage.getItem('userLevel');

    if (loggedInUser && userLevel) {
        if (userLevel === 'ADMIN') {
            window.location.href = 'dashboard.html';
        } else if (userLevel === 'USER') {
            window.location.href = 'pelanggan_dashboard.html'; // Arahkan ke dasbor pelanggan
        }
        return; // Hentikan eksekusi skrip lebih lanjut
    }

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    
    // Loading Management Functions (Tidak ada perubahan di sini)
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
                // --- PERUBAHAN 2: Simpan semua data sesi dan arahkan berdasarkan level ---
                sessionStorage.setItem('loggedInUser', result.user);
                sessionStorage.setItem('userLevel', result.level); // Simpan level pengguna
                sessionStorage.setItem('userIdpl', result.idpl);   // Simpan ID Pelanggan

                // Arahkan berdasarkan level pengguna
                if (result.level === 'ADMIN') {
                    window.location.href = 'dashboard.html';
                } else if (result.level === 'USER') {
                    // Arahkan ke halaman dasbor pelanggan baru
                    window.location.href = 'pelanggan_dashboard.html'; 
                } else {
                    errorMessage.textContent = 'Level pengguna tidak dikenali.';
                }
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