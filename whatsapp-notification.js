import { supabase } from './supabase-client.js';
import { sendPaymentNotification as sendPaymentNotificationToDatabase } from './notification-service.js';

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

// Fungsi untuk mengirim notifikasi pembayaran ke PELANGGAN
export async function sendCustomerPaymentNotification(customerData, invoiceData, paymentMethod) {
    if (!customerData.whatsapp_number) {
        console.warn('Nomor WhatsApp pelanggan tidak tersedia.');
        return { success: false, message: 'Nomor WhatsApp pelanggan tidak ada.' };
    }

    // --- PERBAIKAN DIMULAI DI SINI ---

    // Ambil email pelanggan untuk dimasukkan ke dalam pesan
    let customerEmail = 'email_login_anda'; // Fallback jika email tidak ditemukan
    try {
        // Asumsi ada fungsi RPC 'get_user_email' untuk mengambil email dari auth.users
        const { data: email, error: emailError } = await supabase.rpc('get_user_email', {
            user_id: customerData.id
        });
        if (emailError) throw emailError;
        if (email) customerEmail = email;
    } catch (err) {
        console.error("Gagal mengambil email pelanggan untuk notifikasi:", err);
    }

    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
    let target = String(customerData.whatsapp_number).replace(/[^0-9]/g, '');
    if (target.startsWith('0')) {
        target = '62' + target.substring(1);
    }
    
    let message;
    const paymentMethodText = { 'cash': 'Tunai', 'transfer': 'Transfer Bank', 'ewallet': 'E-Wallet', 'qris': 'QRIS' }[paymentMethod] || 'Tunai';

    // Pesan tambahan untuk login
    const loginInfo = `\nAnda dapat melihat riwayat pembayaran dan status tagihan terbaru melalui dasbor pelanggan Anda.\n` +
                      `\nLogin di:\n*http://selinggonet.netlify.app/*\n` +
                      `*- Email:* ${customerEmail}\n` +
                      `*- Password:* password\n`;

    if (invoiceData.is_fully_paid) {
        message = `Konfirmasi Pembayaran LUNAS\n\nHai Bapak/Ibu ${customerData.full_name},\nID Pelanggan: ${customerData.idpl}\n\n` +
                  `✅ *TAGIHAN TELAH LUNAS!*\n\n` +
                  `*Detail Pembayaran:*\n` +
                  `• Periode: *${invoiceData.invoice_period}*\n` +
                  `• Total Tagihan: *${formatter.format(invoiceData.amount)}*\n` +
                  `• Metode: ${paymentMethodText}\n` +
                  `• Status: *LUNAS*\n\n` +
                  `Terima kasih atas pembayaran Anda.` +
                  `${loginInfo}\n` + // <-- Tambahan info login
                  `_____________________________\n*Pesan otomatis dari Selinggonet*`;
    } else {
        message = `Konfirmasi Pembayaran Cicilan\n\nHai Bapak/Ibu ${customerData.full_name},\nID Pelanggan: ${customerData.idpl}\n\n` +
                  `✅ *Pembayaran cicilan diterima!*\n\n` +
                  `*Detail Pembayaran:*\n` +
                  `• Periode: *${invoiceData.invoice_period}*\n` +
                  `• Jumlah Dibayar: *${formatter.format(invoiceData.amount)}*\n` +
                  `• Metode: ${paymentMethodText}\n` +
                  `• Sisa Tagihan: *${formatter.format(invoiceData.remaining_amount)}*\n\n` +
                  `Sisa tagihan dapat Anda lunasi sebelum jatuh tempo. Terima kasih.` +
                  `${loginInfo}\n` + // <-- Tambahan info login
                  `_____________________________\n*Pesan otomatis dari Selinggonet*`;
    }
    // --- PERBAIKAN SELESAI ---

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

// Fungsi untuk mengirim notifikasi pembayaran ke ADMIN
// Menggantikan fungsi WhatsApp notification dengan notifikasi database Supabase
export async function sendPaymentNotification(customerData, invoiceData, adminName) {
    try {
        // Kirim notifikasi ke database Supabase
        const result = await sendPaymentNotificationToDatabase(customerData, invoiceData, adminName);
        
        if (result.success) {
            console.log('Payment notification sent to database successfully');
        } else {
            console.error('Failed to send payment notification to database:', result.message);
        }
        
        return result;
    } catch (error) {
        console.error('Error in sendPaymentNotification:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
}