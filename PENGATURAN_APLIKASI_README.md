# 📱 Pengaturan Aplikasi - Complete Settings System

Sistem pengaturan aplikasi yang **lengkap dan dinamis** untuk Selinggonet ISP Management System.

---

## ✨ **Fitur Lengkap**

### **1. Branding & Assets** 🎨
- ✅ **Logo Besar** - Untuk halaman login/register
- ✅ **Favicon** - Icon browser tab
- ✅ **PWA Icons** - 192x192px & 512x512px

### **2. Informasi Aplikasi** 📝
- ✅ **Nama Aplikasi** - Full name (untuk title & PWA)
- ✅ **Nama Pendek** - Short name (max 12 karakter, untuk home screen)
- ✅ **Deskripsi** - App description
- ✅ **Tagline** - Muncul di halaman login

### **3. Contact Information** 📞
- ✅ **Nomor WhatsApp** - Untuk customer contact di `pelanggan_info.js` & `pelanggan_riwayat_lunas.js`
- ✅ **Email Support** - Support email address
- ✅ **Alamat Kantor** - Office address

### **4. PWA Theme** 🎨
- ✅ **Theme Color** - Status bar & header color
- ✅ **Background Color** - PWA splash screen color

---

## 🗂️ **File Structure**

```
spreadsheet-selinggonet/
├── profile.html ✅ (Updated - Settings UI)
├── pelanggan.html ✅ (Updated - Apply settings)
├── pelanggan_info.html ✅ (Updated - Dynamic WhatsApp)
├── pelanggan_riwayat_lunas.html ✅ (Updated - Dynamic WhatsApp)
├── app-settings.js ✅ (New - Settings manager)
├── apply-settings.js ✅ (New - Auto-apply to all pages)
├── pelanggan_info.js ✅ (Updated - Use dynamic WhatsApp)
├── pelanggan_riwayat_lunas.js ✅ (Updated - Use dynamic WhatsApp)
├── sql/
│   └── app_settings.sql ✅ (New - Database schema)
└── PENGATURAN_APLIKASI_README.md (This file)
```

---

## 📋 **Database Schema**

### **Table: `app_settings`**

```sql
CREATE TABLE app_settings (
    id UUID PRIMARY KEY,
    
    -- Basic App Info
    app_name TEXT NOT NULL,
    app_short_name TEXT NOT NULL,
    app_description TEXT,
    app_tagline TEXT,
    
    -- Branding Assets
    logo_url TEXT NOT NULL,
    favicon_url TEXT NOT NULL,
    icon_192_url TEXT,
    icon_512_url TEXT,
    
    -- Contact Information
    whatsapp_number TEXT,
    support_email TEXT,
    office_address TEXT,
    
    -- PWA Theme
    theme_color TEXT,
    background_color TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### **Storage Bucket: `app-assets`**

```
app-assets/
├── logos/
│   ├── logos-1234567890.png
│   └── ...
├── favicons/
│   ├── favicons-1234567891.ico
│   └── ...
└── icons/
    ├── icons-1234567892.png (192x192)
    ├── icons-1234567893.png (512x512)
    └── ...
