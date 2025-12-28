import { mmkv, mmkvStorageAsync } from '@my/config'
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

// MMKV storage adapter for React Native session persistence
// MMKV provides ~30x faster performance than AsyncStorage through C++ JSI bindings
// On web/Node.js platforms, MMKV is unavailable and we omit storage to let Supabase use localStorage
// This eliminates AsyncStorage's 50-200ms JS thread blocks on state mutations

/**
 * Adjusts Supabase URL for platform-specific localhost handling
 * - iOS Simulator/Web: 127.0.0.1 works as-is
 * - iOS Physical Device: Needs dev machine's local network IP (e.g., 192.168.1.100)
 * - Android Emulator: 10.0.2.2 maps to host's 127.0.0.1
 * - Physical Android: Use actual local network IP (e.g., 192.168.1.100)
 *
 * To test on physical devices, set EXPO_PUBLIC_DEV_MACHINE_IP in .env.local:
 * EXPO_PUBLIC_DEV_MACHINE_IP=192.168.1.100
 */
function adjustUrlForPlatform(url: string): string {
  if (!Platform) {
    return url
  }

  // Check if user provided dev machine IP for physical device testing
  const devMachineIp = process.env.EXPO_PUBLIC_DEV_MACHINE_IP

  // For physical devices, replace localhost with dev machine IP if provided
  if (devMachineIp && (url.includes('127.0.0.1') || url.includes('localhost'))) {
    // Replace localhost/127.0.0.1 with dev machine IP
    return url.replace(/127\.0\.0\.1|localhost/, devMachineIp)
  }

  // Android emulator: replace localhost with special emulator IP
  if (Platform.OS === 'android') {
    // Replace localhost/127.0.0.1 with Android emulator's special IP
    // This works for emulator; physical devices need EXPO_PUBLIC_DEV_MACHINE_IP
    return url.replace(/127\.0\.0\.1|localhost/, '10.0.2.2')
  }

  // iOS simulator and web: 127.0.0.1 works as-is (no adjustment needed)
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

// Ensure required environment variables are present
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY in your .env.local file. ' +
      'Both web and native use Metro bundler and require EXPO_PUBLIC_* prefix.'
  )
}

// LAZY CLIENT CREATION: Defer Supabase client creation to avoid blocking app launch
// createClient() with persistSession:true reads storage synchronously, blocking JS thread
// By making it lazy, we avoid storage reads until client is actually used
let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Get Supabase client instance (lazy initialization)
 * Client is created on first access, not at module import time
 * This prevents blocking app launch with storage reads
 */
function getSupabaseClient(): ReturnType<typeof createClient<Database>> {
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl!, supabaseKey!, {
      auth: {
        // Auto refresh session
        autoRefreshToken: true,
        // Persist auth session in storage
        persistSession: true,
        // Storage key for session
        storageKey: 'supabase.auth.token',
        // Use MMKV storage on React Native for session persistence (~30x faster than AsyncStorage)
        // Conditionally pass storage only when MMKV is available (native platforms)
        // On web/Node.js, omit storage to let Supabase fall back to localStorage automatically
        ...(mmkv && { storage: mmkvStorageAsync }),
      },
    })
  }
  return supabaseClient
}

// Export lazy client via transparent Proxy
// The Proxy forwards all operations to the real client, making it transparent to:
// - instanceof checks (via getPrototypeOf trap)
// - Type checking (via proper typing)
// - Mocking libraries (via forwarding all property accesses)
// - Property modifications (via set trap)
//
// NOTE: We do NOT cache properties because:
// 1. Cached properties become stale if the underlying client changes
// 2. Direct property binding (e.g., `const auth = supabase.auth`) should always
//    reference the current client instance, not a cached copy
// 3. The real client already maintains stable references for its properties
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    // Always forward to real client (no caching)
    // This ensures properties always reflect the current client state
    const client = getSupabaseClient()
    const value = client[prop as keyof typeof client]

    // If the property is a function, bind it to the client to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(client)
    }

    return value
  },
  set(_target, prop, value) {
    // Forward property assignments to the real client
    // Note: Supabase client properties are typically read-only, but we handle
    // assignments for completeness (e.g., custom properties or test mocks)
    const client = getSupabaseClient()
    ;(client as unknown as Record<PropertyKey, unknown>)[prop] = value
    return true
  },
  getPrototypeOf(_target) {
    // Forward instanceof checks to the real client's prototype
    // This makes `supabase instanceof SupabaseClient` work correctly
    return Object.getPrototypeOf(getSupabaseClient())
  },
  has(_target, prop) {
    // Forward 'in' operator checks to the real client
    return prop in getSupabaseClient()
  },
  ownKeys(_target) {
    // Forward Object.keys() and similar operations to the real client
    return Reflect.ownKeys(getSupabaseClient())
  },
  getOwnPropertyDescriptor(_target, prop) {
    // Forward property descriptor lookups to the real client
    // This is needed for proper property enumeration and descriptor access
    return Reflect.getOwnPropertyDescriptor(getSupabaseClient(), prop)
  },
}) as ReturnType<typeof createClient<Database>>

// Type exports for convenience
export type { Database } from '../types/database'
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
