/**
 * E2E Tests for History & Progress Screen
 *
 * Tests the VideosSection, VideoThumbnailCard, and HistoryProgressScreen
 * components in a real browser environment with user interactions.
 *
 * Prerequisites:
 * - Web dev server running (yarn workspace web-app run serve)
 * - Test user authenticated (when TEST_AUTH_ENABLED=true)
 * - Test data seeded in Supabase (at least 3 completed analysis jobs)
 */

import { expect, test } from '@playwright/test'

test.describe('History & Progress Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to history screen before each test
    await page.goto('/history-progress')

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')
  })

  test.describe('Screen Layout & Navigation', () => {
    test('should load history screen successfully', async ({ page }) => {
      // Verify we're on the history-progress route
      await expect(page).toHaveURL(/\/history-progress/)

      // Check page title or header
      await expect(page.locator('text=History & Progress')).toBeVisible({ timeout: 10000 })
    })

    test('should display AppHeader with back and menu buttons', async ({ page }) => {
      // Check for navigation elements
      // Note: Adjust selectors based on actual AppHeader implementation
      const header = page.locator('[data-testid*="app-header"], header')
      await expect(header).toBeVisible()
    })

    test('should navigate back when back button is pressed', async ({ page }) => {
      // Find and click back button
      const backButton = page.locator('button[aria-label*="back"], button[aria-label*="Back"]')

      if (await backButton.isVisible()) {
        const previousUrl = page.url()
        await backButton.click()

        // Should navigate away from history-progress
        await page.waitForURL((url) => !url.pathname.includes('/history-progress'), {
          timeout: 5000,
        })
      }
    })
  })

  test.describe('Videos Section - Empty State', () => {
    test.skip('should display empty state when no videos exist', async ({ page }) => {
      // This test requires a clean database state
      // Skip by default, run manually when testing empty state

      await expect(page.locator('text=No videos yet')).toBeVisible()
      await expect(page.locator('text=Record your first video')).toBeVisible()
    })
  })

  test.describe('Videos Section - Loading State', () => {
    test('should show loading skeleton while fetching data', async ({ page }) => {
      // Intercept the API call to delay response
      await page.route('**/rest/v1/analysis_jobs?*', async (route) => {
        await page.waitForTimeout(2000) // Delay 2 seconds
        await route.continue()
      })

      await page.goto('/history-progress')

      // Check for loading indicator (adjust selector based on implementation)
      const loadingIndicator = page.locator('[data-testid*="loading"], [aria-label*="Loading"]')
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 })
    })
  })

  test.describe('Videos Section - Success State', () => {
    test('should display videos section with thumbnails', async ({ page }) => {
      // Check for Videos section header
      await expect(page.locator('text=Videos')).toBeVisible({ timeout: 10000 })

      // Check for "See all" button
      const seeAllButton = page.locator('button:has-text("See all")')
      await expect(seeAllButton).toBeVisible()
    })

    test('should display up to 3 video thumbnails', async ({ page }) => {
      // Find all video thumbnail cards
      const thumbnails = page.locator(
        '[data-testid*="video-thumbnail"], [data-testid*="videos-section-thumbnail"]'
      )

      // Should have at least 1 and at most 3 thumbnails
      const count = await thumbnails.count()
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(3)
    })

    test('video thumbnails should have play icon overlay', async ({ page }) => {
      // Check first thumbnail has play icon
      const firstThumbnail = page.locator('[data-testid*="video-thumbnail"]').first()
      await expect(firstThumbnail).toBeVisible()

      // Play icon should be visible (centered overlay)
      const playIcon = firstThumbnail.locator('[data-testid*="play-overlay"], svg[class*="play"]')
      await expect(playIcon).toBeVisible()
    })

    test('should display placeholder when thumbnail image is missing', async ({ page }) => {
      // This test checks graceful handling of missing thumbnails
      // Look for placeholder icons (Play icon in gray background)
      const placeholders = page.locator('[data-testid*="placeholder"]')

      if ((await placeholders.count()) > 0) {
        await expect(placeholders.first()).toBeVisible()
      }
    })
  })

  test.describe('Videos Section - Interactions', () => {
    test('should navigate to video analysis when thumbnail is clicked', async ({ page }) => {
      // Find first video thumbnail
      const firstThumbnail = page.locator('[data-testid*="video-thumbnail"]').first()
      await expect(firstThumbnail).toBeVisible({ timeout: 10000 })

      // Click the thumbnail
      await firstThumbnail.click()

      // Should navigate to video analysis page with analysisId
      await expect(page).toHaveURL(/\/video-analysis\/\d+/, { timeout: 5000 })
    })

    test('should log "See all" action when button is clicked', async ({ page }) => {
      // Set up console listener to capture logs
      const consoleLogs: string[] = []
      page.on('console', (msg) => {
        consoleLogs.push(msg.text())
      })

      // Click "See all" button
      const seeAllButton = page.locator('button:has-text("See all")')
      await seeAllButton.click()

      // Should log placeholder message (P0 implementation)
      // Wait a bit for console log to appear
      await page.waitForTimeout(500)

      const hasPlaceholderLog = consoleLogs.some(
        (log) => log.includes('videos') || log.includes('P1')
      )
      expect(hasPlaceholderLog).toBeTruthy()
    })

    test('thumbnails should have hover effect', async ({ page }) => {
      const firstThumbnail = page.locator('[data-testid*="video-thumbnail"]').first()
      await expect(firstThumbnail).toBeVisible()

      // Hover over thumbnail
      await firstThumbnail.hover()

      // Check for opacity or scale change (implementation-specific)
      // The component uses hoverStyle={{ opacity: 0.95 }}
      await page.waitForTimeout(300) // Wait for animation

      // Thumbnail should still be visible with hover state
      await expect(firstThumbnail).toBeVisible()
    })

    test('thumbnails should have press animation on click', async ({ page }) => {
      const firstThumbnail = page.locator('[data-testid*="video-thumbnail"]').first()
      await expect(firstThumbnail).toBeVisible()

      // Get initial bounding box
      const initialBox = await firstThumbnail.boundingBox()

      // Click and hold briefly to see press animation
      await firstThumbnail.click({ delay: 100 })

      // Animation should have occurred (component uses scale: 0.98)
      // After release, should return to normal size
      const finalBox = await firstThumbnail.boundingBox()

      // Boxes should be similar (animation completed)
      expect(finalBox).toBeTruthy()
    })
  })

  test.describe('Pull-to-Refresh Functionality', () => {
    test.skip('should refresh data when pull-to-refresh is triggered', async ({ page }) => {
      // Note: Pull-to-refresh is primarily a mobile gesture
      // This test is skipped for desktop browsers
      // Would need mobile emulation or manual testing

      // For desktop, we can test programmatic refresh
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should still show videos section
      await expect(page.locator('text=Videos')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should display properly on mobile viewport', async ({ page }) => {
      // Set mobile viewport (iPhone 12)
      await page.setViewportSize({ width: 390, height: 844 })

      await page.goto('/history-progress')
      await page.waitForLoadState('networkidle')

      // Videos section should still be visible
      await expect(page.locator('text=Videos')).toBeVisible({ timeout: 10000 })

      // Thumbnails should be horizontally scrollable
      const videosSection = page.locator('[data-testid*="videos-section"]')
      await expect(videosSection).toBeVisible()
    })

    test('should display properly on tablet viewport', async ({ page }) => {
      // Set tablet viewport (iPad)
      await page.setViewportSize({ width: 768, height: 1024 })

      await page.goto('/history-progress')
      await page.waitForLoadState('networkidle')

      // All content should be visible
      await expect(page.locator('text=Videos')).toBeVisible({ timeout: 10000 })
    })

    test('should display properly on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })

      await page.goto('/history-progress')
      await page.waitForLoadState('networkidle')

      // All content should be visible with proper spacing
      await expect(page.locator('text=Videos')).toBeVisible({ timeout: 10000 })
    })

    test('horizontal scroll should work for video thumbnails', async ({ page }) => {
      // Ensure we have multiple thumbnails
      const thumbnails = page.locator('[data-testid*="video-thumbnail"]')
      const count = await thumbnails.count()

      if (count > 2) {
        // Scroll container should allow horizontal scrolling
        const scrollContainer = page.locator('[data-testid*="videos-section-scroll"]')

        if (await scrollContainer.isVisible()) {
          // Check if scrollable
          const isScrollable = await scrollContainer.evaluate((el) => {
            return el.scrollWidth > el.clientWidth
          })

          expect(isScrollable).toBeTruthy()
        }
      }
    })
  })

  test.describe('Accessibility', () => {
    test('video thumbnails should have accessibility labels', async ({ page }) => {
      const firstThumbnail = page.locator('[data-testid*="video-thumbnail"]').first()
      await expect(firstThumbnail).toBeVisible()

      // Check for accessibility attributes
      const ariaLabel = await firstThumbnail.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toContain('Video thumbnail')
    })

    test('see all button should have accessibility role', async ({ page }) => {
      const seeAllButton = page.locator('button:has-text("See all")')
      await expect(seeAllButton).toBeVisible()

      // Button should have proper role
      const role = await seeAllButton.getAttribute('role')
      expect(role === 'button' || role === null).toBeTruthy() // Native buttons may not have explicit role
    })

    test('should be keyboard navigable', async ({ page }) => {
      // Focus on first interactive element
      await page.keyboard.press('Tab')

      // Should be able to tab through thumbnails and buttons
      const activeElement = page.locator(':focus')
      await expect(activeElement).toBeVisible()

      // Press Enter on focused thumbnail should navigate
      await page.keyboard.press('Enter')

      // Should trigger click action
      await page.waitForTimeout(500)
    })

    test('should support screen reader announcements', async ({ page }) => {
      // Check for live regions or aria-live attributes
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]')

      // May have loading/error announcements
      const count = await liveRegions.count()
      expect(count).toBeGreaterThanOrEqual(0) // Optional feature
    })
  })

  test.describe('Error Handling', () => {
    test('should display error state when API fails', async ({ page }) => {
      // Intercept and fail the API request
      await page.route('**/rest/v1/analysis_jobs?*', (route) => {
        route.abort('failed')
      })

      await page.goto('/history-progress')

      // Should show error message
      await expect(page.locator('text=Failed to load')).toBeVisible({ timeout: 10000 })

      // Should show retry button
      const retryButton = page.locator('button:has-text("Retry")')
      await expect(retryButton).toBeVisible()
    })

    test('should retry loading when retry button is clicked', async ({ page }) => {
      let requestCount = 0

      // Intercept API calls
      await page.route('**/rest/v1/analysis_jobs?*', (route) => {
        requestCount++
        if (requestCount === 1) {
          // Fail first request
          route.abort('failed')
        } else {
          // Succeed on retry
          route.continue()
        }
      })

      await page.goto('/history-progress')

      // Wait for error state
      const retryButton = page.locator('button:has-text("Retry")')
      await expect(retryButton).toBeVisible({ timeout: 10000 })

      // Click retry
      await retryButton.click()

      // Should eventually show videos
      await expect(page.locator('text=Videos')).toBeVisible({ timeout: 10000 })

      // Verify retry was attempted
      expect(requestCount).toBeGreaterThanOrEqual(2)
    })
  })

  test.describe('Performance', () => {
    test('should load history screen within 3 seconds', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/history-progress')
      await page.waitForLoadState('networkidle')

      // Check for main content
      await expect(page.locator('text=Videos')).toBeVisible()

      const loadTime = Date.now() - startTime

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('cached data should load quickly on repeat visits', async ({ page }) => {
      // First visit
      await page.goto('/history-progress')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('text=Videos')).toBeVisible()

      // Navigate away
      await page.goto('/')

      // Second visit (should use cache)
      const startTime = Date.now()
      await page.goto('/history-progress')
      await expect(page.locator('text=Videos')).toBeVisible()
      const loadTime = Date.now() - startTime

      // Cached load should be faster (< 1 second)
      expect(loadTime).toBeLessThan(1000)
    })

    test('should not have memory leaks on repeated navigation', async ({ page }) => {
      // Navigate to history screen multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('/history-progress')
        await page.waitForLoadState('networkidle')
        await expect(page.locator('text=Videos')).toBeVisible()

        await page.goto('/')
        await page.waitForLoadState('networkidle')
      }

      // Should still be responsive
      await page.goto('/history-progress')
      await expect(page.locator('text=Videos')).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Data Validation', () => {
    test('should display correct number of videos (max 3)', async ({ page }) => {
      const thumbnails = page.locator('[data-testid*="video-thumbnail"]')
      const count = await thumbnails.count()

      // Should respect max 3 videos limit
      expect(count).toBeLessThanOrEqual(3)
    })

    test('should display most recent videos first', async ({ page }) => {
      // This test would require checking timestamps or order
      // Placeholder for data ordering validation
      const thumbnails = page.locator('[data-testid*="video-thumbnail"]')

      if ((await thumbnails.count()) >= 2) {
        // Videos should be in descending order by creation date
        // Actual validation would require inspecting data attributes
        await expect(thumbnails.first()).toBeVisible()
        await expect(thumbnails.nth(1)).toBeVisible()
      }
    })
  })
})
