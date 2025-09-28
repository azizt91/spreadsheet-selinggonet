// notification-service.js
// Simple notification service - back to original

import { supabase } from './supabase-client.js';

/**
 * Mendapatkan jumlah notifikasi yang belum dibaca untuk user
 */
export async function getUnreadNotificationCount(userId) {
    try {
        const { data: notifications, error } = await supabase.rpc('get_user_notifications', {
            user_id_param: userId
        });

        if (error) {
            console.error('Error getting notifications:', error);
            return 0;
        }

        // Hitung yang belum dibaca
        const unreadCount = notifications.filter(notif => !notif.is_read).length;
        return unreadCount;
    } catch (error) {
        console.error('Error in getUnreadNotificationCount:', error);
        return 0;
    }
}

/**
 * Menandai notifikasi sebagai sudah dibaca
 */
export async function markNotificationAsRead(notificationId, userId) {
    try {
        const { error } = await supabase
            .from('notification_reads')
            .upsert({
                notification_id: notificationId,
                user_id: userId
            }, {
                onConflict: 'notification_id,user_id',
                ignoreDuplicates: true
            });

        if (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in markNotificationAsRead:', error);
        return false;
    }
}
