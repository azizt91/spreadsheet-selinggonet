-- Migration: Secure GenieACS settings (2025-11-10)
--
-- Problem fixed:
--  * genieacs_settings previously had a policy
--    "allow_all_for_authenticated" (and "Authenticated users can read
--    genieacs_settings") that let EVERY logged-in customer run
--    select('*') on the whole table, including genieacs_username and
--    genieacs_password. ganti-wifi.js did exactly that.
--  * app-settings.js saved the nginx password into that same table.
--  * genieacs-proxy accepted any {url, method, body, auth} without
--    checking the caller's login or IP.
--
-- After this migration + the new genieacs-proxy (SECURE_V1):
--  * Customers can only read genieacs_enabled and genieacs_url.
--  * Only admins can read / write settings, and only for the
--    non-sensitive keys.
--  * The old genieacs_username / genieacs_password rows are deleted.
--    Credentials now live ONLY in Edge Function Secrets
--    (GENIEACS_USERNAME / GENIEACS_PASSWORD) and are used
--    server-side by genieacs-proxy. They are never stored in this
--    table and never sent to the browser.
--
-- Run this in Supabase Dashboard > SQL Editor, then deploy the new
-- genieacs-proxy and set the two secrets (see GENIEACS_SECURE_SETUP.md).

-- 1. Remove the old credential rows (if any were ever saved).
DELETE FROM public.genieacs_settings
WHERE setting_key IN ('genieacs_username', 'genieacs_password');

-- 2. Drop the old, too-permissive policies (drop if exists, so the
--    migration is safe to run even if a policy name differs).
DROP POLICY IF EXISTS "Authenticated users can read genieacs_settings" ON public.genieacs_settings;
DROP POLICY IF EXISTS "Only admins can update genieacs_settings" ON public.genieacs_settings;
DROP POLICY IF EXISTS "Only admins can insert genieacs_settings" ON public.genieacs_settings;
DROP POLICY IF EXISTS "allow_all_for_authenticated" ON public.genieacs_settings;
DROP POLICY IF EXISTS "Customers can read non-sensitive GenieACS settings" ON public.genieacs_settings;
DROP POLICY IF EXISTS "Admins can manage GenieACS settings" ON public.genieacs_settings;
DROP POLICY IF EXISTS "Admins can read all GenieACS settings" ON public.genieacs_settings;

-- 3. Customers (any authenticated user) can read ONLY the two
--    non-sensitive keys. They can never read a credential row,
--    even if one is inserted again by mistake.
CREATE POLICY "Customers can read non-sensitive GenieACS settings"
    ON public.genieacs_settings
    FOR SELECT
    TO authenticated
    USING (setting_key IN ('genieacs_enabled', 'genieacs_url'));

-- 4. Admins can read all settings (for the admin settings page).
CREATE POLICY "Admins can read all GenieACS settings"
    ON public.genieacs_settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Only admins can write settings, and only for the non-sensitive
--    keys. This blocks anyone from (re)creating a credential row
--    through the app.
CREATE POLICY "Admins can manage GenieACS settings"
    ON public.genieacs_settings
    FOR ALL
    TO authenticated
    USING (
        setting_key IN ('genieacs_enabled', 'genieacs_url')
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        setting_key IN ('genieacs_enabled', 'genieacs_url')
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
