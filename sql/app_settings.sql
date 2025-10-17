-- Create app_settings table for storing global app configuration
-- Extended version with logo, contact, and PWA settings

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic App Info
    app_name TEXT NOT NULL DEFAULT 'Selinggonet',
    app_short_name TEXT NOT NULL DEFAULT 'Selinggonet',
    app_description TEXT DEFAULT 'Sistem manajemen pelanggan ISP',
    app_tagline TEXT DEFAULT 'Kelola pelanggan dengan mudah',
    
    -- Branding Assets
    logo_url TEXT NOT NULL DEFAULT 'assets/logo_192x192.png',
    favicon_url TEXT NOT NULL DEFAULT 'assets/logo_192x192.png',
    icon_192_url TEXT DEFAULT 'assets/logo_192x192.png',
    icon_512_url TEXT DEFAULT 'assets/logo_512x512.png',
    
    -- Contact Information
    whatsapp_number TEXT DEFAULT '6281914170701',
    support_email TEXT DEFAULT 'support@selinggonet.com',
    office_address TEXT DEFAULT '',
    
    -- Offline Payment Info
    offline_payment_name TEXT DEFAULT 'Bapak Karsadi dan Ibu Sopiyah',
    offline_payment_address TEXT DEFAULT 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih',
    
    -- QRIS Payment
    qris_image_url TEXT DEFAULT 'assets/qris.jpeg',
    show_qris BOOLEAN DEFAULT true,
    
    -- PWA Theme
    theme_color TEXT DEFAULT '#6a5acd',
    background_color TEXT DEFAULT '#f8f9fe',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Storage bucket setup for avatars (use existing 'avatars' bucket)
-- NOTE: Assuming 'avatars' bucket already exists in Supabase
-- If policies don't exist yet, uncomment and run these:

-- Set storage policy to allow public read
-- CREATE POLICY IF NOT EXISTS "Public read access for avatars"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'avatars');

-- Allow authenticated users to upload
-- CREATE POLICY IF NOT EXISTS "Authenticated users can upload avatars"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--     bucket_id = 'avatars' 
--     AND auth.role() = 'authenticated'
-- );

-- Allow authenticated users to update
-- CREATE POLICY IF NOT EXISTS "Authenticated users can update avatars"
-- ON storage.objects FOR UPDATE
-- USING (
--     bucket_id = 'avatars' 
--     AND auth.role() = 'authenticated'
-- );

-- Allow authenticated users to delete
-- CREATE POLICY IF NOT EXISTS "Authenticated users can delete avatars"
-- ON storage.objects FOR DELETE
-- USING (
--     bucket_id = 'avatars' 
--     AND auth.role() = 'authenticated'
-- );

-- Enable RLS for app_settings table
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read app settings
CREATE POLICY "Anyone can read app settings"
ON app_settings FOR SELECT
USING (true);

-- Policy: Only authenticated users can insert app settings
CREATE POLICY "Authenticated users can insert app settings"
ON app_settings FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can update app settings
CREATE POLICY "Authenticated users can update app settings"
ON app_settings FOR UPDATE
USING (auth.role() = 'authenticated');

-- Insert default settings
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON app_settings(updated_at DESC);
