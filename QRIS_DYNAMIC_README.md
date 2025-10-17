# 📱 Dynamic QRIS Payment System

Sistem **QRIS dinamis** yang memungkinkan admin untuk:
- ✅ Upload gambar QRIS custom
- ✅ Toggle show/hide QRIS di customer page
- ✅ Jika tidak punya QRIS, bisa dinonaktifkan

---

## ✨ **Features**

### **Admin Side:**
- ✅ **Upload QRIS Image** - Upload custom QRIS dari Profile → Pengaturan Aplikasi
- ✅ **Toggle Visibility** - Checkbox untuk show/hide QRIS
- ✅ **Preview** - Lihat preview QRIS sebelum save
- ✅ **Storage** - Gambar disimpan di Supabase Storage

### **Customer Side:**
- ✅ **Conditional Rendering** - QRIS hanya muncul jika `show_qris = true`
- ✅ **Dynamic Image** - Load gambar dari database (bukan hardcode)
- ✅ **Fullscreen Modal** - Klik QRIS untuk zoom
- ✅ **Auto-Hide** - Jika admin uncheck, customer tidak lihat QRIS

---

## 📊 **Database Schema**

### **Table: `app_settings`**

**New Fields:**

```sql
ALTER TABLE app_settings 
ADD COLUMN qris_image_url TEXT DEFAULT 'assets/qris.jpeg';

ALTER TABLE app_settings 
ADD COLUMN show_qris BOOLEAN DEFAULT true;
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `qris_image_url` | TEXT | 'assets/qris.jpeg' | URL gambar QRIS |
| `show_qris` | BOOLEAN | true | Toggle tampilkan QRIS |

---

## 🚀 **Setup Instructions**

### **Step 1: Update Database**

**Option A: Fresh Install**
```sql
-- Run file ini (sudah include QRIS fields):
sql/app_settings.sql
```

**Option B: Existing Database**
```sql
-- Run ALTER TABLE script:
sql/alter_app_settings_qris.sql
```

**Steps:**
1. Buka Supabase Dashboard
2. SQL Editor
3. Copy-paste script yang sesuai
4. RUN ▶️
5. Verify:
   ```sql
   SELECT qris_image_url, show_qris FROM app_settings;
   ```

---

### **Step 2: Test Admin**

```
1. Login ADMIN

2. Profile → Pengaturan Aplikasi

3. Scroll to section "QRIS Payment"

4. You'll see:
   ✅ Checkbox "Tampilkan QRIS di halaman customer"
   ✅ Upload area dengan preview
   ✅ Current QRIS image (default: assets/qris.jpeg)

5. Try:
   - Upload new QRIS image → Preview updates
   - Uncheck "Tampilkan QRIS" → Hide from customer
   - Click SIMPAN
```

---

### **Step 3: Test Customer**

```
1. Login customer (user1@selinggonet.com / password)

2. Go to Info Tagihan

3. Scenario A: show_qris = TRUE
   ✅ QRIS card visible
   ✅ Image from database
   ✅ Click image → Modal zoom works

4. Scenario B: show_qris = FALSE
   ❌ QRIS card HIDDEN
   ❌ Modal HIDDEN
   ✅ Only bank list shown
