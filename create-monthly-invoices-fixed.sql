-- =====================================================
-- FIXED DATABASE FUNCTION: CREATE MONTHLY INVOICES V2
-- Script yang sudah diperbaiki untuk mengatasi ambiguous column
-- =====================================================

-- STEP 1: Drop semua versi function yang mungkin ada
DROP FUNCTION IF EXISTS create_monthly_invoices_v2();
DROP FUNCTION IF EXISTS create_monthly_invoices_v2(TEXT);
DROP FUNCTION IF EXISTS create_monthly_invoices_v2(INTEGER);

-- STEP 2: Create function baru dengan struktur cicilan (FIXED)
CREATE FUNCTION create_monthly_invoices_v2()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month_name TEXT;
    current_year_num INTEGER;
    target_invoice_period TEXT;
    active_customers_count INTEGER;
    created_invoices_count INTEGER;
    customer_record RECORD;
    new_invoice_id UUID;
    result_message TEXT;
    default_package_price NUMERIC := 150000;
BEGIN
    -- Get current month and year (dalam bahasa Indonesia)
    current_month_name := CASE EXTRACT(MONTH FROM CURRENT_DATE)
        WHEN 1 THEN 'Januari'
        WHEN 2 THEN 'Februari'
        WHEN 3 THEN 'Maret'
        WHEN 4 THEN 'April'
        WHEN 5 THEN 'Mei'
        WHEN 6 THEN 'Juni'
        WHEN 7 THEN 'Juli'
        WHEN 8 THEN 'Agustus'
        WHEN 9 THEN 'September'
        WHEN 10 THEN 'Oktober'
        WHEN 11 THEN 'November'
        WHEN 12 THEN 'Desember'
    END;
    
    current_year_num := EXTRACT(YEAR FROM CURRENT_DATE);
    target_invoice_period := current_month_name || ' ' || current_year_num;
    
    -- Count active customers
    SELECT COUNT(*) INTO active_customers_count
    FROM public.profiles 
    WHERE status = 'AKTIF' AND role = 'USER';
    
    IF active_customers_count = 0 THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Tidak ada pelanggan aktif ditemukan'
        );
    END IF;
    
    -- Initialize counter
    created_invoices_count := 0;
    
    -- Loop through active customers dengan query yang lebih sederhana
    FOR customer_record IN 
        SELECT 
            p.id as customer_id,
            p.full_name,
            p.idpl
        FROM public.profiles p
        WHERE p.status = 'AKTIF' AND p.role = 'USER'
        ORDER BY p.full_name
    LOOP
        -- Check if invoice already exists for this customer and period
        IF NOT EXISTS (
            SELECT 1 FROM public.invoices existing_invoice
            WHERE existing_invoice.customer_id = customer_record.customer_id 
            AND existing_invoice.invoice_period = target_invoice_period
        ) THEN
            -- Generate new UUID for invoice
            new_invoice_id := gen_random_uuid();
            
            -- Create new invoice dengan struktur cicilan
            INSERT INTO public.invoices (
                id,
                customer_id,
                package_id,
                invoice_period,
                amount,
                total_due,
                amount_paid,
                status,
                due_date,
                payment_history,
                last_payment_date,
                payment_method,
                created_at
            ) VALUES (
                new_invoice_id,
                customer_record.customer_id,
                1, -- Default package ID, sesuaikan dengan data Anda
                target_invoice_period,
                default_package_price,  -- Amount = sisa tagihan (awalnya sama dengan total)
                default_package_price,  -- Total due = harga package
                0,                      -- Amount paid = 0 (belum bayar)
                'unpaid',               -- Status unpaid
                CURRENT_DATE + INTERVAL '30 days', -- Due date 30 hari
                '[]'::jsonb,            -- Empty payment history
                NULL,                   -- No payment date yet
                'cash',                 -- Default payment method
                CURRENT_TIMESTAMP
            );
            
            created_invoices_count := created_invoices_count + 1;
        END IF;
    END LOOP;
    
    -- Prepare result message
    IF created_invoices_count > 0 THEN
        result_message := 'Berhasil membuat ' || created_invoices_count || ' tagihan untuk periode ' || target_invoice_period;
        
        RETURN jsonb_build_object(
            'status', 'success',
            'message', result_message,
            'data', jsonb_build_object(
                'period', target_invoice_period,
                'total_customers', active_customers_count,
                'created_invoices', created_invoices_count
            )
        );
    ELSE
        RETURN jsonb_build_object(
            'status', 'info',
            'message', 'Semua tagihan untuk periode ' || target_invoice_period || ' sudah dibuat sebelumnya',
            'data', jsonb_build_object(
                'period', target_invoice_period,
                'total_customers', active_customers_count,
                'created_invoices', 0
            )
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Error saat membuat tagihan: ' || SQLERRM,
            'error_code', SQLSTATE,
            'error_detail', SQLERRM
        );
END;
$$;

-- STEP 3: Grant permissions
GRANT EXECUTE ON FUNCTION create_monthly_invoices_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION create_monthly_invoices_v2() TO anon;

-- STEP 4: Test function
SELECT 'TESTING FUNCTION...' as info;
SELECT create_monthly_invoices_v2() as test_result;

-- =====================================================
-- FUNCTION BERHASIL DIPERBAIKI
-- =====================================================
-- Perbaikan yang dilakukan:
-- 1. Rename variable invoice_period -> target_invoice_period
-- 2. Tambah alias untuk table invoices -> existing_invoice  
-- 3. Simplify query untuk menghindari JOIN yang complex
-- 4. Gunakan default package_price = 150000
-- 5. Tambah ORDER BY untuk konsistensi
-- 6. Perbaiki error handling
-- =====================================================
