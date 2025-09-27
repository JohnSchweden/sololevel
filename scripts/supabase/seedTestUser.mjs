#!/usr/bin/env node

/**
 * Test User Seeding Script
 * 
 * Creates or verifies a test user for development and E2E testing.
 * Uses Supabase Admin API to create users with confirmed email addresses.
 */

import { createAdminClient, createAnonClient, createScriptLogger, getScriptConfig, scriptHelpers } from './utils/env.mjs'

const logger = createScriptLogger('seedTestUser')

/**
 * Check if test user already exists
 */
async function findExistingUser(supabase, email) {
  logger.info(`🔍 Checking for existing user: ${email}`)
  
  try {
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      logger.error('Error listing users:', error.message)
      return null
    }
    
    const existingUser = data.users.find(user => user.email === email)
    
    if (existingUser) {
      logger.success(`Found existing user: ${existingUser.id}`)
      return existingUser
    }
    
    logger.info('No existing user found')
    return null
    
  } catch (error) {
    logger.error('Error checking for existing user:', error.message)
    return null
  }
}

/**
 * Create a new test user
 */
async function createTestUser(supabase, email, password) {
  logger.info(`👤 Creating test user: ${email}`)
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for testing
      user_metadata: {
        role: 'test_user',
        created_by: 'seed_script',
        created_at: new Date().toISOString(),
      },
    })
    
    if (error) {
      logger.error('Error creating user:', error.message)
      return {
        success: false,
        error: error.message,
        message: 'Failed to create test user',
      }
    }
    
    logger.success(`Test user created successfully: ${data.user.id}`)
    
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
      },
      message: 'Test user created successfully',
    }
    
  } catch (error) {
    logger.error('Unexpected error creating user:', error.message)
    return {
      success: false,
      error: error.message,
      message: 'Failed to create test user',
    }
  }
}

/**
 * Verify test user can sign in
 */
async function verifyTestUser(email, password) {
  logger.info(`🔐 Verifying test user can sign in: ${email}`)
  
  // Create a regular client for sign-in testing
  const supabase = await createAnonClient()
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      logger.error('Sign-in verification failed:', error.message)
      return {
        success: false,
        error: error.message,
        message: 'Test user verification failed',
      }
    }
    
    logger.success(`Test user verification successful: ${data.user.id}`)
    
    // Sign out after verification
    await supabase.auth.signOut()
    
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      message: 'Test user verification successful',
    }
    
  } catch (error) {
    logger.error('Unexpected error during verification:', error.message)
    return {
      success: false,
      error: error.message,
      message: 'Test user verification failed',
    }
  }
}

/**
 * Main seeding function
 */
export async function seedTestUser(email, password) {
  try {
    const config = getScriptConfig()
    const supabase = await createAdminClient(config)
    
    // Use the shared helper for user creation/verification
    const result = await scriptHelpers.ensureTestUser(supabase, config)
    
    return result
    
  } catch (error) {
    logger.error('Seeding failed:', error.message)
    return {
      success: false,
      error: error.message,
      message: 'Test user seeding failed',
    }
  }
}

/**
 * CLI execution
 */
async function main() {
  logger.info('🌱 Starting test user seeding...')
  
  try {
    const config = getScriptConfig()
    
    // Seed the user
    const seedResult = await seedTestUser(config.testAuth.email, config.testAuth.password)
    
    if (!seedResult.success) {
      logger.error(`${seedResult.message}: ${seedResult.error}`)
      if (seedResult.debug) {
        logger.debug('Debug info:', JSON.stringify(seedResult.debug, null, 2))
      }
      process.exit(1)
    }
    
    logger.success(seedResult.message)
    
    // Verify the user can sign in
    const verifyResult = await verifyTestUser(config.testAuth.email, config.testAuth.password)
    
    if (!verifyResult.success) {
      logger.error(`${verifyResult.message}: ${verifyResult.error}`)
      process.exit(1)
    }
    
    logger.success(verifyResult.message)
    logger.success('🎉 Test user seeding completed successfully!')
    
  } catch (error) {
    logger.error('Seeding script failed:', error.message)
    process.exit(1)
  }
}

// Export for testing
export { verifyTestUser }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
