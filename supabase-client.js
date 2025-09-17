import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://ioirrikteqrpptolbjme.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvaXJyaWt0ZXFycHB0b2xiam1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5ODY1NjksImV4cCI6MjA3MzU2MjU2OX0.UTayRKVg420zM2v2BHfVmmHMm8V1rx2cbZb1Ud_WDsw';

export const supabase = createClient(supabaseUrl, supabaseKey);
