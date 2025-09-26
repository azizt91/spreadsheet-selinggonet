// notification-service.js
// Service untuk mengirim notifikasi pembayaran ke database Supabase

import { supabase } from './supabase-client.js';

/**
 * Mengirim notifikasi pembayaran lunas ke database Supabase
 * Menggantikan fungsi sendPaymentNotification dari whatsapp-notification.js
 */
export async function sendPaymentNotification(customerData, invoiceData, adminName) {
    try {
        // Panggil fungsi SQL untuk menambah notifikasi
        const { data: notificationId, error } = await supabase.rpc('add_payment_notification', {
            customer_name: customerData.full_name,
            customer_idpl: customerData.idpl,
            invoice_period: invoiceData.invoice_period,
            amount: invoiceData.amount || invoiceData.total_due,
            admin_name: adminName
        });

        if (error) {
            console.error('Error sending payment notification:', error);
            return { success: false, message: `Gagal mengirim notifikasi: ${error.message}` };
        }

        console.log('Payment notification sent successfully:', notificationId);
        
        // Juga tampilkan notifikasi browser jika memungkinkan
        await showBrowserNotification(customerData, invoiceData, adminName);
        
        return { success: true, message: 'Notifikasi pembayaran berhasil dikirim.' };
    } catch (error) {
        console.error('Error in sendPaymentNotification:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
}

/**
 * Menampilkan notifikasi browser (PWA notification)
 */
async function showBrowserNotification(customerData, invoiceData, adminName) {
    // Cek apakah browser mendukung notifikasi
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('Browser tidak mendukung notifikasi PWA');
        return;
    }

    // Cek permission
    if (Notification.permission === 'denied') {
        console.log('Notifikasi ditolak oleh user');
        return;
    }

    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Permission notifikasi tidak diberikan');
            return;
        }
    }

    try {
        const amount = new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR' 
        }).format(invoiceData.amount || invoiceData.total_due || 0);

        const title = '🔔 Pembayaran Lunas Diterima';
        const options = {
            body: `Dari ${customerData.full_name} (${amount}) untuk periode ${invoiceData.invoice_period}. Diproses oleh ${adminName}.`,
            icon: 'assets/logo_192x192.png',
            badge: 'assets/logo_192x192.png',
            vibrate: [200, 100, 200],
            tag: `payment-${invoiceData.id}`,
            requireInteraction: true, // Notifikasi tidak hilang otomatis
            actions: [
                {
                    action: 'view',
                    title: 'Lihat Detail',
                    icon: 'assets/logo_192x192.png'
                }
            ]
        };

        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
        
        console.log('Browser notification displayed successfully');
    } catch (error) {
        console.error('Error showing browser notification:', error);
    }
}

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
