#!/usr/bin/env node

/**
 * Shared Utilities for Smoke Tests
 * Lightweight utilities that leverage centralized env.mjs configuration
 * Reduces duplication while maintaining smoke test isolation
 */

import { getScriptConfig } from '../utils/env.mjs'

/**
 * Load smoke test environment (no-op since env.mjs handles loading)
 * Kept for compatibility with existing smoke scripts
 */
export function loadSmokeEnv() {
  // Environment loading is handled automatically by env.mjs import above
}

/**
 * Create Supabase client with service role key
 * For admin operations in smoke tests
 */
export async function createSmokeServiceClient() {
  const config = getScriptConfig()
  const { createClient } = await import('@supabase/supabase-js')

  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${config.supabase.serviceRoleKey}`
      }
    }
  })
}

/**
 * Create Supabase client with anon key
 * For user operations in smoke tests
 */
export async function createSmokeAnonClient() {
  const config = getScriptConfig()
  const { createClient } = await import('@supabase/supabase-js')

  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Get Supabase URL for direct API calls
 */
export function getSupabaseUrl() {
  const config = getScriptConfig()
  return config.supabase.url
}

/**
 * Test user credentials for smoke tests
 * Uses centralized configuration from env.mjs
 */
export const SMOKE_TEST_USER = (() => {
  const config = getScriptConfig()
  return {
    email: config.testAuth.email,
    password: config.testAuth.password
  }
})()