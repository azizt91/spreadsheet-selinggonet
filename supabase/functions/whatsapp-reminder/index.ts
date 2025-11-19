import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Fungsi whatsapp-reminder dipanggil.');

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    console.log('Klien Supabase berhasil dibuat.');

    // 1. Dapatkan informasi tanggal hari ini
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonthYear = today.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    console.log(`Mengecek jatuh tempo untuk tanggal: ${currentDay}, Periode: ${currentMonthYear}`);

    // 2. Cari semua pelanggan aktif yang tanggal pemasangannya cocok dengan tanggal hari ini
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, idpl, full_name, whatsapp_number, package_id, installation_date')
      .eq('status', 'AKTIF');

    if (profilesError) throw profilesError;

    const potentialUsers = profiles.filter(p => {
      if (!p.installation_date) return false;
      const installationDay = new Date(p.installation_date).getDate();
      return installationDay === currentDay;
    });

    if (potentialUsers.length === 0) {
      const msg = 'Tidak ada pengguna yang jatuh tempo hari ini.';
      console.log(msg);
      return new Response(JSON.stringify({ message: msg }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    console.log(`Ditemukan ${potentialUsers.length} pengguna yang berpotensi untuk dinotifikasi.`);

    // 3. Cek siapa saja dari pengguna tersebut yang sudah membayar bulan ini
    const potentialUserIds = potentialUsers.map(u => u.id);
    const { data: paidInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('customer_id')
      .in('customer_id', potentialUserIds)
      .eq('status', 'paid')
      .eq('invoice_period', currentMonthYear);

    if (invoicesError) throw invoicesError;

    const paidUserIds = new Set(paidInvoices.map(inv => inv.customer_id));
    console.log(`Ditemukan ${paidUserIds.size} pengguna yang sudah membayar bulan ini.`);

    // 4. Filter pengguna, hanya sisakan yang belum bayar
    const usersToNotify = potentialUsers.filter(user => !paidUserIds.has(user.id));

    if (usersToNotify.length === 0) {
      const msg = 'Semua pengguna yang jatuh tempo hari ini sudah membayar.';
      console.log(msg);
      return new Response(JSON.stringify({ message: msg }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    console.log(`Final: ${usersToNotify.length} pengguna akan dikirimkan notifikasi WhatsApp.`);


    // 5. Ambil semua data paket untuk efisiensi
    const { data: packages, error: packagesError } = await supabase.from('packages').select('id, price');
    if (packagesError) throw packagesError;
    const packagesMap = new Map(packages.map(p => [p.id, p.price]));

    // 6. Kirim notifikasi ke pengguna yang sudah difilter
    let successCount = 0;
    let failureCount = 0;

    for (const user of usersToNotify) {
      const price = packagesMap.get(user.package_id);

      if (!price || !user.whatsapp_number) {
        console.warn(`Melewatkan user ${user.full_name} karena harga paket atau nomor WhatsApp tidak ditemukan.`);
        continue;
      }

      // Membuat isi pesan sesuai template
      const message = `*Informasi Tagihan WiFi Anda*\n\nHai Bapak/Ibu ${user.full_name},\nID Pelanggan: ${user.idpl || '-'}\n\nTagihan Anda untuk periode *${currentMonthYear}* sebesar *Rp${new Intl.NumberFormat('id-ID').format(price)}* telah jatuh tempo.\n\n*PEMBAYARAN LEBIH MUDAH DENGAN QRIS!*\nScan kode QR di gambar pesan ini menggunakan aplikasi m-banking atau e-wallet Anda (DANA, GoPay, OVO, dll). Pastikan nominal transfer sesuai tagihan.\n\nUntuk pembayaran via QRIS, silakan lihat gambar pada link berikut:\nhttps://bayardong.online/sneat/assets/img/qris.jpeg\n\nAtau transfer manual ke rekening berikut:\n• Seabank: 901307925714\n• BCA: 3621053653\n• BSI: 7211806138\n• Dana: 089609497390\n(an. TAUFIQ AZIZ)\n\nTerima kasih atas kepercayaan Anda.\n_____________________________\n*_Pesan ini dibuat otomatis. Abaikan jika sudah membayar._`;

      // Panggil fungsi 'send-whatsapp-notification' yang sudah ada
      try {
        console.log(`Mengirim pesan ke ${user.full_name} (${user.whatsapp_number})...`);

        const response = await fetch(Deno.env.get('SUPABASE_URL')! + '/functions/v1/send-whatsapp-notification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ target: user.whatsapp_number, message: message })
        });

        const responseBody = await response.text();
        console.log(`Response status: ${response.status}, body:`, responseBody);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${responseBody}`);
        }

        // Parse response untuk validasi lebih lanjut
        const result = JSON.parse(responseBody);
        if (!result.success) {
          throw new Error(`API Error: ${result.message || 'Unknown error'}`);
        }

        console.log(`✓ Berhasil mengirim pesan ke ${user.full_name}:`, result.data);
        successCount++;
      } catch (e) {
        console.error(`✗ Gagal mengirim pesan ke ${user.full_name}:`, e.message);
        failureCount++;
      }
    }

    const responseMessage = `Proses notifikasi WhatsApp selesai. Berhasil: ${successCount}, Gagal: ${failureCount}.`;
    console.log(responseMessage);

    return new Response(JSON.stringify({ message: responseMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Terjadi kesalahan tidak terduga di whatsapp-reminder:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});