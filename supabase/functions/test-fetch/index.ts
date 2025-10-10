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

    let fetchResult;
    let fetchError = null;
    let responseStatus = null;
    let responseText = null;

    try {
      const fetchStartTime = Date.now();
      const response = await fetch(mikrotikUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      const fetchEndTime = Date.now();

      responseStatus = response.status;
      console.log('Response status:', responseStatus);

      if (response.ok) {
        const data = await response.json();
        fetchResult = {
          success: true,
          status: responseStatus,
          dataCount: Array.isArray(data) ? data.length : 0,
          fetchTime: `${(fetchEndTime - fetchStartTime) / 1000}s`,
          sample: Array.isArray(data) ? data.slice(0, 2) : data
        };
      } else {
        responseText = await response.text();
        fetchResult = {
          success: false,
          status: responseStatus,
          statusText: response.statusText,
          responseBody: responseText.substring(0, 500)
        };
      }
    } catch (err) {
      fetchError = {
        name: err.name,
        message: err.message,
        cause: err.cause ? String(err.cause) : null
      };
      console.error('Fetch error:', fetchError);
    }

    return new Response(JSON.stringify({ 
      url: mikrotikUrl,
      fetchResult: fetchResult,
      fetchError: fetchError,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      name: error.name,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
