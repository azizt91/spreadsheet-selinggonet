-- =====================================================
-- DATABASE MIGRATION UNTUK FITUR CICILAN PEMBAYARAN
-- Selinggonet - Implementasi Cicilan
-- =====================================================

-- STEP 1: Buat enum untuk status pembayaran yang lebih lengkap
-- (Jika belum ada, ini akan membuat enum baru)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_payment_status') THEN
        CREATE TYPE invoice_payment_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue');
    END IF;
END $$;

-- STEP 2: Tambahkan kolom-kolom baru ke tabel invoices
-- Kolom ini akan menyimpan data untuk fitur cicilan
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS total_due NUMERIC,                    -- Total tagihan asli
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,        -- Total yang sudah dibayar
ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]',   -- Riwayat pembayaran
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE, -- Tanggal pembayaran terakhir
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';   -- Metode pembayaran

-- STEP 3: Backup data existing ke kolom total_due
-- Ini akan menyalin semua data dari kolom 'amount' lama ke 'total_due'
UPDATE public.invoices
SET total_due = amount
WHERE total_due IS NULL;

-- STEP 4: Set amount_paid berdasarkan status existing
-- Jika status 'paid', berarti sudah dibayar penuh
-- Jika status 'unpaid', berarti belum dibayar sama sekali
UPDATE public.invoices
SET amount_paid = CASE 
    WHEN status = 'paid' THEN total_due  -- Jika lunas, amount_paid = total tagihan
    ELSE 0                               -- Jika belum lunas, amount_paid = 0
END
WHERE amount_paid = 0 OR amount_paid IS NULL;

-- STEP 5: Update kolom amount menjadi "sisa tagihan"
-- Kolom amount sekarang akan berfungsi sebagai sisa tagihan
UPDATE public.invoices
SET amount = CASE 
    WHEN status = 'paid' THEN 0          -- Jika lunas, sisa tagihan = 0
    ELSE total_due - amount_paid         -- Jika belum lunas, sisa = total - terbayar
END;

-- STEP 6: Set last_payment_date untuk tagihan yang sudah lunas
UPDATE public.invoices
SET last_payment_date = paid_at
WHERE status = 'paid' AND paid_at IS NOT NULL;

-- STEP 7: Buat initial payment_history untuk tagihan yang sudah lunas
-- Ini akan membuat riwayat pembayaran untuk data existing
UPDATE public.invoices
SET payment_history = jsonb_build_array(
    jsonb_build_object(
        'amount', total_due,
        'date', COALESCE(paid_at, created_at),
        'admin', 'System Migration',
        'method', 'cash',
        'note', 'Data migrated from old system'
    )
)
WHERE status = 'paid' AND (payment_history = '[]' OR payment_history IS NULL);

-- STEP 8: Validasi data migration
-- Query ini akan menampilkan summary hasil migration
SELECT 
    'MIGRATION SUMMARY' as info,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_invoices,
    COUNT(CASE WHEN total_due IS NOT NULL THEN 1 END) as invoices_with_total_due,
    COUNT(CASE WHEN payment_history != '[]' THEN 1 END) as invoices_with_history
FROM public.invoices;

-- STEP 9: Tampilkan sample data untuk verifikasi
SELECT 
    id,
    total_due,
    amount_paid,
    amount as sisa_tagihan,
    status,
    payment_history
FROM public.invoices
LIMIT 5;

-- =====================================================
-- MIGRATION COMPLETED
-- =====================================================
-- Setelah menjalankan script ini:
-- 1. Kolom 'total_due' berisi tagihan asli
-- 2. Kolom 'amount_paid' berisi total yang sudah dibayar  
-- 3. Kolom 'amount' sekarang berisi sisa tagihan
-- 4. Kolom 'payment_history' berisi riwayat pembayaran
-- 5. Data existing sudah aman dan ter-migrate
-- =====================================================
