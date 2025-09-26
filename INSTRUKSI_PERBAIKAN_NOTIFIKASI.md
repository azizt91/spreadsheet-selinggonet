# Instruksi Perbaikan Error Notifikasi "column reference 'id' is ambiguous"

## Masalah yang Diperbaiki
Error "column reference 'id' is ambiguous" terjadi karena:
1. Tabel `notifications` dan `notification_reads` belum ada di Supabase
2. Fungsi SQL `get_user_notifications` belum dibuat dengan alias yang tepat
3. Fungsi `sendPaymentNotification` belum terintegrasi dengan sistem notifikasi Supabase

## Langkah-langkah Perbaikan

### 1. Buat Tabel dan Fungsi SQL di Supabase

1. **Buka Supabase Dashboard** → Project Anda → SQL Editor
2. **Jalankan script SQL** yang ada di file `sql_notifications.sql`
3. **Pastikan semua komponen berhasil dibuat**:
   - **Tabel**: `notifications`, `notification_reads`
   - **Fungsi**: `get_user_notifications`, `add_payment_notification`
   - **RLS Policies**: 12 policies untuk keamanan data
   - **Indexes**: 7 indexes untuk performa optimal
   - **Permissions**: Grant/revoke permissions yang tepat

### 2. File-file yang Sudah Diperbaiki

Berikut adalah file-file yang sudah saya perbaiki:

#### ✅ `notifikasi.js`
- **Perbaikan**: Update parameter fungsi RPC untuk menghindari ambiguous column
- **Perubahan**: Menambahkan `user_id_param: user.id` pada pemanggilan `get_user_notifications`
- **Fitur**: Sistem mark as read yang terintegrasi dengan database

#### ✅ `notification-service.js` (File Baru)
- **Fungsi**: Service untuk mengirim notifikasi pembayaran ke database Supabase
- **Fitur**: 
  - `sendPaymentNotification()` - Kirim notifikasi ke database
  - `getUnreadNotificationCount()` - Hitung notifikasi belum dibaca
  - `markNotificationAsRead()` - Tandai notifikasi sebagai dibaca
  - Browser notification (PWA) support

#### ✅ `notification-badge.js` (File Baru)
- **Fungsi**: Mengelola badge notifikasi di dashboard
- **Fitur**:
  - `initNotificationBadge()` - Inisialisasi badge dengan update otomatis
  - `addNotificationIconToHeader()` - Menambah ikon lonceng ke header dashboard

#### ✅ `whatsapp-notification.js`
- **Perbaikan**: Menambahkan fungsi `sendPaymentNotification` yang terintegrasi dengan Supabase
- **Import**: Menambahkan import dari `notification-service.js`

#### ✅ `dashboard.js`
- **Perbaikan**: Update untuk menggunakan sistem notifikasi Supabase
- **Import**: Menambahkan import notification services
- **Fitur**: Auto-inisialisasi ikon notifikasi dan badge

### 3. Cara Menguji Fitur Notifikasi

#### Test 1: Buat Notifikasi Manual
```javascript
// Jalankan di browser console (halaman dashboard)
await supabase.rpc('add_payment_notification', {
    customer_name: 'Test Customer',
    customer_idpl: 'TEST001',
    invoice_period: 'Januari 2024',
    amount: 100000,
    admin_name: 'Admin Test'
});
```

#### Test 2: Cek Notifikasi
1. **Refresh halaman dashboard** - Badge merah harus muncul di ikon lonceng
2. **Klik ikon lonceng** - Harus redirect ke `notifikasi.html`
3. **Lihat daftar notifikasi** - Notifikasi test harus muncul

#### Test 3: Mark as Read
1. **Klik notifikasi** - Notifikasi harus berubah style (tidak bold lagi)
2. **Kembali ke dashboard** - Badge merah harus hilang

#### Test 4: Test Pembayaran Real
1. **Buka halaman tagihan** (`tagihan.html`)
2. **Proses pembayaran** pada salah satu tagihan
3. **Cek notifikasi** - Harus ada notifikasi pembayaran baru

### 4. Struktur File Notifikasi

