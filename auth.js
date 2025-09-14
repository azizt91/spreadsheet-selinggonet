// auth.js (Shared Authentication & Responsive Logic)

// --- Fungsi Pengecekan Sesi (Tidak Berubah) ---
function checkSession() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        alert('Anda harus login untuk mengakses halaman ini.');
        window.location.href = 'index.html';
    }
    return loggedInUser;
}

// --- Fungsi Pengecekan Authentication untuk Profile ---
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('userData');
    
    if (!isLoggedIn || isLoggedIn !== 'true') {
        alert('Anda harus login untuk mengakses halaman ini.');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// --- Fungsi Logout (Tidak Berubah) ---
function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('loggedInUser');
            alert('Anda berhasil logout.');
            window.location.href = 'index.html';
        });
    }
}

// --- Fungsi Hamburger Menu (Tidak Berubah) ---
function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (hamburgerBtn && sidebar && overlay) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }
}

// function initHamburgerMenu() {
//     console.log("Mencoba menginisialisasi menu hamburger..."); // Pesan 1

//     const hamburgerBtn = document.getElementById('hamburger-btn');
//     const sidebar = document.getElementById('sidebar');
//     const overlay = document.getElementById('sidebar-overlay');

//     if (hamburgerBtn && sidebar && overlay) {
//         console.log("SUKSES: Tombol hamburger dan elemen lain ditemukan!"); // Pesan 2

//         hamburgerBtn.addEventListener('click', () => {
//             console.log("Tombol hamburger di-klik!"); // Pesan 3
//             sidebar.classList.toggle('show');
//             overlay.classList.toggle('show');
//         });

//         overlay.addEventListener('click', () => {
//             sidebar.classList.remove('show');
//             overlay.classList.remove('show');
//         });
//     } else {
//         console.error("GAGAL: Salah satu elemen tidak ditemukan!"); // Pesan 4
//         if (!hamburgerBtn) console.error("Elemen dengan id='hamburger-btn' tidak ada.");
//         if (!sidebar) console.error("Elemen dengan id='sidebar' tidak ada.");
//         if (!overlay) console.error("Elemen dengan id='sidebar-overlay' tidak ada.");
//     }
// }

// ===============================================
// --- PERBAIKAN DI SINI ---
// Jalankan semua fungsi HANYA SETELAH seluruh halaman HTML siap
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    initLogout();
    initHamburgerMenu(); // Jalankan fungsi hamburger di sini
});