```

---

## 🎯 **Use Cases**

### **Use Case 1: Upload Custom QRIS**

**Scenario:** Admin punya QRIS baru dari bank/e-wallet

**Steps:**
```
1. Profile → Pengaturan Aplikasi
2. Section "QRIS Payment"
3. Click area upload
4. Select file (PNG/JPG, max 2MB)
5. Preview updates instantly
6. ✓ Check "Tampilkan QRIS"
7. SIMPAN
```

**Result:**
- ✅ QRIS baru tersimpan di Supabase Storage
- ✅ Customer lihat QRIS baru setelah refresh

---

### **Use Case 2: Hide QRIS (No QRIS Available)**

**Scenario:** Admin tidak punya QRIS, hanya terima transfer bank

**Steps:**
```
1. Profile → Pengaturan Aplikasi
2. Section "QRIS Payment"
3. ☐ Uncheck "Tampilkan QRIS di halaman customer"
4. SIMPAN
```

**Result:**
- ❌ QRIS card TIDAK muncul di customer page
- ✅ Customer hanya lihat bank transfer methods
- ✅ Lebih clean & relevant

---

### **Use Case 3: Show QRIS Again**

**Scenario:** Admin sudah punya QRIS baru, mau aktifkan lagi

**Steps:**
```
1. Profile → Pengaturan Aplikasi
2. Upload QRIS image baru
3. ☑ Check "Tampilkan QRIS di halaman customer"
4. SIMPAN
```

**Result:**
- ✅ QRIS muncul lagi di customer page
- ✅ Dengan gambar baru

---

## 📁 **File Changes**

| File | Type | Changes |
|------|------|---------|
| `sql/app_settings.sql` | SQL | ✅ Add qris_image_url & show_qris fields |
| `sql/alter_app_settings_qris.sql` | SQL | ✅ **NEW** - ALTER TABLE script |
| `profile.html` | HTML | ✅ Add QRIS Payment section |
| `app-settings.js` | JS | ✅ Handle QRIS upload & toggle |
| `apply-settings.js` | JS | ✅ Export getQRISInfo() |
| `pelanggan_info.js` | JS | ✅ Apply QRIS settings dynamically |
| `QRIS_DYNAMIC_README.md` | Doc | ✅ **NEW** - This file |

**Total:** 7 files created/updated

---

## 🔄 **Data Flow**

### **Admin Upload QRIS:**

```
┌──────────────────────────────────┐
│ Admin: Pengaturan Aplikasi       │
│ - Upload QRIS image              │
│ - Check "Tampilkan QRIS"         │
│ - Click SIMPAN                   │
└───────────────┬──────────────────┘
                │ app-settings.js
                │ saveSettings()
                ▼
┌──────────────────────────────────┐
│ Upload to Supabase Storage       │
│ Folder: qris/                    │
│ Get public URL                   │
└───────────────┬──────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│ Save to Database                 │
│ app_settings.qris_image_url      │
│ app_settings.show_qris = true    │
└───────────────┬──────────────────┘
                │ Updated
                ▼
           ✅ Saved!
```

---

### **Customer View QRIS:**

```
┌──────────────────────────────────┐
│ Customer: Info Tagihan loads     │
└───────────────┬──────────────────┘
                │ DOMContentLoaded
                ▼
┌──────────────────────────────────┐
│ pelanggan_info.js                │
│ applyQRISSettings()              │
└───────────────┬──────────────────┘
                │ FETCH
                ▼
┌──────────────────────────────────┐
│ apply-settings.js                │
│ getQRISInfo()                    │
└───────────────┬──────────────────┘
                │ Return
                ▼
┌──────────────────────────────────┐
│ Settings:                        │
│ {                                │
│   imageUrl: "...",               │
│   showQRIS: true/false           │
│ }                                │
└───────────────┬──────────────────┘
                │
                ▼
        IF showQRIS = TRUE:
┌──────────────────────────────────┐
│ ✅ Display QRIS Card             │
│ - Update image src               │
│ - Update modal image             │
│ - Show card                      │
└──────────────────────────────────┘

        IF showQRIS = FALSE:
┌──────────────────────────────────┐
│ ❌ Hide QRIS Card                │
│ - Add 'hidden' class             │
│ - Hide modal                     │
└──────────────────────────────────┘
```

---

## 💻 **Code Examples**

### **Admin Side (app-settings.js):**

```javascript
// Handle QRIS upload
document.getElementById('qris-upload')?.addEventListener('change', (e) => {
    this.handleImageUpload(e, 'qris', 'qris-preview');
});

// Save QRIS settings
const qrisUrl = this.uploadedFiles.qris 
    ? await this.uploadImage(this.uploadedFiles.qris, 'qris')
    : document.getElementById('qris-preview').src;

