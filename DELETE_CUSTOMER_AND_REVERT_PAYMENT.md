# 🗑️ Delete Customer & 🔄 Revert Payment Features

Dokumentasi lengkap untuk 2 fitur baru:
1. **Delete Customer** (cascade delete)
2. **Revert Payment Status** (paid → unpaid)

---

## **📋 Feature 1: Delete Customer**

### **Deskripsi:**
Admin dapat menghapus pelanggan secara **permanen** dengan cascade delete:
- ✅ Akun login (Supabase Auth)
- ✅ Data profil pelanggan (profiles table)
- ✅ Semua riwayat tagihan (invoices table)

### **UI Location:**
**Halaman:** Pelanggan → Detail View  
**Tombol:** Icon Trash (🗑️) di header - warna merah

### **Flow:**

```
┌───────────────────────────────────────┐
│ Admin: Detail Pelanggan               │
│ - Click icon trash (merah)            │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ Konfirmasi Dialog #1                  │
│ ⚠️ PERHATIAN: Hapus Pelanggan         │
│                                       │
│ Nama: John Doe                        │
│ ID: PL-001                            │
│                                       │
│ Akan menghapus:                       │
│ ✓ Akun login                          │
│ ✓ Data profil                         │
│ ✓ Riwayat tagihan                     │
│                                       │
│ Data TIDAK DAPAT dikembalikan!        │
│                                       │
│ [Batal]  [OK]                         │
└───────────────┬───────────────────────┘
                │ OK
                ▼
┌───────────────────────────────────────┐
│ Konfirmasi Dialog #2 (Safety)         │
│                                       │
│ Konfirmasi terakhir:                  │
│ Yakin ingin melanjutkan penghapusan?  │
│                                       │
│ [Batal]  [OK]                         │
└───────────────┬───────────────────────┘
                │ OK
                ▼
┌───────────────────────────────────────┐
│ Processing:                           │
│ 1. Delete invoices → Success ✅       │
│ 2. Delete profile → Success ✅        │
│ 3. Delete auth user → Success ✅      │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ Success Message:                      │
│ ✅ Pelanggan "John Doe" berhasil      │
│    dihapus!                           │
│                                       │
│ Data yang dihapus:                    │
│ - Akun login                          │
│ - Profil pelanggan                    │
│ - Riwayat tagihan                     │
└───────────────┬───────────────────────┘
                │
                ▼
        Navigate to List View
        Customer removed from list
```

### **Code Changes:**

#### **1. pelanggan.html**
```html
<!-- Delete button added in detail view header -->
<button id="delete-customer-icon-btn" 
        class="text-red-600 flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-red-50 rounded-full transition-colors">
    <svg><!-- Trash icon --></svg>
</button>
```

#### **2. pelanggan.js**

**Event Listener:**
```javascript
if (id === 'delete-customer-icon-btn') {
    handleDeleteCustomer();
    return;
}
```

**Delete Function:**
```javascript
async function handleDeleteCustomer() {
    // 1. Fetch customer data
    // 2. Double confirmation
    // 3. Delete invoices (cascade)
    // 4. Delete profile
    // 5. Delete from Auth (Edge Function)
    // 6. Show success & refresh
}
```

### **Database Operations:**

```sql
-- Step 1: Delete invoices
DELETE FROM invoices 
WHERE customer_id = 'uuid-customer';

-- Step 2: Delete profile
DELETE FROM profiles 
WHERE id = 'uuid-customer';

-- Step 3: Delete Auth user (via Edge Function)
supabase.functions.invoke('delete-user', {
    body: { user_id: 'uuid-customer' }
});
```

### **Edge Function:**

**File:** `supabase/functions/delete-user/index.ts`

**Purpose:** Delete user from Supabase Auth (requires service role key)

```typescript
const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
```

### **Deploy Edge Function:**

```bash
# Deploy to Supabase
supabase functions deploy delete-user

# Test locally (optional)
supabase functions serve delete-user
```

---

## **📋 Feature 2: Revert Payment Status**

### **Deskripsi:**
Admin dapat membatalkan pembayaran yang **sudah lunas** kembali ke status **belum dibayar**.

**Use Case:** Admin salah input pembayaran, atau customer ternyata belum transfer.

### **UI Location:**
**Halaman:** Tagihan → Tab "Dibayar"  
**Tombol:** Icon Revert (🔄) di setiap invoice - warna orange

### **Flow:**

