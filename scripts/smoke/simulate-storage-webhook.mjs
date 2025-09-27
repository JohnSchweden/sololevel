#!/usr/bin/env node

import crypto from 'crypto'

const url = process.argv[2] || 'http://127.0.0.1:54321/functions/v1/storage-upload-finalize'
const path = process.argv[3]
const secret = process.env.SUPABASE_STORAGE_WEBHOOK_SECRET || ''

if (!path) {
  console.error('Usage: simulate-storage-webhook <url?> <storage_path>')
  process.exit(1)
}

const body = JSON.stringify({
  type: 'OBJECT_CREATED',
  record: {
    bucket: 'raw',
    name: path,
    metadata: { mimetype: 'video/mp4' },
  },
})

const sig = secret ? crypto.createHmac('sha256', secret).update(body).digest('hex') : undefined

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(sig ? { 'x-supabase-signature': sig } : {}),
  },
  body,
})

console.log('Status:', res.status)
console.log('Body:', await res.text())


