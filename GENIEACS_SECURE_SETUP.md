# GenieACS Aman — Cara Deploy Perbaikan Proxy + RLS

Perbaikan ini menutup dua celah yang ditemukan 9 Nov 2026:

1. **genieacs-proxy terbuka** — dulu menerima `{url, method, body, auth}` apa saja tanpa cek login dan tanpa batas IP. Siapa saja yang punya anon key Supabase (kunci itu ada di `supabase-client.js`, bisa dilihat siapa saja) bisa panggil proxy untuk baca semua device dan ganti WiFi siapa saja tanpa login.
2. **Password GenieACS bocor lewat tabel** — `ganti-wifi.js` menjalankan `select('*')` pada `genieacs_settings`, dan `app-settings.js` menyimpan password ke tabel yang sama. Policy lama `allow_all_for_authenticated` membuat semua pelanggan yang login bisa baca username/password itu dari browser.

Setelah perbaikan ini, kredensial GenieACS **tidak pernah** disimpan di tabel dan **tidak pernah** dikirim ke browser.

## Yang berubah di repo

- `supabase/functions/genieacs-proxy/index.ts` (SECURE_V1)
  - Verifikasi JWT user dengan `supabase.auth.getUser()`, tolak token anonim / tidak valid (401).
  - IP pelanggan dibaca server-side dari `profiles.ip_static_pppoe` (service-role), bukan dari client.
  - `genieacs_url` / `genieacs_enabled` dibaca server-side dari `genieacs_settings`.
  - Kredensial GenieACS hanya dari Edge Function Secrets `GENIEACS_USERNAME` / `GENIEACS_PASSWORD`. `auth` dari client diabaikan.
  - Hanya diizinkan: `GET /devices?query=...` yang semua IP-nya sama dengan IP pelanggan, dan `POST /devices/{deviceId}/tasks` dengan `setParameterValues` hanya untuk SSID atau KeyPassphrase, dan hanya setelah server memverifikasi `deviceId` itu milik IP pelanggan. Selain itu 403.
- `ganti-wifi.js`
  - Tidak lagi memuat / mengirim `genieacs_username` / `genieacs_password`. Hanya memuat `genieacs_enabled` dan `genieacs_url`.
  - Tidak lagi mengirim `auth` ke proxy.
- `app-settings.js` + `app-settings.html`
  - Field username/password GenieACS dihapus. Hanya `genieacs_enabled` dan `genieacs_url` yang disimpan dari halaman ini.
- `supabase/migrations/20251110_genieacs_secure_proxy.sql`
  - Hapus baris `genieacs_username` / `genieacs_password` (kalau pernah terisi).
  - Pelanggan biasa hanya bisa baca `genieacs_enabled` dan `genieacs_url`.
  - Hanya admin yang bisa tulis, dan hanya untuk dua key itu.

## Langkah deploy (berurutan)

### 1. Jalankan migration SQL

Supabase Dashboard > SQL Editor > New query, paste isi
`supabase/migrations/20251110_genieacs_secure_proxy.sql`, lalu Run.

Verifikasi: login sebagai pelanggan biasa, lalu di browser console:
```js
// Harusnya TIDAK ada baris genieacs_username / genieacs_password
await supabase.from('genieacs_settings').select('*')
```

### 2. Set Edge Function Secrets

Supabase Dashboard > Edge Functions > Secrets, atau lewat CLI:

```bash
supabase secrets set GENIEACS_USERNAME=genieacs
supabase secrets set GENIEACS_PASSWORD=<password-nginx-yang-dibuat-di-STB>
```

Jangan kirim password itu di chat. `GENIEACS_USERNAME` = `genieacs` (user htpasswd di STB), `GENIEACS_PASSWORD` = password yang sama dengan yang dibuat lewat `htpasswd -c /etc/nginx/.htpasswd genieacs` di STB.

### 3. Deploy Edge Function yang baru

```bash
supabase functions deploy genieacs-proxy
```

### 4. Isi URL di halaman admin (bukan password)

Di `app-settings.html` > Konfigurasi GenieACS, isi hanya:
- `genieacs_url`: `http://121.101.134.146:7557`
- Aktifkan GenieACS.

Jangan isi username/password di halaman ini lagi — field-nya sudah dihapus.

### 5. Tes

1. Dari HP pakai data seluler, buka `http://121.101.134.146:7557/devices` — harusnya minta username/password / 401, bukan keluar JSON langsung.
2. Login sebagai pelanggan di `https://selinggonet.netlify.app/ganti-wifi.html` — SSID dan password saat ini harus muncul, dan ganti WiFi harus berhasil.
3. Tes negatif (opsional, dari browser console sebagai pelanggan): panggil proxy dengan query IP pelanggan lain — harusnya ditolak 403.

## Catatan

- DST-NAT Mikrotik harus tetap ke port nginx `7558` (`to-ports=7558`), bukan langsung ke `7557`. Kalau masih ke `7557`, auth nginx dilewati dan semua perbaikan ini sia-sia.
- Kalau password nginx diganti di STB (`htpasswd`), update juga secret `GENIEACS_PASSWORD` di atas, lalu deploy ulang tidak perlu — secret dibaca tiap request.
- Jangan kembalikan `auth` dari client di `ganti-wifi.js`, dan jangan simpan lagi kredensial ke `genieacs_settings`.