```
┌───────────────────────────────────────┐
│ Admin: Tab Dibayar                    │
│ - Lihat invoice yang sudah LUNAS      │
│ - Click icon revert (🔄 orange)       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ Konfirmasi Dialog                     │
│ ⚠️ BATALKAN PEMBAYARAN                │
│                                       │
│ Pelanggan: John Doe                   │
│ Periode: Januari 2025                 │
│ Jumlah: Rp 200.000                    │
│ Status: LUNAS → BELUM DIBAYAR         │
│                                       │
│ Tindakan ini akan:                    │
│ - Reset status ke "Belum Dibayar"     │
│ - Hapus tanggal bayar                 │
│ - Hapus metode pembayaran             │
│                                       │
│ [Batal]  [OK]                         │
└───────────────┬───────────────────────┘
                │ OK
                ▼
┌───────────────────────────────────────┐
│ Processing:                           │
│ UPDATE invoices                       │
│ SET status = 'unpaid',                │
│     paid_at = NULL,                   │
│     payment_method = NULL,            │
│     amount = total_due,               │
│     amount_paid = 0                   │
│ WHERE id = invoice_id                 │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│ Success Message:                      │
│ ✅ Pembayaran berhasil dibatalkan!    │
│ Tagihan "Januari 2025" kembali ke     │
│ status belum dibayar.                 │
└───────────────┬───────────────────────┘
                │
                ▼
    Switch to "Belum Dibayar" tab
    Invoice muncul di tab unpaid
```

### **Code Changes:**

#### **1. tagihan.js - Add Revert Button**

```javascript
// In paid invoice rendering (line ~718)
<button class="revert-paid-btn flex items-center justify-center w-8 h-8 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" 
        data-invoice-id="${invoiceId}" 
        title="Batalkan Pembayaran">
    <svg><!-- Revert icon --></svg>
</button>
```

#### **2. tagihan.js - Event Handler**

```javascript
// In handleInvoiceListClick
else if (button.classList.contains('revert-paid-btn')) {
    revertPaymentStatus(targetItem);
}
```

#### **3. tagihan.js - Revert Function**

```javascript
async function revertPaymentStatus(invoice) {
    // 1. Show confirmation
    // 2. Update invoice to unpaid
    // 3. Reset payment fields
    // 4. Show success & refresh
    // 5. Switch to unpaid tab
}
```

### **Database Update:**

```sql
UPDATE invoices
SET 
    status = 'unpaid',
    paid_at = NULL,
    payment_method = NULL,
    amount = total_due,
    amount_paid = 0
WHERE id = 'invoice-uuid';
```

### **Fields Reset:**

| Field | Before (Paid) | After (Reverted) |
|-------|---------------|------------------|
| **status** | 'paid' | 'unpaid' ✅ |
| **paid_at** | '2025-01-15' | NULL ✅ |
| **payment_method** | 'BCA' | NULL ✅ |
| **amount** | 0 (sisa) | 200000 (full) ✅ |
| **amount_paid** | 200000 | 0 ✅ |

---

## **🎯 Testing Guide**

### **Test 1: Delete Customer**

```
✅ Step-by-step:

1. Login sebagai ADMIN
2. Pelanggan → Click salah satu customer
3. Detail View → Click icon trash (merah, pojok kanan atas)
4. Dialog konfirmasi 1 → Click OK
5. Dialog konfirmasi 2 → Click OK
6. Wait for processing (3-5 seconds)
7. Success message muncul
8. List view refresh, customer hilang

✅ Verify:
- Customer hilang dari list
- Database: SELECT * FROM profiles WHERE id = '...'; → No results
- Database: SELECT * FROM invoices WHERE customer_id = '...'; → No results
- Try login dengan email customer → Auth error (user not found)
```

### **Test 2: Revert Payment**

```
✅ Step-by-step:

1. Login sebagai ADMIN
2. Tagihan → Tab "Dibayar"
3. Pilih invoice yang LUNAS
4. Click icon revert (🔄 orange)
5. Dialog konfirmasi → Click OK
6. Wait for processing (1-2 seconds)
7. Success message muncul
8. Auto switch ke tab "Belum Dibayar"
9. Invoice muncul dengan status UNPAID

✅ Verify:
- Invoice ada di tab "Belum Dibayar"
- Invoice TIDAK ada di tab "Dibayar"
- Database: SELECT * FROM invoices WHERE id = '...';
  → status = 'unpaid'
  → paid_at = NULL
  → payment_method = NULL
```

---

## **⚠️ Important Notes**

