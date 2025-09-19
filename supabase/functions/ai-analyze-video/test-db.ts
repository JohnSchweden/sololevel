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
      const { data, error } = await supabase.rpc('store_enhanced_analysis_results', {
        analysis_job_id: 1,
        p_full_report_text: 'Test report',
        p_summary_text: 'Test summary',
        p_ssml: '<speak>Test</speak>',
        p_audio_url: 'test.mp3',
        p_processing_time_ms: 1000,
        p_video_source_type: 'uploaded_video',
        p_feedback: [],
        p_metrics: {}
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
