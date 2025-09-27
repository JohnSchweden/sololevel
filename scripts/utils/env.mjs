#!/usr/bin/env node

/**
 * Centralized Environment Configuration for Scripts
 *
 * Shared environment loading, validation, and Supabase client creation
 * for all scripts. Replaces hard-coded credentials with env-driven configuration.
 */

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')

dotenv.config({ path: join(projectRoot, '.env.local') })
dotenv.config({ path: join(projectRoot, '.env') })

/**
 * Required environment variables for scripts
 */
const REQUIRED_VARS = [
  'SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TEST_AUTH_EMAIL',
  'TEST_AUTH_PASSWORD'
]

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
  SUPABASE_DB_HOST: '127.0.0.1',
  SUPABASE_DB_PORT: '54322',
  SUPABASE_DB_USER: 'postgres',
  SUPABASE_DB_PASSWORD: 'postgres',
  SUPABASE_DB_NAME: 'postgres'
}

/**
 * Validate required environment variables
 */
export function validateEnvironment() {
  const missing = REQUIRED_VARS.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}\n` +
      'Please ensure your .env file contains:\n' +
      missing.map(key => `${key}=your_value_here`).join('\n'))
  }

  return true
}

/**
 * Get validated environment configuration
 */
export function getScriptConfig() {
  validateEnvironment()

  return {
    // Supabase configuration
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },

    // Direct database configuration
    database: {
      host: process.env.SUPABASE_DB_HOST || OPTIONAL_VARS.SUPABASE_DB_HOST,
      port: parseInt(process.env.SUPABASE_DB_PORT || OPTIONAL_VARS.SUPABASE_DB_PORT),
      user: process.env.SUPABASE_DB_USER || OPTIONAL_VARS.SUPABASE_DB_USER,
      password: process.env.SUPABASE_DB_PASSWORD || OPTIONAL_VARS.SUPABASE_DB_PASSWORD,
      database: process.env.SUPABASE_DB_NAME || OPTIONAL_VARS.SUPABASE_DB_NAME,
    },

    // Test authentication
    testAuth: {
      email: process.env.TEST_AUTH_EMAIL,
      password: process.env.TEST_AUTH_PASSWORD,
    },

    // Environment info
    env: {
      isDevelopment: process.env.NODE_ENV !== 'production',
      isLocal: process.env.SUPABASE_URL?.includes('127.0.0.1') || process.env.SUPABASE_URL?.includes('localhost'),
    }
  }
}

/**
 * Create a simple logger for scripts (replaces console usage)
 */
export function createScriptLogger(scriptName) {
  const prefix = `[${scriptName}]`

  return {
    info: (...args) => console.log(prefix, ...args),
    success: (...args) => console.log(prefix, '✅', ...args),
    warn: (...args) => console.warn(prefix, '⚠️ ', ...args),
    error: (...args) => console.error(prefix, '❌', ...args),
    debug: (...args) => {
      if (process.env.DEBUG) {
        console.log(prefix, '🐛', ...args)
      }
    },
  }
}

/**
 * Create Supabase admin client with validated config
 */
export async function createAdminClient(config = null) {
  const { createClient } = await import('@supabase/supabase-js')
  const cfg = config || getScriptConfig()

  return createClient(cfg.supabase.url, cfg.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${cfg.supabase.serviceRoleKey}`,
      },
    },
  })
}

/**
 * Create Supabase client with anon key (for testing sign-in)
 */
export async function createAnonClient(config = null) {
  const { createClient } = await import('@supabase/supabase-js')
  const cfg = config || getScriptConfig()

  return createClient(cfg.supabase.url, cfg.supabase.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create direct database client (for raw SQL operations)
 */
export async function createDbClient(config = null) {
  const pkg = await import('pg')
  const { Client } = pkg.default || pkg
  const cfg = config || getScriptConfig()

  return new Client({
    host: cfg.database.host,
    port: cfg.database.port,
    user: cfg.database.user,
    password: cfg.database.password,
    database: cfg.database.database,
  })
}

/**
 * Common script helpers
 */
export const scriptHelpers = {
  /**
   * Sign in with test user credentials
   */
  async signInTestUser(supabase, config = null) {
    const cfg = config || getScriptConfig()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cfg.testAuth.email,
      password: cfg.testAuth.password,
    })

    return { data, error }
  },

  /**
   * Create or verify test user exists
   */
  async ensureTestUser(adminClient, config = null) {
    const cfg = config || getScriptConfig()

    // Check if user already exists
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    const existingUser = users.users.find(user => user.email === cfg.testAuth.email)

    if (existingUser) {
      return {
        success: true,
        user: existingUser,
        message: 'Test user already exists',
        created: false,
      }
    }

    // Create new user
    const { data, error } = await adminClient.auth.admin.createUser({
      email: cfg.testAuth.email,
      password: cfg.testAuth.password,
      email_confirm: true,
      user_metadata: {
        role: 'test_user',
        created_by: 'script_helper',
        created_at: new Date().toISOString(),
      },
    })

    if (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create test user',
        debug: { email: cfg.testAuth.email, errorCode: error.status }
      }
    }

    return {
      success: true,
      user: data.user,
      message: 'Test user created successfully',
      created: true,
    }
  },
}

// Export default config getter for convenience
export default getScriptConfig