```

---

## 🚀 **Setup Instructions**

### **Step 1: Run SQL Script**

1. Open **Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. Select project: **selinggonet**

3. Go to **SQL Editor** (sidebar)

4. Copy-paste isi file: `sql/app_settings.sql`

5. Click **RUN** ▶️

6. Verify table created:
   ```sql
   SELECT * FROM app_settings;
   ```

**Expected Result:**
```
✅ Table app_settings created
✅ Storage bucket app-assets created
✅ RLS policies set
✅ Default settings inserted
```

---

### **Step 2: Verify Storage Bucket**

1. Go to **Storage** in Supabase sidebar

2. Check bucket **`app-assets`** exists

3. Verify it's **Public** (green badge)

4. Test upload a sample image

---

### **Step 3: Test on Browser**

1. **Login** sebagai ADMIN

2. Buka halaman **Profil**

3. Klik **"Pengaturan Aplikasi"**

4. You should see the complete settings form

---

## 🎯 **How To Use**

### **Admin Side:**

#### **1. Edit App Name & Description**

```
Profile → Pengaturan Aplikasi → Informasi Aplikasi
```

- **Nama Aplikasi**: "ISP Selinggo" (full name)
- **Nama Pendek**: "Selinggo" (max 12 chars)
- **Deskripsi**: "Sistem manajemen pelanggan ISP modern"
- **Tagline**: "Internet Cepat & Terpercaya"

**Impact:**
- ✅ Browser title updated
- ✅ PWA name updated
- ✅ Login page shows tagline

---

#### **2. Upload Logo & Icons**

**Logo Besar** (512x512px):
- Used on **login/register** page
- Format: PNG/JPG
- Recommendation: Transparent background

**Favicon** (32x32px):
- Browser tab icon
- Format: PNG/ICO

**PWA Icon 192x192px**:
- Android home screen
- App switcher
- Format: PNG

**PWA Icon 512x512px**:
- Splash screen
- High-res devices
- Format: PNG

**Upload Process:**
1. Click **"Upload Logo"** / **"Upload Favicon"** / **"Upload 192"** / **"Upload 512"**
2. Select file from computer
3. Preview akan update otomatis
4. Click **SIMPAN**

---

#### **3. Set Contact Info**

**WhatsApp Number:**
```
Format: 628xxxxxxxxxx
Example: 6281914170701
```

**Impact:**
- ✅ Customer clicks "Konfirmasi Transfer" → WhatsApp to this number
- ✅ Customer clicks "Minta Alamat" → WhatsApp to this number
- ✅ All customer pages use this number

**Email Support:**
```
Example: support@selinggonet.com
```

**Alamat Kantor:**
```
Example: Jl. Raya No. 123, Kota ABC, 12345
```

---

#### **4. Customize PWA Theme**

**Theme Color** (status bar):
```
Default: #6a5acd (purple)
Impact: Android status bar, browser UI
```

**Background Color** (splash screen):
```
Default: #f8f9fe (light blue)
Impact: PWA loading screen
```

**How to change:**
1. Click color picker
2. Choose color
3. Or input HEX code manually
4. Preview in real-time

---

#### **5. Save Settings**

1. Fill all fields
2. Upload images (optional if changing)
3. Click **SIMPAN**
4. Wait for "Berhasil disimpan!" message
5. **Refresh browser (F5)**

**What happens:**
```
1. Images upload to Supabase Storage
2. Settings save to app_settings table
3. Settings cached in localStorage
4. Title & favicon update immediately
5. Full changes visible after refresh
```

---

### **User/Customer Side:**

#### **Automatic Changes:**

**1. WhatsApp Integration** 📱

When customer clicks **"Konfirmasi Transfer"**:
```javascript
// OLD (hardcoded):
const whatsappNumber = '6281914170701';

