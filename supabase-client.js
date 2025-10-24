import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'URL_PROYEK_SUPABASE_ANDA';
const supabaseKey = 'URL_API_KEY_SUPABASE_ANDA';

export const supabase = createClient(supabaseUrl, supabaseKey);
