-- Insert default app settings (if table exists but empty)
-- Run this ONLY if app_settings table exists but has no data

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
    'assets/sn-blue.png',
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
)
ON CONFLICT (id) DO NOTHING;

-- Verify insert
SELECT 
    app_name, 
    logo_url, 
    show_qris, 
    created_at 
FROM app_settings;