### **Delete Customer:**

1. **PERMANENT ACTION** - Data tidak bisa dikembalikan
2. **Double confirmation** untuk safety
3. **Cascade delete** - semua data terkait terhapus
4. **Edge Function required** - untuk delete dari Auth
5. **RLS policies** tidak menghalangi admin delete

### **Revert Payment:**

1. **Only from "Dibayar" tab** - revert button hanya muncul di paid invoices
2. **Full reset** - semua payment fields di-reset
3. **No history** - tidak ada log pembayaran sebelumnya
4. **Auto switch** - setelah revert, pindah ke tab "Belum Dibayar"
5. **Can re-pay** - invoice bisa dibayar lagi setelah revert

---

## **🔐 Security & Permissions**

### **Delete Customer:**

**Required:**
- ✅ Admin role
- ✅ Authenticated session
- ✅ Edge Function deployed
- ✅ Service role key configured

**Protected:**
- ❌ User role tidak bisa delete customer (UI tidak ada button)
- ❌ Unauthenticated tidak bisa akses

### **Revert Payment:**

**Required:**
- ✅ Admin role
- ✅ Authenticated session
- ✅ Invoice status = 'paid'

**Protected:**
- ❌ User role tidak bisa revert (tidak ada akses ke tagihan page)
- ❌ Unpaid/installment invoices tidak punya revert button

---

## **🐛 Troubleshooting**

### **Problem 1: Delete Customer fails - "delete-user function not found"**

**Cause:** Edge Function belum di-deploy

**Solution:**
```bash
supabase functions deploy delete-user
```

---

### **Problem 2: Revert button tidak muncul**

**Cause:** Rendering conditional issue

**Check:**
```javascript
// Pastikan di tab 'paid', bukan 'unpaid' atau 'installment'
if (currentTab === 'paid') {
    // Revert button harus ada di sini
}
```

---

### **Problem 3: Delete berhasil tapi Auth user masih ada**

**Cause:** Edge Function error / service role key salah

**Solution:**
```javascript
// Check Edge Function logs
supabase functions logs delete-user

// Verify service role key in Supabase Dashboard
// Settings → API → service_role key
```

---

### **Problem 4: Revert berhasil tapi invoice tidak pindah tab**

**Cause:** Auto switch ke unpaid tab tidak jalan

**Fix:**
```javascript
// Setelah revert, pastikan ada:
await fetchData();
switchTab('unpaid');
```

---

## **📊 Database Impact**

### **Delete Customer:**

**Before:**
```
profiles: 66 rows
invoices: 500 rows
auth.users: 66 users
```

**After Delete (1 customer):**
```
profiles: 65 rows (-1) ✅
invoices: 495 rows (-5, assuming 5 invoices) ✅
auth.users: 65 users (-1) ✅
```

---

### **Revert Payment:**

**Before:**
```
Invoice:
- status: 'paid'
- paid_at: '2025-01-15'
- payment_method: 'BCA'
- amount: 0
- amount_paid: 200000
```

**After Revert:**
```
Invoice:
- status: 'unpaid' ✅
- paid_at: NULL ✅
- payment_method: NULL ✅
- amount: 200000 ✅
- amount_paid: 0 ✅
```

---

## **✅ Feature Summary**

| Feature | Status | Files Changed | Functions Created |
|---------|--------|---------------|-------------------|
| **Delete Customer** | ✅ Ready | 2 files | 1 Edge Function |
| **Revert Payment** | ✅ Ready | 1 file | 1 JS function |

**Total Impact:**
- 3 files modified
- 2 new functions
- 1 Edge Function deployed
- Full cascade delete support
- Full payment revert support

---

## **🚀 Deployment Checklist**

### **Before Deploy:**
- [x] Code changes committed
- [x] Edge Function created
- [x] Testing locally completed
- [x] Documentation created

### **Deploy Steps:**

```bash
# 1. Deploy Edge Function
supabase functions deploy delete-user

# 2. Test Edge Function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/delete-user \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-uuid"}'

# 3. Push code changes
git add .
git commit -m "feat: Add delete customer & revert payment features"
git push
```

### **After Deploy:**
- [x] Test delete customer (with real data)
- [x] Test revert payment
- [x] Verify cascade delete works
- [x] Verify no orphaned data
- [x] Update admin documentation

---

**📝 Created by:** Taufiq Aziz  
**📅 Date:** January 17, 2025  
**🔖 Version:** 1.0.0  
**✨ Status:** Production Ready
