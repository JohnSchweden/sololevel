#!/usr/bin/env node

/**
 * CI Security Audit Script
 *
 * This script runs a security audit with specific configurations for CI environments.
 * It allows certain known vulnerabilities in development dependencies while ensuring
 * no high-severity vulnerabilities exist in production dependencies.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'

const log = console.log
log('🔒 Running CI security audit...')

// Check if .npmauditrc.json exists
if (!fs.existsSync('.npmauditrc.json')) {
  console.error('❌ Error: .npmauditrc.json not found')
  process.exit(1)
}

try {
  // Run audit with severity=high to only fail on high severity issues
  log('🔍 Checking for high severity vulnerabilities in production dependencies...')
  execSync('yarn npm audit --environment production --severity high', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  })

  // Run full audit but don't fail on moderate issues
  log('🔍 Running full audit (informational only)...')
  try {
    execSync('yarn npm audit --all', { stdio: 'inherit' })
  } catch (error) {
    // Don't fail if this reports moderate issues
    log('⚠️ Non-critical vulnerabilities found in full audit')
  }

  log('✅ Security audit passed CI requirements')
  process.exit(0)
} catch (error) {
  console.error('❌ Security audit failed - high severity vulnerabilities found')
  process.exit(1)
}
