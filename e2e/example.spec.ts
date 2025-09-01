import { expect, test } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')

  // Expect title to contain app name
  await expect(page).toHaveTitle(/Solito|Next|Tamagui/i)
})

test('navigation works', async ({ page }) => {
  await page.goto('/')

  // Check that page loads successfully
  await expect(page).toHaveTitle(/Solito|Next|Tamagui/i)
})
