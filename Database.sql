--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-2.pgdg24.04+1)

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
-- Name: add_payment_notification(text, text, text, numeric, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    notification_id uuid;
    formatted_amount text;
BEGIN
    -- Format amount ke Rupiah
    formatted_amount := 'Rp ' || to_char(amount, 'FM999,999,999');

    -- Insert notifikasi untuk semua ADMIN (ikon lonceng sudah dihapus dari judul)
    INSERT INTO public.notifications (title, body, recipient_role, url)
    VALUES (
        'Pembayaran Lunas Diterima', -- <--- Ikon lonceng dihapus dari sini
        'Dari ' || customer_name || ' (' || customer_idpl || ') sebesar ' || formatted_amount || ' untuk periode ' || invoice_period || '. Diproses oleh ' || admin_name || '.',
        'ADMIN',
        '/tagihan.html?status=paid'
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;


ALTER FUNCTION public.add_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text) OWNER TO postgres;

--
-- Name: broadcast_to_all_admins(text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.broadcast_to_all_admins(notification_type text, title text, message text, data jsonb DEFAULT '{}'::jsonb, url text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    notification_id TEXT;
BEGIN
    -- Generate unique notification ID
    notification_id := gen_random_uuid()::TEXT;

    -- Insert notification untuk semua admin menggunakan struktur lama
    INSERT INTO public.notifications (
        id,
        title,
        body,
        recipient_role,
        recipient_user_id,
        url,
        type,
        data,
        created_at
    ) VALUES (
        notification_id::UUID,
        title,
        message,
        'ADMIN',  -- Kirim ke semua admin
        NULL,     -- Tidak spesifik user
        url,
        notification_type,
        data,
        NOW()
    );

    RETURN notification_id;
END;
$$;


ALTER FUNCTION public.broadcast_to_all_admins(notification_type text, title text, message text, data jsonb, url text) OWNER TO postgres;

--
-- Name: cleanup_old_notifications(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_notifications(days_to_keep integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Hanya admin yang bisa menjalankan cleanup
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Access denied: Only admins can cleanup notifications';
    END IF;

    WITH deleted AS (
        DELETE FROM public.notifications
        WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_old_notifications(days_to_keep integer) OWNER TO postgres;

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
    month_name TEXT;
    current_date_jakarta DATE;
BEGIN
    -- 1. Mengambil tanggal saat ini dengan zona waktu Jakarta (WIB)
    current_date_jakarta := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;

    -- 2. Mengambil nama bulan dalam bahasa Indonesia dari tanggal yang sudah disesuaikan
    SELECT 
        CASE EXTRACT(MONTH FROM current_date_jakarta)
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
        END
    INTO month_name;

    -- 3. Membuat periode tagihan (contoh: 'Oktober 2025')
    target_invoice_period := month_name || ' ' || EXTRACT(YEAR FROM current_date_jakarta);

    -- 4. Loop melalui pelanggan yang memenuhi syarat
    FOR customer_record IN 
        SELECT 
            prof.id as customer_id,
            pack.price as customer_price, 
            pack.id as customer_package_id
        FROM 
            public.profiles prof
        JOIN 
            public.packages pack ON prof.package_id = pack.id
        WHERE 
            prof.status = 'AKTIF' 
            AND prof.role = 'USER'
            AND prof.package_id IS NOT NULL
            -- 5. Pengecekan yang lebih tangguh (case-insensitive dan trim spasi)
            AND NOT EXISTS (
                SELECT 1 FROM public.invoices inv 
                WHERE inv.customer_id = prof.id AND LOWER(TRIM(inv.invoice_period)) = LOWER(TRIM(target_invoice_period))
            )
    LOOP
        -- Membuat invoice baru
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
            (date_trunc('month', current_date_jakarta) + interval '1 month' + interval '9 days')::date 
        );
        created_invoices_count := created_invoices_count + 1;
    END LOOP;

    -- Mengembalikan pesan hasil
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
    -- VARIABEL BARU UNTUK TANGGAL YANG BENAR --
    current_date_jakarta DATE;
BEGIN
    -- Mengambil tanggal saat ini dengan zona waktu Jakarta (WIB)
    current_date_jakarta := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;

    -- Generate data untuk 6 bulan terakhir
    FOR i IN 0..(p_months-1) LOOP
        -- Menggunakan tanggal Jakarta untuk perhitungan
        current_month_start := DATE_TRUNC('month', current_date_jakarta - INTERVAL '1 month' * i);
        
        -- Format bulan dalam bahasa Indonesia
        month_label := CASE EXTRACT(MONTH FROM current_month_start)
            WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar' WHEN 4 THEN 'Apr'
            WHEN 5 THEN 'Mei' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Agu'
            WHEN 9 THEN 'Sep' WHEN 10 THEN 'Okt' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Des'
        END || ' ' || EXTRACT(YEAR FROM current_month_start);
        
        -- PENDAPATAN
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
            invoice_period = (
                CASE EXTRACT(MONTH FROM current_month_start)
                    WHEN 1 THEN 'Januari' WHEN 2 THEN 'Februari' WHEN 3 THEN 'Maret' WHEN 4 THEN 'April'
                    WHEN 5 THEN 'Mei' WHEN 6 THEN 'Juni' WHEN 7 THEN 'Juli' WHEN 8 THEN 'Agustus'
                    WHEN 9 THEN 'September' WHEN 10 THEN 'Oktober' WHEN 11 THEN 'November' WHEN 12 THEN 'Desember'
                END || ' ' || EXTRACT(YEAR FROM current_month_start)
            )
        );
        
        -- PENGELUARAN
        SELECT COALESCE(SUM(amount), 0) INTO month_expenses
        FROM public.expenses
        WHERE DATE_TRUNC('month', expense_date) = current_month_start;
        
        -- PROFIT
        month_profit := month_revenue - month_expenses;
        
        -- METRIK PELANGGAN
        SELECT COUNT(*) INTO month_new_customers FROM public.profiles WHERE DATE_TRUNC('month', installation_date) = current_month_start AND role = 'USER';
        SELECT COUNT(*) INTO month_churned_customers FROM public.profiles WHERE DATE_TRUNC('month', churn_date) = current_month_start AND role = 'USER';
        month_net_growth := month_new_customers - month_churned_customers;
        SELECT COUNT(*) INTO month_total_active FROM public.profiles WHERE role = 'USER' AND status = 'AKTIF' AND installation_date <= (current_month_start + INTERVAL '1 month' - INTERVAL '1 day') AND (churn_date IS NULL OR churn_date > (current_month_start + INTERVAL '1 month' - INTERVAL '1 day'));
        
        -- Tambahkan ke array
        labels_data := jsonb_insert(labels_data, '{0}', to_jsonb(month_label));
        revenue_data := jsonb_insert(revenue_data, '{0}', to_jsonb(month_revenue));
        expenses_data := jsonb_insert(expenses_data, '{0}', to_jsonb(month_expenses));
        profit_data := jsonb_insert(profit_data, '{0}', to_jsonb(month_profit));
        customer_growth_data := jsonb_insert(customer_growth_data, '{0}', to_jsonb(month_new_customers));
        customer_net_data := jsonb_insert(customer_net_data, '{0}', to_jsonb(month_net_growth));
        customer_total_data := jsonb_insert(customer_total_data, '{0}', to_jsonb(month_total_active));
    END LOOP;
    
    -- STATUS PEMBAYARAN: Berdasarkan periode bulan ini (sesuai tanggal Jakarta)
    current_month_start := DATE_TRUNC('month', current_date_jakarta);
    
    current_period := CASE EXTRACT(MONTH FROM current_month_start)
        WHEN 1 THEN 'Januari' WHEN 2 THEN 'Februari' WHEN 3 THEN 'Maret' WHEN 4 THEN 'April'
        WHEN 5 THEN 'Mei' WHEN 6 THEN 'Juni' WHEN 7 THEN 'Juli' WHEN 8 THEN 'Agustus'
        WHEN 9 THEN 'September' WHEN 10 THEN 'Oktober' WHEN 11 THEN 'November' WHEN 12 THEN 'Desember'
    END || ' ' || EXTRACT(YEAR FROM current_month_start);
    
    SELECT 
        COUNT(*) FILTER (WHERE status = 'paid'),
        COUNT(*) FILTER (WHERE status = 'partially_paid'),
        COUNT(*) FILTER (WHERE status = 'unpaid')
    INTO paid_count, partially_paid_count, unpaid_count
    FROM public.invoices
    WHERE invoice_period = current_period;
    
    RETURN jsonb_build_object(
        'revenue_chart', jsonb_build_object('labels', labels_data, 'datasets', jsonb_build_array(jsonb_build_object('label', 'Pendapatan', 'data', revenue_data, 'borderColor', '#10B981', 'backgroundColor', 'rgba(16, 185, 129, 0.1)', 'tension', 0.4, 'fill', true), jsonb_build_object('label', 'Pengeluaran', 'data', expenses_data, 'borderColor', '#EF4444', 'backgroundColor', 'rgba(239, 68, 68, 0.1)', 'tension', 0.4, 'fill', true), jsonb_build_object('label', 'Profit', 'data', profit_data, 'borderColor', '#6366F1', 'backgroundColor', 'rgba(99, 102, 241, 0.1)', 'tension', 0.4, 'fill', true))),
        'payment_status_chart', jsonb_build_object('labels', jsonb_build_array('Lunas', 'Cicilan', 'Belum Bayar'), 'datasets', jsonb_build_array(jsonb_build_object('data', jsonb_build_array(paid_count, partially_paid_count, unpaid_count), 'backgroundColor', jsonb_build_array('#10B981', '#F59E0B', '#EF4444'), 'borderColor', jsonb_build_array('#059669', '#D97706', '#DC2626'), 'borderWidth', 2))),
        'customer_growth_chart', jsonb_build_object('labels', labels_data, 'datasets', jsonb_build_array(jsonb_build_object('label', 'Pelanggan Baru', 'data', customer_growth_data, 'backgroundColor', '#10B981', 'borderColor', '#059669', 'borderWidth', 2, 'borderRadius', 4), jsonb_build_object('label', 'Pelanggan Cabut', 'data', customer_net_data, 'backgroundColor', '#EF4444', 'borderColor', '#DC2626', 'borderWidth', 2, 'borderRadius', 4))),
        'customer_total_chart', jsonb_build_object('labels', labels_data, 'datasets', jsonb_build_array(jsonb_build_object('label', 'Total Pelanggan Aktif', 'data', customer_total_data, 'borderColor', '#8B5CF6', 'backgroundColor', 'rgba(139, 92, 246, 0.1)', 'tension', 0.4, 'fill', true)))
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
-- Name: get_unread_notification_count(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_unread_notification_count(user_id_param uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    unread_count INTEGER;
    current_user_role TEXT;
BEGIN
    -- Validasi authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: User not authenticated';
    END IF;

    -- Ambil role user dari tabel profiles
    SELECT p.role INTO current_user_role
    FROM public.profiles p
    WHERE p.id = user_id_param;

    -- Jika user tidak ditemukan, return 0
    IF current_user_role IS NULL THEN
        RETURN 0;
    END IF;

    -- Hitung notifikasi yang belum dibaca
    SELECT COUNT(*)
    INTO unread_count
    FROM public.notifications n
    LEFT JOIN public.notification_reads nr ON n.id = nr.notification_id AND nr.user_id = user_id_param
    WHERE
        -- Filter notifikasi yang relevan untuk user
        (
            (n.recipient_role IS NULL AND n.recipient_user_id IS NULL)
            OR
            (n.recipient_role = current_user_role AND n.recipient_user_id IS NULL)
            OR
            (n.recipient_user_id = user_id_param)
        )
        AND nr.notification_id IS NULL; -- Belum dibaca

    RETURN COALESCE(unread_count, 0);
END;
$$;


ALTER FUNCTION public.get_unread_notification_count(user_id_param uuid) OWNER TO postgres;

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
-- Name: get_user_notifications(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_notifications(user_id_param uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, title text, body text, url text, created_at timestamp with time zone, is_read boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    current_user_id uuid;
    current_user_role text;
BEGIN
    -- Validasi bahwa user yang memanggil adalah authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: User not authenticated';
    END IF;
    
    -- Jika user_id_param tidak diberikan, ambil dari auth.uid()
    IF user_id_param IS NULL THEN
        current_user_id := auth.uid();
    ELSE
        current_user_id := user_id_param;
        -- Validasi bahwa user hanya bisa mengakses notifikasi mereka sendiri
        -- kecuali jika mereka adalah ADMIN
        IF current_user_id != auth.uid() THEN
            SELECT p.role INTO current_user_role 
            FROM public.profiles p 
            WHERE p.id = auth.uid();
            
            IF current_user_role != 'ADMIN' THEN
                RAISE EXCEPTION 'Access denied: Cannot access other user notifications';
            END IF;
        END IF;
    END IF;
    
    -- Ambil role user dari tabel profiles
    SELECT p.role INTO current_user_role 
    FROM public.profiles p 
    WHERE p.id = current_user_id;
    
    -- Jika user tidak ditemukan, return empty
    IF current_user_role IS NULL THEN
        RETURN;
    END IF;
    
    -- Return notifikasi yang relevan untuk user
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.body,
        n.url,
        n.created_at,
        CASE 
            WHEN nr.id IS NOT NULL THEN true 
            ELSE false 
        END as is_read
    FROM public.notifications n
    LEFT JOIN public.notification_reads nr ON n.id = nr.notification_id AND nr.user_id = current_user_id
    WHERE 
        -- Notifikasi untuk semua user
        (n.recipient_role IS NULL AND n.recipient_user_id IS NULL)
        OR
        -- Notifikasi untuk role tertentu
        (n.recipient_role = current_user_role AND n.recipient_user_id IS NULL)
        OR
        -- Notifikasi untuk user spesifik
        (n.recipient_user_id = current_user_id)
    ORDER BY n.created_at DESC;
END;
$$;


ALTER FUNCTION public.get_user_notifications(user_id_param uuid) OWNER TO postgres;

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
-- Name: log_admin_activity(uuid, text, text, jsonb, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_admin_activity(admin_id uuid, action text, description text, additional_data jsonb DEFAULT '{}'::jsonb, activity_timestamp timestamp with time zone DEFAULT now()) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Validasi bahwa user yang memanggil adalah authenticated admin
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: User not authenticated';
    END IF;

    -- Validasi bahwa admin_id sesuai dengan user yang login atau user adalah admin
    IF admin_id != auth.uid() THEN
        DECLARE
            current_user_role TEXT;
        BEGIN
            SELECT p.role INTO current_user_role
            FROM public.profiles p
            WHERE p.id = auth.uid();

            IF current_user_role != 'ADMIN' THEN
                RAISE EXCEPTION 'Access denied: Cannot log activity for other users';
            END IF;
        END;
    END IF;

    INSERT INTO public.admin_activity_log (
        admin_id,
        action,
        description,
        additional_data,
        timestamp
    ) VALUES (
        admin_id,
        action,
        description,
        additional_data,
        activity_timestamp
    );
END;
$$;


ALTER FUNCTION public.log_admin_activity(admin_id uuid, action text, description text, additional_data jsonb, activity_timestamp timestamp with time zone) OWNER TO postgres;

--
-- Name: mark_notification_read(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_notification_read(notification_id_param uuid, user_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Validasi authentication
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    -- Validasi bahwa user hanya bisa mark notifikasi mereka sendiri
    IF user_id_param != auth.uid() THEN
        DECLARE
            current_user_role TEXT;
        BEGIN
            SELECT p.role INTO current_user_role
            FROM public.profiles p
            WHERE p.id = auth.uid();

            IF current_user_role != 'ADMIN' THEN
                RETURN false;
            END IF;
        END;
    END IF;

    INSERT INTO public.notification_reads (notification_id, user_id, read_at)
    VALUES (notification_id_param, user_id_param, NOW())
    ON CONFLICT (notification_id, user_id) DO NOTHING;

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;


ALTER FUNCTION public.mark_notification_read(notification_id_param uuid, user_id_param uuid) OWNER TO postgres;

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

--
-- Name: send_admin_login_notification(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.send_admin_login_notification(admin_name text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    notification_id TEXT;
    notification_data JSONB;
BEGIN
    -- Prepare notification data
    notification_data := jsonb_build_object(
        'admin_name', admin_name,
        'login_time', NOW()
    );

    -- Broadcast ke semua admin
    notification_id := broadcast_to_all_admins(
        'admin_login',
        '🔐 Admin Login',
        admin_name || ' telah login ke sistem.',
        notification_data,
        '/dashboard.html'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Admin login notification sent successfully',
        'notification_id', notification_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION public.send_admin_login_notification(admin_name text) OWNER TO postgres;

--
-- Name: send_customer_added_notification(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.send_customer_added_notification(admin_name text, customer_name text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    notification_id TEXT;
    notification_data JSONB;
BEGIN
    -- Prepare notification data
    notification_data := jsonb_build_object(
        'admin_name', admin_name,
        'customer_name', customer_name
    );

    -- Broadcast ke semua admin
    notification_id := broadcast_to_all_admins(
        'customer_added',
        '👥 Pelanggan Baru Ditambahkan',
        admin_name || ' telah menambahkan pelanggan baru: ' || customer_name || '.',
        notification_data,
        '/pelanggan.html'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Customer added notification sent successfully',
        'notification_id', notification_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION public.send_customer_added_notification(admin_name text, customer_name text) OWNER TO postgres;

--
-- Name: send_invoice_creation_notification(text, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.send_invoice_creation_notification(admin_name text, invoice_count integer, period text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    notification_id TEXT;
    notification_data JSONB;
BEGIN
    -- Prepare notification data
    notification_data := jsonb_build_object(
        'admin_name', admin_name,
        'invoice_count', invoice_count,
        'period', period
    );

    -- Broadcast ke semua admin
    notification_id := broadcast_to_all_admins(
        'invoice_created',
        '📄 Tagihan Bulanan Dibuat',
        admin_name || ' telah membuat ' || invoice_count || ' tagihan untuk periode ' || period || '.',
        notification_data,
        '/tagihan.html'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Invoice creation notification sent successfully',
        'notification_id', notification_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION public.send_invoice_creation_notification(admin_name text, invoice_count integer, period text) OWNER TO postgres;

--
-- Name: send_payment_notification(text, text, text, numeric, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.send_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text, customer_id uuid DEFAULT NULL::uuid, invoice_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    notification_id TEXT;
    formatted_amount TEXT;
    notification_data JSONB;
BEGIN
    -- Validasi input
    IF customer_name IS NULL OR customer_name = '' THEN
        RETURN '{"success": false, "message": "Customer name cannot be empty"}'::JSONB;
    END IF;

    IF amount IS NULL OR amount <= 0 THEN
        RETURN '{"success": false, "message": "Amount must be greater than 0"}'::JSONB;
    END IF;

    -- Format amount ke Rupiah
    formatted_amount := 'Rp ' || to_char(amount, 'FM999,999,999');

    -- Prepare notification data
    notification_data := jsonb_build_object(
        'customer_name', customer_name,
        'customer_idpl', customer_idpl,
        'invoice_period', invoice_period,
        'amount', amount,
        'admin_name', admin_name,
        'customer_id', customer_id,
        'invoice_id', invoice_id
    );

    -- Broadcast ke semua admin
    notification_id := broadcast_to_all_admins(
        'payment_processed',
        '💰 Pembayaran Lunas Diterima',
        'Dari ' || customer_name || ' (' || customer_idpl || ') sebesar ' || formatted_amount || ' untuk periode ' || invoice_period || '. Diproses oleh ' || admin_name || '.',
        notification_data,
        '/tagihan.html?status=paid'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment notification sent successfully',
        'notification_id', notification_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION public.send_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text, customer_id uuid, invoice_id uuid) OWNER TO postgres;

--
-- Name: update_genieacs_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_genieacs_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_genieacs_settings_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: update_whatsapp_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_whatsapp_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_whatsapp_settings_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    app_name text DEFAULT 'Selinggonet'::text NOT NULL,
    app_short_name text DEFAULT 'Selinggonet'::text NOT NULL,
    app_description text DEFAULT 'Sistem manajemen pelanggan ISP'::text,
    app_tagline text DEFAULT 'Kelola pelanggan dengan mudah'::text,
    logo_url text DEFAULT 'assets/logo_192x192.png'::text NOT NULL,
    favicon_url text DEFAULT 'assets/logo_192x192.png'::text NOT NULL,
    icon_192_url text DEFAULT 'assets/logo_192x192.png'::text,
    icon_512_url text DEFAULT 'assets/logo_512x512.png'::text,
    whatsapp_number text DEFAULT '6281914170701'::text,
    support_email text DEFAULT 'support@selinggonet.com'::text,
    office_address text DEFAULT ''::text,
    offline_payment_name text DEFAULT 'Bapak Karsadi dan Ibu Sopiyah'::text,
    offline_payment_address text DEFAULT 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih'::text,
    qris_image_url text DEFAULT 'assets/qris.jpeg'::text,
    show_qris boolean DEFAULT true,
    theme_color text DEFAULT '#6a5acd'::text,
    background_color text DEFAULT '#f8f9fe'::text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.app_settings OWNER TO postgres;

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
-- Name: genieacs_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.genieacs_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text,
    is_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.genieacs_settings OWNER TO postgres;

--
-- Name: TABLE genieacs_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.genieacs_settings IS 'GenieACS configuration settings';


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
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notification_reads OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    recipient_role text,
    recipient_user_id uuid,
    url text,
    created_at timestamp with time zone DEFAULT now(),
    type text,
    data jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

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
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    account_holder text NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payment_methods OWNER TO postgres;

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
    package_id integer,
    latitude numeric,
    longitude numeric
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: COLUMN profiles.latitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.latitude IS 'Koordinat latitude lokasi pelanggan (opsional)';


--
-- Name: COLUMN profiles.longitude; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.longitude IS 'Koordinat longitude lokasi pelanggan (opsional)';


--
-- Name: whatsapp_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_settings OWNER TO postgres;

--
-- Name: TABLE whatsapp_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.whatsapp_settings IS 'Stores WhatsApp notification templates and settings';


--
-- Name: COLUMN whatsapp_settings.setting_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_settings.setting_key IS 'Unique key for the setting';


--
-- Name: COLUMN whatsapp_settings.setting_value; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_settings.setting_value IS 'Template or setting value';


--
-- Name: COLUMN whatsapp_settings.is_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.whatsapp_settings.is_enabled IS 'Whether this setting/template is enabled';


--
-- Name: wifi_change_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wifi_change_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    ip_address text NOT NULL,
    old_ssid text,
    new_ssid text,
    changed_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    error_message text
);


ALTER TABLE public.wifi_change_logs OWNER TO postgres;

--
-- Name: TABLE wifi_change_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.wifi_change_logs IS 'History of WiFi SSID/Password changes';


--
-- Name: COLUMN wifi_change_logs.ip_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.wifi_change_logs.ip_address IS 'Device IP address from profiles.ip_static_pppoe';


--
-- Name: packages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packages ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: genieacs_settings genieacs_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genieacs_settings
    ADD CONSTRAINT genieacs_settings_pkey PRIMARY KEY (id);


--
-- Name: genieacs_settings genieacs_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.genieacs_settings
    ADD CONSTRAINT genieacs_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_unique UNIQUE (notification_id, user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


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
-- Name: whatsapp_settings whatsapp_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_settings
    ADD CONSTRAINT whatsapp_settings_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_settings whatsapp_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_settings
    ADD CONSTRAINT whatsapp_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: wifi_change_logs wifi_change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wifi_change_logs
    ADD CONSTRAINT wifi_change_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_app_settings_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_app_settings_updated_at ON public.app_settings USING btree (updated_at DESC);


--
-- Name: idx_notification_reads_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_reads_composite ON public.notification_reads USING btree (notification_id, user_id);


--
-- Name: idx_notification_reads_notification_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_reads_notification_id ON public.notification_reads USING btree (notification_id);


--
-- Name: idx_notification_reads_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notification_reads_user_id ON public.notification_reads USING btree (user_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_recipient_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient_role ON public.notifications USING btree (recipient_role);


--
-- Name: idx_notifications_recipient_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_recipient_user_id ON public.notifications USING btree (recipient_user_id);


--
-- Name: idx_notifications_role_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_role_created ON public.notifications USING btree (recipient_role, created_at DESC);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_payment_methods_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_methods_active ON public.payment_methods USING btree (is_active, sort_order);


--
-- Name: idx_payment_methods_sort; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payment_methods_sort ON public.payment_methods USING btree (sort_order);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: genieacs_settings genieacs_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER genieacs_settings_updated_at BEFORE UPDATE ON public.genieacs_settings FOR EACH ROW EXECUTE FUNCTION public.update_genieacs_settings_updated_at();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: whatsapp_settings whatsapp_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER whatsapp_settings_updated_at BEFORE UPDATE ON public.whatsapp_settings FOR EACH ROW EXECUTE FUNCTION public.update_whatsapp_settings_updated_at();


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
-- Name: notification_reads notification_reads_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


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
-- Name: wifi_change_logs wifi_change_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wifi_change_logs
    ADD CONSTRAINT wifi_change_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


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
-- Name: notifications Admins can delete notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text));


--
-- Name: notifications Admins can update notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update notifications" ON public.notifications FOR UPDATE USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text));


--
-- Name: wifi_change_logs Admins can view all WiFi change logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all WiFi change logs" ON public.wifi_change_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: whatsapp_settings Allow authenticated users to read whatsapp_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to read whatsapp_settings" ON public.whatsapp_settings FOR SELECT TO authenticated USING (true);


--
-- Name: whatsapp_settings Allow authenticated users to update whatsapp_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to update whatsapp_settings" ON public.whatsapp_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: payment_methods Anyone can read active payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read active payment methods" ON public.payment_methods FOR SELECT USING ((is_active = true));


--
-- Name: app_settings Anyone can read app settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);


--
-- Name: payment_methods Authenticated users can delete payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can delete payment methods" ON public.payment_methods FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: app_settings Authenticated users can insert app settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert app settings" ON public.app_settings FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: payment_methods Authenticated users can insert payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert payment methods" ON public.payment_methods FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: payment_methods Authenticated users can read all payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read all payment methods" ON public.payment_methods FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: app_settings Authenticated users can update app settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can update app settings" ON public.app_settings FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: payment_methods Authenticated users can update payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can update payment methods" ON public.payment_methods FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: packages Hanya admin yang bisa memodifikasi paket; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Hanya admin yang bisa memodifikasi paket" ON public.packages USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text)) WITH CHECK ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'ADMIN'::text));


--
-- Name: profiles Pengguna bisa membuat profil sendiri saat registrasi; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pengguna bisa membuat profil sendiri saat registrasi" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


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
-- Name: notifications Secure notification insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Secure notification insert" ON public.notifications FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND
CASE
    WHEN (recipient_role = 'ADMIN'::text) THEN (( SELECT profiles.role
       FROM public.profiles
      WHERE (profiles.id = auth.uid())) = 'ADMIN'::text)
    ELSE true
END AND
CASE
    WHEN (recipient_user_id IS NOT NULL) THEN ((recipient_user_id = auth.uid()) OR (( SELECT profiles.role
       FROM public.profiles
      WHERE (profiles.id = auth.uid())) = 'ADMIN'::text))
    ELSE true
END));


--
-- Name: packages Semua pengguna bisa melihat daftar paket; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Semua pengguna bisa melihat daftar paket" ON public.packages FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: notification_reads Users can delete their own read status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own read status" ON public.notification_reads FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: wifi_change_logs Users can insert their own WiFi change logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own WiFi change logs" ON public.wifi_change_logs FOR INSERT TO authenticated WITH CHECK ((customer_id = auth.uid()));


--
-- Name: notification_reads Users can insert their own read status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own read status" ON public.notification_reads FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: notification_reads Users can update their own read status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own read status" ON public.notification_reads FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: notifications Users can view relevant notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view relevant notifications" ON public.notifications FOR SELECT USING ((((recipient_role IS NULL) AND (recipient_user_id IS NULL)) OR (recipient_role = ( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (recipient_user_id = auth.uid())));


--
-- Name: wifi_change_logs Users can view their own WiFi change logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own WiFi change logs" ON public.wifi_change_logs FOR SELECT TO authenticated USING ((customer_id = auth.uid()));


--
-- Name: notification_reads Users can view their own read status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own read status" ON public.notification_reads FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: genieacs_settings allow_all_for_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY allow_all_for_authenticated ON public.genieacs_settings TO authenticated USING (true) WITH CHECK (true);


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: genieacs_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.genieacs_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_reads; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: packages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_methods; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: wifi_change_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.wifi_change_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION add_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text) TO authenticated;
GRANT ALL ON FUNCTION public.add_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text) TO service_role;


--
-- Name: FUNCTION broadcast_to_all_admins(notification_type text, title text, message text, data jsonb, url text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.broadcast_to_all_admins(notification_type text, title text, message text, data jsonb, url text) TO authenticated;
GRANT ALL ON FUNCTION public.broadcast_to_all_admins(notification_type text, title text, message text, data jsonb, url text) TO service_role;


--
-- Name: FUNCTION cleanup_old_notifications(days_to_keep integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_notifications(days_to_keep integer) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_notifications(days_to_keep integer) TO service_role;


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
-- Name: FUNCTION get_unread_notification_count(user_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_unread_notification_count(user_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.get_unread_notification_count(user_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_unread_notification_count(user_id_param uuid) TO service_role;


--
-- Name: FUNCTION get_user_email(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_email(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_email(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_email(user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_notifications(user_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_notifications(user_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_notifications(user_id_param uuid) TO service_role;


--
-- Name: FUNCTION get_user_role(user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_role(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_role(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_role(user_id uuid) TO service_role;


--
-- Name: FUNCTION log_admin_activity(admin_id uuid, action text, description text, additional_data jsonb, activity_timestamp timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_admin_activity(admin_id uuid, action text, description text, additional_data jsonb, activity_timestamp timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.log_admin_activity(admin_id uuid, action text, description text, additional_data jsonb, activity_timestamp timestamp with time zone) TO service_role;


--
-- Name: FUNCTION mark_notification_read(notification_id_param uuid, user_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.mark_notification_read(notification_id_param uuid, user_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.mark_notification_read(notification_id_param uuid, user_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mark_notification_read(notification_id_param uuid, user_id_param uuid) TO service_role;


--
-- Name: FUNCTION process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text) TO anon;
GRANT ALL ON FUNCTION public.process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.process_installment_payment(p_invoice_id uuid, p_payment_amount numeric, p_admin_name text, p_payment_method text, p_note text) TO service_role;


--
-- Name: FUNCTION send_admin_login_notification(admin_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.send_admin_login_notification(admin_name text) TO authenticated;
GRANT ALL ON FUNCTION public.send_admin_login_notification(admin_name text) TO service_role;


--
-- Name: FUNCTION send_customer_added_notification(admin_name text, customer_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.send_customer_added_notification(admin_name text, customer_name text) TO authenticated;
GRANT ALL ON FUNCTION public.send_customer_added_notification(admin_name text, customer_name text) TO service_role;


--
-- Name: FUNCTION send_invoice_creation_notification(admin_name text, invoice_count integer, period text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.send_invoice_creation_notification(admin_name text, invoice_count integer, period text) TO authenticated;
GRANT ALL ON FUNCTION public.send_invoice_creation_notification(admin_name text, invoice_count integer, period text) TO service_role;


--
-- Name: FUNCTION send_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text, customer_id uuid, invoice_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.send_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text, customer_id uuid, invoice_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.send_payment_notification(customer_name text, customer_idpl text, invoice_period text, amount numeric, admin_name text, customer_id uuid, invoice_id uuid) TO service_role;


--
-- Name: FUNCTION update_genieacs_settings_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_genieacs_settings_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_genieacs_settings_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_genieacs_settings_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION update_whatsapp_settings_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_whatsapp_settings_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_whatsapp_settings_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_whatsapp_settings_updated_at() TO service_role;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.app_settings TO anon;
GRANT ALL ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;


--
-- Name: TABLE expenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.expenses TO anon;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.expenses TO service_role;


--
-- Name: TABLE genieacs_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.genieacs_settings TO anon;
GRANT ALL ON TABLE public.genieacs_settings TO authenticated;
GRANT ALL ON TABLE public.genieacs_settings TO service_role;


--
-- Name: TABLE invoices; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invoices TO anon;
GRANT ALL ON TABLE public.invoices TO authenticated;
GRANT ALL ON TABLE public.invoices TO service_role;


--
-- Name: TABLE notification_reads; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_reads TO authenticated;
GRANT ALL ON TABLE public.notification_reads TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


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
-- Name: TABLE payment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payment_methods TO anon;
GRANT ALL ON TABLE public.payment_methods TO authenticated;
GRANT ALL ON TABLE public.payment_methods TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE whatsapp_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.whatsapp_settings TO anon;
GRANT ALL ON TABLE public.whatsapp_settings TO authenticated;
GRANT ALL ON TABLE public.whatsapp_settings TO service_role;


--
-- Name: TABLE wifi_change_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.wifi_change_logs TO anon;
GRANT ALL ON TABLE public.wifi_change_logs TO authenticated;
GRANT ALL ON TABLE public.wifi_change_logs TO service_role;


--
-- PostgreSQL database dump complete
--



