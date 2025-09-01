// Simple Edge Function without framework
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname

  try {
    // Route: GET /hello-world - Default route
    if (req.method === 'GET' && path === '/hello-world') {
      return new Response(
        JSON.stringify({
          message: 'Hello World Edge Function',
          endpoints: {
            health: 'GET /hello-world/health',
            hello: 'POST /hello-world/hello',
            profiles: 'GET /hello-world/profiles',
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Route: GET /hello-world/health - Health check
    if (req.method === 'GET' && path === '/hello-world/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'hello-world-function',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Route: POST /hello-world/hello - Hello endpoint
    if (req.method === 'POST' && path === '/hello-world/hello') {
      const { name } = await req.json()

      if (!name) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      return new Response(
        JSON.stringify({
          message: `Hello ${name}!`,
          timestamp: new Date().toISOString(),
          function: 'hello-world',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Route: GET /hello-world/profiles - Get profiles from database
    if (req.method === 'GET' && path === '/hello-world/profiles') {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, created_at')
        .limit(10)

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }

      return new Response(
        JSON.stringify({
          profiles,
          count: profiles?.length || 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // 404 for unmatched routes
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Run `supabase functions serve hello-world` (serve the function)
  3. Make HTTP requests:

  # Main endpoint
  curl http://127.0.0.1:54321/functions/v1/hello-world

  # Health check
  curl http://127.0.0.1:54321/functions/v1/hello-world/health

  # Hello endpoint
  curl -X POST http://127.0.0.1:54321/functions/v1/hello-world/hello \
    -H "Content-Type: application/json" \
    -d '{"name":"World"}'

  # Profiles endpoint
  curl http://127.0.0.1:54321/functions/v1/hello-world/profiles

*/
