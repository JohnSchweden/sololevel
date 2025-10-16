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

  // Check if running locally (no access token means local development)
  const isLocal = !SUPABASE_ACCESS_TOKEN
  const isHosted = !!SUPABASE_ACCESS_TOKEN

  // For local development, we need different vars
  const localMissing = []
  if (isLocal && !DB_WEBHOOK_SECRET) localMissing.push('DB_WEBHOOK_SECRET')
  if (isLocal && !functionsBase) localMissing.push('EDGE_FUNCTIONS_BASE_URL|SUPABASE_URL')

  // For hosted, we need the full set
  const hostedMissing = []
  if (isHosted && !SUPABASE_ACCESS_TOKEN) hostedMissing.push('SUPABASE_ACCESS_TOKEN')
  if (isHosted && !SUPABASE_PROJECT_REF) hostedMissing.push('SUPABASE_PROJECT_REF')
  if (isHosted && !DB_WEBHOOK_SECRET) hostedMissing.push('DB_WEBHOOK_SECRET')
  if (isHosted && !functionsBase) hostedMissing.push('EDGE_FUNCTIONS_BASE_URL|SUPABASE_URL')

  if (localMissing.length > 0) {
    log.error(`Local development requires: ${localMissing.join(', ')}`)
    process.exit(1)
  }

  if (hostedMissing.length > 0) {
    log.error(`Hosted environment requires: ${hostedMissing.join(', ')}`)
    process.exit(1)
  }

  // For local development, use local Supabase REST API with local_webhook_config table
  // For hosted, use Supabase Management API
  let listUrl, upsertUrl, headers

  if (isLocal) {
    const localApiBase = cfg.supabase.url.replace(/\/$/, '')
    listUrl = `${localApiBase}/rest/v1/local_webhook_config`
    upsertUrl = `${localApiBase}/rest/v1/local_webhook_config`
    headers = {
      'Content-Type': 'application/json',
    }
  } else {
    // [Unverified] Hosted API base; override via SUPABASE_WEBHOOK_API_BASE
    const apiBase = SUPABASE_WEBHOOK_API_BASE
      || `https://api.supabase.com/v1/projects/${encodeURIComponent(SUPABASE_PROJECT_REF)}`

    listUrl = `${apiBase}/database/webhooks` // [Unverified]
    upsertUrl = `${apiBase}/database/webhooks` // [Unverified]

    headers = {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    }
  }

  const targetUrl = `${functionsBase}/ai-analyze-video/webhook`

  // Different payload structures for local vs hosted
  let desired
  if (isLocal) {
    desired = {
      webhook_url: targetUrl,
      webhook_secret: DB_WEBHOOK_SECRET,
    }
  } else {
    desired = {
      name: DB_WEBHOOK_NAME,
      table: 'public.analysis_jobs',
      event: 'INSERT',
      filter: "NEW.status = 'queued'",
      url: targetUrl,
      include: ['record'],
      headers: [{ key: 'X-Db-Webhook-Secret', value: DB_WEBHOOK_SECRET }],
      enabled: true,
    }
  }

  // Fetch existing webhooks
  let existing = []
  try {
    log.info('Listing existing webhooks', { listUrl })
    const res = await fetch(listUrl, { headers })
    if (!res.ok) throw new Error(`List failed: ${res.status}`)
    existing = await res.json()
  } catch (err) {
    log.error('[Unverified] Failed to list webhooks:', err.message || err)
    process.exit(1)
  }

  // Match logic differs between local and hosted
  const match = (existing || []).find((w) => {
    if (isLocal) {
      return w?.webhook_url === desired.webhook_url
    } else {
      return w?.name === desired.name || w?.url === desired.url
    }
  })

  if (match) {
    const updateUrl = `${upsertUrl}?id=eq.${match.id}`
    try {
      log.info('Updating existing webhook', { id: match.id, updateUrl })
      const res = await fetch(updateUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(desired)
      })
      if (!res.ok) throw new Error(`Update failed: ${res.status}`)
      const webhookName = isLocal ? desired.webhook_url : desired.name
      log.success('Webhook updated', webhookName)
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
      const webhookName = isLocal ? desired.webhook_url : desired.name
      log.success('Webhook created', webhookName)
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


