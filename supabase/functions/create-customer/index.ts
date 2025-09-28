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
    photo_url?: string;
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
      console.log('=== CREATE CUSTOMER FUNCTION START ===');

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const customerData: CustomerData = await req.json();
      console.log('Received customer data:', JSON.stringify(customerData, null, 2));

      // Validation
      if (!customerData.password) throw new Error("Password dibutuhkan.");
      if (!customerData.package_id) throw new Error("Paket harus dipilih.");
      if (!customerData.email) throw new Error("Email dibutuhkan.");
      if (!customerData.full_name) throw new Error("Nama lengkap dibutuhkan.");

      // Type checking
      if (typeof customerData.package_id !== 'number' || customerData.package_id <= 0) {
        throw new Error("Package ID harus berupa angka yang valid.");
      }
      if (typeof customerData.amount !== 'number' || customerData.amount <= 0) {
        throw new Error("Amount harus berupa angka yang valid.");
      }

      console.log('Validation passed, creating auth user...');

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customerData.email,
        password: customerData.password,
        email_confirm: true, // AUTO CONFIRM EMAIL
      });
      console.log('Auth user creation result:', { authData: authData?.user?.id, authError });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Gagal membuat pengguna di sistem otentikasi.");
      const newUserId = authData.user.id;

      console.log('Inserting profile for user:', newUserId);

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: newUserId, // PENTING: Set ID sama dengan user ID
          idpl: customerData.idpl,
          full_name: customerData.full_name,
          address: customerData.address,
          gender: customerData.gender,
          whatsapp_number: customerData.whatsapp_number,
          status: customerData.status,
          installation_date: customerData.installation_date,
          device_type: customerData.device_type,
          ip_static_pppoe: customerData.ip_static_pppoe,
          photo_url: customerData.photo_url,
        });
      console.log('Profile insert result:', { profileError });
      if (profileError) throw profileError;

      console.log('Creating invoice...');

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
          total_due: customerData.amount, // TAMBAHAN: total_due sama dengan amount
          status: 'unpaid'
        });
      console.log('Invoice creation result:', { invoiceError });
      if (invoiceError) throw invoiceError;

      console.log('Customer creation completed successfully');

      return new Response(JSON.stringify({ message: "Pelanggan berhasil dibuat" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        status: 200,
      });

    } catch (error) {
      console.error('Error in create-customer function:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        status: 400,
      });
    }
  });