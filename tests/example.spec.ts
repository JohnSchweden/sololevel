import { test, expect } from '@playwright/test'

test('home page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Solito|Next|Tamagui/i)
})

test('can navigate to demo page', async ({ page }) => {
  await page.goto('/')
  const demoLink = page.getByRole('link', { name: /demo/i })
  if (await demoLink.isVisible()) {
    await demoLink.click()
    await expect(page).toHaveURL(/demo/i)
  }
})
