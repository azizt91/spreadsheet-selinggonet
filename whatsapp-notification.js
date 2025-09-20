import { supabase } from './supabase-client.js';

// Fungsi ini sekarang akan memanggil Supabase Edge Function
// async function invokeWhatsappFunction(target, message) {
//     const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
//         body: { target, message },
//     });

//     if (error) {
//         console.error('Error invoking Supabase function:', error);
//         return { success: false, message: error.message };
//     }
    
//     // Periksa apakah data yang dikembalikan adalah error dari dalam function
//     if (data && data.success === false) {
//         console.error('Error from Supabase function:', data.message);
//         return { success: false, message: data.message };
//     }

//     console.log('WhatsApp notification sent successfully via Supabase:', data);
//     return { success: true, message: 'Notifikasi WhatsApp berhasil dikirim', response: data };
// }

async function invokeWhatsappFunction(target, message) {
    console.log(`Attempting to invoke Supabase function 'send-whatsapp-notification' for target: ${target}`);

    const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: { target, message },
    });

    if (error) {
        // Ini adalah error jaringan atau error Supabase
        console.error('Supabase function invocation failed:', error);
        return { success: false, message: `Error memanggil fungsi: ${error.message}` };
    }
    
    // Ini adalah log untuk melihat respons dari dalam fungsi
    console.log('Response from Supabase function:', data);
    
    if (data && data.success === false) {
        // Ini adalah error yang ditangkap di dalam Edge Function (misalnya dari API Fonnte)
        console.error('Error returned from inside the function:', data.message);
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
        console.warn('Customer WhatsApp number not available');
        return { success: false, message: 'Nomor WhatsApp pelanggan tidak ada.' };
    }

    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
    let target = String(customerData.whatsapp_number).replace(/[^0-9]/g, '');
    if (target.startsWith('0')) {
        target = '62' + target.substring(1);
    }
    
    let message;
    if (invoiceData.is_fully_paid) {
        message = `Konfirmasi Pembayaran LUNAS\n\nHai Bapak/Ibu ${customerData.full_name},\nID Pelanggan: ${customerData.idpl}\n\n` +
                  `✅ *TAGIHAN TELAH LUNAS!*\n\n` +
                  `*Detail Pembayaran:*\n` +
                  `• Periode: ${invoiceData.invoice_period}\n` +
                  `• Total Tagihan: ${formatter.format(invoiceData.amount)}\n` +
                  `• Metode: ${paymentMethod}\n` +
                  `• Status: LUNAS\n\n` +
                  `Terima kasih atas pembayaran Anda. Layanan internet Anda akan terus aktif.\n\n` +
                  `_____________________________\n*Pesan otomatis dari Selinggonet*`;
    } else {
        message = `Konfirmasi Pembayaran Cicilan\n\nHai Bapak/Ibu ${customerData.full_name},\nID Pelanggan: ${customerData.idpl}\n\n` +
                  `✅ *Pembayaran cicilan diterima!*\n\n` +
                  `*Detail Pembayaran:*\n` +
                  `• Periode: ${invoiceData.invoice_period}\n` +
                  `• Jumlah Dibayar: ${formatter.format(invoiceData.amount)}\n` +
                  `• Metode: ${paymentMethod}\n` +
                  `• Sisa Tagihan: ${formatter.format(invoiceData.remaining_amount)}\n\n` +
                  `Sisa tagihan tolong dibayarkan segera. Terima kasih.\n\n` +
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

export function showNotificationResult(result) {
    // ... (Fungsi ini tidak perlu diubah)
}