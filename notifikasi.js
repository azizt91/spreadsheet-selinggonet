import { supabase } from './supabase-client.js';
import { requireRole } from './auth.js'; // Asumsi Anda punya file ini

document.addEventListener('DOMContentLoaded', async () => {
    // Pastikan hanya admin yang bisa mengakses halaman ini
    const user = await requireRole('ADMIN');
    if (!user) return;

    const notificationList = document.getElementById('notification-list');
    const clearButton = document.getElementById('clear-notifications');
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'text-center p-8 text-gray-500';
    loadingSpinner.innerText = 'Memuat notifikasi...';

    async function renderNotifications() {
        notificationList.innerHTML = '';
        notificationList.appendChild(loadingSpinner);

        try {
            // Panggil fungsi SQL yang sudah kita buat
            const { data: notifications, error } = await supabase.rpc('get_user_notifications');

            if (error) throw error;
            
            notificationList.innerHTML = ''; // Hapus spinner

            if (!notifications || notifications.length === 0) {
                notificationList.innerHTML = `
                    <div class="text-center p-8 bg-white rounded-lg shadow-sm">
                        <p class="text-gray-500">Tidak ada notifikasi saat ini.</p>
                    </div>
                `;
                return;
            }

            notifications.forEach(notif => {
                const item = document.createElement('div'); // Ubah dari <a> ke <div>
                item.className = 'notification-item block bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 ease-in-out cursor-pointer';
                
                // Tambahkan style untuk notifikasi yang belum dibaca
                if (!notif.is_read) {
                    item.classList.add('font-bold', 'border-blue-500');
                } else {
                    item.classList.add('opacity-70');
                }
                
                // Simpan data notifikasi di elemen itu sendiri
                item.dataset.id = notif.id;
                item.dataset.url = notif.url || '#';
                item.dataset.isRead = notif.is_read;

                item.innerHTML = `
                    <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 w-10 h-10 ${notif.is_read ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'} rounded-full flex items-center justify-center">
                            🔔
                        </div>
                        <div class="flex-1">
                            <p class="text-gray-800 ${!notif.is_read ? 'font-semibold' : 'font-medium'}">${notif.title}</p>
                            <p class="text-sm text-gray-600 font-normal">${notif.body}</p>
                            <p class="text-xs text-gray-400 mt-2 font-normal">${new Date(notif.created_at).toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                `;

                // Tambahkan event listener untuk menandai sebagai "sudah dibaca"
                item.addEventListener('click', async () => {
                    if (item.dataset.isRead === 'false') {
                        const { error } = await supabase.from('notification_reads').insert({
                            notification_id: item.dataset.id,
                            user_id: user.id
                        });
                        if (error) {
                            console.error('Gagal menandai notifikasi:', error);
                        } else {
                            // Langsung redirect jika ada URL, atau render ulang jika tidak
                             if (item.dataset.url !== '#') {
                                window.location.href = item.dataset.url;
                            } else {
                                renderNotifications();
                            }
                        }
                    } else {
                        if (item.dataset.url !== '#') {
                            window.location.href = item.dataset.url;
                        }
                    }
                });

                notificationList.appendChild(item);
            });

        } catch (error) {
            notificationList.innerHTML = `<div class="text-center p-8 bg-red-50 text-red-700 rounded-lg">Gagal memuat notifikasi: ${error.message}</div>`;
            console.error(error);
        }
    }

    clearButton.addEventListener('click', async () => {
        if (confirm('Ini akan menghapus semua notifikasi dari daftar Anda. Lanjutkan?')) {
            // NOTE: This is a simplified clear. A more robust implementation
            // might mark all as read instead of deleting. For simplicity, we delete.
            try {
                 const { error } = await supabase
                    .from('notifications')
                    .delete()
                    .or(`recipient_role.eq.ADMIN,recipient_user_id.eq.${user.id}`); // Hapus yang relevan
                
                if (error) throw error;
                renderNotifications();
            } catch (error) {
                alert('Gagal membersihkan notifikasi: ' + error.message);
            }
        }
    });

    // Render notifikasi saat halaman dimuat
    renderNotifications();
});
