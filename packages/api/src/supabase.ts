import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Platform detection for URL adjustment
// Use try-catch to safely import Platform (may not be available in all contexts)
let Platform: { OS: string } | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Platform = require('react-native').Platform
} catch {
  // Platform not available (e.g., in Node.js tests)
  Platform = null
}

/**
 * Adjusts Supabase URL for platform-specific localhost handling
 * - iOS/Web: 127.0.0.1 works as-is
 * - Android Emulator: 10.0.2.2 maps to host's 127.0.0.1
 * - Physical Android: Use actual local network IP (e.g., 192.168.0.203)
 */
function adjustUrlForPlatform(url: string): string {
  if (!Platform) {
    return url
  }

  // Only adjust for Android platform
  if (Platform.OS === 'android') {
    // Replace localhost/127.0.0.1 with Android emulator's special IP
    // This works for emulator; physical devices need actual local network IP
    return url.replace(/127\.0\.0\.1|localhost/, '10.0.2.2')
  }

  return url
}

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

// Adjust URL for platform (Android emulator needs 10.0.2.2 instead of 127.0.0.1)
if (supabaseUrl) {
  supabaseUrl = adjustUrlForPlatform(supabaseUrl)
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
