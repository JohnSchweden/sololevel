/**
 * Playwright Global Setup for Pre-Authentication
 *
 * This setup runs once before all tests and creates an authenticated session
 * that can be reused across all test files.
 */

import path from 'node:path'
import { FullConfig, chromium } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🔐 Setting up pre-authenticated session for Playwright tests...')

  // Get test auth credentials from environment
  const testAuthEnabled = process.env.TEST_AUTH_ENABLED === 'true'
  const testEmail = process.env.TEST_AUTH_EMAIL || 'test@example.com'
  const testPassword = process.env.TEST_AUTH_PASSWORD || 'test-password-123'

  if (!testAuthEnabled) {
    console.log('⚠️  TEST_AUTH_ENABLED is not set to true. Tests may fail on protected routes.')
    return
  }

  // Launch browser for setup
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Get the base URL from config
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:8081'

    console.log(`📍 Navigating to ${baseURL}/auth/sign-in`)

    // Navigate to sign-in page
    await page.goto(`${baseURL}/auth/sign-in`)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check if we're already authenticated (test auth bootstrap might have worked)
    const currentUrl = page.url()
    if (!currentUrl.includes('/auth/sign-in')) {
      console.log('✅ Already authenticated via test auth bootstrap')
    } else {
      console.log('🔑 Performing manual sign-in...')

      // Fill in credentials
      await page.fill('input[placeholder*="Email"], input[type="email"]', testEmail)
      await page.fill('input[placeholder*="Password"], input[type="password"]', testPassword)

      // Click sign-in button
      await page.click('button:has-text("Sign In"), button[type="submit"]')

      // Wait for authentication to complete
      await page.waitForURL((url) => !url.includes('/auth/sign-in'), { timeout: 10000 })

      console.log('✅ Successfully signed in')
    }

    // Save authentication state
    const storageStatePath = path.join(__dirname, 'auth-state.json')
    await context.storageState({ path: storageStatePath })

    console.log(`💾 Saved authentication state to ${storageStatePath}`)
  } catch (error) {
    // Log error for debugging (test infrastructure)
    process.stderr.write(`❌ Failed to set up pre-authentication: ${error}\n`)

    // Take a screenshot for debugging
    await page.screenshot({ path: 'e2e/setup-failure.png' })
    console.log('📸 Saved setup failure screenshot to e2e/setup-failure.png')

    throw error
  } finally {
    await browser.close()
  }

  console.log('🎉 Pre-authentication setup completed successfully!')
}

export default globalSetup
