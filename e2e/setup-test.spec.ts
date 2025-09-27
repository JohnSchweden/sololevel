/**
 * Simple test to verify Playwright setup is working
 * This test should run without authentication to verify basic functionality
 */

import { expect, test } from '@playwright/test'

test.describe('Playwright Setup Verification', () => {
  test('should be able to load the application', async ({ page }) => {
    // Navigate to the app
    await page.goto('/')

    // Should load successfully (either auth page or main app)
    await expect(page.locator('body')).toBeVisible()

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Should have some content
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('should be able to navigate to sign-in page', async ({ page }) => {
    // Navigate directly to sign-in
    await page.goto('/auth/sign-in')

    // Should show sign-in form
    await expect(page.locator('body')).toBeVisible()

    // Should be on sign-in page
    await expect(page).toHaveURL(/\/auth\/sign-in/)

    // Should have sign-in related content
    await expect(page.locator('body')).toContainText(/sign/i)
  })
})