// NEW (dynamic):
const whatsappNumber = getWhatsAppNumber(); // From settings
```

**Customer sees:**
- ✅ Updated WhatsApp number
- ✅ Correct admin contact
- ✅ No code change needed

---

**2. Login Page Branding** 🎨

Login page automatically shows:
- ✅ Custom logo
- ✅ Custom app name
- ✅ Custom tagline

**No manual update needed!**

---

**3. PWA Installation** 📲

When customer installs PWA:
- ✅ Custom app name
- ✅ Custom icons (192 & 512)
- ✅ Custom theme colors
- ✅ Custom description

---

## 🔧 **Technical Details**

### **Architecture:**

```
┌─────────────────────────────────────┐
│        Admin Profile Page           │
│    (Pengaturan Aplikasi Form)       │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      app-settings.js                │
│  - Load current settings            │
│  - Handle uploads                   │
│  - Save to Supabase                 │
│  - Cache to localStorage            │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│         Supabase                    │
│  - app_settings table               │
│  - app-assets bucket (storage)      │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      apply-settings.js              │
│  - Load on every page               │
│  - Fetch from Supabase              │
│  - Apply title, favicon, theme      │
│  - Update login page                │
│  - Export to window.APP_SETTINGS    │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      All Pages                      │
│  - Title updated                    │
│  - Favicon updated                  │
│  - Theme color updated              │
│  - Logo updated (login)             │
│  - WhatsApp updated (customer)      │
└─────────────────────────────────────┘
```

---

### **Data Flow:**

#### **Save Settings:**
```
1. Admin fills form
2. Upload images → Supabase Storage
3. Get public URLs
4. Save to app_settings table
5. Cache to localStorage
6. Update PWA manifest
7. Apply immediately (partial)
8. Full apply after refresh
```

#### **Load Settings:**
```
1. Page loads
2. apply-settings.js runs
3. Check localStorage (fast)
4. Fetch from Supabase (fresh data)
5. Apply to page elements
6. Export to window.APP_SETTINGS
7. Other scripts use it
```

#### **WhatsApp Integration:**
```
1. Customer page loads
2. apply-settings.js loads settings
3. Export getWhatsAppNumber() function
4. pelanggan_info.js imports it
5. WhatsApp button uses dynamic number
```

---

### **Functions Exported:**

```javascript
// apply-settings.js exports:

// Get all settings
export function getAppSettings() {
    return window.APP_SETTINGS || localStorage.getItem('app_settings');
}

// Get WhatsApp number specifically
export function getWhatsAppNumber() {
    const settings = getAppSettings();
    return settings?.whatsapp_number || '6281914170701'; // fallback
}
```

**Usage in other files:**
```javascript
import { getWhatsAppNumber } from './apply-settings.js';

const whatsapp = getWhatsAppNumber(); // Dynamic!
```

---

## 📱 **Pages That Auto-Apply Settings**

### **All Pages** (via `apply-settings.js`):
- ✅ `dashboard.html` - Title, favicon, theme
- ✅ `pelanggan.html` - Title, favicon, theme
- ✅ `tagihan.html` - Title, favicon, theme
- ✅ `lunas.html` - Title, favicon, theme
- ✅ `pengeluaran.html` - Title, favicon, theme
- ✅ `profile.html` - Title, favicon, theme
- ✅ `login.html` - Logo, app name, tagline
- ✅ `index.html` - Logo, app name, tagline

### **Customer Pages** (WhatsApp Integration):
- ✅ `pelanggan_info.html` - Dynamic WhatsApp
- ✅ `pelanggan_riwayat_lunas.html` - Dynamic WhatsApp
- ✅ `pelanggan_dashboard.html` - Title, favicon
- ✅ `pelanggan_profile.html` - Title, favicon

---

## ⚠️ **Important Notes**

### **1. Refresh Required**
After saving settings:
```
✅ Title updates immediately
✅ Favicon updates immediately
✅ Theme color updates immediately
❌ Login logo requires refresh (F5)
❌ PWA manifest requires refresh
```

**Solution:** Always **refresh browser (F5)** after save.

---

### **2. Cache Clearing**
If changes don't appear:
```
1. Hard refresh: Ctrl + Shift + R (Windows) / Cmd + Shift + R (Mac)
2. Clear browser cache
3. Clear localStorage:
   - Open DevTools (F12)
   - Application → Local Storage
   - Delete 'app_settings' key
   - Refresh page
