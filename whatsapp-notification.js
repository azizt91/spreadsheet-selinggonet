import { supabase } from './supabase-client.js';

// Fungsi PENTING yang memanggil Supabase Function, bukan lagi PHP
async function invokeWhatsappFunction(target, message) {
    console.log(`Memanggil Supabase Function 'send-whatsapp-notification' untuk target: ${target}`);

    // Ini adalah bagian yang diubah. Kita memanggil 'send-whatsapp-notification'
    const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: { target, message },
    });

    if (error) {
        console.error('Supabase function invocation failed:', error);
        return { success: false, message: `Error memanggil fungsi: ${error.message}` };
    }
    
    console.log('Respons dari Supabase function:', data);
    
    if (data && data.success === false) {
        console.error('Error dari dalam function:', data.message);
        return { success: false, message: `API Error: ${data.message}` };
    }

    return { success: true, message: 'Notifikasi WhatsApp berhasil diproses', response: data };
}

// Fungsi untuk mengirim notifikasi pembayaran ke NOMOR ADMIN
export async function sendPaymentNotification(customerData, invoiceData, adminName) {
    const notificationNumber = '6281914170701'; // Nomor admin
    const amount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(invoiceData.amount || 0);
    const paidDate = new Date(invoiceData.paid_at || Date.now()).toLocaleString('id-ID');

    const message = `🔔 *PEMBAYARAN LUNAS* 🔔\n\n` +
                    `*Detail Pembayaran:*\n` +
                    `• Nama: ${customerData.full_name}\n` +
                    `• ID Pelanggan: ${customerData.idpl}\n` +
                    `• Periode: ${invoiceData.invoice_period}\n` +
                    `• Jumlah: ${amount}\n` +
                    `• Tanggal Bayar: ${paidDate}\n\n` +
                    `*Diproses oleh:* ${adminName}\n\n` +
                    `✅ Status tagihan telah diubah menjadi LUNAS\n\n` +
                    `_Selinggonet Management System_`;

    return await invokeWhatsappFunction(notificationNumber, message);
}

// Fungsi untuk mengirim notifikasi pembayaran ke PELANGGAN
export async function sendCustomerPaymentNotification(customerData, invoiceData, paymentMethod) {
    if (!customerData.whatsapp_number) {
        console.warn('Nomor WhatsApp pelanggan tidak tersedia.');
        return { success: false, message: 'Nomor WhatsApp pelanggan tidak ada.' };
    }

    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
    let target = String(customerData.whatsapp_number).replace(/[^0-9]/g, '');
    if (target.startsWith('0')) {
        target = '62' + target.substring(1);
    }
    
    let message;
    const paymentMethodText = { 'cash': 'Tunai', 'transfer': 'Transfer Bank', 'ewallet': 'E-Wallet' }[paymentMethod] || 'Tunai';

    if (invoiceData.is_fully_paid) {
        message = `Konfirmasi Pembayaran LUNAS\n\nHai Bapak/Ibu ${customerData.full_name},\nID Pelanggan: ${customerData.idpl}\n\n` +
                  `✅ *TAGIHAN TELAH LUNAS!*\n\n` +
                  `*Detail Pembayaran:*\n` +
                  `• Periode: ${invoiceData.invoice_period}\n` +
                  `• Total Tagihan: ${formatter.format(invoiceData.amount)}\n` +
                  `• Metode: ${paymentMethodText}\n` +
                  `• Status: LUNAS\n\n` +
                  `Terima kasih atas pembayaran Anda.\n\n` +
                  `_____________________________\n*Pesan otomatis dari Selinggonet*`;
    } else {
        message = `Konfirmasi Pembayaran Cicilan\n\nHai Bapak/Ibu ${customerData.full_name},\nID Pelanggan: ${customerData.idpl}\n\n` +
                  `✅ *Pembayaran cicilan diterima!*\n\n` +
                  `*Detail Pembayaran:*\n` +
                  `• Periode: ${invoiceData.invoice_period}\n` +
                  `• Jumlah Dibayar: ${formatter.format(invoiceData.amount)}\n` +
                  `• Metode: ${paymentMethodText}\n` +
                  `• Sisa Tagihan: ${formatter.format(invoiceData.remaining_amount)}\n\n` +
                  `Sisa tagihan dapat Anda lunasi sebelum jatuh tempo. Terima kasih.\n\n` +
                  `_____________________________\n*Pesan otomatis dari Selinggonet*`;
    }

    return await invokeWhatsappFunction(target, message);
}

// Fungsi lain tetap sama
export async function getCurrentAdminName() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'Admin';
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        return profile?.full_name || 'Admin';
    } catch (error) {
        console.error('Error getting admin name:', error);
        return 'Admin';
    }
}

// Anda bisa menambahkan fungsi notifikasi UI di sini jika perlu

export function showNotificationResult(result) {
    if (result.success) {
        showSuccessNotification('✅ ' + result.message);
    } else {
        showErrorNotification('⚠️ ' + result.message);
    }
}

// Utility functions for showing notifications (if not already available)
function showSuccessNotification(message) {
    showNotification(message, '#28a745', '✓');
}

function showErrorNotification(message) {
    showNotification(message, '#dc3545', '⚠');
}

function showNotification(message, bgColor, icon) {
    const notification = document.createElement('div');
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background-color: ${bgColor}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 1002; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); animation: slideInRight 0.3s ease;`;
    notification.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><span>${icon}</span><span>${message}</span></div>`;
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }`;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            notification.addEventListener('animationend', () => notification.remove());
        }
    }, 3000);
}