const settings = {
    ...
    qris_image_url: qrisUrl,
    show_qris: document.getElementById('show-qris-input').checked,
    ...
};
```

---

### **Export Function (apply-settings.js):**

```javascript
export function getQRISInfo() {
    const settings = getAppSettings();
    return {
        imageUrl: settings?.qris_image_url || 'assets/qris.jpeg',
        showQRIS: settings?.show_qris !== false
    };
}
```

---

### **Customer Side (pelanggan_info.js):**

```javascript
import { getQRISInfo } from './apply-settings.js';

function applyQRISSettings() {
    const qrisInfo = getQRISInfo();
    const qrisImage = document.getElementById('qris-image');
    const qrisCard = qrisImage?.closest('.bg-white.p-4.rounded-lg');

    if (qrisInfo.showQRIS) {
        // Show QRIS
        qrisCard.classList.remove('hidden');
        qrisImage.src = qrisInfo.imageUrl;
    } else {
        // Hide QRIS
        qrisCard.classList.add('hidden');
    }
}
```

---

## 🎨 **UI Preview**

### **Admin - QRIS Section:**

```
┌────────────────────────────────────┐
│ 📱 QRIS Payment                    │
├────────────────────────────────────┤
│                                    │
│ ☑️ Tampilkan QRIS di halaman       │
│    customer                        │
│                                    │
│ ┌────────────────────────────────┐ │
│ │  [QRIS Image Preview]          │ │
│ │  (clickable upload area)       │ │
│ │                                │ │
│ │  Upload QRIS Image             │ │
│ │  PNG atau JPG, max 2MB         │ │
│ └────────────────────────────────┘ │
│                                    │
│ 💡 Jika tidak punya QRIS, uncheck │
│    checkbox di atas                │
└────────────────────────────────────┘
```

---

### **Customer - QRIS Shown:**

```
┌────────────────────────────────────┐
│ Info Tagihan                       │
├────────────────────────────────────┤
│                                    │
│ 📱 Pembayaran via QRIS             │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │   [QRIS Code Image]            │ │
│ │                                │ │
│ └────────────────────────────────┘ │
│ Ketuk gambar untuk memperbesar     │
│                                    │
│ 💳 SeaBank             [📋]        │
│    901307925714                    │
│                                    │
│ 💳 BCA                 [📋]        │
│    3621053653                      │
└────────────────────────────────────┘
```

---

### **Customer - QRIS Hidden:**

```
┌────────────────────────────────────┐
│ Info Tagihan                       │
├────────────────────────────────────┤
│                                    │
│ (QRIS section tidak tampil)       │
│                                    │
│ 💳 SeaBank             [📋]        │
│    901307925714                    │
│                                    │
│ 💳 BCA                 [📋]        │
│    3621053653                      │
│                                    │
│ 💳 BSI                 [📋]        │
│    7211806138                      │
└────────────────────────────────────┘
```

---

## ⚡ **Technical Details**

### **Storage Structure:**

```
Supabase Storage: app-assets/
├── logos/
│   └── logos-{timestamp}.png
├── favicons/
│   └── favicons-{timestamp}.png
├── icons/
│   └── icons-{timestamp}.png
└── qris/
    └── qris-{timestamp}.png  ← New!
```

---

### **Image Upload:**

```javascript
async uploadImage(file, folder) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file);

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}
```

---

### **Conditional Rendering:**

```javascript
if (qrisInfo.showQRIS) {
    qrisCard.classList.remove('hidden');  // Show
    qrisImage.src = qrisInfo.imageUrl;    // Update image
} else {
    qrisCard.classList.add('hidden');     // Hide
}
```

---

## 🐛 **Troubleshooting**

### **Problem 1: Column does not exist**

**Error:** `column "qris_image_url" does not exist`

**Solution:**
```sql
-- Run ALTER TABLE script:
sql/alter_app_settings_qris.sql
```

---

### **Problem 2: QRIS masih muncul padahal sudah uncheck**

**Check:**
```javascript
// Browser console (F12)
console.log(window.APP_SETTINGS);
// Should show: show_qris: false
```

**Fix:**
```javascript
// Clear localStorage
localStorage.removeItem('app_settings');

