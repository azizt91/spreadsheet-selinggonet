-- =====================================================
-- DATABASE FUNCTION: GET DASHBOARD STATS
-- Function untuk menghitung statistik dashboard dengan struktur cicilan
-- =====================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS get_dashboard_stats(INTEGER, INTEGER);

-- Create dashboard stats function
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_month INTEGER DEFAULT 0,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
    total_revenue NUMERIC,
    total_expenses NUMERIC,
    profit NUMERIC,
    active_customers INTEGER,
    inactive_customers INTEGER,
    unpaid_invoices_count INTEGER,
    paid_invoices_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_period TEXT;
    month_name TEXT;
BEGIN
    -- Jika p_month = 0, hitung untuk semua bulan di tahun tersebut
    -- Jika p_month > 0, hitung untuk bulan spesifik
    
    IF p_month > 0 THEN
        -- Convert month number to Indonesian month name
        month_name := CASE p_month
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
        target_period := month_name || ' ' || p_year;
    END IF;

    RETURN QUERY
    SELECT 
        -- TOTAL REVENUE: Jumlah yang sudah dibayar (amount_paid) dari semua invoice
        COALESCE(
            (SELECT SUM(i.amount_paid) 
             FROM public.invoices i 
             WHERE (p_month = 0 OR i.invoice_period = target_period)
             AND (p_month > 0 OR EXTRACT(YEAR FROM i.created_at) = p_year)
             AND i.amount_paid > 0
            ), 0
        ) as total_revenue,
        
        -- TOTAL EXPENSES: Pengeluaran dari tabel expenses
        COALESCE(
            (SELECT SUM(e.amount) 
             FROM public.expenses e 
             WHERE (p_month = 0 OR EXTRACT(MONTH FROM e.expense_date) = p_month)
             AND EXTRACT(YEAR FROM e.expense_date) = p_year
            ), 0
        ) as total_expenses,
        
        -- PROFIT: Revenue - Expenses
        COALESCE(
            (SELECT SUM(i.amount_paid) 
             FROM public.invoices i 
             WHERE (p_month = 0 OR i.invoice_period = target_period)
             AND (p_month > 0 OR EXTRACT(YEAR FROM i.created_at) = p_year)
             AND i.amount_paid > 0
            ), 0
        ) - COALESCE(
            (SELECT SUM(e.amount) 
             FROM public.expenses e 
             WHERE (p_month = 0 OR EXTRACT(MONTH FROM e.expense_date) = p_month)
             AND EXTRACT(YEAR FROM e.expense_date) = p_year
            ), 0
        ) as profit,
        
        -- ACTIVE CUSTOMERS: Pelanggan dengan status AKTIF dan role USER
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.profiles p 
             WHERE p.status = 'AKTIF' 
             AND p.role = 'USER'
            ), 0
        )::INTEGER as active_customers,
        
        -- INACTIVE CUSTOMERS: Pelanggan dengan status NONAKTIF dan role USER
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.profiles p 
             WHERE p.status = 'NONAKTIF' 
             AND p.role = 'USER'
            ), 0
        )::INTEGER as inactive_customers,
        
        -- UNPAID INVOICES COUNT: Tagihan belum dibayar (unpaid + partially_paid)
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.invoices i 
             WHERE (p_month = 0 OR i.invoice_period = target_period)
             AND (p_month > 0 OR EXTRACT(YEAR FROM i.created_at) = p_year)
             AND i.status IN ('unpaid', 'partially_paid')
            ), 0
        )::INTEGER as unpaid_invoices_count,
        
        -- PAID INVOICES COUNT: Tagihan lunas
        COALESCE(
            (SELECT COUNT(*) 
             FROM public.invoices i 
             WHERE (p_month = 0 OR i.invoice_period = target_period)
             AND (p_month > 0 OR EXTRACT(YEAR FROM i.created_at) = p_year)
             AND i.status = 'paid'
            ), 0
        )::INTEGER as paid_invoices_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_stats(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(INTEGER, INTEGER) TO anon;

-- Test function
SELECT 'TESTING DASHBOARD STATS FUNCTION...' as info;
SELECT * FROM get_dashboard_stats(9, 2025); -- September 2025
SELECT * FROM get_dashboard_stats(0, 2025); -- All months 2025

-- =====================================================
-- DASHBOARD STATS FUNCTION CREATED
-- =====================================================
-- Function ini menghitung:
-- 1. total_revenue: SUM(amount_paid) - uang yang benar-benar masuk
-- 2. total_expenses: SUM(expenses.amount) - pengeluaran
-- 3. profit: revenue - expenses
-- 4. active_customers: COUNT profiles dengan status=AKTIF dan role=USER
-- 5. inactive_customers: COUNT profiles dengan status=NONAKTIF dan role=USER  
-- 6. unpaid_invoices_count: COUNT invoice dengan status unpaid/partially_paid
-- 7. paid_invoices_count: COUNT invoice dengan status paid
-- 
-- PERBAIKAN UTAMA:
-- - Revenue dihitung dari amount_paid (uang yang benar-benar masuk)
-- - Bukan dari amount (sisa tagihan) seperti sebelumnya
-- - Pelanggan aktif hanya menghitung role=USER, bukan ADMIN
-- =====================================================
