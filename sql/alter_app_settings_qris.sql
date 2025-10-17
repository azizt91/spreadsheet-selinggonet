-- ALTER TABLE script untuk menambahkan kolom QRIS
-- Run HANYA jika table app_settings sudah ada sebelumnya

-- Tambah kolom qris_image_url
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS qris_image_url TEXT DEFAULT 'assets/qris.jpeg';

-- Tambah kolom show_qris
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS show_qris BOOLEAN DEFAULT true;

-- Update existing records dengan default values (jika ada)
UPDATE app_settings 
SET 
    qris_image_url = 'assets/qris.jpeg',
    show_qris = true
WHERE qris_image_url IS NULL OR show_qris IS NULL;

-- Verify
SELECT 
    app_name, 
    qris_image_url,
    show_qris,
    updated_at 
FROM app_settings;
