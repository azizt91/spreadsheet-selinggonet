// supabase/functions/update-user-auth/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Menangani preflight request untuk CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, update_data } = await req.json();

    if (!user_id || !update_data) {
      throw new Error("User ID and update data are required.");
    }

    // Buat Admin Client Supabase yang memiliki hak akses penuh
    // Pastikan Anda sudah mengatur SUPABASE_SERVICE_ROLE_KEY di .env
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Panggil fungsi admin untuk mengupdate user
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      {
        email: update_data.email, // Akan diabaikan jika null
        password: update_data.password, // Akan diabaikan jika null
        email_confirm: true, // AUTO CONFIRM jika email berubah
        // Anda juga bisa mengupdate data lain di sini jika perlu
      }
    );

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, message: "User updated successfully.", data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
