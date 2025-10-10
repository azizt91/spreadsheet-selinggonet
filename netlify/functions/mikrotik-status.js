const fetch = require('node-fetch');
const AbortController = require('abort-controller');

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Kredensial dari environment variables Netlify
    const MIKROTIK_URL = process.env.MIKROTIK_URL || 'http://cc210c4350d7.sn.mynetname.net/rest';
    const MIKROTIK_USER = process.env.MIKROTIK_USER || 'azizt91';
    const MIKROTIK_PASSWORD = process.env.MIKROTIK_PASSWORD || 'Pmt52371';

    console.log('Attempting to connect to:', MIKROTIK_URL);

    // Basic Auth
    const auth = Buffer.from(`${MIKROTIK_USER}:${MIKROTIK_PASSWORD}`).toString('base64');
    
    // Timeout controller - 20 detik (lebih pendek untuk response cepat)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    try {
      const response = await fetch(`${MIKROTIK_URL}/tool/netwatch`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        },
        signal: controller.signal,
        compress: true
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Mikrotik error: ${response.status} ${response.statusText}`);
      }

      const netwatchData = await response.json();
    
      // Format data
      const statusByIp = {};
      if (Array.isArray(netwatchData)) {
        netwatchData.forEach(item => {
          if (item.host && item.status) {
            statusByIp[item.host] = {
              status: item.status,
              since: item.since || null,
              comment: item.comment || null
            };
          }
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(statusByIp)
      };

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle timeout atau network error
      if (fetchError.name === 'AbortError') {
        console.error('Timeout error:', fetchError);
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({ 
            error: 'Request timeout',
            details: 'Mikrotik tidak merespons dalam waktu yang ditentukan'
          })
        };
      }
      
      throw fetchError; // Re-throw untuk ditangkap outer catch
    }

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Gagal terhubung ke Mikrotik'
      })
    };
  }
};
