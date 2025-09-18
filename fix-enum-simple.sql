-- =====================================================
-- FIX ENUM INVOICE_STATUS - VERSI SEDERHANA
-- Script untuk memperbaiki enum yang hilang (tanpa conflict)
-- =====================================================

-- STEP 1: Cek enum yang ada saat ini
SELECT 
    'CURRENT ENUM VALUES' as info,
    enumlabel as enum_values
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'invoice_status'
)
ORDER BY enumsortorder;

-- STEP 2: Tambahkan partially_paid (jika belum ada)
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'partially_paid';

-- STEP 3: Tambahkan overdue (jika belum ada) 
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'overdue';

-- STEP 4: Verifikasi enum setelah update
SELECT 
    'UPDATED ENUM VALUES' as info,
    enumlabel as enum_values
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'invoice_status'
)
ORDER BY enumsortorder;

-- STEP 5: Cek struktur kolom status
SELECT 
    'COLUMN INFO' as info,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name = 'status'
AND table_schema = 'public';

-- =====================================================
-- SELESAI - ENUM FIXED
-- Sekarang refresh halaman tagihan untuk test
-- =====================================================
