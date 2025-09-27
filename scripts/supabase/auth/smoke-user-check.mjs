#!/usr/bin/env node

/**
 * Smoke Test: User Database Check
 * 
 * Verify test user exists in database with correct properties.
 * Uses shared environment configuration and database client.
 */

import { createDbClient, createScriptLogger, getScriptConfig } from '../../utils/env.mjs'

const logger = createScriptLogger('smoke-user-check')

async function checkUser() {
  try {
    const config = getScriptConfig()
    const client = await createDbClient(config)
    
    await client.connect()
    logger.info('Connected to database')
    
    // Check auth.users table
    const result = await client.query(`
      SELECT id, email, email_confirmed_at, encrypted_password, created_at, aud, role
      FROM auth.users
      WHERE email = $1
    `, [config.testAuth.email])
    
    if (result.rows.length === 0) {
      logger.error('User not found in auth.users')
      await client.end()
      return
    }
    
    const user = result.rows[0]
    logger.success('User found:')
    logger.info('- ID:', user.id)
    logger.info('- Email:', user.email)
    logger.info('- Email confirmed:', !!user.email_confirmed_at)
    logger.info('- AUD:', user.aud)
    logger.info('- Role:', user.role)
    logger.info('- Created:', user.created_at)
    logger.info('- Password hash exists:', !!user.encrypted_password)
    
    // Check if password hash looks correct (bcrypt format)
    const bcryptRegex = /^\$2[aby]\$\d{1,2}\$[.\/A-Za-z0-9]{53}$/
    logger.info('- Password hash format valid:', bcryptRegex.test(user.encrypted_password))
    
    await client.end()
    logger.success('🎉 User check completed successfully!')
    
  } catch (err) {
    logger.error('User check failed:', err.message)
    process.exit(1)
  }
}

checkUser()
