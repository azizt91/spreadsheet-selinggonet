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
    
    // --- PERUBAHAN: Disederhanakan untuk UI mobile ---
    function setButtonLoading(button, loading) {
        const textSpan = button.querySelector('span');
        if (!textSpan) return;

        if (loading) {
            button.disabled = true;
            textSpan.textContent = 'Logging in...';
            // Tambahkan kelas untuk styling loading jika ada (opsional)
            button.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            button.disabled = false;
            textSpan.textContent = 'Login';
            button.classList.remove('opacity-75', 'cursor-not-allowed');
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
            setButtonLoading(submitButton, false);
            errorMessage.textContent = 'Tidak dapat terhubung ke server.';
        }
    });
});
