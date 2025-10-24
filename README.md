# Instalasi Aplikasi

Berikut adalah langkah-langkah untuk menginstal dan menjalankan aplikasi ini.

## 1. Clone Repository

Clone repositori ini ke mesin lokal Anda menggunakan git:

```bash
git clone https://github.com/azizt91/spreadsheet-selinggonet.git
cd spreadsheet-selinggonet
```

## 2. Konfigurasi Supabase

Aplikasi ini menggunakan Supabase sebagai backend.

### a. Buat Akun Supabase

Jika Anda belum memiliki akun, buat akun baru di [supabase.com](https://supabase.com) dan buat proyek baru.

### b. Dapatkan Kunci API Supabase

- Buka dasbor proyek Supabase Anda.
- Pergi ke **Project Settings** > **API**.
- Salin **Project URL** dan **Project API Keys** (public anon key).

### c. Perbarui Klien Supabase

Buka file `supabase-client.js` dan ganti `supabaseUrl` dan `supabaseKey` dengan kredensial yang Anda dapatkan dari dasbor Supabase.

```javascript
// supabase-client.js

const supabaseUrl = 'URL_PROYEK_SUPABASE_ANDA';
const supabaseKey = 'KUNCI_ANON_PUBLIK_ANDA';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
```

## 3. Setup Database

### a. Jalankan SQL

Buka **SQL Editor** di dasbor Supabase Anda. Buka file Database.sql copy semua query yang ada, kemudian jalankan query tersebut untuk membuat tabel dan skema yang diperlukan.

### b. Nonaktifkan Konfirmasi Email

Untuk memudahkan proses pendaftaran pengguna selama pengembangan, nonaktifkan konfirmasi email:
- Pergi ke **Authentication** -> **Providers**.
- Temukan dan matikan *toggle* **Confirm email**.

### c. Buat Storage Bucket

Aplikasi memerlukan bucket untuk menyimpan file seperti avatar pengguna.
- Pergi ke **Storage** dari menu utama.
- Klik **New bucket**.
- Isi **Bucket name** dengan `avatars`.
- Aktifkan opsi **Public bucket**.
- Klik **Create bucket**.

## 4. Deploy Supabase Functions

Deploy semua Supabase Functions yang diperlukan dengan menjalankan perintah berikut di terminal Anda. Pastikan Anda sudah menginstal Supabase CLI.

```bash
supabase functions deploy create-customer
supabase functions deploy delete-user
supabase functions deploy genieacs-proxy
supabase functions deploy send-whatsapp-notification
supabase functions deploy update-user-auth
```

Setelah menyelesaikan langkah-langkah ini, aplikasi Anda seharusnya sudah siap untuk dijalankan.

## Donasi

Jika Anda merasa aplikasi ini bermanfaat, Anda bisa memberikan donasi untuk membeli kopi.

![QRIS Donasi](assets/qris.jpeg)
