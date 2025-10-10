# Integrasi Mikrotik Netwatch dengan Selinggonet

## 📋 Overview

Integrasi ini memungkinkan aplikasi Selinggonet menampilkan status koneksi pelanggan secara real-time dari Mikrotik Netwatch. Status ditampilkan dengan indikator visual seperti WhatsApp (lingkaran hijau/merah/abu-abu di sekitar foto profil).

## 🏗️ Arsitektur

```
Frontend (Netlify) → Netlify Function → Mikrotik REST API → Response
```

**Keuntungan:**
- ✅ Tidak ada masalah CORS
- ✅ Kredensial Mikrotik aman (tidak terekspos di frontend)
- ✅ Berjalan di cloud (tidak perlu server lokal 24/7)
- ✅ Scalable dan mudah maintain

## 📁 File yang Dibuat

### 1. `netlify/functions/mikrotik-status.js`
Serverless function yang berfungsi sebagai proxy untuk mengakses Mikrotik REST API.

**Fitur:**
- Basic Authentication ke Mikrotik
- CORS handling
- Error handling
- Format data untuk frontend

### 2. `netlify/functions/package.json`
Dependencies untuk Netlify Functions (node-fetch).

### 3. `netlify.toml` (Updated)
Konfigurasi Netlify untuk enable functions dan routing.

### 4. `pelanggan.js` (Updated)
Frontend code untuk fetch dan display status Netwatch.

## 🚀 Cara Deploy

### Step 1: Push ke Repository

```bash
git add .
git commit -m "Add Mikrotik Netwatch integration"
git push origin main
```

### Step 2: Set Environment Variables di Netlify

1. Buka **Netlify Dashboard**
2. Pilih site Anda
3. Pergi ke **Site settings** → **Environment variables**
4. Tambahkan 3 variables berikut:

| Key | Value |
|-----|-------|
| `MIKROTIK_URL` | `http://cc210c4350d7.sn.mynetname.net/rest` |
| `MIKROTIK_USER` | `azizt91` |
| `MIKROTIK_PASSWORD` | `Pmt52371` |

⚠️ **PENTING:** Jangan hardcode kredensial di code! Selalu gunakan environment variables.

### Step 3: Deploy

Netlify akan otomatis deploy setelah push ke repository. Atau manual trigger deploy dari dashboard.

### Step 4: Test

1. Buka aplikasi di browser
2. Pergi ke halaman **Pelanggan**
3. Cek console browser (F12) untuk log:
   ```
   Netwatch status berhasil diambil: XX IP
   ```
4. Lihat indikator status di foto profil pelanggan:
   - 🟢 **Hijau** = Online (up)
   - 🔴 **Merah** = Offline (down)
   - ⚪ **Abu-abu** = Unknown (tidak ada IP atau tidak di Netwatch)

## 🎨 Tampilan UI

### List Pelanggan
```
┌─────────────────────────────────────┐
│  🟢  [Foto]  Nama Pelanggan         │
│             Terdaftar: 1 Jan 2025   │
│             Up since 2025-10-09...  │
└─────────────────────────────────────┘
```

**Keterangan:**
- Lingkaran berwarna mengelilingi foto profil
- Status "Up/Down/Unknown" ditampilkan di bawah nama
- Timestamp "since" menunjukkan sejak kapan status berlaku

## 🔧 Troubleshooting

### Function tidak bisa diakses
**Error:** `404 Not Found` saat fetch `/.netlify/functions/mikrotik-status`

**Solusi:**
1. Pastikan folder structure benar: `netlify/functions/mikrotik-status.js`
2. Pastikan `netlify.toml` sudah di-push
3. Re-deploy site di Netlify dashboard

### Mikrotik tidak bisa diakses
**Error:** Console warning "Gagal mengambil status Netwatch"

**Solusi:**
1. Test manual dengan curl:
   ```bash
   curl --user azizt91:Pmt52371 "http://cc210c4350d7.sn.mynetname.net/rest/tool/netwatch"
   ```
2. Pastikan Mikrotik REST API aktif
3. Pastikan URL bisa diakses dari internet publik (bukan hanya lokal)
4. Cek firewall Mikrotik

### Environment variables tidak terbaca
**Error:** "Kredensial MikroTik belum diatur di Supabase Secrets"

**Solusi:**
1. Cek environment variables di Netlify dashboard
2. Pastikan nama variable PERSIS: `MIKROTIK_URL`, `MIKROTIK_USER`, `MIKROTIK_PASSWORD`
3. Re-deploy setelah set environment variables

### Status selalu "Unknown"
**Kemungkinan penyebab:**
1. IP pelanggan di database tidak match dengan IP di Netwatch
2. Kolom `ip_static_pppoe` di database kosong
3. Netwatch tidak memiliki entry untuk IP tersebut

**Solusi:**
- Cek data IP di database vs Mikrotik Netwatch
- Pastikan format IP sama persis (10.10.10.12, bukan 10.10.10.012)

## 📊 Monitoring

### Check Function Logs
1. Buka Netlify Dashboard
2. Pergi ke **Functions** tab
3. Klik `mikrotik-status`
4. Lihat logs untuk debug

### Check Browser Console
```javascript
// Sukses
Netwatch status berhasil diambil: 50 IP

// Warning (tidak fatal, app tetap jalan)
Gagal mengambil status Netwatch: 500 Internal Server Error

// Error (fatal)
Error fetching data: ...
```

## 🔐 Security Best Practices

✅ **DO:**
- Gunakan environment variables untuk kredensial
- Gunakan HTTPS untuk Mikrotik jika memungkinkan
- Rotate password secara berkala
- Limit akses Mikrotik API ke IP tertentu jika bisa

❌ **DON'T:**
- Hardcode password di code
- Commit kredensial ke git
- Share environment variables di public
- Gunakan user admin untuk API (buat user khusus dengan permission terbatas)

## 🎯 Next Steps (Optional)

### 1. Cache Response
Tambahkan caching untuk mengurangi load ke Mikrotik:
```javascript
// Cache selama 30 detik
const CACHE_DURATION = 30000;
let cachedData = null;
let cacheTime = 0;
```

### 2. Webhook/Real-time Updates
Gunakan Supabase Realtime atau WebSocket untuk update status tanpa refresh.

### 3. Alert System
Kirim notifikasi WhatsApp/Telegram saat pelanggan offline.

### 4. Historical Data
Simpan log status ke database untuk analisis uptime.

## 📞 Support

Jika ada masalah:
1. Cek dokumentasi ini
2. Cek Netlify function logs
3. Test manual dengan curl
4. Cek browser console

---

**Dibuat:** 10 Oktober 2025  
**Versi:** 1.0  
**Status:** ✅ Production Ready
