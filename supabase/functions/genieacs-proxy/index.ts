import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Secure GenieACS proxy — version SECURE_V1
//
// Old behaviour (insecure, do NOT restore): the function accepted any
// {url, method, body, auth} from the browser and fetched it, with no
// login check and with GenieACS credentials supplied by the browser.
// Anyone with the public Supabase anon key could list every device
// and change any customer's WiFi without logging in.
//
// New behaviour:
//  1. The caller must send a valid Supabase user JWT in
//     `Authorization: Bearer <access_token>`. The function verifies
//     it with supabase.auth.getUser() and rejects anonymous /
//     invalid tokens with 401.
//  2. The user's own IP is read server-side from profiles
//     (ip_static_pppoe) with the service-role key. The client is
//     never trusted for its IP.
//  3. genieacs_url / genieACS_enabled are read server-side from
//     genieacs_settings with the service-role key. The client only
//     sends the GenieACS path it wants, never the full base URL.
//  4. GenieACS credentials come ONLY from Edge Function secrets
//     GENIEACS_USERNAME / GENIEACS_PASSWORD (Supabase Dashboard >
//     Edge Functions > Secrets, or `supabase secrets set`).
//     They are never read from genieacs_settings and never sent
//     to / from the browser. Client-supplied `auth` is ignored.
//  5. Only two operations are allowed, both scoped to the caller's
//     own IP:
//       - GET  /devices?query=...  where every IP in the query
//         equals the caller's ip_static_pppoe.
//       - POST /devices/{deviceId}/tasks?timeout=...&connection_request
//         with name=setParameterValues and only the SSID or
//         KeyPassphrase parameter, and only after the server
//         verifies that deviceId belongs to the caller's IP.
//     Anything else returns 403. No arbitrary URLs, no other
//     methods, paths or parameter names are proxied.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_SSID_PATH = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID'
const ALLOWED_PASSWORD_PATH = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase'

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function collectIps(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    // Only collect values that look like IPv4 addresses.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) collectIps(v, out)
    return
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) collectIps(v, out)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server tidak dikonfigurasi (SUPABASE_URL / SERVICE_ROLE_KEY)' }, 500)
    }

    // 1. Verify the caller's JWT. Do not trust the anon key alone.
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return jsonResponse({ error: 'Login dibutuhkan' }, 401)
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) {
      return jsonResponse({ error: 'Sesi login tidak valid' }, 401)
    }

    // Server-side clients (service role bypasses RLS; never expose this key).
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 2. Caller's own IP, from the server-side profile — never from the client.
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('ip_static_pppoe')
      .eq('id', user.id)
      .single()
    const userIp = profile?.ip_static_pppoe?.trim?.() ?? ''
    if (profileError || !userIp) {
      return jsonResponse({ error: 'IP Address tidak ditemukan. Hubungi admin.' }, 403)
    }

    // 3. GenieACS base URL + enabled flag, server-side only.
    const { data: settings } = await admin
      .from('genieacs_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['genieacs_enabled', 'genieacs_url'])
    const settingsMap: Record<string, string> = {}
    for (const s of settings ?? []) settingsMap[s.setting_key] = s.setting_value ?? ''
    if (settingsMap['genieacs_enabled'] !== 'true') {
      return jsonResponse({ error: 'Fitur ganti WiFi tidak tersedia saat ini.' }, 403)
    }
    const genieacsUrl = (settingsMap['genieacs_url'] ?? '').replace(/\/$/, '')
    if (!genieacsUrl) {
      return jsonResponse({ error: 'URL GenieACS tidak dikonfigurasi' }, 500)
    }

    // 4. GenieACS credentials from Edge Function secrets only.
    //    Client-supplied `auth` in the request body is ignored on purpose.
    const acsUser = Deno.env.get('GENIEACS_USERNAME') ?? ''
    const acsPass = Deno.env.get('GENIEACS_PASSWORD') ?? ''
    if (!acsUser || !acsPass) {
      return jsonResponse({ error: 'Kredensial GenieACS belum diatur di Edge Function Secrets' }, 500)
    }
    const acsHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(acsUser + ':' + acsPass)}`,
    }

    const requestData = await req.json()
    const { url, method, body } = requestData as { url?: string; method?: string; body?: unknown }

    if (typeof url !== 'string' || !url.startsWith(genieacsUrl + '/')) {
      return jsonResponse({ error: 'URL tidak diizinkan' }, 403)
    }
    const pathAndQuery = url.slice(genieacsUrl.length) // starts with '/'

    // Helper: fetch from GenieACS with the server credentials, 10s timeout.
    const acsFetch = async (target: string, m: string, b?: unknown) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      try {
        const res = await fetch(target, {
          method: m,
          headers: acsHeaders,
          body: b !== undefined ? JSON.stringify(b) : undefined,
          signal: controller.signal,
        })
        const contentType = res.headers.get('content-type') ?? ''
        const data = contentType.includes('application/json') ? await res.json() : { success: res.ok, text: await res.text() }
        return { res, data }
      } finally {
        clearTimeout(timeoutId)
      }
    }

    // 5a. GET /devices — only for the caller's own IP.
    if (method === 'GET' && pathAndQuery.startsWith('/devices')) {
      let queryObj: unknown = null
      try {
        const u = new URL(url)
        const q = u.searchParams.get('query')
        queryObj = q ? JSON.parse(q) : null
      } catch {
        return jsonResponse({ error: 'Query tidak valid' }, 400)
      }
      const ips: string[] = []
      collectIps(queryObj, ips)
      if (ips.length === 0 || ips.some((ip) => ip !== userIp)) {
        return jsonResponse({ error: 'Hanya boleh mengakses device milik sendiri' }, 403)
      }
      try {
        const { res, data } = await acsFetch(url, 'GET')
        return jsonResponse(data, res.status)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return jsonResponse({ error: 'Request timeout after 10 seconds' }, 504)
        throw e
      }
    }

    // 5b. POST /devices/{deviceId}/tasks — only setParameterValues for
    //     SSID / KeyPassphrase, and only for the caller's own device.
    const taskMatch = pathAndQuery.match(/^\/devices\/([^/?]+)\/tasks(\?.*)?$/)
    if (method === 'POST' && taskMatch) {
      const deviceId = decodeURIComponent(taskMatch[1])
      const taskBody = body as { name?: string; parameterValues?: unknown } | null
      if (!taskBody || taskBody.name !== 'setParameterValues' || !Array.isArray(taskBody.parameterValues)) {
        return jsonResponse({ error: 'Task tidak diizinkan' }, 403)
      }
      for (const pv of taskBody.parameterValues as unknown[]) {
        if (!Array.isArray(pv) || pv.length < 2) return jsonResponse({ error: 'Parameter tidak valid' }, 400)
        const [paramPath, value] = pv as [string, unknown]
        if (paramPath === ALLOWED_SSID_PATH) {
          if (typeof value !== 'string' || value.length === 0 || value.length > 32) {
            return jsonResponse({ error: 'SSID tidak valid (maksimal 32 karakter)' }, 400)
          }
        } else if (paramPath === ALLOWED_PASSWORD_PATH) {
          if (typeof value !== 'string' || value.length < 8) {
            return jsonResponse({ error: 'Password minimal 8 karakter' }, 400)
          }
        } else {
          return jsonResponse({ error: 'Parameter tidak diizinkan' }, 403)
        }
      }

      // Verify ownership server-side: the device must belong to the caller's IP.
      const lookupQuery = encodeURIComponent(JSON.stringify({
        '$or': [
          { 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress': userIp },
          { 'VirtualParameters.pppoeIP': userIp },
        ],
      }))
      const { res: lookupRes, data: lookupData } = await acsFetch(`${genieacsUrl}/devices?query=${lookupQuery}`, 'GET')
      if (!lookupRes.ok || !Array.isArray(lookupData) || lookupData.length === 0 || lookupData[0]._id !== deviceId) {
        return jsonResponse({ error: 'Device tidak ditemukan' }, 403)
      }

      try {
        const { res, data } = await acsFetch(url, 'POST', taskBody)
        return jsonResponse(data, res.status)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return jsonResponse({ error: 'Request timeout after 10 seconds' }, 504)
        throw e
      }
    }

    return jsonResponse({ error: 'Operasi tidak diizinkan' }, 403)
  } catch (error) {
    console.error('genieacs-proxy error:', error)
    // Do not leak stack traces to the client.
    return jsonResponse({ error: (error as Error).message ?? 'Terjadi kesalahan' }, 500)
  }
})
