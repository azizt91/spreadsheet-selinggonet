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

// Fungsi untuk mengirim notifikasi pembayaran ke PELANGGAN
export async function sendCustomerPaymentNotification(customerData, invoiceData, paymentMethod) {
    if (!customerData.whatsapp_number) {
        console.warn('Nomor WhatsApp pelanggan tidak tersedia.');
        return { success: false, message: 'Nomor WhatsApp pelanggan tidak ada.' };
    }

    // Check if auto notification is enabled
    const { data: autoNotifSetting } = await supabase
        .from('whatsapp_settings')
        .select('setting_value')
        .eq('setting_key', 'auto_notification_enabled')
        .single();

    if (autoNotifSetting?.setting_value !== 'true') {
        console.log('Auto notification is disabled');
        return { success: true, message: 'Notifikasi otomatis dinonaktifkan' };
    }

    // Check if Fonnte token is configured (either in database or Supabase Secrets)
    const { data: tokenSetting } = await supabase
        .from('whatsapp_settings')
        .select('setting_value')
        .eq('setting_key', 'fonnte_token')
        .single();

    // If no token in database, assume it's in Supabase Secrets (will be checked by Edge Function)
    // If token exists but empty, show warning
    if (tokenSetting && tokenSetting.setting_value === '') {
        console.warn('Fonnte token not configured in database. Make sure it is set in Supabase Secrets.');
    }

    // Get WhatsApp settings
    const { data: whatsappSettings } = await supabase
        .from('whatsapp_settings')
        .select('*');

    const settings = {};
    whatsappSettings?.forEach(s => {
        settings[s.setting_key] = s.setting_value;
    });

    // Get customer email
    let customerEmail = 'email_login_anda';
    try {
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
    
    const paymentMethodText = { 'cash': 'Tunai', 'transfer': 'Transfer Bank', 'ewallet': 'E-Wallet', 'qris': 'QRIS' }[paymentMethod] || 'Tunai';

    // Get template based on payment type
    let template = invoiceData.is_fully_paid 
        ? settings.template_payment_full 
        : settings.template_payment_installment;

    // Replace variables in template
    const message = template
        .replace(/{nama_pelanggan}/g, customerData.full_name)
        .replace(/{idpl}/g, customerData.idpl)
        .replace(/{periode}/g, invoiceData.invoice_period)
        .replace(/{total_tagihan}/g, formatter.format(invoiceData.amount))
        .replace(/{jumlah_dibayar}/g, formatter.format(invoiceData.amount))
        .replace(/{sisa_tagihan}/g, formatter.format(invoiceData.remaining_amount || 0))
        .replace(/{metode_pembayaran}/g, paymentMethodText)
        .replace(/{app_url}/g, settings.app_url || 'https://selinggonet.web.id/')
        .replace(/{email_pelanggan}/g, customerEmail);

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

