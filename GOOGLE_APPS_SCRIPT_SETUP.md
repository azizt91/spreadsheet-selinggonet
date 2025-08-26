# Google Apps Script Setup Instructions

## Langkah 1: Buat Backend di Google Apps Script

1. **Buka Google Sheet** Anda dengan ID: `1t5wDtV4yATXitTjk9S2jutziUI8KAj23FOaEM2inGPM`
2. Di menu atas, klik **Extensions** > **Apps Script**
3. Sebuah editor kode akan terbuka. Hapus semua kode contoh yang ada
4. Salin dan tempel **seluruh kode dari file `google-apps-script-backend.js`** ke dalam editor

## Langkah 2: Deploy Script sebagai Web App

1. Di editor Apps Script, klik tombol biru **"Deploy"** di pojok kanan atas
2. Pilih **"New deployment"**
3. Di sebelah ikon roda gigi, klik **"Select type"** dan pilih **"Web app"**
4. Isi konfigurasinya:
   - **Description**: `Selinggonet API`
   - **Execute as**: Pilih **"Me"** (akun Google Anda)
   - **Who has access**: **PENTING!** Ubah menjadi **"Anyone"**
5. Klik **"Deploy"**
6. Google akan meminta otorisasi:
   - Klik **"Authorize access"**
   - Pilih akun Google Anda
   - Di layar "Google hasn't verified this app", klik **"Advanced"**
   - Klik **"Go to Selinggonet API (unsafe)"**
   - Klik **"Allow"**
7. Setelah berhasil, Anda akan mendapatkan **"Web app URL"**
8. **SALIN URL INI** - Anda akan memerlukan ini untuk langkah berikutnya

## Langkah 3: Update config.js

1. Buka file `config.js`
2. Ganti URL di baris `API_BASE_URL` dengan URL Web App yang Anda salin:

```javascript
// config.js - API Configuration
const config = {
    // GANTI URL DI BAWAH INI DENGAN WEB APP URL DARI GOOGLE APPS SCRIPT ANDA
    API_BASE_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec', // <-- GANTI DENGAN URL WEB APP ANDA
    
    // Fungsi untuk mendapatkan URL API
    getApiUrl: function(endpoint) {
        // Untuk Google Apps Script, endpoint akan dikirim sebagai parameter action
        return this.API_BASE_URL;
    }
};

// Make config available globally
window.AppConfig = config;
```

## Langkah 4: Commit dan Push ke GitHub

1. Jalankan perintah berikut di terminal:

```bash
git add .
git commit -m "Migrate to Google Apps Script: Simplify backend architecture

- Replace Netlify Functions with Google Apps Script Web App
- Update all frontend API calls to use Google Apps Script format
- Remove dependency issues and complex environment configurations
- Simplify netlify.toml configuration
- More reliable and easier to debug backend solution"
git push origin main
```

## Langkah 5: Deploy ke Netlify

1. Netlify akan melakukan deploy ulang secara otomatis
2. Tidak akan ada proses building functions lagi
3. Deploy akan lebih cepat dan tanpa error

## Fitur yang Tersedia di Google Apps Script Backend

✅ **Authentication**: Login system dengan validasi user/password  
✅ **Customer Management**: CRUD operations untuk data pelanggan  
✅ **Billing Management**: Mengelola tagihan dan pembayaran  
✅ **Expense Tracking**: CRUD operations untuk pengeluaran  
✅ **Dashboard Statistics**: Statistik dengan filtering berdasarkan periode  
✅ **Payment Processing**: Memindahkan tagihan ke lunas  

## Keunggulan Arsitektur Baru

🎯 **Lebih Sederhana**: Tidak perlu konfigurasi environment variables  
🎯 **Lebih Andal**: Tidak ada masalah dependency atau bundling  
🎯 **Mudah Debug**: Semua logika backend di satu tempat  
🎯 **Gratis**: Menggunakan Google Apps Script yang gratis  
🎯 **Terintegrasi**: Langsung terhubung dengan Google Sheets  

## Troubleshooting

Jika ada masalah:

1. **Pastikan Web App URL sudah benar** di config.js
2. **Cek authorization** - pastikan script sudah di-authorize dengan benar
3. **Periksa console browser** untuk error JavaScript
4. **Test API** langsung dengan membuka URL Web App di browser

## Testing

Setelah setup selesai, test fungsi-fungsi berikut:

- [ ] Login ke aplikasi
- [ ] View dashboard statistics
- [ ] Tambah/edit/hapus pelanggan
- [ ] View dan proses tagihan
- [ ] Tambah/edit/hapus pengeluaran
- [ ] View riwayat lunas

Semua fungsi harus bekerja dengan lancar tanpa error!