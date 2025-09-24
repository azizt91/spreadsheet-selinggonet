--
-- PostgreSQL database dump
--
-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: customer_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.customer_status AS ENUM (
    'AKTIF',
    'NONAKTIF'
);


ALTER TYPE public.customer_status OWNER TO postgres;

--
-- Name: invoice_payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_payment_status AS ENUM (
    'unpaid',
    'partially_paid',
    'paid',
    'overdue'
);


ALTER TYPE public.invoice_payment_status OWNER TO postgres;

--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_status AS ENUM (
    'unpaid',
    'paid',
    'partially_paid',
    'overdue'
);


ALTER TYPE public.invoice_status OWNER TO postgres;

--
-- Name: create_monthly_invoices_v2(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_monthly_invoices_v2() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    target_invoice_period TEXT;
    created_invoices_count INTEGER := 0;
    customer_record RECORD;
BEGIN
    -- Menentukan periode tagihan saat ini, contoh: 'September 2025'
    target_invoice_period := TO_CHAR(CURRENT_DATE, 'TMMonth YYYY');

    -- Loop hanya melalui pelanggan yang memenuhi SEMUA syarat:
    -- 1. Statusnya AKTIF dan rolenya USER.
    -- 2. SUDAH memiliki package_id yang terisi (tidak NULL).
    -- 3. BELUM memiliki tagihan untuk periode saat ini.
    FOR customer_record IN 
        SELECT 
            prof.id as customer_id,
            pack.price as customer_price, 
            pack.id as customer_package_id
        FROM 
            public.profiles prof
        -- Menggunakan JOIN biasa karena kita hanya mau proses yang PASTI punya paket
        JOIN 
            public.packages pack ON prof.package_id = pack.id
        WHERE 
            prof.status = 'AKTIF' 
            AND prof.role = 'USER'
            AND prof.package_id IS NOT NULL
            AND NOT EXISTS (
                SELECT 1 FROM public.invoices inv 
                WHERE inv.customer_id = prof.id AND inv.invoice_period = target_invoice_period
            )
    LOOP
        -- Membuat invoice baru dengan harga yang pasti benar dari paket pelanggan
        INSERT INTO public.invoices (
            customer_id, 
            package_id, 
            invoice_period, 
            amount, 
            total_due, 
            status, 
            due_date
        ) VALUES (
            customer_record.customer_id,
            customer_record.customer_package_id,
            target_invoice_period,
            customer_record.customer_price,
            customer_record.customer_price,
            'unpaid',
            -- Jatuh tempo diatur tanggal 10 bulan berikutnya
            (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '9 days')::date 
        );
        created_invoices_count := created_invoices_count + 1;
    END LOOP;

    -- Mengembalikan pesan hasil berdasarkan jumlah tagihan yang dibuat
    IF created_invoices_count > 0 THEN
        RETURN jsonb_build_object(
            'status', 'success',
            'message', 'Berhasil membuat ' || created_invoices_count || ' tagihan baru untuk periode ' || target_invoice_period
        );
    ELSE
        RETURN jsonb_build_object(
            'status', 'info',
            'message', 'Tidak ada tagihan baru yang dibuat. Semua pelanggan aktif sudah memiliki tagihan untuk periode ini.'
        );
    END IF;

EXCEPTION
    -- Menangkap error jika terjadi masalah saat eksekusi
    WHEN OTHERS THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Error: ' || SQLERRM);
END;
$$;


ALTER FUNCTION public.create_monthly_invoices_v2() OWNER TO postgres;

--
-- Name: get_all_customers(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_all_customers(p_filter text DEFAULT 'all'::text, p_search_term text DEFAULT ''::text) RETURNS TABLE(id uuid, idpl text, full_name text, address text, gender text, whatsapp_number text, role text, photo_url text, status public.customer_status, installation_date date, device_type text, ip_static_pppoe text, created_at timestamp with time zone, churn_date date)
    LANGUAGE plpgsql SECURITY DEFINER
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
        p.created_at,
        p.churn_date -- Dan di sini
    FROM public.profiles p
    WHERE 
        p.role = 'USER'
        AND (
            p_filter = 'all' OR
            (p_filter = 'active' AND p.status = 'AKTIF'::customer_status) OR
            (p_filter = 'inactive' AND p.status = 'NONAKTIF'::customer_status)
        )
        AND (
            p_search_term = '' OR
            LOWER(p.full_name) LIKE LOWER('%' || p_search_term || '%') OR
            LOWER(p.idpl) LIKE LOWER('%' || p_search_term || '%') OR
            LOWER(p.whatsapp_number) LIKE LOWER('%' || p_search_term || '%') OR
            LOWER(p.address) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        CASE WHEN p.status = 'AKTIF'::customer_status THEN 0 ELSE 1 END,
        p.full_name ASC;
END;
$$;


ALTER FUNCTION public.get_all_customers(p_filter text, p_search_term text) OWNER TO postgres;

--
-- Name: get_dashboard_charts_data(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_dashboard_charts_data(p_months integer DEFAULT 6) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_dashboard_charts_data(p_months integer) OWNER TO postgres;

--
-- Name: get_dashboard_charts_data_alt(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_dashboard_charts_data_alt(p_months integer DEFAULT 6) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    revenue_data JSONB := '[]'::jsonb;
    expenses_data JSONB := '[]'::jsonb;
    profit_data JSONB := '[]'::jsonb;
    labels_data JSONB := '[]'::jsonb;
    payment_status_data JSONB;
    customer_growth_data JSONB := '[]'::jsonb;
    current_month_start DATE;
    month_revenue NUMERIC;
    month_expenses NUMERIC;
    month_profit NUMERIC;
    month_label TEXT;
    month_customers INTEGER;
    paid_count INTEGER := 0;
    partially_paid_count INTEGER := 0;
    unpaid_count INTEGER := 0;
    i INTEGER;
BEGIN
    -- Generate data untuk bulan terakhir (reverse chronological order)
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
        
        -- REVENUE: Total invoice yang DIBUAT dalam bulan ini (total_due)
        SELECT COALESCE(SUM(total_due), 0) INTO month_revenue
        FROM public.invoices
        WHERE DATE_TRUNC('month', created_at) = current_month_start;
        
        -- Jika tidak ada total_due, gunakan amount
        IF month_revenue = 0 THEN
            SELECT COALESCE(SUM(amount), 0) INTO month_revenue
            FROM public.invoices
            WHERE DATE_TRUNC('month', created_at) = current_month_start;
        END IF;
        
        -- EXPENSES: Total pengeluaran dalam bulan ini
        SELECT COALESCE(SUM(amount), 0) INTO month_expenses
        FROM public.expenses
        WHERE DATE_TRUNC('month', expense_date) = current_month_start;
        
        -- PROFIT: Revenue - Expenses
        month_profit := month_revenue - month_expenses;
        
        -- CUSTOMER GROWTH: Pelanggan baru dalam bulan ini
        SELECT COUNT(*) INTO month_customers
        FROM public.profiles
        WHERE DATE_TRUNC('month', created_at) = current_month_start
        AND role = 'USER';
        
        -- Tambahkan ke array (reverse order untuk chronological)
        labels_data := jsonb_insert(labels_data, '{0}', to_jsonb(month_label));
        revenue_data := jsonb_insert(revenue_data, '{0}', to_jsonb(month_revenue));
        expenses_data := jsonb_insert(expenses_data, '{0}', to_jsonb(month_expenses));
        profit_data := jsonb_insert(profit_data, '{0}', to_jsonb(month_profit));
        customer_growth_data := jsonb_insert(customer_growth_data, '{0}', to_jsonb(month_customers));
    END LOOP;
    
    -- PAYMENT STATUS: Invoice yang DIBUAT bulan ini
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    
    BEGIN
        SELECT 
            COUNT(*) FILTER (WHERE status::text = 'paid'),
            COUNT(*) FILTER (WHERE status::text = 'partially_paid'),
            COUNT(*) FILTER (WHERE status::text = 'unpaid')
        INTO paid_count, partially_paid_count, unpaid_count
        FROM public.invoices
        WHERE DATE_TRUNC('month', created_at) = current_month_start;
    EXCEPTION
        WHEN OTHERS THEN
            -- Fallback jika ada error dengan enum
            SELECT 
                COUNT(*) FILTER (WHERE status = 'paid'),
                COUNT(*) FILTER (WHERE status = 'partially_paid'), 
                COUNT(*) FILTER (WHERE status = 'unpaid')
            INTO paid_count, partially_paid_count, unpaid_count
            FROM public.invoices
            WHERE DATE_TRUNC('month', created_at) = current_month_start;
    END;
    
    -- Build payment status data dengan format yang benar untuk Chart.js
    payment_status_data := jsonb_build_object(
        'labels', jsonb_build_array('Lunas', 'Cicilan', 'Belum Bayar'),
        'datasets', jsonb_build_array(
            jsonb_build_object(
                'data', jsonb_build_array(paid_count, partially_paid_count, unpaid_count),
                'backgroundColor', jsonb_build_array('#10B981', '#F59E0B', '#EF4444'),
                'borderColor', jsonb_build_array('#059669', '#D97706', '#DC2626'),
                'borderWidth', 2
            )
        )
    );
    
    -- Return semua data chart
    RETURN jsonb_build_object(
        'revenue_chart', jsonb_build_object(
            'labels', labels_data,
            'datasets', jsonb_build_array(
                jsonb_build_object(
                    'label', 'Invoice Dibuat',
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
                    'label', 'Selisih',
                    'data', profit_data,
                    'borderColor', '#6366F1',
                    'backgroundColor', 'rgba(99, 102, 241, 0.1)',
                    'tension', 0.4,
                    'fill', true
                )
            )
        ),
        'payment_status_chart', payment_status_data,
        'customer_growth_chart', jsonb_build_object(
            'labels', labels_data,
            'datasets', jsonb_build_array(
                jsonb_build_object(
                    'label', 'Pelanggan Baru',
                    'data', customer_growth_data,
                    'backgroundColor', '#8B5CF6',
                    'borderColor', '#7C3AED',
                    'borderWidth', 2,
                    'borderRadius', 4
                )
            )
        ),
        'debug_info', jsonb_build_object(
            'paid_count', paid_count,
            'partially_paid_count', partially_paid_count,
            'unpaid_count', unpaid_count,
            'total_current_month', paid_count + partially_paid_count + unpaid_count,
            'logic', 'Revenue berdasarkan invoice created_at, Payment Status berdasarkan created_at bulan ini'
        )
    );
END;
$$;


ALTER FUNCTION public.get_dashboard_charts_data_alt(p_months integer) OWNER TO postgres;

--
-- Name: get_dashboard_stats(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_dashboard_stats(p_month integer DEFAULT 0, p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer) RETURNS TABLE(total_revenue numeric, total_expenses numeric, profit numeric, active_customers integer, inactive_customers integer, unpaid_invoices_count integer, paid_invoices_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
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


ALTER FUNCTION public.get_dashboard_stats(p_month integer, p_year integer) OWNER TO postgres;

--
-- Name: get_invoices_with_payment_info(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_invoices_with_payment_info(p_status text DEFAULT 'all'::text, p_customer_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, customer_id uuid, customer_name text, whatsapp_number text, invoice_period text, total_due numeric, amount_paid numeric, remaining_amount numeric, status public.invoice_status, due_date date, last_payment_date timestamp with time zone, payment_count integer, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.customer_id,
        p.full_name as customer_name,
        p.whatsapp_number,
        i.invoice_period,
        i.total_due,
        i.amount_paid,
        i.amount as remaining_amount,
        i.status,
        i.due_date,
        i.last_payment_date,
        COALESCE(jsonb_array_length(i.payment_history), 0)::INTEGER as payment_count,
        i.created_at
    FROM public.invoices i
    LEFT JOIN public.profiles p ON i.customer_id = p.id
    WHERE 
        (p_status = 'all' OR i.status::TEXT = p_status) AND
        (p_customer_id IS NULL OR i.customer_id = p_customer_id)
    ORDER BY 
        CASE 
            WHEN i.status = 'unpaid' THEN 1
            WHEN i.status = 'partially_paid' THEN 2
            WHEN i.status = 'overdue' THEN 3
            WHEN i.status = 'paid' THEN 4
        END,
        i.created_at DESC;
END;
$$;


ALTER FUNCTION public.get_invoices_with_payment_info(p_status text, p_customer_id uuid) OWNER TO postgres;

--
-- Name: get_payment_history(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_payment_history(p_invoice_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    invoice_data RECORD;
    history_result JSONB;
BEGIN
    -- Ambil data invoice dan history
    SELECT 
        id, total_due, amount_paid, amount, status, 
        payment_history, invoice_period,
        p.full_name as customer_name
    INTO invoice_data
    FROM public.invoices i
    LEFT JOIN public.profiles p ON i.customer_id = p.id
    WHERE i.id = p_invoice_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invoice tidak ditemukan'
        );
    END IF;

    -- Format hasil
    history_result := jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'invoice_id', invoice_data.id,
            'customer_name', invoice_data.customer_name,
            'invoice_period', invoice_data.invoice_period,
            'total_due', invoice_data.total_due,
            'amount_paid', invoice_data.amount_paid,
            'remaining_amount', invoice_data.amount,
            'status', invoice_data.status,
            'payment_history', COALESCE(invoice_data.payment_history, '[]'::jsonb)
        )
    );

    RETURN history_result;
END;
$$;


ALTER FUNCTION public.get_payment_history(p_invoice_id uuid) OWNER TO postgres;

--
-- Name: get_user_email(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_email(user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT email
  FROM auth.users
  WHERE id = user_id
$$;


ALTER FUNCTION public.get_user_email(user_id uuid) OWNER TO postgres;

--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_role(user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
  BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = user_id);
  END;
  $$;


ALTER FUNCTION public.get_user_role(user_id uuid) OWNER TO postgres;

--
-- Name: process_installment_payment(uuid, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text DEFAULT 'cash'::text, p_note text DEFAULT ''::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    current_invoice RECORD;
    new_amount_paid NUMERIC;
    new_remaining_amount NUMERIC;
    new_status TEXT;
    new_history_entry JSONB;
    current_history JSONB;
    result_message TEXT;
BEGIN
    -- Ambil data invoice saat ini
    SELECT 
        id, total_due, amount_paid, amount, status, payment_history,
        customer_id, invoice_period
    INTO current_invoice
    FROM public.invoices
    WHERE id = p_invoice_id;

    -- Validasi: Invoice harus ada
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invoice tidak ditemukan'
        );
    END IF;

    -- Validasi: Invoice tidak boleh sudah lunas
    IF current_invoice.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invoice sudah lunas, tidak bisa dibayar lagi'
        );
    END IF;

    -- Validasi: Amount tidak boleh 0 atau negatif
    IF p_payment_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Jumlah pembayaran harus lebih dari 0'
        );
    END IF;

    -- Validasi: Amount tidak boleh melebihi sisa tagihan
    IF p_payment_amount > current_invoice.amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Jumlah pembayaran melebihi sisa tagihan (Rp ' || 
                      TO_CHAR(current_invoice.amount, 'FM999,999,999') || ')'
        );
    END IF;

    -- Hitung nilai baru
    new_amount_paid := current_invoice.amount_paid + p_payment_amount;
    new_remaining_amount := current_invoice.total_due - new_amount_paid;
    
    -- Tentukan status baru
    IF new_remaining_amount <= 0 THEN
        new_status := 'paid';
        new_remaining_amount := 0; -- Pastikan tidak minus
        result_message := 'Pembayaran berhasil! Invoice telah LUNAS.';
    ELSE
        new_status := 'partially_paid';
        result_message := 'Pembayaran cicilan berhasil. Sisa tagihan: Rp ' || 
                         TO_CHAR(new_remaining_amount, 'FM999,999,999');
    END IF;

    -- Buat entri riwayat pembayaran baru
    new_history_entry := jsonb_build_object(
        'amount', p_payment_amount,
        'date', NOW(),
        'admin', p_admin_name,
        'method', p_payment_method,
        'note', p_note,
        'remaining_after_payment', new_remaining_amount
    );

    -- Gabungkan dengan riwayat yang sudah ada
    current_history := COALESCE(current_invoice.payment_history, '[]'::jsonb);
    current_history := current_history || new_history_entry;

    -- Update invoice di database
    UPDATE public.invoices
    SET 
        amount = new_remaining_amount,           -- Sisa tagihan
        amount_paid = new_amount_paid,           -- Total terbayar
        status = new_status::invoice_status,     -- Status baru
        payment_history = current_history,       -- Riwayat lengkap
        last_payment_date = NOW(),               -- Tanggal pembayaran terakhir
        payment_method = p_payment_method,       -- <-- PERBAIKAN DI SINI
        paid_at = CASE 
            WHEN new_status = 'paid' THEN NOW() 
            ELSE paid_at 
        END
    WHERE id = p_invoice_id;

    -- Return hasil sukses
    RETURN jsonb_build_object(
        'success', true,
        'message', result_message,
        'data', jsonb_build_object(
            'invoice_id', p_invoice_id,
            'payment_amount', p_payment_amount,
            'total_paid', new_amount_paid,
            'remaining_amount', new_remaining_amount,
            'new_status', new_status,
            'invoice_period', current_invoice.invoice_period
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION public.process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    expense_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    package_id integer,
    invoice_period text NOT NULL,
    amount numeric NOT NULL,
    status public.invoice_status DEFAULT 'unpaid'::public.invoice_status NOT NULL,
    due_date date,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    total_due numeric,
    amount_paid numeric DEFAULT 0,
    payment_history jsonb DEFAULT '[]'::jsonb,
    last_payment_date timestamp with time zone,
    payment_method text DEFAULT 'cash'::text
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: COLUMN invoices.customer_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.customer_id IS 'Merujuk ke pelanggan di tabel profiles.';


--
-- Name: COLUMN invoices.package_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.package_id IS 'Merujuk ke paket yang ditagihkan.';


--
-- Name: COLUMN invoices.invoice_period; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.invoice_period IS 'Periode tagihan, misal: "September 2025".';


--
-- Name: COLUMN invoices.paid_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.invoices.paid_at IS 'Waktu ketika tagihan dibayar.';


--
-- Name: packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.packages (
    id integer NOT NULL,
    package_name text NOT NULL,
    price numeric NOT NULL,
    speed_mbps integer,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.packages OWNER TO postgres;

--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.packages_id_seq OWNER TO postgres;

--
-- Name: packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.packages_id_seq OWNED BY public.packages.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    idpl text,
    full_name text,
    address text,
    gender text,
    whatsapp_number text,
    role text DEFAULT 'USER'::text NOT NULL,
    photo_url text,
    status public.customer_status DEFAULT 'AKTIF'::public.customer_status,
    installation_date date,
    device_type text,
    ip_static_pppoe text,
    created_at timestamp with time zone DEFAULT now(),
    churn_date date,
    package_id integer
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: packages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packages ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_idpl_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_idpl_key UNIQUE (idpl);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id);


--
-- Name: profiles Admin bisa melihat semua profil; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin bisa melihat semua profil" ON public.profiles FOR SELECT TO authenticated USING ((public.get_user_role(auth.uid()) = 'ADMIN'::text));


--
-- Name: profiles Admin bisa mengupdate semua profil; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin bisa mengupdate semua profil" ON public.profiles FOR UPDATE USING ((public.get_user_role(auth.uid()) = 'ADMIN'::text));


--
-- Name: expenses Admin memiliki akses penuh ke pengeluaran; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin memiliki akses penuh ke pengeluaran" ON public.expenses USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text)) WITH CHECK ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text));


--
-- Name: invoices Admin memiliki akses penuh ke semua tagihan; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin memiliki akses penuh ke semua tagihan" ON public.invoices USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text)) WITH CHECK ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text));


--
-- Name: packages Hanya admin yang bisa memodifikasi paket; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Hanya admin yang bisa memodifikasi paket" ON public.packages USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text)) WITH CHECK ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text));


--
-- Name: profiles Pengguna bisa mengupdate profilnya sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pengguna bisa mengupdate profilnya sendiri" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Pengguna hanya bisa melihat profil sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pengguna hanya bisa melihat profil sendiri" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: invoices Pengguna hanya bisa melihat tagihan miliknya; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pengguna hanya bisa melihat tagihan miliknya" ON public.invoices FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: invoices Pengguna hanya bisa melihat tagihan sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pengguna hanya bisa melihat tagihan sendiri" ON public.invoices FOR SELECT USING ((auth.uid() = customer_id));


--
-- Name: profiles Pengguna hanya bisa mengubah profil sendiri; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pengguna hanya bisa mengubah profil sendiri" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: packages Semua pengguna bisa melihat daftar paket; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Semua pengguna bisa melihat daftar paket" ON public.packages FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: packages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION create_monthly_invoices_v2(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_monthly_invoices_v2() TO anon;
GRANT ALL ON FUNCTION public.create_monthly_invoices_v2() TO authenticated;
GRANT ALL ON FUNCTION public.create_monthly_invoices_v2() TO service_role;


--
-- Name: FUNCTION get_all_customers(p_filter text, p_search_term text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_all_customers(p_filter text, p_search_term text) TO anon;
GRANT ALL ON FUNCTION public.get_all_customers(p_filter text, p_search_term text) TO authenticated;
GRANT ALL ON FUNCTION public.get_all_customers(p_filter text, p_search_term text) TO service_role;


--
-- Name: FUNCTION get_dashboard_charts_data(p_months integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_dashboard_charts_data(p_months integer) TO anon;
GRANT ALL ON FUNCTION public.get_dashboard_charts_data(p_months integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_dashboard_charts_data(p_months integer) TO service_role;


--
-- Name: FUNCTION get_dashboard_charts_data_alt(p_months integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_dashboard_charts_data_alt(p_months integer) TO anon;
GRANT ALL ON FUNCTION public.get_dashboard_charts_data_alt(p_months integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_dashboard_charts_data_alt(p_months integer) TO service_role;


--
-- Name: FUNCTION get_dashboard_stats(p_month integer, p_year integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_dashboard_stats(p_month integer, p_year integer) TO anon;
GRANT ALL ON FUNCTION public.get_dashboard_stats(p_month integer, p_year integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_dashboard_stats(p_month integer, p_year integer) TO service_role;


--
-- Name: FUNCTION get_invoices_with_payment_info(p_status text, p_customer_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_invoices_with_payment_info(p_status text, p_customer_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_invoices_with_payment_info(p_status text, p_customer_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_invoices_with_payment_info(p_status text, p_customer_id uuid) TO service_role;


--
-- Name: FUNCTION get_payment_history(p_invoice_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_payment_history(p_invoice_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_payment_history(p_invoice_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_payment_history(p_invoice_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_email(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_email(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_email(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_email(user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_role(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_role(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_role(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_role(user_id uuid) TO service_role;


--
-- Name: FUNCTION process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text) TO anon;
GRANT ALL ON FUNCTION public.process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text) TO service_role;


--
-- Name: TABLE expenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.expenses TO anon;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.expenses TO service_role;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO service_role;


--
-- Name: TABLE packages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.packages TO anon;
GRANT ALL ON TABLE public.packages TO authenticated;
GRANT ALL ON TABLE public.packages TO service_role;


--
-- Name: SEQUENCE packages_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.packages_id_seq TO anon;
GRANT ALL ON SEQUENCE public.packages_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.packages_id_seq TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- SAMPAI SINI RESTORNYA

-- Insert Paket
-- Tambahkan NULL untuk kolom "description" dan "created_at"
INSERT INTO "public"."packages" ("id", "package_name", "price", "speed_mbps", "description", "created_at") 
VALUES 
('1', '5 Mbps', '50000', '5', NULL, NULL), 
('2', '10 Mbps', '150000', '10', NULL, NULL), 
('3', '15 Mbps', '200000', '15', NULL, NULL), 
('4', '30 Mbps', '250000', '30', NULL, NULL), 
('5', '40 Mbps', '300000', '8', NULL, NULL); 







