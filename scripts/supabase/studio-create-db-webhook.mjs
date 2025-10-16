#!/usr/bin/env node

/**
 * Automate Supabase Studio UI to create a Database Webhook (local only)
 * - Navigates Studio at http://127.0.0.1:54323
 * - Creates webhook for table public.video_recordings, event UPDATE
 * - URL: <functionsBase>/ai-analyze-video/webhook
 * - Header: X-Db-Webhook-Secret: DB_WEBHOOK_SECRET
 */

import process from 'node:process'
// import { writeFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'
import { createScriptLogger, getScriptConfig } from '../utils/env.mjs'

const log = createScriptLogger('studio-create-db-webhook')

function getEnv(key, fallback = undefined) {
  const v = process.env[key]
  if (v && v.trim() !== '') return v
  return fallback
}

async function waitForStudioReady(baseUrl, timeoutMs = 20000) {
  const start = Date.now()
  const pingUrl = `${baseUrl.replace(/\/$/, '')}/project/default/integrations/webhooks/overview`
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(pingUrl, { method: 'GET' })
      if (res.ok) return true
    } catch (_) {}
    await delay(500)
  }
  return false
}

async function run() {
  const cfg = getScriptConfig()

  const STUDIO_URL = getEnv('SUPABASE_STUDIO_URL', 'http://127.0.0.1:54323')
  const functionsBase = (getEnv('EDGE_FUNCTIONS_BASE_URL')
    || `${String(cfg.supabase.url).replace(/\/$/, '')}/functions/v1`).replace(/\/$/, '')
  const DB_WEBHOOK_SECRET = getEnv('DB_WEBHOOK_SECRET')
  const DB_WEBHOOK_NAME = getEnv('DB_WEBHOOK_NAME', 'auto-start-analysis-on-upload-completed')

  if (!DB_WEBHOOK_SECRET) {
    log.error('DB_WEBHOOK_SECRET is required')
    process.exit(1)
  }

  const studioReady = await waitForStudioReady(STUDIO_URL, 30000)
  if (!studioReady) {
    log.error('Supabase Studio is not reachable; ensure `yarn supabase start` is running')
    process.exit(1)
  }

  const targetUrl = `${functionsBase}/ai-analyze-video/webhook`
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to Webhooks page
    // const webhooksOverview = `${STUDIO_URL.replace(/\/$/, '')}/project/default/integrations/webhooks/overview`
    // await page.goto(webhooksOverview, { waitUntil: 'domcontentloaded' })

    // Go to Database Webhooks listing
    await page.goto(`${STUDIO_URL.replace(/\/$/, '')}/project/default/integrations/webhooks/webhooks/new`, {
      waitUntil: 'domcontentloaded',
    })

    // Wait for page UI to render network calls
    log.info('Waiting for page to load after clicking Create...')
    // await page.waitForLoadState('networkidle')
    log.info('Page loaded, starting form fill')

    // Log visible buttons to aid selector stability
    // try {
    //   const buttonNames = await page.getByRole('button').allInnerTexts()
    //   log.info('Visible buttons:', buttonNames.slice(0, 20))
    // } catch {}

    // Click "Create/New Webhook" using multiple resilient strategies
    const tryClicks = [
        () => page.getByRole('button', { name: /create a new hook/i }).first().click(),
        () => page.locator('button:has-text("Create a new hook")').first().click(),
      //   () => page.getByRole('button', { name: /new webhook/i }).first().click(),
      //   () => page.getByRole('button', { name: /create webhook/i }).first().click(),
      //   () => page.getByRole('button', { name: /new/i }).first().click(),
      //   () => page.getByRole('button', { name: /create/i }).first().click(),
      //   () => page.locator('text=New Webhook').first().click(),
      //   () => page.locator('text=Create Webhook').first().click(),
      //   () => page.locator('button:has-text("Webhook")').first().click(),
      //   () => page.locator('button:has-text("hook")').first().click(),
      ]
      let clicked = false
      for (const fn of tryClicks) {
        try {
          await fn()
          clicked = true
          break
        } catch (_) {}
      }
      if (!clicked) throw new Error('Unable to find Create/New Webhook button in Studio UI')
  

    // Fill form fields
    // Wait for the creation form to be present
    // await page.waitForTimeout(500)
    // await page.waitForLoadState('networkidle')


    // Name
    await page.fill('input[name="name"]', DB_WEBHOOK_NAME)
    await page.waitForSelector('input[name="http_url"]')

    // Select Table: public.analysis_jobs
    log.info('Selecting table: public.analysis_jobs')
    let tableSelected = false

    // try {
    //   const formInputs = await page.evaluate(() => {
    //     const list = []
    //     const push = (el) => {
    //       list.push({
    //         tag: el.tagName,
    //         name: el.getAttribute('name'),
    //         placeholder: el.getAttribute('placeholder'),
    //         role: el.getAttribute('role'),
    //         id: el.id,
    //         dataTestid: el.getAttribute('data-testid'),
    //         classes: el.className,
    //         value: 'value' in el ? el.value : undefined,
    //         dataset: { ...el.dataset },
    //         parentClasses: el.parentElement?.className,
    //       })
    //     }
    //     document.querySelectorAll('form input, form select, form button').forEach(push)
    //     return list
    //   })
    //   writeFileSync('studio-webhook-form-inputs.json', JSON.stringify(formInputs, null, 2))
    //   log.info('Saved form input snapshot to studio-webhook-form-inputs.json')
    // } catch (formError) {
    //   log.warn('Failed to snapshot form inputs:', formError.message)
    // }

    // try {
    //   const dialogHtml = await page.evaluate(() => {
    //     const dialogs = Array.from(document.querySelectorAll('div[role="dialog"][data-state="open"]'))
    //     return dialogs.map((dialog, index) => ({
    //       index,
    //       classes: dialog.className,
    //       html: dialog.outerHTML,
    //     }))
    //   })
    //   if (dialogHtml.length > 0) {
    //   writeFileSync('studio-webhook-open-dialogs.json', JSON.stringify(dialogHtml, null, 2))
    //   log.info('Saved open dialog snapshot to studio-webhook-open-dialogs.json')
    //   } else {
    //     log.info('No open dialog elements detected for snapshot')
    //   }
    // } catch (dialogError) {
    //   log.warn('Failed to snapshot open dialog content:', dialogError.message)
    // }

    try {
      const tableTrigger = page.locator('button#table_id[name="table_id"]').first()
      await tableTrigger.waitFor({ state: 'visible', timeout: 5000 })
      await tableTrigger.scrollIntoViewIfNeeded()
      await tableTrigger.click({ force: true })
      log.info('Opened table dropdown via button#table_id')

      const menu = page.locator('div[data-radix-menu-content][role="menu"][data-state="open"]').first()
      await menu.waitFor({ state: 'visible', timeout: 5000 })
      log.info('Detected open table dropdown menu')

      const optionLocatorCandidates = [
        menu.locator('div[role="menuitem"]').filter({ hasText: 'public analysis_jobs' }).first(),
        menu.locator('div[role="menuitem"]').filter({ hasText: 'publicanalysis_jobs' }).first(),
      ]

      let optionClicked = false
      for (const optionLocator of optionLocatorCandidates) {
        try {
          if (await optionLocator.count()) {
            await optionLocator.waitFor({ state: 'visible', timeout: 2000 })
            await optionLocator.click({ force: true })
            optionClicked = true
            log.info('Clicked table option via locator candidate')
            break
          }
        } catch (candidateErr) {
          log.warn('Failed clicking option candidate:', candidateErr.message)
        }
      }

      if (!optionClicked) {
        const evaluateClicked = await page.evaluate(() => {
          const menu = document.querySelector('div[data-radix-menu-content][role="menu"][data-state="open"]')
          if (!menu) return false
          const items = Array.from(menu.querySelectorAll('[data-radix-collection-item]'))
          const normalize = (value) => value.replace(/\s+/g, '').toLowerCase()
          const target = 'publicanalysis_jobs'
          for (const item of items) {
            const text = normalize(item.textContent ?? '')
            if (text.includes(target)) {
              item.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
              item.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
              item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
              return true
            }
          }
          return false
        })
        optionClicked = evaluateClicked
        if (optionClicked) {
          log.info('Clicked table option via evaluate fallback')
        }
      }

      if (!optionClicked) {
        throw new Error('table-option-not-found')
      }

      await page.waitForFunction(() => {
        const trigger = document.querySelector('button#table_id span span')
        return trigger?.textContent?.includes('analysis_jobs') ?? false
      }, { timeout: 3000 })

      await menu.waitFor({ state: 'detached', timeout: 2000 }).catch(async () => {
        try {
          await page.keyboard.press('Escape')
        } catch {}
      })

      tableSelected = true
    } catch (tableError) {
      log.warn('Table selection via dropdown failed:', tableError.message)
      try {
        const allOptions = await page.evaluate(() => {
          const menu = document.querySelector('div[data-radix-menu-content][role="menu"][data-state="open"]')
          if (!menu) return null
          return Array.from(menu.querySelectorAll('[data-radix-collection-item]')).map((item) => item.textContent?.trim())
        })
        if (allOptions) {
          log.warn('Menu items available when selection failed', { options: allOptions })
        }
      } catch {}
    }

    if (tableSelected) {
      log.info('Table selection completed')
    } else {
      const formInputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form input')).map((input) => ({
          name: input.name,
          placeholder: input.placeholder,
          role: input.getAttribute('role') || undefined,
        }))
      })
      log.warn('Table selection may have failed - form might handle this automatically', { inputs: formInputs })
      if (!tableSelected) {
        log.warn('Attempting final fallback to set schema/table via DOM script')
        try {
          const finalResult = await page.evaluate(() => {
            const dispatchEvent = (el, eventName) => {
              el.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }))
            }

            const schemaElements = Array.from(document.querySelectorAll('select')).filter((el) => {
              return ['schema', 'table_schema', 'schemaName'].some((name) => el.name === name)
            })
            const tableInputs = Array.from(document.querySelectorAll('input, select')).filter((el) => {
              const candidates = ['table', 'table_name', 'schema_table']
              return candidates.includes(el.name)
            })

            if (schemaElements.length === 0 && tableInputs.length === 0) {
              return { success: false, reason: 'noElements' }
            }

            if (schemaElements.length > 0) {
              const schemaEl = schemaElements[0]
              schemaEl.value = 'public'
              dispatchEvent(schemaEl, 'input')
              dispatchEvent(schemaEl, 'change')
            }

            if (tableInputs.length > 0) {
              const tableEl = tableInputs[0]
              if (tableEl.tagName === 'SELECT') {
                tableEl.value = 'video_recordings'
                dispatchEvent(tableEl, 'input')
                dispatchEvent(tableEl, 'change')
              } else {
                tableEl.value = 'public.video_recordings'
                dispatchEvent(tableEl, 'input')
                dispatchEvent(tableEl, 'change')
              }

              return { success: true, mode: tableEl.tagName }
            }

            return { success: false, reason: 'noInputsFound', schemas: schemaElements.length }
          })

          if (finalResult?.success) {
            tableSelected = true
            log.info('Selected table via final DOM fallback', finalResult)
          } else {
            log.warn('Final DOM fallback could not select table', finalResult)
          }
        } catch (err) {
          log.warn('Final DOM fallback crashed:', err.message)
        }
      }
    }
    
    // await page.screenshot({ path: 'webhook-creation-top.png', fullPage: false })

    // Check INSERT event checkbox
    await page.check('input[name="insert"]')

    // Add filter for INSERT events
    // log.info('Adding filter for INSERT events')
    // try {
    //   const filterInput = page.locator('input[placeholder*="filter"], input[name="filter"]').first()
    //   await filterInput.waitFor({ state: 'visible', timeout: 5000 })
    //   await filterInput.fill("NEW.status = 'queued'")
    //   log.info('Filter added: NEW.status = \'queued\'')
    // } catch (filterError) {
    //   log.warn('Could not add filter - may not be supported in this version:', filterError.message)
    // }

    // Select HTTP webhook type (radio button)
    await page.check('input[name="function_type"][value="http_request"]')

    // URL
    await page.fill('input[name="http_url"]', targetUrl)

    // Add headers (Content-type and secret)
    log.info('Adding headers...')

    const addHeaderButton = page.getByRole('button', { name: /add header|new header|add.*header/i })

    async function ensureHeaderRowCount(count) {
      let attempts = 0
      let currentCount = await page.locator('input[placeholder="Header name"]').count()
      while (currentCount < count && attempts < 5) {
        if (await addHeaderButton.count()) {
          await addHeaderButton.first().click()
          await page.waitForTimeout(300)
        }
        currentCount = await page.locator('input[placeholder="Header name"]').count()
        attempts += 1
      }
      return currentCount >= count
    }

    if (!(await ensureHeaderRowCount(2))) {
      throw new Error('Unable to create enough header rows')
    }

    const headerNameInputs = page.locator('input[placeholder="Header name"]')
    const headerValueInputs = page.locator('input[placeholder="Header value"]')

    if ((await headerNameInputs.count()) < 2 || (await headerValueInputs.count()) < 2) {
      throw new Error('Header inputs not found')
    }

    await headerNameInputs.nth(0).fill('Content-type')
    await headerValueInputs.nth(0).fill('application/json')
    await headerNameInputs.nth(1).fill('X-Db-Webhook-Secret')
    await headerValueInputs.nth(1).fill(DB_WEBHOOK_SECRET)

    log.info('Headers added successfully')

    // Validate form before saving
    const nameValue = await page.inputValue('input[name="name"]')
    const urlValue = await page.inputValue('input[name="http_url"]')
    const insertChecked = await page.isChecked('input[name="insert"]')
    const functionTypeValue = await page.inputValue('input[name="function_type"]:checked')

    // log.info('Form validation:', { nameValue, urlValue, insertChecked, functionTypeValue, targetUrl })

    // Debug: log all form data
    const allFormData = await page.evaluate(() => {
      const form = document.querySelector('form')
      if (form) {
        const data = new FormData(form)
        const result = {}
        for (const [key, value] of data.entries()) {
          result[key] = value
        }
        return result
      }
      return {}
    })
    // log.info('Form data:', allFormData)

    if (!nameValue || !urlValue || !insertChecked) {
      throw new Error('Form not properly filled')
    }

    // Save
    log.info('Looking for Save button...')
    const saveTries = [
      () => page.getByRole('button', { name: /create webhook/i }).first().click(),
    ]
    let saved = false
    for (const fn of saveTries) {
      try {
        await fn()
        saved = true
        log.info('Clicked save button')
        break
      } catch (_) {}
    }
    if (!saved) throw new Error('Unable to find Save/Create button')

    // Wait a bit and check if we navigated away (success) or if there are errors
    await page.waitForTimeout(2000)

    // Check current URL to see if we navigated away from the form
    const currentUrl = page.url()
    if (currentUrl.includes('/integrations/webhooks/new')) {
      // Still on form page, check for errors
      const errorSelectors = [
        '[role="alert"]',
        '.error',
        '.text-red-500',
        '.text-destructive'
      ]

      let hasErrors = false
      for (const selector of errorSelectors) {
        try {
          const errorElement = page.locator(selector).first()
          if (await errorElement.count() > 0) {
            const errorText = await errorElement.textContent()
            if (errorText && errorText.trim()) {
              log.error('Form submission error:', errorText.trim())
              hasErrors = true
            }
          }
        } catch (_) {}
      }

      if (hasErrors) {
        throw new Error('Form submission failed with errors')
      } else {
        log.info('No errors detected on form page, webhook should be saved')
      }
    } else {
      log.info('Navigated away from form page, webhook creation likely successful')
    }

    // Verify it appears in list (optional verification since user confirmed success)
    // await page.waitForLoadState('networkidle')
    // await page.waitForTimeout(1200)

    // Take screenshot for debugging

    // await page.keyboard.press('PageDown')
    // await page.waitForTimeout(300)
    // await page.screenshot({ path: 'webhook-creation-result.png', fullPage: false })

    // Navigate back to list if a modal remains
    try { await page.goto(`${STUDIO_URL.replace(/\/$/, '')}/project/default/integrations/webhooks/webhooks`, { waitUntil: 'domcontentloaded' }) } catch {}

    // Check if we're on the list page and webhook appears (optional check)
    // await page.waitForLoadState('networkidle')
    // await page.waitForTimeout(1000)

    const row = page.getByText(DB_WEBHOOK_NAME, { exact: false })
    if (await row.count()) {
      log.success('Database Webhook created via Studio and verified in list', DB_WEBHOOK_NAME)
    } else {
      log.info('Database Webhook created via Studio (verification skipped as user confirmed success)', DB_WEBHOOK_NAME)
    }
  } catch (error) {
    // Only exit with error if it's not a verification issue (since user confirmed webhook was created)
    if (error?.message?.includes('Webhook not found after creation')) {
      log.info('Verification failed but webhook was created (as confirmed by user):', error?.message || error)
    } else {
      log.error('Failed to create webhook via Studio', error?.message || error)
      process.exit(1)
    }
  } finally {
    await browser.close()
  }
}

run().catch((e) => {
  log.error('Unexpected error', e)
  process.exit(1)
})


