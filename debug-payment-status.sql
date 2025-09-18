-- =====================================================
-- DEBUG PAYMENT STATUS CHART
-- Script untuk debug kenapa payment status chart kosong
-- =====================================================

-- 1. Cek total invoices
SELECT 'TOTAL INVOICES' as info, COUNT(*) as count FROM public.invoices;

-- 2. Cek status distribution
SELECT 
    'STATUS DISTRIBUTION' as info,
    status,
    COUNT(*) as count
FROM public.invoices 
GROUP BY status
ORDER BY count DESC;

-- 3. Cek enum values yang tersedia
SELECT 
    'AVAILABLE ENUM VALUES' as info,
    enumlabel as status_values
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'invoice_status'
)
ORDER BY enumsortorder;

-- 4. Cek data bulan ini vs semua data
SELECT 
    'CURRENT MONTH vs ALL TIME' as info,
    'Current Month' as period,
    COUNT(*) FILTER (WHERE status = 'paid') as paid,
    COUNT(*) FILTER (WHERE status = 'partially_paid') as partially_paid,
    COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid
FROM public.invoices
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)

UNION ALL

SELECT 
    'CURRENT MONTH vs ALL TIME' as info,
    'All Time' as period,
    COUNT(*) FILTER (WHERE status = 'paid') as paid,
    COUNT(*) FILTER (WHERE status = 'partially_paid') as partially_paid,
    COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid
FROM public.invoices;

-- 5. Test chart function dengan debug
SELECT 
    'CHART FUNCTION TEST' as info,
    get_dashboard_charts_data(6)->'payment_status_chart' as payment_chart_data;

-- 6. Cek sample data
SELECT 
    'SAMPLE INVOICE DATA' as info,
    id, status, invoice_period, created_at
FROM public.invoices 
ORDER BY created_at DESC 
LIMIT 10;
