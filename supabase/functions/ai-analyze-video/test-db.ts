// Simple test function to verify database integration
declare const Deno: {
  env: { get(key: string): string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

declare function createClient(
  url: string,
  key: string
): {
  from: (table: string) => Record<string, unknown>
  rpc: (functionName: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
}

// Initialize Supabase client with service role
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    // Test the new database functions
    try {
      // Test if the enhanced storage function exists
      const { data, error } = await supabase.rpc('store_analysis_results', {
        p_job_id: 1, // Test job ID
        p_full_feedback_text: 'Test summary',
        p_summary_text: 'Test summary',
        p_raw_generated_text: null,
        p_full_feedback_json: null,
        p_feedback_prompt: null,
      })

      return new Response(JSON.stringify({
        success: !error,
        data,
        error: error ? String(error) : null
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (err) {
      return new Response(JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response('Method not allowed', { status: 405 })
})
