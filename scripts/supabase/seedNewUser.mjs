#!/usr/bin/env node

/**
 * New User Seeding Script
 * 
 * Creates a new user with terminal input for username and email.
 * Uses Supabase Admin API to create users with confirmed email addresses.
 */

import readline from 'readline'
import { createAdminClient, createAnonClient, createScriptLogger, getScriptConfig } from '../utils/env.mjs'

const logger = createScriptLogger('seedNewUser')
const FIXED_PASSWORD = 'test123'

/**
 * Prompt user for input in terminal
 */
function promptInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * Check if user already exists
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
 * Create a new user
 */
async function createNewUser(supabase, email, username, password) {
  logger.info(`👤 Creating new user: ${email}`)
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for testing
      user_metadata: {
        username,
        role: 'user',
        created_by: 'seed_script',
        created_at: new Date().toISOString(),
      },
    })
    
    if (error) {
      logger.error('Error creating user:', error.message)
      return {
        success: false,
        error: error.message,
        message: 'Failed to create user',
      }
    }
    
    logger.success(`User created successfully: ${data.user.id}`)
    
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
      },
      message: 'User created successfully',
    }
    
  } catch (error) {
    logger.error('Unexpected error creating user:', error.message)
    return {
      success: false,
      error: error.message,
      message: 'Failed to create user',
    }
  }
}

/**
 * Verify user can sign in
 */
async function verifyUser(email, password) {
  logger.info(`🔐 Verifying user can sign in: ${email}`)
  
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
        message: 'User verification failed',
      }
    }
    
    logger.success(`User verification successful: ${data.user.id}`)
    
    // Sign out after verification
    await supabase.auth.signOut()
    
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      message: 'User verification successful',
    }
    
  } catch (error) {
    logger.error('Unexpected error during verification:', error.message)
    return {
      success: false,
      error: error.message,
      message: 'User verification failed',
    }
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Main seeding function
 */
export async function seedNewUser(email, username, password) {
  try {
    const config = getScriptConfig()
    const supabase = await createAdminClient(config)
    
    // Check if user already exists
    const existingUser = await findExistingUser(supabase, email)
    
    if (existingUser) {
      logger.warn(`User already exists: ${email}`)
      return {
        success: false,
        error: 'User already exists',
        message: `User with email ${email} already exists`,
        user: existingUser,
      }
    }
    
    // Create the user
    const createResult = await createNewUser(supabase, email, username, password)
    
    return createResult
    
  } catch (error) {
    logger.error('Seeding failed:', error.message)
    return {
      success: false,
      error: error.message,
      message: 'User seeding failed',
    }
  }
}

/**
 * CLI execution
 */
async function main() {
  logger.info('🌱 Starting new user seeding...')
  
  try {
    let username, email
    
    // Check for command-line arguments
    const args = process.argv.slice(2)
    
    if (args.length >= 2) {
      // Use command-line arguments
      username = args[0]
      email = args[1]
      logger.info(`Using provided values: username="${username}", email="${email}"`)
    } else {
      // Prompt for input interactively
      username = await promptInput('Enter username: ')
      if (!username) {
        logger.error('Username is required')
        process.exit(1)
      }
      
      email = await promptInput('Enter email: ')
      if (!email) {
        logger.error('Email is required')
        process.exit(1)
      }
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      logger.error('Invalid email format')
      process.exit(1)
    }
    
    logger.info(`Using fixed password: ${FIXED_PASSWORD}`)
    
    // Seed the user
    const seedResult = await seedNewUser(email, username, FIXED_PASSWORD)
    
    if (!seedResult.success) {
      logger.error(`${seedResult.message}: ${seedResult.error}`)
      if (seedResult.debug) {
        logger.debug('Debug info:', JSON.stringify(seedResult.debug, null, 2))
      }
      process.exit(1)
    }
    
    logger.success(seedResult.message)
    
    // Verify the user can sign in
    const verifyResult = await verifyUser(email, FIXED_PASSWORD)
    
    if (!verifyResult.success) {
      logger.error(`${verifyResult.message}: ${verifyResult.error}`)
      process.exit(1)
    }
    
    logger.success(verifyResult.message)
    logger.success('🎉 New user seeding completed successfully!')
    logger.info(`\nUser details:`)
    logger.info(`  Email: ${email}`)
    logger.info(`  Username: ${username}`)
    logger.info(`  Password: ${FIXED_PASSWORD}`)
    
  } catch (error) {
    logger.error('Seeding script failed:', error.message)
    process.exit(1)
  }
}

// Export for testing
export { verifyUser }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