```

---

### **3. Image Optimization**

**Recommendations:**
- **Logo**: 512x512px, PNG, transparent background, < 200KB
- **Favicon**: 32x32px, PNG/ICO, < 50KB
- **Icon 192**: 192x192px, PNG, < 100KB
- **Icon 512**: 512x512px, PNG, < 200KB

**Tools:**
- TinyPNG: https://tinypng.com/
- Favicon Generator: https://favicon.io/
- Image Resizer: https://www.iloveimg.com/resize-image

---

### **4. WhatsApp Number Format**

**Correct Formats:**
```
✅ 6281234567890 (with country code, no +)
✅ 628xxxxxxxxxx (Indonesia)
❌ +6281234567890 (no + symbol)
❌ 081234567890 (missing country code)
❌ 62-812-3456-7890 (no dashes)
```

**Testing:**
```
1. Save WhatsApp number in settings
2. Go to pelanggan_info.html (as customer)
3. Click "Konfirmasi Transfer"
4. WhatsApp should open with correct number
```

---

### **5. Storage Limits**

**Supabase Free Tier:**
- Storage: 1GB
- Bandwidth: 2GB/month
- File size limit: 50MB per file

**Our Usage:**
- Logo: ~100KB
- Favicon: ~50KB
- Icons: ~200KB total
- **Total per save: ~350KB**

**Estimated capacity: ~2,800 saves** (plenty!)

---

## 🐛 **Troubleshooting**

### **Problem 1: Settings Not Loading**

**Symptoms:**
- Form empty when opening Pengaturan Aplikasi
- Default values not showing

**Solutions:**
```sql
-- Check if data exists:
SELECT * FROM app_settings;

-- If empty, run default insert:
INSERT INTO app_settings (
    app_name, app_short_name, app_description, app_tagline,
    logo_url, favicon_url, icon_192_url, icon_512_url,
    whatsapp_number, support_email,
    theme_color, background_color
) VALUES (
    'Selinggonet', 'Selinggonet',
    'Sistem manajemen pelanggan ISP', 'Kelola pelanggan dengan mudah',
    'assets/logo_192x192.png', 'assets/logo_192x192.png',
    'assets/logo_192x192.png', 'assets/logo_512x512.png',
    '6281914170701', 'support@selinggonet.com',
    '#6a5acd', '#f8f9fe'
);
```

---

### **Problem 2: Upload Gagal**

**Error:** "Gagal upload gambar"

**Possible Causes:**
1. ❌ Storage bucket `app-assets` tidak ada
2. ❌ RLS policy salah
3. ❌ User tidak authenticated
4. ❌ File size > 2MB

**Solutions:**
```sql
-- Check bucket exists:
SELECT * FROM storage.buckets WHERE id = 'app-assets';

-- Check policies:
SELECT * FROM storage.policies WHERE bucket_id = 'app-assets';

-- Recreate bucket if needed:
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true);
```

---

### **Problem 3: WhatsApp Number Tidak Update**

**Symptoms:**
- Customer click WhatsApp button
- Still uses old number

**Solutions:**
1. Clear localStorage:
   ```javascript
   localStorage.removeItem('app_settings');
   ```

2. Check if apply-settings.js loaded:
   ```javascript
   console.log(window.APP_SETTINGS); // Should show settings object
   ```

3. Check import in pelanggan_info.js:
   ```javascript
   import { getWhatsAppNumber } from './apply-settings.js';
   ```

4. Hard refresh (Ctrl + Shift + R)

---

### **Problem 4: Favicon Tidak Berubah**

**Symptoms:**
- Saved new favicon
- Still shows old icon

**Solutions:**
```html
<!-- Check in DevTools (F12 → Elements): -->
<link rel="icon" href="NEW_URL"> <!-- Should be updated -->

