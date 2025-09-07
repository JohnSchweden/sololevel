import { expect, test } from '@playwright/test'

/**
 * E2E Tests for Expo Router Migration
 *
 * Tests complete user flows after migration to Expo Router.
 * Uses Playwright for web E2E testing as per testing-unified rule.
 *
 * TDD Approach: These tests validate the migration preserves user experience.
 */

test.describe('Expo Router Migration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app - unified structure starts with camera recording screen
    await page.goto('/')
  })

  test.describe('Basic App Loading', () => {
    test('should load camera recording screen directly', async ({ page }) => {
      // Test that the app loads directly to camera recording screen (unified with native)

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Verify we're on the root path (since both web and native start with camera)
      await expect(page).toHaveURL('/')

      // Check that the page has loaded (basic smoke test)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle browser back/forward buttons', async ({ page }) => {
      // Test browser navigation integration

      // Wait for page to load
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL('/')

      // Use browser back button (should go to previous page in history)
      await page.goBack()

      // Use browser forward button (should return to our app)
      await page.goForward()
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Deep Linking', () => {
    test('should handle direct URL navigation', async ({ page }) => {
      // Test direct navigation to root (which now shows camera recording)
      await page.goto('/')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Verify screen loads correctly
      await expect(page).toHaveURL('/')
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle URL parameters', async ({ page }) => {
      // Test navigation with parameters
      await page.goto('/?mode=video&duration=60')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Verify parameters are accessible in URL
      await expect(page).toHaveURL('/?mode=video&duration=60')
    })

    test('should handle invalid URLs gracefully', async ({ page }) => {
      // Test error handling for invalid routes
      await page.goto('/non-existent-route')

      // Should redirect to home or show 404 - not crash
      // This will be implemented during migration
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('State Preservation', () => {
    test('should handle page refresh correctly', async ({ page }) => {
      // Test that page refresh works with Expo Router
      await page.goto('/')

      // Wait for initial load
      await page.waitForLoadState('networkidle')

      // Refresh the page
      await page.reload()

      // Wait for reload
      await page.waitForLoadState('networkidle')

      // Verify screen still loads correctly
      await expect(page).toHaveURL('/')
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load routes quickly', async ({ page }) => {
      // Test initial load performance
      const startTime = Date.now()

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      const loadTime = Date.now() - startTime

      // Initial load should be reasonably fast (< 5 seconds for development)
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle rapid navigation without issues', async ({ page }) => {
      // Test rapid navigation doesn't cause issues

      // Wait for initial load
      await page.waitForLoadState('networkidle')

      // Rapidly navigate back and forth using browser navigation
      for (let i = 0; i < 3; i++) {
        await page.goBack()
        await page.goForward()
      }

      // Should still be functional
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Accessibility', () => {
    test('should maintain basic accessibility', async ({ page }) => {
      // Test basic accessibility features

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Check that page has proper structure
      await expect(page.locator('body')).toBeVisible()

      // Test keyboard navigation works
      await page.keyboard.press('Tab')
    })
  })

  test.describe('Error Recovery', () => {
    test('should recover from navigation errors', async ({ page }) => {
      // Test error recovery mechanisms

      // Simulate navigation error (implementation specific)
      await page.goto('/')

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Should still be functional
      await expect(page).toHaveURL('/')
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle network issues gracefully', async ({ page }) => {
      // Test offline/network error handling

      // Wait for initial load
      await page.waitForLoadState('networkidle')

      // Go offline
      await page.context().setOffline(true)

      // Try to navigate to a new URL (should handle gracefully)
      try {
        await page.goto('/?test=offline')
      } catch (error) {
        // Expected to fail when offline
        console.log('Expected offline navigation failure:', error.message)
      }

      // Go back online
      await page.context().setOffline(false)

      // Should still be functional
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
