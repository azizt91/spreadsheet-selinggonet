import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData = await req.json()
    const { url, method, body, auth } = requestData
    
    console.log('Proxy request:', { url, method, hasAuth: !!auth, hasBody: !!body })
    
    const headers: any = {
      'Content-Type': 'application/json'
    }
    
    if (auth && auth.username && auth.password) {
      headers['Authorization'] = `Basic ${btoa(auth.username + ':' + auth.password)}`
    }
    
    const fetchOptions: any = {
      method: method || 'GET',
      headers: headers
    }
    
    // Only add body for POST/PUT/PATCH methods
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body)
    }
    
    console.log('Fetching:', url, fetchOptions)
    
    // Add timeout (10 seconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      let data
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        data = { success: response.ok, text: text }
      }
      
      return new Response(
        JSON.stringify(data),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Fetch error:', fetchError)
      
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Request timeout after 10 seconds' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw fetchError
    }
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})