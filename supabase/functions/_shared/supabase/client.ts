// @ts-ignore - JSR import for Deno runtime
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Type declaration for Deno global in Edge Functions environment
declare const Deno: {
  env: { get(key: string): string | undefined }
}

// Create Supabase service client from environment variables
export function createServiceClientFromEnv(logger?: {
  info: (msg: string, data?: any) => void
  error: (msg: string, data?: any) => void
}): any {
  // Initialize Supabase client with service role
  // Note: supabase functions serve ignores SUPABASE_* names from --env-file.
  // Provide EDGE_* fallbacks for local dev.
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('EDGE_SUPABASE_URL')
  const supabaseServiceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    logger?.error('Missing required environment variables for Supabase client', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })
  }

  // Create client only if environment variables are available
  const supabase =
    supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

  logger?.info('Supabase client initialized', {
    hasSupabaseClient: !!supabase,
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
  })

  if (!supabase) {
    logger?.error('Supabase client not available')
  }

  return supabase
}
