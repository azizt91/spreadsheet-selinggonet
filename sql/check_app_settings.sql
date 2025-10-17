-- Check if app_settings table exists and has data

-- Step 1: Check table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'app_settings'
) as table_exists;

-- Step 2: Check row count
SELECT COUNT(*) as row_count FROM app_settings;

-- Step 3: Check data (if exists)
SELECT 
    app_name,
    logo_url,
    qris_image_url,
    show_qris,
    created_at,
    updated_at
FROM app_settings
LIMIT 1;

-- Step 4: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'app_settings';
