-- ========================================
-- SELINGGONET NOTIFICATION SYSTEM
-- ========================================
-- 
-- Script SQL untuk membuat sistem notifikasi lengkap dengan:
-- 1. Tabel notifications untuk menyimpan notifikasi
-- 2. Tabel notification_reads untuk tracking status baca
-- 3. Fungsi RPC untuk operasi notifikasi
-- 4. Row Level Security (RLS) policies
-- 5. Indexes untuk performa optimal
--
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy-paste seluruh script ini
-- 3. Klik "Run" untuk mengeksekusi
-- 4. Pastikan tidak ada error
--
-- AUTHOR: Selinggonet Development Team
-- VERSION: 1.1
-- DATE: 2025-01-26
-- ========================================

-- ========================================
-- CLEANUP: DROP EXISTING FUNCTIONS IF EXISTS
-- ========================================

-- Drop existing functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_user_notifications(uuid);
DROP FUNCTION IF EXISTS public.get_user_notifications();
DROP FUNCTION IF EXISTS public.add_payment_notification(text, text, text, numeric, text);

-- Tabel untuk menyimpan notifikasi
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    body text NOT NULL,
    recipient_role text, -- 'ADMIN' atau 'USER' atau NULL (untuk semua)
    recipient_user_id uuid, -- ID user spesifik atau NULL (untuk semua user dengan role tertentu)
    url text, -- URL tujuan saat notifikasi diklik
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Tabel untuk tracking notifikasi yang sudah dibaca
CREATE TABLE IF NOT EXISTS public.notification_reads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_reads_pkey PRIMARY KEY (id),
    CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE,
    CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT notification_reads_unique UNIQUE (notification_id, user_id)
);

-- ========================================
-- INDEXES UNTUK PERFORMA
-- ========================================

-- Index untuk filtering berdasarkan recipient_role
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON public.notifications(recipient_role);

-- Index untuk filtering berdasarkan recipient_user_id
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON public.notifications(recipient_user_id);

