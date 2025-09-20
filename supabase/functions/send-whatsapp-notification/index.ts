import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

// Ambil token Fonnte dari environment variables di Supabase
const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN');

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
     if (!FONNTE_TOKEN) {
      throw new Error("Token Fonnte belum diatur di environment variables Supabase.");
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