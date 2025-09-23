//
// File: notifikasi.js
//

document.addEventListener('DOMContentLoaded', () => {
    const notificationList = document.getElementById('notification-list');
    const clearButton = document.getElementById('clear-notifications');

    function getNotifications() {
        const notificationsJSON = localStorage.getItem('selinggonet_notifications');
        return notificationsJSON ? JSON.parse(notificationsJSON) : [];
    }

    function saveNotifications(notifications) {
        localStorage.setItem('selinggonet_notifications', JSON.stringify(notifications));
    }

    function renderNotifications() {
        const notifications = getNotifications();
        notificationList.innerHTML = ''; // Kosongkan daftar

        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="text-center p-8 bg-white rounded-lg shadow-sm">
                    <p class="text-gray-500">Tidak ada notifikasi saat ini.</p>
                </div>
            `;
            return;
        }

        notifications.forEach(notif => {
            const item = document.createElement('a');
            item.href = notif.url || '#'; // Arahkan ke URL jika ada
            item.className = 'notification-item block bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 ease-in-out';
            
            item.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        🔔
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold text-gray-800">${notif.title}</p>
                        <p class="text-sm text-gray-600">${notif.body}</p>
                        <p class="text-xs text-gray-400 mt-2">${new Date(notif.timestamp).toLocaleString('id-ID')}</p>
                    </div>
                </div>
            `;
            notificationList.appendChild(item);
        });
    }

    // Event listener untuk tombol hapus
    clearButton.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin menghapus semua notifikasi?')) {
            saveNotifications([]);
            renderNotifications();
        }
    });

    // Tandai semua notifikasi sebagai "sudah dibaca" saat halaman dibuka
    const notifications = getNotifications();
    notifications.forEach(n => n.read = true);
    saveNotifications(notifications);

    // Render notifikasi saat halaman dimuat
    renderNotifications();
});