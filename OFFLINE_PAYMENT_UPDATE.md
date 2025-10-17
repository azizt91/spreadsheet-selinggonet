# 💰 Pembayaran Offline - Dynamic Update

Fitur untuk membuat informasi **pembayaran offline** (nama & alamat) menjadi **dinamis** dan bisa diedit dari **Profile Admin**.

---

## ✅ **Apa Yang Sudah Diupdate:**

### **1. Database**
- ✅ Tambah field `offline_payment_name` di `app_settings` table
- ✅ Tambah field `offline_payment_address` di `app_settings` table
- ✅ Default values sudah diset

### **2. Profile Admin (Pengaturan Aplikasi)**
- ✅ Tambah section **"Pembayaran Offline"** di `profile.html`
- ✅ Input field untuk **Nama Penerima**
- ✅ Textarea field untuk **Alamat Pembayaran**

### **3. Apply Settings System**
- ✅ `app-settings.js` updated untuk save/load offline payment fields
- ✅ `apply-settings.js` export function `getOfflinePaymentInfo()`

### **4. Customer Page**
- ✅ `pelanggan_info.html` - Text hardcoded diganti dengan `<span id="...">`
- ✅ `pelanggan_info.js` - Import & apply `getOfflinePaymentInfo()` secara dinamis

---

## 🚀 **Cara Setup:**

### **OPTION 1: Table Belum Ada** (Fresh Install)
```sql
-- Run file ini (sudah include offline payment fields):
sql/app_settings.sql
```

### **OPTION 2: Table Sudah Ada** (Update Existing)
```sql
-- Run file ALTER TABLE ini:
sql/alter_app_settings_offline_payment.sql
```

**Perintah:**
1. Buka **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy-paste isi file yang sesuai
4. Click **RUN** ▶️
5. Verify: `SELECT * FROM app_settings;`

---

## 🎯 **Cara Menggunakan:**

### **Admin:**

1. **Login** sebagai ADMIN

2. Buka **Profile** → **Pengaturan Aplikasi**

3. Scroll ke section **"Pembayaran Offline"**

4. Edit field:
   - **Nama Penerima**: 
     ```
     Contoh: Bapak Karsadi dan Ibu Sopiyah
     Atau: Ibu Siti Fatimah
     Atau: Kantor ISP Selinggonet
     ```
   
   - **Alamat Pembayaran**:
     ```
     Contoh: Dukuh Sekiyong RT 04/RW 07, Desa Pamutih
     Atau: Jl. Merdeka No. 123, Kota ABC
     ```

5. Click **SIMPAN**

6. **Refresh browser (F5)**

---

### **Customer:**

1. Customer login & buka halaman **Info Tagihan** (`pelanggan_info.html`)

2. Lihat section **"Cara Pembayaran"**

3. Text pembayaran offline akan update otomatis:
   ```
   "Anda juga dapat melakukan pembayaran secara langsung 
   di rumah [NAMA_DINAMIS], beralamat di [ALAMAT_DINAMIS]."
   ```

4. ✅ **No refresh needed!** (Apply saat page load)

---

## 📁 **File Yang Berubah:**

| File | Perubahan |
|------|-----------|
| `sql/app_settings.sql` | ✅ Tambah 2 kolom baru + default INSERT |
| `sql/alter_app_settings_offline_payment.sql` | ✅ **NEW** - ALTER TABLE script |
| `profile.html` | ✅ Tambah section "Pembayaran Offline" |
| `app-settings.js` | ✅ Handle load/save offline payment fields |
| `apply-settings.js` | ✅ Export `getOfflinePaymentInfo()` |
| `pelanggan_info.html` | ✅ Tambah ID ke span elements |
| `pelanggan_info.js` | ✅ Import & apply offline payment info |

---

## 🧪 **Testing:**

### **Test 1: Admin Edit**
```
1. Profile → Pengaturan Aplikasi
2. Section "Pembayaran Offline"
3. Edit nama: "Kantor ISP Selinggo"
4. Edit alamat: "Jl. Test No. 999"
5. SIMPAN
6. Refresh (F5)
```

**Expected:** Settings saved ke database ✅

---

### **Test 2: Customer View**
```
1. Logout admin
2. Login sebagai customer (user1@selinggonet.com / password)
3. Buka "Info Tagihan"
4. Lihat text pembayaran offline
```

**Expected:** Text update dengan nama & alamat baru ✅

---

### **Test 3: Fallback**
```
1. Hapus localStorage (F12 → Application → Clear)
2. Refresh halaman customer
```

**Expected:** Tetap load dari Supabase ✅

---

## 📊 **Database Schema:**

### **Before:**
```sql
CREATE TABLE app_settings (
    ...
    office_address TEXT,
    theme_color TEXT,
    ...
);
```

### **After:**
```sql
CREATE TABLE app_settings (
    ...
    office_address TEXT,
    
    -- NEW FIELDS ✅
    offline_payment_name TEXT DEFAULT 'Bapak Karsadi dan Ibu Sopiyah',
    offline_payment_address TEXT DEFAULT 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih',
    
    theme_color TEXT,
    ...
);
```

---

## 🔍 **How It Works:**

### **Data Flow:**

