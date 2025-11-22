import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Fungsi whatsapp-reminder dipanggil.');

// Kita gunakan array manual untuk memastikan nama bulan persis sama dengan Database
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    console.log('Klien Supabase berhasil dibuat.');

    // 1. PERBAIKAN TIMEZONE (FIX UTAMA)
    // Paksa waktu server (UTC) menjadi WIB (UTC+7)
    const nowUtc = new Date();
    // Tambah 7 jam
    const nowWib = new Date(nowUtc.getTime() + (7 * 60 * 60 * 1000));
    
    // Ambil tanggal dari waktu yang sudah digeser
    const currentDay = nowWib.getUTCDate();
    const currentMonthIndex = nowWib.getUTCMonth();
    const currentYear = nowWib.getUTCFullYear();
    
    // Buat string periode agar 100% cocok dengan format di tabel invoices (misal: "November 2025")
    const currentMonthYear = `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`;
    
    console.log(`Mode WIB - Cek Tanggal: ${currentDay}, Periode: ${currentMonthYear}`);

    // 2. Cari semua pelanggan aktif
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, idpl, full_name, whatsapp_number, package_id, installation_date')
      .eq('status', 'AKTIF');

    if (profilesError) throw profilesError;

    const potentialUsers = profiles.filter(p => {
      if (!p.installation_date) return false;
      
      // Parse tanggal instalasi dengan aman
      const installDate = new Date(p.installation_date);
      // Gunakan getDate() biasa atau getUTCDate() tergantung format string di DB,
      // tapi biasanya installation_date YYYY-MM-DD dianggap UTC midnight oleh JS.
      const installationDay = installDate.getUTCDate();
      
      return installationDay === currentDay;
    });

    if (potentialUsers.length === 0) {
      const msg = `Tidak ada pengguna yang jatuh tempo tanggal ${currentDay} ini (WIB).`;
      console.log(msg);
      return new Response(JSON.stringify({ message: msg }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    console.log(`Ditemukan ${potentialUsers.length} pengguna jatuh tempo tanggal ${currentDay}.`);

    // 3. Cek siapa yang SUDAH bayar (status 'paid') untuk periode ini
    const potentialUserIds = potentialUsers.map(u => u.id);
    const { data: paidInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('customer_id')
      .in('customer_id', potentialUserIds)
      .eq('status', 'paid')
      .eq('invoice_period', currentMonthYear); // Menggunakan format bulan yang pasti cocok

    if (invoicesError) throw invoicesError;

    const paidUserIds = new Set(paidInvoices.map(inv => inv.customer_id));
    
    // 4. Filter: Hanya sisakan yang BELUM bayar
    const usersToNotify = potentialUsers.filter(user => !paidUserIds.has(user.id));

    if (usersToNotify.length === 0) {
      const msg = 'Semua pengguna yang jatuh tempo hari ini sudah lunas.';
      console.log(msg);
      return new Response(JSON.stringify({ message: msg }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    console.log(`Final: ${usersToNotify.length} pengguna akan dikirim notifikasi.`);

    // 5. Ambil data harga paket
    const { data: packages, error: packagesError } = await supabase.from('packages').select('id, price');
    if (packagesError) throw packagesError;
    const packagesMap = new Map(packages.map(p => [p.id, p.price]));

    // 6. Kirim notifikasi
    let successCount = 0;
    let failureCount = 0;

    for (const user of usersToNotify) {
      const price = packagesMap.get(user.package_id);

      if (!price || !user.whatsapp_number) {
        console.warn(`Skip user ${user.full_name}: Harga/WA tidak lengkap.`);
        continue;
      }

      // Bersihkan nomor WA (hanya angka)
      const waTarget = user.whatsapp_number.replace(/\D/g, '');
      
      // ISI PESAN (Sudah termasuk nomor DANA yang Anda tambahkan)
      const message = `*Informasi Tagihan WiFi Anda*\n\nHai Bapak/Ibu ${user.full_name},\nID Pelanggan: ${user.idpl || '-'}\n\nTagihan Anda untuk periode *${currentMonthYear}* sebesar *Rp${new Intl.NumberFormat('id-ID').format(price)}* telah jatuh tempo.\n\n*PEMBAYARAN LEBIH MUDAH DENGAN QRIS!*\nScan kode QR di gambar pesan ini menggunakan aplikasi m-banking atau e-wallet Anda (DANA, GoPay, OVO, dll). Pastikan nominal transfer sesuai tagihan.\n\nUntuk pembayaran via QRIS, silakan lihat gambar pada link berikut:\nhttps://bayardong.online/sneat/assets/img/qris.jpeg\n\nAtau transfer manual ke rekening berikut:\n• Seabank: 901307925714\n• BCA: 3621053653\n• BSI: 7211806138\n• Dana: 089609497390\n(an. TAUFIQ AZIZ)\n\nTerima kasih atas kepercayaan Anda.\n_____________________________\n*_Pesan ini dibuat otomatis. Abaikan jika sudah membayar._`;

      try {
        console.log(`Mengirim ke ${user.full_name} (${waTarget})...`);

        // Panggil fungsi kirim WA
        const response = await fetch(Deno.env.get('SUPABASE_URL')! + '/functions/v1/send-whatsapp-notification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ target: waTarget, message: message })
        });

        // Baca response text dulu untuk log error jika perlu
        const responseBody = await response.text();

        if (!response.ok) {
          console.error(`Gagal HTTP ${response.status}: ${responseBody}`);
          failureCount++;
          continue; 
        }

        const result = JSON.parse(responseBody);
        if (!result.success) {
          console.error(`API WA Error: ${result.message}`);
          failureCount++;
          continue;
        }

        console.log(`✓ Terkirim ke ${user.full_name}`);
        successCount++;
      } catch (e) {
        console.error(`✗ Error mengirim ke ${user.full_name}:`, e.message);
        failureCount++;
      }
    }

    const responseMessage = `Selesai. Berhasil: ${successCount}, Gagal: ${failureCount}.`;
    console.log(responseMessage);

    return new Response(JSON.stringify({ message: responseMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Critical Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});