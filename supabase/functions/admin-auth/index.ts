import { corsHeaders } from '../_shared/http/cors.ts'
import { createLogger } from '../_shared/logger.ts'
import { createServiceClientFromEnv } from '../_shared/supabase/client.ts'

declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

const logger = createLogger('admin-auth')
const supabase = createServiceClientFromEnv(logger)

type CreateUserRequest = {
  email: string
  password?: string
  email_confirm?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname

  // Health check - no auth required for testing
  if (req.method === 'GET' && path === '/admin-auth/health') {
    return new Response(
      JSON.stringify({
        status: supabase ? 'ok' : 'warning',
        service: 'admin-auth',
        env: {
          supabaseUrl: !!Deno.env.get('SUPABASE_URL') || !!Deno.env.get('EDGE_SUPABASE_URL'),
          supabaseServiceKey:
            !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
            !!Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY'),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: supabase ? 200 : 206 }
    )
  }

  if (req.method === 'POST' && path === '/admin-auth/create-user') {
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Service client not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    try {
      const body = (await req.json()) as Partial<CreateUserRequest & { api_key?: string }>
      const email = body.email?.trim()
      const password = body.password || 'password'
      const email_confirm = body.email_confirm ?? true
      const api_key = body.api_key

      // Simple API key check for testing - accept service role key
      const expected_key = Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')
      if (!api_key || api_key !== expected_key) {
        return new Response(
          JSON.stringify({ error: 'invalid api_key' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'email is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm,
      })

      if (error) {
        // idempotent: if already exists, return 200 with message
        if (typeof error.message === 'string' && error.message.includes('already registered')) {
          logger.info('User already exists', { email })
          return new Response(
            JSON.stringify({ ok: true, alreadyExists: true, email }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }

        logger.error('Failed to create user', { email, error })
        return new Response(
          JSON.stringify({ error: 'create_user_failed', message: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, user: data.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      logger.error('Unhandled error in create-user', { message })
      return new Response(
        JSON.stringify({ error: 'unexpected_error', message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 404,
  })
})

/* Local usage:

1) supabase start
2) yarn dlx supabase functions serve admin-auth --env-file .env
3) curl -X POST http://127.0.0.1:54321/functions/v1/admin-auth/create-user \
   -H "Content-Type: application/json" \
   -d '{"email":"test@example.com","password":"password","api_key":"sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"}'
*/


