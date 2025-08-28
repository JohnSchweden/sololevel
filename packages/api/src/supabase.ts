import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Environment variables for Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// DEBUG: Log environment variables (without exposing keys)
if (__DEV__) {
}

// Ensure required environment variables are present
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars: EXPO_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
  )
}

// if (!supabaseUrl || !supabaseKey) {
//   const hasExpoUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL
//   const hasNextUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
//   const hasExpoKey = !!process.env.EXPO_PUBLIC_SUPABASE_KEY
//   const hasNextKey = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

//   const missing: string[] = []
//   if (!hasExpoUrl && !hasNextUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
//   if (!hasExpoKey && !hasNextKey) missing.push('EXPO_PUBLIC_SUPABASE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY')

//   const isNextContext = !!process.env.NEXT_RUNTIME || !!process.env.NEXT_PHASE
//   const suggestion = isNextContext
//     ? 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in apps/next/.env.local.'
//     : 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY (Expo) or NEXT_PUBLIC_* (Next.js).'

//   const errorMsg = isNextContext
//     ? `Missing Supabase envs for Next.js: ${[
//         !hasNextUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : undefined,
//         !hasNextKey ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY' : undefined,
//       ]
//         .filter(Boolean)
//         .join(', ')}. ${suggestion}`
//     : `Missing Supabase environment variables: ${missing.join(', ')}. ${suggestion}`

//   console.error('❌ Supabase Configuration Error:', {
//     resolvedUrl: !!supabaseUrl,
//     resolvedAnonKey: !!supabaseKey,
//     EXPO_PUBLIC_SUPABASE_URL: hasExpoUrl,
//     EXPO_PUBLIC_SUPABASE_KEY: hasExpoKey,
//     NEXT_PUBLIC_SUPABASE_URL: hasNextUrl,
//     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: hasNextKey,
//     hint: suggestion,
//   })
//   throw new Error(errorMsg)
// }

// Create typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    // Auto refresh session
    autoRefreshToken: true,
    // Persist auth session in storage
    persistSession: true,
    // Storage key for session
    storageKey: 'supabase.auth.token',
  },
})

// Type exports for convenience
export type { Database } from '../types/database'
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
