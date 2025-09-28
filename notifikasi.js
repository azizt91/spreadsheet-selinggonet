import { supabase } from './supabase-client.js';
import { requireRole } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Pastikan hanya admin yang bisa mengakses halaman ini
    const user = await requireRole('ADMIN');
    if (!user) return;

    const notificationList = document.getElementById('notification-list');
    const clearButton = document.getElementById('clear-notifications');
    const markAllReadButton = document.getElementById('mark-all-read');
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'text-center p-8 text-gray-500';
    loadingSpinner.innerText = 'Memuat notifikasi...';

    // Helper function untuk mark as read
    async function markAsRead(notificationId, userId) {
        try {
            const { error } = await supabase.from('notification_reads').upsert({
                notification_id: notificationId,
                user_id: userId
            }, {
                onConflict: 'notification_id,user_id',
                ignoreDuplicates: true
            });

            if (error) {
                console.error('Gagal menandai notifikasi:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }

    // Helper function untuk delete notification
    async function deleteNotification(notificationId) {
        try {
            // Hapus dari notification_reads terlebih dahulu (jika ada)
            await supabase
                .from('notification_reads')
                .delete()
                .eq('notification_id', notificationId);

            // Kemudian hapus notifikasi utama
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) {
                console.error('Gagal menghapus notifikasi:', error);
                alert('Gagal menghapus notifikasi: ' + error.message);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error deleting notification:', error);
            alert('Error menghapus notifikasi: ' + error.message);
            return false;
        }
    }

    async function renderNotifications() {
        notificationList.innerHTML = '';
        notificationList.appendChild(loadingSpinner);

        try {
            // Panggil fungsi SQL dengan parameter user ID yang jelas
            const { data: notifications, error } = await supabase.rpc('get_user_notifications', {
                user_id_param: user.id
            });

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
                const item = document.createElement('div');
                item.className = 'notification-item bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 ease-in-out';

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
                        <div class="flex-1 cursor-pointer notification-content">
                            <p class="text-gray-800 ${!notif.is_read ? 'font-semibold' : 'font-medium'}">${notif.title}</p>
                            <p class="text-sm text-gray-600 font-normal">${notif.body}</p>
                            <p class="text-xs text-gray-400 mt-2 font-normal">${new Date(notif.created_at).toLocaleString('id-ID')}</p>
                        </div>
                        <div class="flex flex-col gap-2 ml-2">
                            ${!notif.is_read ? `
                                <button class="mark-read-btn w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center transition-colors" title="Tandai sudah dibaca">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                    </svg>
                                </button>
                            ` : ''}
                            <button class="delete-btn w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors" title="Hapus notifikasi">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `;

                // Event listener untuk konten notifikasi (navigasi)
                const content = item.querySelector('.notification-content');
                content.addEventListener('click', async () => {
                    if (item.dataset.isRead === 'false') {
                        await markAsRead(item.dataset.id, user.id);
                    }
                    if (item.dataset.url !== '#') {
                        window.location.href = item.dataset.url;
                    }
                });

                // Event listener untuk tombol mark as read
                const markReadBtn = item.querySelector('.mark-read-btn');
                if (markReadBtn) {
                    markReadBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await markAsRead(item.dataset.id, user.id);
                        renderNotifications();
                    });
                }

                // Event listener untuk tombol delete
                const deleteBtn = item.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Hapus notifikasi ini?')) {
                        await deleteNotification(item.dataset.id);
                        renderNotifications();
                    }
                });

                notificationList.appendChild(item);
            });

        } catch (error) {
            notificationList.innerHTML = `<div class="text-center p-8 bg-red-50 text-red-700 rounded-lg">Gagal memuat notifikasi: ${error.message}</div>`;
            console.error(error);
        }
    }

    // Event listener untuk tombol "Tandai Semua Sudah Dibaca"
    markAllReadButton.addEventListener('click', async () => {
        if (confirm('Tandai semua notifikasi sebagai sudah dibaca?')) {
            try {
                // Ambil semua notifikasi yang belum dibaca untuk user ini
                const { data: unreadNotifications, error: fetchError } = await supabase.rpc('get_user_notifications', {
                    user_id_param: user.id
                });

                if (fetchError) throw fetchError;

                // Filter hanya yang belum dibaca
                const unreadIds = unreadNotifications
                    .filter(notif => !notif.is_read)
                    .map(notif => notif.id);

                if (unreadIds.length > 0) {
                    // Tandai semua sebagai sudah dibaca
                    const readRecords = unreadIds.map(notificationId => ({
                        notification_id: notificationId,
                        user_id: user.id
                    }));

                    const { error: insertError } = await supabase
                        .from('notification_reads')
                        .upsert(readRecords, {
                            onConflict: 'notification_id,user_id',
                            ignoreDuplicates: true
                        });

                    if (insertError) throw insertError;

                    renderNotifications();
                    alert('Semua notifikasi telah ditandai sebagai sudah dibaca.');
                } else {
                    alert('Tidak ada notifikasi yang belum dibaca.');
                }
            } catch (error) {
                console.error('Error marking all as read:', error);
                alert('Gagal menandai semua sebagai dibaca: ' + error.message);
            }
        }
    });

    // Event listener untuk tombol "Hapus Semua Notifikasi"
    clearButton.addEventListener('click', async () => {
        if (confirm('PERHATIAN: Ini akan menghapus SEMUA notifikasi Anda secara permanen. Lanjutkan?')) {
            try {
                // Ambil semua notifikasi untuk user ini
                const { data: userNotifications, error: fetchError } = await supabase.rpc('get_user_notifications', {
                    user_id_param: user.id
                });

                if (fetchError) throw fetchError;

                if (userNotifications.length > 0) {
                    const notificationIds = userNotifications.map(notif => notif.id);

                    // Hapus semua read records untuk user ini
                    await supabase
                        .from('notification_reads')
                        .delete()
                        .in('notification_id', notificationIds);

                    // Hapus semua notifikasi yang relevan untuk user ini
                    // Catatan: Ini hanya akan menghapus notifikasi yang ditujukan khusus untuk user ini
                    // atau notifikasi umum. Notifikasi untuk admin lain tetap ada.
                    const { error: deleteError } = await supabase
                        .from('notifications')
                        .delete()
                        .or(`recipient_user_id.eq.${user.id},and(recipient_role.eq.ADMIN,recipient_user_id.is.null)`);

                    if (deleteError) throw deleteError;

                    renderNotifications();
                    alert('Semua notifikasi telah dihapus.');
                } else {
                    alert('Tidak ada notifikasi untuk dihapus.');
                }
            } catch (error) {
                console.error('Error deleting all notifications:', error);
                alert('Gagal menghapus semua notifikasi: ' + error.message);
            }
        }
    });

    // Render notifikasi saat halaman dimuat
    renderNotifications();
});
