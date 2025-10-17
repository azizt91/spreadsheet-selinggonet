-- ALTER TABLE script untuk menambahkan kolom offline payment
-- Run HANYA jika table app_settings sudah ada sebelumnya

-- Tambah kolom offline_payment_name
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS offline_payment_name TEXT DEFAULT 'Bapak Karsadi dan Ibu Sopiyah';

-- Tambah kolom offline_payment_address  
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS offline_payment_address TEXT DEFAULT 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih';

-- Update existing records dengan default values (jika ada)
UPDATE app_settings 
SET 
    offline_payment_name = 'Bapak Karsadi dan Ibu Sopiyah',
    offline_payment_address = 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih'
WHERE offline_payment_name IS NULL OR offline_payment_address IS NULL;

-- Verify
SELECT 
    app_name, 
    offline_payment_name, 
    offline_payment_address,
    updated_at 
FROM app_settings;