// Hard refresh
Ctrl + Shift + R
```

---

### **Problem 3: Upload QRIS gagal**

**Error:** "Gagal upload gambar"

**Possible Causes:**
1. ❌ File size > 2MB
2. ❌ Format bukan PNG/JPG
3. ❌ Storage bucket tidak ada
4. ❌ RLS policy blocking

**Solution:**
```sql
-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'app-assets';

-- Check policies
SELECT * FROM storage.policies WHERE bucket_id = 'app-assets';
```

---

### **Problem 4: QRIS image broken/404**

**Symptoms:** Image shows broken icon

**Check:**
```sql
-- Verify URL in database
SELECT qris_image_url FROM app_settings;

-- Should start with:
-- https://ioirrikteqrpptolbjme.supabase.co/storage/v1/object/public/...
```

**Fix:**
- Re-upload QRIS image
- Verify Supabase Storage is public
- Check browser Network tab for actual error

---

## ✅ **Testing Checklist**

### **Admin:**
- [ ] Login admin
- [ ] Profile → Pengaturan Aplikasi
- [ ] Section "QRIS Payment" visible
- [ ] Checkbox "Tampilkan QRIS" works
- [ ] Upload new QRIS → Preview updates
- [ ] Click SIMPAN → Success message
- [ ] Refresh → QRIS preview persists

### **Customer (QRIS Shown):**
- [ ] Login customer
- [ ] Info Tagihan → QRIS card visible
- [ ] QRIS image loads correctly
- [ ] Click image → Modal opens
- [ ] Modal shows correct image

### **Customer (QRIS Hidden):**
- [ ] Admin uncheck "Tampilkan QRIS"
- [ ] Admin SIMPAN
- [ ] Customer refresh page
- [ ] QRIS card NOT visible
- [ ] Modal NOT visible
- [ ] Only bank list shown

---

## 📝 **Best Practices**

### **1. Image Optimization**

```
✅ GOOD:
- Format: PNG with transparency
- Size: 500x500px to 1000x1000px
- File size: < 500KB
- DPI: 72-150

❌ BAD:
- Format: JPEG with white background
- Size: > 2000x2000px (too large)
- File size: > 2MB (rejected)
- DPI: > 300 (overkill for screen)
```

**Tools:**
- TinyPNG: https://tinypng.com/
- Squoosh: https://squoosh.app/

---

### **2. When to Hide QRIS**

```
✅ Hide QRIS if:
- Tidak punya QRIS
- QRIS sedang bermasalah
- Sementara tidak terima via QRIS
- Testing bank transfer only

✅ Show QRIS if:
- Punya QRIS aktif
- QRIS dari bank/e-wallet
- Mau customer bisa scan & bayar
```

---

### **3. Testing After Upload**

**Always test:**
```
1. Admin: Upload → SIMPAN → Refresh
2. Customer: Refresh → Check image loads
3. Customer: Click image → Modal works
4. Mobile: Test on real device
5. Different browsers: Chrome, Firefox, Safari
```

---

## 🎯 **Summary**

**Sekarang Anda punya:**

1. ✅ **Upload QRIS custom** - Admin bisa upload gambar sendiri
2. ✅ **Toggle visibility** - Show/hide QRIS flexibel
3. ✅ **Dynamic rendering** - Customer lihat QRIS sesuai setting
4. ✅ **Conditional display** - Tidak punya QRIS? Hide saja!
5. ✅ **Fullscreen modal** - Customer bisa zoom QRIS
6. ✅ **Storage integrated** - Gambar aman di Supabase
7. ✅ **Fallback safe** - Error? Tetap pakai default

**No more hardcoded QRIS!** Admin full control dari Profile! 🚀

---

**📝 Created by:** Taufiq Aziz  
**📅 Date:** October 17, 2025  
**🔖 Version:** 1.0.0  
**✨ Status:** Production Ready
