-- RPC Functions untuk Email dan Password Management
-- Jalankan di Supabase SQL Editor

-- 1. Tambahkan kolom email di tabel profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Function untuk mendapatkan email user
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN (
    SELECT email 
    FROM auth.users 
    WHERE id = user_id
  );
END;
$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO authenticated;