```
┌─────────────────────────────────────┐
│   Admin Profile Page                │
│   (Pengaturan Aplikasi Form)        │
│   - Input: Nama Penerima            │
│   - Textarea: Alamat                │
└───────────────┬─────────────────────┘
                │ SAVE
                ▼
┌─────────────────────────────────────┐
│       Supabase                      │
│   app_settings.offline_payment_*    │
└───────────────┬─────────────────────┘
                │ FETCH
                ▼
┌─────────────────────────────────────┐
│    apply-settings.js                │
│  getOfflinePaymentInfo()            │
│  { name: "...", address: "..." }    │
└───────────────┬─────────────────────┘
                │ IMPORT
                ▼
┌─────────────────────────────────────┐
│    pelanggan_info.js                │
│  applyOfflinePaymentInfo()          │
└───────────────┬─────────────────────┘
                │ UPDATE DOM
                ▼
┌─────────────────────────────────────┐
│    pelanggan_info.html              │
│  <span id="offline-payment-name">   │
│  <span id="offline-payment-address">│
└─────────────────────────────────────┘
```

---

## 💡 **Code Examples:**

### **Admin Side (app-settings.js):**
```javascript
// Load settings
offline_payment_name: 'Bapak Karsadi dan Ibu Sopiyah',
offline_payment_address: 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih'

// Populate form
document.getElementById('offline-name-input').value = settings.offline_payment_name;
document.getElementById('offline-address-input').value = settings.offline_payment_address;

// Save settings
offline_payment_name: document.getElementById('offline-name-input').value.trim(),
offline_payment_address: document.getElementById('offline-address-input').value.trim()
```

---

### **Customer Side (pelanggan_info.js):**
```javascript
import { getOfflinePaymentInfo } from './apply-settings.js';

function applyOfflinePaymentInfo() {
    const offlineInfo = getOfflinePaymentInfo();
    // Returns: { name: "...", address: "..." }
    
    document.getElementById('offline-payment-name').textContent = offlineInfo.name;
    document.getElementById('offline-payment-address').textContent = offlineInfo.address;
}
```

---

### **Export Function (apply-settings.js):**
```javascript
export function getOfflinePaymentInfo() {
    const settings = getAppSettings();
    return {
        name: settings?.offline_payment_name || 'Bapak Karsadi dan Ibu Sopiyah',
        address: settings?.offline_payment_address || 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih'
    };
}
```

---

## ⚠️ **Important Notes:**

### **1. SQL Script Selection**
- ❌ **JANGAN run kedua script sekaligus!**
- ✅ Pilih salah satu:
  - Fresh install → `app_settings.sql`
  - Existing table → `alter_app_settings_offline_payment.sql`

### **2. Default Values**
- Jika field kosong di form, akan gunakan fallback
- Fallback: "Bapak Karsadi dan Ibu Sopiyah" + alamat default

### **3. Refresh Required**
- Setelah save settings di Profile, **REFRESH (F5)**
- Customer page auto-apply saat load

### **4. Multiple Locations**
- Kalau ada beberapa lokasi pembayaran:
  ```
  Nama: Kantor Pusat, Cabang A, Cabang B
  Alamat: Jl. Pusat No.1 | Jl. Cabang A No.2 | Jl. Cabang B No.3
  ```

---

## 🐛 **Troubleshooting:**

### **Problem 1: Text tidak update di customer page**

**Solutions:**
```javascript
// 1. Check browser console (F12)
console.log(window.APP_SETTINGS); // Should have offline_payment_*

// 2. Clear localStorage
localStorage.removeItem('app_settings');

// 3. Hard refresh
Ctrl + Shift + R (Windows) / Cmd + Shift + R (Mac)
```

---

### **Problem 2: Form kosong di Profile**

**Check database:**
```sql
SELECT offline_payment_name, offline_payment_address 
FROM app_settings;
```

**If NULL:**
```sql
UPDATE app_settings 
SET 
    offline_payment_name = 'Bapak Karsadi dan Ibu Sopiyah',
    offline_payment_address = 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih';
```

---

### **Problem 3: Save gagal**

**Error:** "Column does not exist"

**Solution:**
```sql
-- Run ALTER TABLE script:
sql/alter_app_settings_offline_payment.sql
```

---

## ✨ **Benefits:**

### **Before (Hardcoded):**
```html
<p>Anda juga dapat melakukan pembayaran secara langsung 
di rumah <span>Bapak Karsadi dan Ibu Sopiyah</span>, 
beralamat di <span>Dukuh Sekiyong RT 04/RW 07, Desa Pamutih</span>.</p>
```
❌ Harus edit HTML manual  
❌ Butuh developer untuk ganti  
❌ Rawan typo

---

### **After (Dynamic):**
```html
<p>Anda juga dapat melakukan pembayaran secara langsung 
di rumah <span id="offline-payment-name">...</span>, 
beralamat di <span id="offline-payment-address">...</span>.</p>
```
✅ Edit dari Profile Admin  
✅ No coding needed  
✅ Auto-apply ke semua customer  
✅ Tersimpan di database

---

## 📝 **Summary:**

| Item | Before | After |
|------|--------|-------|
| **Edit Method** | Manual HTML | Admin Profile Form |
| **Requires** | Developer | Admin user |
| **Apply Time** | Re-deploy | Instant (refresh) |
| **Storage** | Hardcoded | Supabase Database |
| **Fallback** | None | Default values |

---

## 🎉 **Done!**

Sekarang admin bisa **edit info pembayaran offline** langsung dari Profile, tanpa perlu coding!

**Next Steps:**
1. ✅ Run SQL script (pilih yang sesuai)
2. ✅ Login admin → Test edit di Profile
3. ✅ Login customer → Verify text updated
4. ✅ Production ready!

---

**📧 Questions?**  
Check: `PENGATURAN_APLIKASI_README.md` untuk dokumentasi lengkap semua settings.

**Created:** October 17, 2025  
**By:** Taufiq Aziz