-- Index untuk sorting berdasarkan created_at (DESC untuk newest first)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Composite index untuk query yang sering digunakan (role + created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_role_created ON public.notifications(recipient_role, created_at DESC);

-- Index untuk notification_reads berdasarkan user_id
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads(user_id);

-- Index untuk notification_reads berdasarkan notification_id
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON public.notification_reads(notification_id);

-- Composite index untuk join yang sering digunakan
CREATE INDEX IF NOT EXISTS idx_notification_reads_composite ON public.notification_reads(notification_id, user_id);

-- Index untuk profiles.role (jika belum ada)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Fungsi untuk mendapatkan notifikasi user dengan status read/unread
CREATE OR REPLACE FUNCTION get_user_notifications(user_id_param uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    title text,
    body text,
    url text,
    created_at timestamp with time zone,
    is_read boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id uuid;
    current_user_role text;
BEGIN
    -- Jika user_id_param tidak diberikan, ambil dari auth.uid()
    IF user_id_param IS NULL THEN
        current_user_id := auth.uid();
    ELSE
        current_user_id := user_id_param;
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

-- Fungsi untuk menambah notifikasi pembayaran
CREATE OR REPLACE FUNCTION add_payment_notification(
    customer_name text,
    customer_idpl text,
    invoice_period text,
    amount numeric,
    admin_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id uuid;
    formatted_amount text;
BEGIN
    -- Format amount ke Rupiah
    formatted_amount := 'Rp ' || to_char(amount, 'FM999,999,999');
    
    -- Insert notifikasi untuk semua ADMIN
    INSERT INTO public.notifications (title, body, recipient_role, url)
    VALUES (
        '🔔 Pembayaran Lunas Diterima',
        'Dari ' || customer_name || ' (' || customer_idpl || ') sebesar ' || formatted_amount || ' untuk periode ' || invoice_period || '. Diproses oleh ' || admin_name || '.',
        'ADMIN',
        '/tagihan.html?status=paid'
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Enable RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLICIES UNTUK TABEL NOTIFICATIONS
-- ========================================

-- Policy untuk SELECT notifications - hanya bisa dilihat oleh user yang sesuai
CREATE POLICY "Users can view relevant notifications" ON public.notifications
    FOR SELECT USING (
        -- Notifikasi untuk semua user
        (recipient_role IS NULL AND recipient_user_id IS NULL)
        OR
        -- Notifikasi untuk role tertentu (ADMIN/USER)
        (recipient_role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
        OR
        -- Notifikasi untuk user spesifik
        (recipient_user_id = auth.uid())
    );

-- Policy untuk INSERT notifications - dengan validasi role dan ownership
CREATE POLICY "Secure notification insert" ON public.notifications
    FOR INSERT WITH CHECK (
        -- User harus authenticated
        auth.uid() IS NOT NULL
        AND
        -- Jika notifikasi untuk ADMIN, hanya ADMIN yang bisa buat
        (
            CASE 
                WHEN recipient_role = 'ADMIN' THEN 
                    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
                ELSE true
            END
        )
        AND
        -- Jika notifikasi untuk user spesifik, hanya admin atau user itu sendiri yang bisa buat
        (
            CASE 
                WHEN recipient_user_id IS NOT NULL THEN 
                    recipient_user_id = auth.uid() OR 
                    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
                ELSE true
            END
        )
    );

-- Policy untuk UPDATE notifications - hanya admin yang bisa update
CREATE POLICY "Admins can update notifications" ON public.notifications
    FOR UPDATE USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
    );

-- Policy untuk DELETE notifications - hanya admin yang bisa delete
CREATE POLICY "Admins can delete notifications" ON public.notifications
    FOR DELETE USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
    );

-- ========================================
-- POLICIES UNTUK TABEL NOTIFICATION_READS
-- ========================================

-- Policy untuk SELECT notification_reads - user hanya bisa lihat read status mereka sendiri
CREATE POLICY "Users can view their own read status" ON public.notification_reads
    FOR SELECT USING (user_id = auth.uid());

-- Policy untuk INSERT notification_reads - user hanya bisa insert read status mereka sendiri
CREATE POLICY "Users can insert their own read status" ON public.notification_reads
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy untuk UPDATE notification_reads - user hanya bisa update read status mereka sendiri
CREATE POLICY "Users can update their own read status" ON public.notification_reads
    FOR UPDATE USING (user_id = auth.uid());

-- Policy untuk DELETE notification_reads - user hanya bisa delete read status mereka sendiri
CREATE POLICY "Users can delete their own read status" ON public.notification_reads
    FOR DELETE USING (user_id = auth.uid());

-- ========================================
-- FUNCTION SECURITY
-- ========================================

-- Update fungsi get_user_notifications dengan security definer yang lebih aman
CREATE OR REPLACE FUNCTION get_user_notifications(user_id_param uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    title text,
    body text,
    url text,
    created_at timestamp with time zone,
    is_read boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update fungsi add_payment_notification dengan validasi yang lebih ketat
CREATE OR REPLACE FUNCTION add_payment_notification(
    customer_name text,
    customer_idpl text,
    invoice_period text,
    amount numeric,
    admin_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    notification_id uuid;
    formatted_amount text;
    current_user_role text;
BEGIN
    -- Validasi bahwa user yang memanggil adalah authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: User not authenticated';
    END IF;
    
    -- Validasi bahwa hanya ADMIN yang bisa membuat notifikasi pembayaran
    SELECT p.role INTO current_user_role 
    FROM public.profiles p 
    WHERE p.id = auth.uid();
    
    IF current_user_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Access denied: Only admins can create payment notifications';
    END IF;
    
    -- Validasi input parameters
    IF customer_name IS NULL OR customer_name = '' THEN
        RAISE EXCEPTION 'Customer name cannot be empty';
    END IF;
    
    IF invoice_period IS NULL OR invoice_period = '' THEN
        RAISE EXCEPTION 'Invoice period cannot be empty';
    END IF;
    
    IF amount IS NULL OR amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than 0';
    END IF;
    
    -- Format amount ke Rupiah
    formatted_amount := 'Rp ' || to_char(amount, 'FM999,999,999');
    
    -- Insert notifikasi untuk semua ADMIN
    INSERT INTO public.notifications (title, body, recipient_role, url)
    VALUES (
        '🔔 Pembayaran Lunas Diterima',
        'Dari ' || customer_name || ' (' || customer_idpl || ') sebesar ' || formatted_amount || ' untuk periode ' || invoice_period || '. Diproses oleh ' || admin_name || '.',
        'ADMIN',
        '/tagihan.html?status=paid'
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions untuk tabel notifications
GRANT SELECT ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;
GRANT DELETE ON public.notifications TO authenticated;

-- Grant permissions untuk tabel notification_reads
GRANT SELECT ON public.notification_reads TO authenticated;
GRANT INSERT ON public.notification_reads TO authenticated;
GRANT UPDATE ON public.notification_reads TO authenticated;
GRANT DELETE ON public.notification_reads TO authenticated;

-- Grant permissions untuk functions
GRANT EXECUTE ON FUNCTION get_user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION add_payment_notification TO authenticated;

-- Revoke permissions dari anon untuk security
REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.notification_reads FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_notifications FROM anon;
REVOKE EXECUTE ON FUNCTION add_payment_notification FROM anon;
