-- =====================================================
-- SIMPLE DATABASE FUNCTION: PENDAPATAN & PROFIT CHART
-- Function sederhana dengan logic yang jelas
-- =====================================================

-- Drop existing function first
DROP FUNCTION IF EXISTS get_dashboard_charts_data(INTEGER);

-- Create simple dashboard charts data function
CREATE OR REPLACE FUNCTION get_dashboard_charts_data(
    p_months INTEGER DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    revenue_data JSONB := '[]'::jsonb;
    expenses_data JSONB := '[]'::jsonb;
    profit_data JSONB := '[]'::jsonb;
    customer_growth_data JSONB := '[]'::jsonb;
    customer_total_data JSONB := '[]'::jsonb;
    customer_net_data JSONB := '[]'::jsonb;
    labels_data JSONB := '[]'::jsonb;
    current_month_start DATE;
    month_revenue NUMERIC;
    month_expenses NUMERIC;
    month_profit NUMERIC;
    month_label TEXT;
    current_period TEXT;
    month_new_customers INTEGER;
    month_churned_customers INTEGER;
    month_net_growth INTEGER;
    month_total_active INTEGER;
    paid_count INTEGER := 0;
    partially_paid_count INTEGER := 0;
    unpaid_count INTEGER := 0;
    i INTEGER;
BEGIN
    -- Generate data untuk 6 bulan terakhir
    FOR i IN 0..(p_months-1) LOOP
        current_month_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * i);
        
        -- Format bulan dalam bahasa Indonesia
        month_label := CASE EXTRACT(MONTH FROM current_month_start)
            WHEN 1 THEN 'Jan'
            WHEN 2 THEN 'Feb'
            WHEN 3 THEN 'Mar'
            WHEN 4 THEN 'Apr'
            WHEN 5 THEN 'Mei'
            WHEN 6 THEN 'Jun'
            WHEN 7 THEN 'Jul'
            WHEN 8 THEN 'Agu'
            WHEN 9 THEN 'Sep'
            WHEN 10 THEN 'Okt'
            WHEN 11 THEN 'Nov'
            WHEN 12 THEN 'Des'
        END || ' ' || EXTRACT(YEAR FROM current_month_start);
        
        -- PENDAPATAN: Total dari pelanggan LUNAS berdasarkan periode tagihan
        -- Ambil invoice dengan status='paid' yang invoice_period sesuai bulan ini
        SELECT COALESCE(SUM(
            CASE 
                WHEN amount_paid > 0 THEN amount_paid
                WHEN total_due > 0 THEN total_due  
                ELSE amount
            END
        ), 0) INTO month_revenue
        FROM public.invoices
        WHERE status = 'paid'
        AND (
            -- Format periode: "September 2025" atau "2025-09"
            invoice_period = (
                CASE EXTRACT(MONTH FROM current_month_start)
                    WHEN 1 THEN 'January'
                    WHEN 2 THEN 'February'
                    WHEN 3 THEN 'March'
                    WHEN 4 THEN 'April'
                    WHEN 5 THEN 'May'
                    WHEN 6 THEN 'June'
                    WHEN 7 THEN 'July'
                    WHEN 8 THEN 'August'
                    WHEN 9 THEN 'September'
                    WHEN 10 THEN 'October'
                    WHEN 11 THEN 'November'
                    WHEN 12 THEN 'December'
                END || ' ' || EXTRACT(YEAR FROM current_month_start)
            )
            OR invoice_period = (
                CASE EXTRACT(MONTH FROM current_month_start)
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
                END || ' ' || EXTRACT(YEAR FROM current_month_start)
            )
            OR invoice_period = (
                EXTRACT(YEAR FROM current_month_start) || '-' || 
                LPAD(EXTRACT(MONTH FROM current_month_start)::text, 2, '0')
            )
        );
        
        -- PENGELUARAN: Total pengeluaran berdasarkan bulan
        SELECT COALESCE(SUM(amount), 0) INTO month_expenses
        FROM public.expenses
        WHERE DATE_TRUNC('month', expense_date) = current_month_start;
        
        -- PROFIT: Total Pendapatan - Total Pengeluaran
        month_profit := month_revenue - month_expenses;
        
        -- CUSTOMER METRICS: 3 Metrik sesuai saran Gemini AI
        
        -- 1. New Customers: Pelanggan baru berdasarkan installation_date
        SELECT COUNT(*) INTO month_new_customers
        FROM public.profiles
        WHERE DATE_TRUNC('month', installation_date) = current_month_start
        AND role = 'USER';
        
        -- 2. Churned Customers: Pelanggan yang berhenti berdasarkan churn_date
        SELECT COUNT(*) INTO month_churned_customers
        FROM public.profiles
        WHERE DATE_TRUNC('month', churn_date) = current_month_start
        AND role = 'USER';
        
        -- 3. Net Growth: New - Churned
        month_net_growth := month_new_customers - month_churned_customers;
        
        -- 4. Total Active: Total pelanggan aktif di akhir bulan ini
        SELECT COUNT(*) INTO month_total_active
        FROM public.profiles
        WHERE role = 'USER'
        AND status = 'AKTIF'
        AND installation_date <= (current_month_start + INTERVAL '1 month' - INTERVAL '1 day')
        AND (churn_date IS NULL OR churn_date > (current_month_start + INTERVAL '1 month' - INTERVAL '1 day'));
        
        -- Tambahkan ke array (reverse order untuk chronological)
        labels_data := jsonb_insert(labels_data, '{0}', to_jsonb(month_label));
        revenue_data := jsonb_insert(revenue_data, '{0}', to_jsonb(month_revenue));
        expenses_data := jsonb_insert(expenses_data, '{0}', to_jsonb(month_expenses));
        profit_data := jsonb_insert(profit_data, '{0}', to_jsonb(month_profit));
        customer_growth_data := jsonb_insert(customer_growth_data, '{0}', to_jsonb(month_new_customers));
        customer_net_data := jsonb_insert(customer_net_data, '{0}', to_jsonb(month_net_growth));
        customer_total_data := jsonb_insert(customer_total_data, '{0}', to_jsonb(month_total_active));
    END LOOP;
    
    -- STATUS PEMBAYARAN: Berdasarkan periode bulan ini (September 2025)
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Format periode bulan ini
    current_period := CASE EXTRACT(MONTH FROM current_month_start)
        WHEN 1 THEN 'January'
        WHEN 2 THEN 'February'
        WHEN 3 THEN 'March'
        WHEN 4 THEN 'April'
        WHEN 5 THEN 'May'
        WHEN 6 THEN 'June'
        WHEN 7 THEN 'July'
        WHEN 8 THEN 'August'
        WHEN 9 THEN 'September'
        WHEN 10 THEN 'October'
        WHEN 11 THEN 'November'
        WHEN 12 THEN 'December'
    END || ' ' || EXTRACT(YEAR FROM current_month_start);
    
    -- Hitung status pembayaran berdasarkan invoice_period bulan ini
    SELECT 
        COUNT(*) FILTER (WHERE status = 'paid'),
        COUNT(*) FILTER (WHERE status = 'partially_paid'),
        COUNT(*) FILTER (WHERE status = 'unpaid')
    INTO paid_count, partially_paid_count, unpaid_count
    FROM public.invoices
    WHERE (
        invoice_period = current_period
        OR invoice_period = (
            CASE EXTRACT(MONTH FROM current_month_start)
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
            END || ' ' || EXTRACT(YEAR FROM current_month_start)
        )
        OR invoice_period = (
            EXTRACT(YEAR FROM current_month_start) || '-' || 
            LPAD(EXTRACT(MONTH FROM current_month_start)::text, 2, '0')
        )
    );
    
    -- Return revenue chart + payment status chart
    RETURN jsonb_build_object(
        'revenue_chart', jsonb_build_object(
            'labels', labels_data,
            'datasets', jsonb_build_array(
                jsonb_build_object(
                    'label', 'Pendapatan',
                    'data', revenue_data,
                    'borderColor', '#10B981',
                    'backgroundColor', 'rgba(16, 185, 129, 0.1)',
                    'tension', 0.4,
                    'fill', true
                ),
                jsonb_build_object(
                    'label', 'Pengeluaran', 
                    'data', expenses_data,
                    'borderColor', '#EF4444',
                    'backgroundColor', 'rgba(239, 68, 68, 0.1)',
                    'tension', 0.4,
                    'fill', true
                ),
                jsonb_build_object(
                    'label', 'Profit',
                    'data', profit_data,
                    'borderColor', '#6366F1',
                    'backgroundColor', 'rgba(99, 102, 241, 0.1)',
                    'tension', 0.4,
                    'fill', true
                )
            )
        ),
        'payment_status_chart', jsonb_build_object(
            'labels', jsonb_build_array('Lunas', 'Cicilan', 'Belum Bayar'),
            'datasets', jsonb_build_array(
                jsonb_build_object(
                    'data', jsonb_build_array(paid_count, partially_paid_count, unpaid_count),
                    'backgroundColor', jsonb_build_array('#10B981', '#F59E0B', '#EF4444'),
                    'borderColor', jsonb_build_array('#059669', '#D97706', '#DC2626'),
                    'borderWidth', 2
                )
            )
        ),
        'customer_growth_chart', jsonb_build_object(
            'labels', labels_data,
            'datasets', jsonb_build_array(
                jsonb_build_object(
                    'label', 'Pelanggan Baru',
                    'data', customer_growth_data,
                    'backgroundColor', '#10B981',
                    'borderColor', '#059669',
                    'borderWidth', 2,
                    'borderRadius', 4
                ),
                jsonb_build_object(
                    'label', 'Pelanggan Cabut',
                    'data', customer_net_data,
                    'backgroundColor', '#EF4444',
                    'borderColor', '#DC2626',
                    'borderWidth', 2,
                    'borderRadius', 4
                )
            )
        ),
        'customer_total_chart', jsonb_build_object(
            'labels', labels_data,
            'datasets', jsonb_build_array(
                jsonb_build_object(
                    'label', 'Total Pelanggan Aktif',
                    'data', customer_total_data,
                    'borderColor', '#8B5CF6',
                    'backgroundColor', 'rgba(139, 92, 246, 0.1)',
                    'tension', 0.4,
                    'fill', true
                )
            )
        ),
        'debug_info', jsonb_build_object(
            'logic', 'Pendapatan dari pelanggan LUNAS berdasarkan periode tagihan, Pengeluaran berdasarkan bulan',
            'current_period', current_period,
            'paid_count', paid_count,
            'partially_paid_count', partially_paid_count,
            'unpaid_count', unpaid_count,
            'total_current_period', paid_count + partially_paid_count + unpaid_count,
            'customer_metrics', jsonb_build_object(
                'new_customers_this_month', month_new_customers,
                'churned_customers_this_month', month_churned_customers,
                'net_growth_this_month', month_net_growth,
                'total_active_customers', month_total_active
            )
        )
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dashboard_charts_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_charts_data(INTEGER) TO anon;

-- Test function
SELECT 'TESTING SIMPLE DASHBOARD CHARTS FUNCTION...' as info;
SELECT get_dashboard_charts_data(6) as chart_data;

-- Debug query untuk cek data September 2025
SELECT 
    'DEBUG SEPTEMBER 2025' as info,
    invoice_period,
    status,
    COUNT(*) as count,
    SUM(COALESCE(amount_paid, total_due, amount)) as total_amount
FROM public.invoices 
WHERE status = 'paid'
AND (
    invoice_period = 'September 2025' OR 
    invoice_period = 'September 2025' OR
    invoice_period = '2025-09'
)
GROUP BY invoice_period, status
ORDER BY invoice_period;

-- Cek semua format periode yang ada
SELECT 
    'AVAILABLE INVOICE PERIODS' as info,
    invoice_period,
    COUNT(*) as count
FROM public.invoices 
GROUP BY invoice_period 
ORDER BY invoice_period DESC
LIMIT 20;

-- Debug status pembayaran bulan ini
SELECT 
    'STATUS PEMBAYARAN SEPTEMBER 2025' as info,
    status,
    COUNT(*) as count
FROM public.invoices 
WHERE (
    invoice_period = 'September 2025' OR 
    invoice_period = 'September 2025' OR
    invoice_period = '2025-09'
)
GROUP BY status
ORDER BY status;

-- =====================================================
-- SIMPLE DASHBOARD CHARTS FUNCTION
-- =====================================================
-- LOGIC SEDERHANA:
-- 
-- 1. PENDAPATAN:
--    - Dari invoice dengan status = 'paid'
--    - Berdasarkan invoice_period (September 2025, dll)
--    - Total semua pelanggan yang lunas periode tersebut
--
-- 2. PENGELUARAN:
--    - Dari tabel expenses berdasarkan expense_date
--    - Total pengeluaran per bulan
--
-- 3. PROFIT:
--    - Pendapatan - Pengeluaran
--    - Profit bersih per bulan
--
-- 4. STATUS PEMBAYARAN:
--    - Berdasarkan invoice_period bulan ini saja
--    - Total Lunas, Cicilan, Belum Bayar
--    - Hanya periode September 2025 (bulan berjalan)
--
-- 5. CUSTOMER GROWTH METRICS (3 Metrik sesuai saran Gemini AI):
--    - New Customers: Berdasarkan installation_date
--    - Churned Customers: Berdasarkan churn_date
--    - Net Growth: New - Churned
--    - Total Active: Kumulatif pelanggan aktif
--
-- Format periode yang didukung:
-- - "September 2025" (English)
-- - "September 2025" (Indonesia) 
-- - "2025-09" (YYYY-MM)
--
-- REQUIREMENTS:
-- - Kolom churn_date harus sudah ditambahkan ke tabel profiles
-- - ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS churn_date DATE;
-- =====================================================
