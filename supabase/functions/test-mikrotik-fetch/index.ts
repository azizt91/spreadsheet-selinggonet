import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MIKROTIK_API_URL = Deno.env.get('MIKROTIK_API_URL');
    const MIKROTIK_USER = Deno.env.get('MIKROTIK_API_USER');
    const MIKROTIK_PASSWORD = Deno.env.get('MIKROTIK_API_PASSWORD');

    const mikrotikUrl = `${MIKROTIK_API_URL}/tool/netwatch`;
    const authString = btoa(`${MIKROTIK_USER}:${MIKROTIK_PASSWORD}`);

    console.log('Attempting to fetch:', mikrotikUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(mikrotikUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ 
          success: false,
          error: `MikroTik returned ${response.status}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            url: mikrotikUrl,
            responseBody: errorText.substring(0, 500)
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const data = await response.json();
      const itemCount = Array.isArray(data) ? data.length : 0;

      return new Response(JSON.stringify({ 
        success: true,
        message: `Successfully fetched ${itemCount} items from MikroTik`,
        itemCount: itemCount,
        sampleItem: Array.isArray(data) && data.length > 0 ? {
          host: data[0].host,
          status: data[0].status,
          since: data[0].since
        } : null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to connect to MikroTik',
        details: {
          errorName: fetchError.name,
          errorMessage: fetchError.message,
          url: mikrotikUrl,
          possibleCauses: [
            'MikroTik URL is not accessible from Supabase servers',
            'Network firewall blocking the connection',
            'DNS resolution failed',
            'Connection timeout (15s)'
          ]
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
