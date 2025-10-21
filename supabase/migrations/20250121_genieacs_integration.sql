-- Migration: GenieACS Integration
-- Create tables for GenieACS settings
-- Note: IP Address diambil dari profiles.ip_static_pppoe (kolom sudah ada)

-- Create genieacs_settings table
CREATE TABLE IF NOT EXISTS public.genieacs_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default GenieACS settings
INSERT INTO public.genieacs_settings (setting_key, setting_value, is_enabled) VALUES
(
    'genieacs_enabled',
    'false',
    false
),
(
    'genieacs_url',
    'http://acs.bayardong.my.id',
    true
),
(
    'genieacs_username',
    '',
    true
),
(
    'genieacs_password',
    '',
    true
)
ON CONFLICT (setting_key) DO NOTHING;

-- Create wifi_change_logs table (history perubahan WiFi)
CREATE TABLE IF NOT EXISTS public.wifi_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    old_ssid TEXT,
    new_ssid TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    error_message TEXT
);

-- Enable RLS
ALTER TABLE public.genieacs_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wifi_change_logs ENABLE ROW LEVEL SECURITY;

-- Policies for genieacs_settings
CREATE POLICY "Authenticated users can read genieacs_settings"
    ON public.genieacs_settings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can update genieacs_settings"
    ON public.genieacs_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can insert genieacs_settings"
    ON public.genieacs_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policies for wifi_change_logs
CREATE POLICY "Users can view their own WiFi change logs"
    ON public.wifi_change_logs
    FOR SELECT
    TO authenticated
    USING (customer_id = auth.uid());

CREATE POLICY "Users can insert their own WiFi change logs"
    ON public.wifi_change_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can view all WiFi change logs"
    ON public.wifi_change_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all WiFi change logs"
    ON public.wifi_change_logs
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_genieacs_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS genieacs_settings_updated_at ON public.genieacs_settings;
CREATE TRIGGER genieacs_settings_updated_at
    BEFORE UPDATE ON public.genieacs_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_genieacs_settings_updated_at();

-- Grant permissions
GRANT SELECT ON public.genieacs_settings TO authenticated;
GRANT SELECT, INSERT ON public.wifi_change_logs TO authenticated;

-- Comments
COMMENT ON TABLE public.genieacs_settings IS 'GenieACS configuration settings';
COMMENT ON TABLE public.wifi_change_logs IS 'History of WiFi SSID/Password changes';
COMMENT ON COLUMN public.wifi_change_logs.ip_address IS 'Device IP address from profiles.ip_static_pppoe';
