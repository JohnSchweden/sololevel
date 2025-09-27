#!/usr/bin/env node

/**
 * [Unverified] Supabase Database Webhook Upsert Script (CI-friendly)
 * Uses centralized env loader/logger from scripts/utils/env.mjs
 */

import process from 'node:process'
import { createScriptLogger, getScriptConfig } from '../utils/env.mjs'

const log = createScriptLogger('upsertDbWebhook')

async function main() {
  const cfg = getScriptConfig()

  const {
    SUPABASE_ACCESS_TOKEN,
    SUPABASE_PROJECT_REF,
    DB_WEBHOOK_SECRET,
    EDGE_FUNCTIONS_BASE_URL,
    SUPABASE_WEBHOOK_API_BASE,
    DB_WEBHOOK_NAME = 'auto-start-analysis-on-upload-completed',
  } = process.env

  // Derive functions base from SUPABASE_URL if not provided
  const derivedFunctionsBase = `${String(cfg.supabase.url).replace(/\/$/, '')}/functions/v1`
  const functionsBase = (EDGE_FUNCTIONS_BASE_URL || derivedFunctionsBase).replace(/\/$/, '')

  const missing = []
  if (!SUPABASE_ACCESS_TOKEN) missing.push('SUPABASE_ACCESS_TOKEN')
  if (!SUPABASE_PROJECT_REF) missing.push('SUPABASE_PROJECT_REF')
  if (!DB_WEBHOOK_SECRET) missing.push('DB_WEBHOOK_SECRET')
  if (!functionsBase) missing.push('EDGE_FUNCTIONS_BASE_URL|SUPABASE_URL')

  if (missing.length) {
    log.error(`Missing required env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  // [Unverified] Default API base; override via SUPABASE_WEBHOOK_API_BASE
  const apiBase = SUPABASE_WEBHOOK_API_BASE
    || `https://api.supabase.com/v1/projects/${encodeURIComponent(SUPABASE_PROJECT_REF)}`

  const listUrl = `${apiBase}/database/webhooks` // [Unverified]
  const upsertUrl = `${apiBase}/database/webhooks` // [Unverified]

  const targetUrl = `${functionsBase}/ai-analyze-video/webhook`

  const headers = {
    Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }

  const desired = {
    name: DB_WEBHOOK_NAME,
    table: 'public.video_recordings',
    event: 'UPDATE',
    filter: "NEW.upload_status = 'completed'",
    url: targetUrl,
    include: ['record'],
    headers: [{ key: 'X-Db-Webhook-Secret', value: DB_WEBHOOK_SECRET }],
    enabled: true,
  }

  // Fetch existing webhooks
  let existing = []
  try {
    log.info('Listing existing DB webhooks', { listUrl })
    const res = await fetch(listUrl, { headers })
    if (!res.ok) throw new Error(`List failed: ${res.status}`)
    existing = await res.json()
  } catch (err) {
    log.error('[Unverified] Failed to list webhooks:', err.message || err)
    process.exit(1)
  }

  const match = (existing || []).find((w) => w?.name === desired.name || w?.url === desired.url)

  if (match) {
    const updateUrl = `${upsertUrl}/${encodeURIComponent(match.id || match.name)}`
    try {
      log.info('Updating existing webhook', { id: match.id || match.name, updateUrl })
      const res = await fetch(updateUrl, { method: 'PUT', headers, body: JSON.stringify(desired) })
      if (!res.ok) throw new Error(`Update failed: ${res.status}`)
      log.success('Webhook updated', desired.name)
      process.exit(0)
    } catch (err) {
      log.error('[Unverified] Failed to update webhook:', err.message || err)
      process.exit(1)
    }
  } else {
    try {
      log.info('Creating webhook', { upsertUrl })
      const res = await fetch(upsertUrl, { method: 'POST', headers, body: JSON.stringify(desired) })
      if (!res.ok) throw new Error(`Create failed: ${res.status}`)
      log.success('Webhook created', desired.name)
      process.exit(0)
    } catch (err) {
      log.error('[Unverified] Failed to create webhook:', err.message || err)
      process.exit(1)
    }
  }
}

main().catch((e) => {
  log.error('Unexpected error:', e)
  process.exit(1)
})


