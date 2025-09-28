// notification-badge.js
// Script untuk mengelola badge notifikasi di dashboard

import { getUnreadNotificationCount } from './notification-service.js';

/**
 * Inisialisasi badge notifikasi di dashboard
 */
export function initNotificationBadge(userId) {
    // Update badge saat halaman dimuat
    updateNotificationBadge(userId);
    
    // Update badge setiap 30 detik
    setInterval(() => {
        updateNotificationBadge(userId);
    }, 30000);
    
    // Update badge saat window focus (user kembali ke tab)
    window.addEventListener('focus', () => {
        updateNotificationBadge(userId);
    });
}

/**
 * Update tampilan badge notifikasi
 */
async function updateNotificationBadge(userId) {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    try {
        const unreadCount = await getUnreadNotificationCount(userId);
        
        if (unreadCount > 0) {
            badge.classList.remove('hidden');
            // Hapus angka, hanya tampilkan dot merah
            badge.textContent = '';
        } else {
            badge.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error updating notification badge:', error);
        badge.classList.add('hidden');
    }
}

/**
 * Menambahkan HTML untuk ikon notifikasi di header dashboard
 * Panggil fungsi ini di dashboard.js setelah DOM loaded
 */
export function addNotificationIconToHeader() {
    // Cari header yang ada
    const header = document.querySelector('header .flex.items-center.justify-between');
    if (!header) {
        console.warn('Header tidak ditemukan untuk menambah ikon notifikasi');
        return;
    }

    // Cari div yang berisi tombol logout
    const rightSection = header.querySelector('div:last-child');
    if (!rightSection) {
        console.warn('Right section header tidak ditemukan');
        return;
    }

    // Cek apakah ikon notifikasi sudah ada
    if (document.getElementById('notification-bell')) {
        return; // Sudah ada, tidak perlu tambah lagi
    }

    // Buat elemen ikon notifikasi
    const notificationIcon = document.createElement('a');
    notificationIcon.href = 'notifikasi.html';
    notificationIcon.id = 'notification-bell';
    notificationIcon.className = 'relative w-10 h-10 flex items-center justify-center text-white rounded-full hover:bg-white/20 transition-colors mr-2';
    
    notificationIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
            <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"></path>
        </svg>
        <span id="notification-badge" class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full hidden"></span>
    `;

    // Sisipkan sebelum tombol logout
    const logoutButton = rightSection.querySelector('button');
    if (logoutButton) {
        rightSection.insertBefore(notificationIcon, logoutButton);
    } else {
        rightSection.appendChild(notificationIcon);
    }
}
