import { expect, test } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')

  // Expect title to contain app name
  await expect(page).toHaveTitle(/Solito|Next|Tamagui/i)
})

test('navigation works', async ({ page }) => {
  await page.goto('/')

  // Try to find and click a demo link if it exists
  const demoLink = page.getByRole('link', { name: /demo/i })

  if (await demoLink.isVisible()) {
    await demoLink.click()
    await expect(page.url()).toContain('demo')
  }
})
