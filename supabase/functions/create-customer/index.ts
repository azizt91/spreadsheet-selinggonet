import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

  interface CustomerData {
    email: string;
    password?: string;
    full_name: string;
    address: string;
    whatsapp_number: string;
    gender: string;
    status: 'AKTIF' | 'NONAKTIF';
    device_type?: string;
    ip_static_pppoe?: string;
    idpl: string;
    installation_date: string;
    package_id: number;
    amount: number;
  }

  serve(async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers":
  "authorization, x-client-info, apikey, content-type" } });
    }

    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const customerData: CustomerData = await req.json();

      if (!customerData.password) throw new Error("Password dibutuhkan.");
      if (!customerData.package_id) throw new Error("Paket harus dipilih.");

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customerData.email,
        password: customerData.password,
        email_confirm: false,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Gagal membuat pengguna di sistem otentikasi.");
      const newUserId = authData.user.id;

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          idpl: customerData.idpl,
          full_name: customerData.full_name,
          address: customerData.address,
          gender: customerData.gender,
          whatsapp_number: customerData.whatsapp_number,
          status: customerData.status,
          installation_date: customerData.installation_date,
          device_type: customerData.device_type,
          ip_static_pppoe: customerData.ip_static_pppoe,
        })
        .eq('id', newUserId);
      if (profileError) throw profileError;

      const now = new Date();
      const currentMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(now);
      const currentYear = now.getFullYear();

      const { error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .insert({
          customer_id: newUserId,
          package_id: customerData.package_id,
          // --- INI PERBAIKANNYA ---
          invoice_period: currentMonthName + ' ' + currentYear,
          // -------------------------
          amount: customerData.amount,
          status: 'unpaid'
        });
      if (invoiceError) throw invoiceError;

      return new Response(JSON.stringify({ message: "Pelanggan berhasil dibuat" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        status: 200,
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        status: 400,
      });
    }
  });