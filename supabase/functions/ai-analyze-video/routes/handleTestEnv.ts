import { corsHeaders } from '../../../shared/http/cors.ts'

declare const Deno: {
  env: { get(key: string): string | undefined }
}

interface HandlerContext {
  logger: { info: (msg: string, data?: any) => void }
}

export function handleTestEnv({ logger }: HandlerContext): Response {
  // Check both Supabase secret and direct env var for local development
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  logger.info('Testing GEMINI_API_KEY access', { hasKey: !!geminiKey, keyLength: geminiKey?.length || 0 })

  return new Response(JSON.stringify({
    hasGeminiKey: !!geminiKey,
    keyLength: geminiKey?.length || 0,
    keyPreview: geminiKey ? `${geminiKey.substring(0, 10)}...` : 'none',
    note: geminiKey ? 'API key available' : 'Set GEMINI_API_KEY environment variable'
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
