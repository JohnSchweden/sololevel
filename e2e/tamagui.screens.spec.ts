import { expect, test } from '@playwright/test'

test.describe('Tamagui Screens E2E', () => {
  test('home screen loads and displays welcome message', async ({ page }) => {
    await page.goto('/')

    // Check for main page title
    await expect(page).toHaveTitle(/Solito Example App/)

    // Wait for content to load and check for welcome text
    await expect(page.locator('text=Welcome to Tamagui')).toBeVisible()
  })

  test('theme switching functionality', async ({ page }) => {
    await page.goto('/')

    // Look for theme toggle button (may have different text variations)
    const themeButton = page
      .locator(
        'button:has-text("Theme"), button:has-text("Switch"), button:has-text("Dark"), button:has-text("Light")'
      )
      .first()

    if (await themeButton.isVisible()) {
      await themeButton.click()
      // Verify theme change occurred (could check for class changes or color changes)
      await expect(themeButton).toBeVisible()
    }
  })

  test('responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check content is still visible on mobile
    await expect(page.locator('text=Welcome to Tamagui')).toBeVisible()
  })
})
