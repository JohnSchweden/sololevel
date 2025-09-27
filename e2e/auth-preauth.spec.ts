/**
 * Test to verify Playwright global authentication setup
 * This test should pass when pre-authentication is properly configured
 */

import { expect, test } from '@playwright/test'

test.describe('Pre-authenticated E2E Tests', () => {
  test('should be pre-authenticated when accessing protected routes', async ({ page }) => {
    // Navigate to a protected route (main app)
    await page.goto('/')

    // Should NOT be redirected to sign-in page
    await expect(page).not.toHaveURL(/\/auth\/sign-in/)

    // Should be on the main app page
    await expect(page).toHaveURL('/')

    // Should not see sign-in form elements
    await expect(page.locator('input[placeholder*="Email"]')).not.toBeVisible()
    await expect(page.locator('input[type="password"]')).not.toBeVisible()

    // Should see authenticated content (camera recording screen or similar)
    // Note: This will depend on the actual app content
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have access to user-specific data', async ({ page }) => {
    // Navigate to video analysis page (another protected route)
    await page.goto('/video-analysis')

    // Should NOT be redirected to sign-in
    await expect(page).not.toHaveURL(/\/auth\/sign-in/)

    // Should be able to access the video analysis page
    await expect(page).toHaveURL(/\/video-analysis/)
  })

  test('should maintain authentication across page navigations', async ({ page }) => {
    // Start at home page
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/auth\/sign-in/)

    // Navigate to different routes
    await page.goto('/video-analysis')
    await expect(page).not.toHaveURL(/\/auth\/sign-in/)

    // Go back to home
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/auth\/sign-in/)

    // Authentication should persist throughout navigation
    await expect(page).toHaveURL('/')
  })

  test('should have authentication cookies/storage set', async ({ page, context }) => {
    // Check that authentication cookies are present
    const cookies = await context.cookies()

    // Should have Supabase auth cookies
    const authCookies = cookies.filter(
      (cookie) =>
        cookie.name.includes('sb-') ||
        cookie.name.includes('supabase') ||
        cookie.name.includes('auth')
    )

    // Should have at least one auth-related cookie
    expect(authCookies.length).toBeGreaterThan(0)
  })
})
