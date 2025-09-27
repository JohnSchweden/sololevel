#!/usr/bin/env node

/**
 * Smoke Test: User Login
 * 
 * Quick test to verify test user can authenticate with Supabase.
 * Uses shared environment configuration.
 */

import { createAnonClient, createScriptLogger, getScriptConfig, scriptHelpers } from '../../utils/env.mjs'

const logger = createScriptLogger('smoke-login')

async function testLogin() {
  try {
    const config = getScriptConfig()
    const supabase = await createAnonClient(config)
    
    logger.info(`Testing login for: ${config.testAuth.email}`)
    
    const { data, error } = await scriptHelpers.signInTestUser(supabase, config)
    
    if (error) {
      logger.error('Login failed:', error.message)
      process.exit(1)
    }
    
    logger.success('Logged in as:', data.user?.email)
    logger.info('User ID:', data.user?.id)
    logger.info('Session:', data.session?.access_token ? 'Active' : 'None')
    
    // Test getting user session
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser()
    if (sessionError) {
      logger.error('Failed to get user session:', sessionError.message)
      process.exit(1)
    }
    
    logger.success('User session confirmed!')
    logger.info('Session user ID:', sessionData.user?.id)
    
    // Test database access (should work with RLS)
    const { data: recordings, error: dbError } = await supabase
      .from('video_recordings')
      .select('*')
      .limit(1)
    
    if (dbError) {
      logger.error('Database access failed:', dbError.message)
      process.exit(1)
    }
    
    logger.success('Database access works!')
    logger.info('Found', recordings?.length || 0, 'video recordings')
    
    logger.success('🎉 All authentication tests passed!')
    
  } catch (error) {
    logger.error('Login test failed:', error.message)
    process.exit(1)
  }
}

testLogin()
