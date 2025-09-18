-- =====================================================
-- SAFE DATABASE FUNCTION: GET ALL CUSTOMERS
-- Script aman dengan pengecekan enum type
-- =====================================================

-- STEP 1: Cek enum customer_status yang ada
SELECT 
    'CURRENT CUSTOMER_STATUS ENUM VALUES' as info,
    enumlabel as enum_values
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'customer_status'
)
ORDER BY enumsortorder;

-- STEP 2: Buat enum jika belum ada
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE customer_status AS ENUM ('AKTIF', 'NONAKTIF');
        RAISE NOTICE 'Created customer_status enum';
    ELSE
        RAISE NOTICE 'customer_status enum already exists';
    END IF;
END $$;

-- STEP 3: Drop existing function first
DROP FUNCTION IF EXISTS get_all_customers(TEXT, TEXT);

-- STEP 4: Create get_all_customers function dengan tipe yang benar
CREATE OR REPLACE FUNCTION get_all_customers(
    p_filter TEXT DEFAULT 'all',
    p_search_term TEXT DEFAULT ''
)
RETURNS TABLE (
    id UUID,
    idpl TEXT,
    full_name TEXT,
    address TEXT,
    gender TEXT,
    whatsapp_number TEXT,
    role TEXT,
    photo_url TEXT,
    status customer_status,
    installation_date DATE,
    device_type TEXT,
    ip_static_pppoe TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.idpl,
        p.full_name,
        p.address,
        p.gender,
        p.whatsapp_number,
        p.role,
        p.photo_url,
        p.status,
        p.installation_date,
        p.device_type,
        p.ip_static_pppoe,
        p.created_at
    FROM public.profiles p
    WHERE 
        -- Filter berdasarkan role (hanya USER, bukan ADMIN)
        p.role = 'USER'
        
        -- Filter berdasarkan status
        AND (
            p_filter = 'all' OR
            (p_filter = 'active' AND p.status = 'AKTIF'::customer_status) OR
            (p_filter = 'inactive' AND p.status = 'NONAKTIF'::customer_status)
        )
        
        -- Filter berdasarkan search term
        AND (
            p_search_term = '' OR
            LOWER(p.full_name) LIKE LOWER('%' || p_search_term || '%') OR
            LOWER(p.idpl) LIKE LOWER('%' || p_search_term || '%') OR
            LOWER(p.whatsapp_number) LIKE LOWER('%' || p_search_term || '%') OR
            LOWER(p.address) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        -- Urutkan berdasarkan status (AKTIF dulu), lalu nama
        CASE WHEN p.status = 'AKTIF'::customer_status THEN 0 ELSE 1 END,
        p.full_name ASC;
END;
$$;

-- STEP 5: Grant permissions
GRANT EXECUTE ON FUNCTION get_all_customers(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_customers(TEXT, TEXT) TO anon;

-- STEP 6: Test function
SELECT 'TESTING GET_ALL_CUSTOMERS FUNCTION...' as info;

-- Test 1: All customers
SELECT COUNT(*) as total_customers FROM get_all_customers('all', '');

-- Test 2: Active customers only
SELECT COUNT(*) as active_customers FROM get_all_customers('active', '');

-- Test 3: Inactive customers only  
SELECT COUNT(*) as inactive_customers FROM get_all_customers('inactive', '');

-- Test 4: Search functionality
SELECT COUNT(*) as search_results FROM get_all_customers('all', 'budi');

-- STEP 7: Verifikasi enum setelah update
SELECT 
    'VERIFIED CUSTOMER_STATUS ENUM VALUES' as info,
    enumlabel as enum_values
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'customer_status'
)
ORDER BY enumsortorder;

-- =====================================================
-- GET_ALL_CUSTOMERS FUNCTION CREATED (SAFE VERSION)
-- =====================================================
-- Perbaikan yang dilakukan:
-- 1. Cek dan buat enum customer_status jika belum ada
-- 2. Gunakan tipe customer_status untuk kolom status
-- 3. Cast explicit ke customer_status dalam query
-- 4. Test function dengan berbagai skenario
-- 
-- MAPPING FILTER:
-- - 'all' = semua pelanggan USER
-- - 'active' = pelanggan dengan status='AKTIF'
-- - 'inactive' = pelanggan dengan status='NONAKTIF'
-- =====================================================
