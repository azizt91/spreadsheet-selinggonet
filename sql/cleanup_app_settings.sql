-- Cleanup app_settings table
-- PROBLEM: Multiple rows exist when there should only be 1
-- FIX: Delete all rows and insert clean default data

-- Step 1: Delete all existing rows
DELETE FROM app_settings;

-- Step 2: Insert single default row with correct paths
INSERT INTO app_settings (
    app_name,
    app_short_name,
    app_description,
    app_tagline,
    logo_url,
    favicon_url,
    icon_192_url,
    icon_512_url,
    whatsapp_number,
    support_email,
    offline_payment_name,
    offline_payment_address,
    qris_image_url,
    show_qris,
    theme_color,
    background_color
)
VALUES (
    'Selinggonet',
    'Selinggonet',
    'Sistem manajemen pelanggan ISP dengan integrasi Supabase',
    'Kelola pelanggan dengan mudah',
    'assets/sn-blue.png',              -- Fixed: Use existing file
    'assets/logo_192x192.png',
    'assets/logo_192x192.png',
    'assets/logo_512x512.png',
    '6281914170701',
    'support@selinggonet.com',
    'Bapak Karsadi dan Ibu Sopiyah',
    'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih',
    'assets/qris.jpeg',
    true,
    '#6a5acd',
    '#f8f9fe'
);

-- Step 3: Verify only 1 row exists
SELECT COUNT(*) as row_count FROM app_settings;

-- Step 4: Check the data
SELECT 
    id,
    app_name,
    logo_url,
    favicon_url,
    created_at
FROM app_settings;