<!-- If not, force update: -->
<script>
document.querySelector('link[rel="icon"]').href = 'NEW_URL' + '?v=' + Date.now();
</script>
```

**Browser Cache:**
- Chrome: Ctrl + Shift + Delete → Clear cached images
- Firefox: Ctrl + Shift + Delete → Cache
- Safari: Cmd + Option + E

---

### **Problem 5: PWA Manifest Tidak Update**

**Symptoms:**
- Installed PWA shows old name/icons

**Solutions:**
1. **Uninstall PWA:**
   - Android: Long press → App info → Uninstall
   - iOS: Long press → Remove from Home Screen

2. **Clear Service Worker:**
   ```javascript
   // DevTools → Application → Service Workers
   // Click "Unregister"
   ```

3. **Clear Cache:**
   ```javascript
   // DevTools → Application → Storage
   // Click "Clear site data"
   ```

4. **Reinstall PWA:**
   - Refresh browser
   - Install PWA again
   - Check if new settings applied

---

## 📚 **Best Practices**

### **1. Naming**

**App Name:**
```
✅ Short & memorable (max 20 chars)
✅ "Selinggonet ISP"
❌ "Selinggonet Internet Service Provider Management System v2.0"
```

**Short Name:**
```
✅ Max 12 characters
✅ "Selinggonet"
❌ "Selinggonet ISP Management" (too long)
```

---

### **2. Images**

**Logo (512x512):**
- Use transparent background
- Center the design
- Leave padding ~10%
- High contrast colors

**Favicon (32x32):**
- Simple icon, recognizable when small
- High contrast
- Avoid text (too small)

**PWA Icons (192 & 512):**
- Follow Material Design guidelines
- Safe area: 80% of canvas
- Maskable: important content in center 40%

---

### **3. Colors**

**Theme Color:**
```
✅ Match your brand
✅ Good contrast with white text
✅ #6a5acd (purple) - professional
✅ #2196f3 (blue) - trust
✅ #4caf50 (green) - growth
❌ #ffff00 (yellow) - poor contrast
```

**Background Color:**
```
✅ Light color for splash screen
✅ #f8f9fe (light blue)
✅ #ffffff (white)
❌ #000000 (black) - harsh
```

---

### **4. Contact Info**

**WhatsApp:**
- Test the number before saving
- Use business WhatsApp if available
- Set auto-reply for after-hours

**Email:**
- Use professional domain
- Set up auto-responder
- Monitor inbox regularly

---

## 🎉 **Testing Checklist**

### **Admin Testing:**

- [ ] Login as ADMIN
- [ ] Open Profile → Pengaturan Aplikasi
- [ ] Form loads with current settings
- [ ] Edit app name → Save → Refresh → Title updated
- [ ] Upload logo → Save → Refresh → Login page shows new logo
- [ ] Upload favicon → Save → Refresh → Browser tab shows new icon
- [ ] Upload PWA icons → Save → Reinstall PWA → Icons updated
- [ ] Edit WhatsApp number → Save → Customer page uses new number
- [ ] Change theme color → Save → Refresh → Status bar color updated
- [ ] All settings persist after logout/login

---

### **Customer Testing:**

- [ ] Login as USER (customer)
- [ ] Check browser title matches new app name
- [ ] Check favicon matches new icon
- [ ] Go to pelanggan_info.html
- [ ] Click "Konfirmasi Transfer" → WhatsApp opens with new number
- [ ] Go to pelanggan_riwayat_lunas.html
- [ ] Click WhatsApp button → Uses new number
- [ ] Install PWA → Check name and icons
- [ ] Uninstall → Reinstall → Settings persist

---

### **Multi-Device Testing:**

**Desktop:**
- [ ] Windows + Chrome
- [ ] Windows + Firefox
- [ ] Mac + Safari
- [ ] Mac + Chrome

**Mobile:**
- [ ] Android + Chrome
- [ ] Android + Firefox
- [ ] iOS + Safari
- [ ] iOS + Chrome

**PWA:**
- [ ] Android home screen
- [ ] iOS home screen
- [ ] Desktop app (Chrome/Edge)

---

## 🚀 **Deployment Checklist**

Before going live:

- [x] Run SQL script in production Supabase
- [x] Test upload to production storage
- [x] Verify RLS policies
- [x] Set production WhatsApp number
- [x] Upload production logo & icons
- [x] Test on real devices
- [x] Test WhatsApp integration
- [x] Clear all caches
- [x] Test PWA installation
- [x] Monitor error logs

---

## 📞 **Support**

**Issues?**
- Check this README first
- Check browser console for errors (F12)
- Check Supabase logs
- Clear cache and try again

**Need Help?**
Contact: azizt91@gmail.com

---

**📝 Created by:** Taufiq Aziz  
**📅 Date:** October 17, 2025  
**🔖 Version:** 2.0.0 (Extended)  
**✨ Status:** Production Ready