```
spreadsheet-selinggonet/
├── sql_notifications.sql          # SQL untuk membuat tabel dan fungsi
├── notification-service.js        # Service utama notifikasi
├── notification-badge.js          # Pengelola badge di dashboard
├── notifikasi.js                  # Script halaman notifikasi
├── notifikasi.html               # Halaman daftar notifikasi
├── whatsapp-notification.js      # Updated dengan sendPaymentNotification
└── dashboard.js                  # Updated dengan ikon notifikasi
```

### 5. Fitur yang Tersedia

#### 🔔 Notifikasi Database
- Notifikasi tersimpan permanen di database Supabase
- Support untuk notifikasi role-based (ADMIN/USER)
- Tracking read/unread status per user

#### 🌐 Browser Notification (PWA)
- Push notification di browser
- Bekerja bahkan saat aplikasi tidak aktif
- Custom icon dan vibration pattern

#### 📱 Badge System
- Badge merah di ikon lonceng dashboard
- Update otomatis setiap 30 detik
- Update saat window focus

#### 📋 Halaman Notifikasi
- Daftar semua notifikasi dengan timestamp
- Mark all as read functionality
- Responsive design

### 6. Troubleshooting

#### Error: "Function get_user_notifications does not exist"
**Solusi**: Pastikan script `sql_notifications.sql` sudah dijalankan di Supabase SQL Editor

#### Error: "Table notifications does not exist"
**Solusi**: Jalankan ulang script SQL, pastikan tidak ada error saat eksekusi

#### Badge tidak muncul
**Solusi**: 
1. Cek console browser untuk error
2. Pastikan user memiliki role 'ADMIN'
3. Cek apakah ada notifikasi di database

#### Notifikasi tidak muncul saat pembayaran
**Solusi**:
1. Cek console untuk error di `sendPaymentNotification`
2. Pastikan fungsi `add_payment_notification` ada di database
3. Cek permission RLS di tabel notifications

### 7. Keamanan Row Level Security (RLS)

Sistem notifikasi dilengkapi dengan RLS policies yang komprehensif:

#### 🔒 **Tabel Notifications**
- **SELECT**: User hanya bisa melihat notifikasi yang relevan (untuk role mereka atau spesifik untuk mereka)
- **INSERT**: Validasi role-based creation (hanya admin bisa buat notifikasi admin)
- **UPDATE/DELETE**: Hanya admin yang bisa mengubah/menghapus notifikasi

#### 🔒 **Tabel Notification_Reads**
- **SELECT/INSERT/UPDATE/DELETE**: User hanya bisa manage read status mereka sendiri
- **Isolation**: User tidak bisa melihat read status user lain

#### 🔒 **Functions Security**
- **get_user_notifications**: Validasi authenticated user, admin bisa akses notifikasi user lain
- **add_payment_notification**: Hanya admin yang bisa membuat notifikasi pembayaran
- **Input validation**: Validasi parameter untuk mencegah data invalid

#### 🔒 **Permissions**
- **Anon users**: Tidak ada akses ke tabel notifikasi
- **Authenticated users**: Akses terbatas sesuai RLS policies
- **Function execution**: Hanya authenticated users

### 8. Kustomisasi

#### Mengubah Interval Update Badge
```javascript
// Di notification-badge.js, ubah interval (default 30 detik)
setInterval(() => {
    updateNotificationBadge(userId);
}, 10000); // Ubah ke 10 detik
```

#### Mengubah Style Notifikasi
```css
/* Tambahkan di style.css */
.notification-item {
    /* Custom styling */
}
```

#### Menambah Jenis Notifikasi Baru
```javascript
// Gunakan fungsi add_payment_notification sebagai template
// Atau buat fungsi SQL baru untuk jenis notifikasi lain
```

## Kesimpulan

Setelah menjalankan semua langkah di atas, sistem notifikasi Selinggonet akan:
- ✅ Tidak ada lagi error "column reference 'id' is ambiguous"
- ✅ Notifikasi pembayaran tersimpan di database
- ✅ Badge notifikasi muncul di dashboard
- ✅ Halaman notifikasi berfungsi dengan baik
- ✅ Browser notification (PWA) aktif

**Catatan**: Pastikan untuk menjalankan script SQL terlebih dahulu sebelum menguji fitur notifikasi.
