import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Environment variables for Supabase
// Note: Both web and native use Metro bundler (via Expo), so EXPO_PUBLIC_* is required
// Metro automatically inlines EXPO_PUBLIC_* vars at build time
let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
let supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY

// For testing: use local Supabase if running in Jest
if (process.env.JEST_WORKER_ID && !supabaseUrl && !supabaseKey) {
  supabaseUrl = 'http://127.0.0.1:54321'
  supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
}

// DEBUG: Log environment variables (without exposing keys)
if (process.env.NODE_ENV === 'development') {
}

// Ensure required environment variables are present
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in your .env.local file. ' +
      'Both web and native use Metro bundler and require EXPO_PUBLIC_* prefix.'
  )
}

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
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
