import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Ambil token Fonnte dari environment variables di Supabase (fallback)
const FONNTE_TOKEN_ENV = Deno.env.get('FONNTE_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle preflight request untuk CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ambil data 'target' dan 'message' dari body request
    const { target, message } = await req.json();

    if (!target || !message) {
      throw new Error("Nomor tujuan (target) dan isi pesan (message) harus diisi.");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Try to get Fonnte token from database first
    let FONNTE_TOKEN = FONNTE_TOKEN_ENV; // Default to environment variable
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('whatsapp_settings')
      .select('setting_value')
      .eq('setting_key', 'fonnte_token')
      .single();

    // If token exists in database and not empty, use it (priority)
    if (!tokenError && tokenData?.setting_value && tokenData.setting_value.trim() !== '') {
      FONNTE_TOKEN = tokenData.setting_value.trim();
      console.log('Using Fonnte token from database');
    } else {
      console.log('Using Fonnte token from environment variables');
    }

    if (!FONNTE_TOKEN) {
      throw new Error("Token Fonnte belum diatur. Silakan atur di Pengaturan Aplikasi atau Supabase Secrets.");
    }

    // Panggil API Fonnte untuk mengirim pesan
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'target': target,
        'message': message
      })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(JSON.stringify(result));
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Gunakan status 400 untuk error dari client atau validasi
    });
  }
});