Fungsi Notifikasi Seperti ini

-- Menghapus fungsi lama terlebih dahulu untuk memastikan pembaruan bersih
DROP FUNCTION IF EXISTS get_user_notifications(uuid);

-- Membuat ulang fungsi dengan logika query yang diubah total menggunakan JOIN untuk menghilangkan ambiguitas
CREATE OR REPLACE FUNCTION get_user_notifications(p_user_id uuid)
RETURNS TABLE (
    notification_id bigint,
    notification_created_at timestamptz,
    notification_title text,
    notification_body text,
    notification_url text,
    is_read boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id AS notification_id,
        n.created_at AS notification_created_at,
        n.title AS notification_title,
        n.body AS notification_body,
        n.url AS notification_url,
        EXISTS (
            SELECT 1
            FROM public.notification_reads rs
            WHERE rs.notification_id = n.id AND rs.user_id = p_user_id
        ) AS is_read
    FROM
        public.notifications AS n
    -- PERUBAHAN UTAMA: Menggunakan JOIN untuk mendapatkan role pengguna saat ini
    JOIN
        public.profiles AS p ON p.id = p_user_id
    WHERE
        -- Kondisi 1: Notifikasi ditujukan langsung ke user ini
        n.recipient_user_id = p_user_id
        -- Kondisi 2: Notifikasi ditujukan untuk peran yang dimiliki user ini
        OR n.recipient_role = p.role
    ORDER BY
        n.created_at DESC
    LIMIT 50;
END;
$$;