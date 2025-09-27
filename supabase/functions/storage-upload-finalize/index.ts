import type { SupabaseClient } from '../_shared/supabase/client'
import { createServiceClientFromEnv } from '../_shared/supabase/client'

type StorageEvent = {
  type: string
  record: {
    bucket: string
    name: string
    metadata?: { mimetype?: string }
  }
}

function isVideoMime(mime?: string): boolean {
  if (!mime) return false
  return mime.startsWith('video/')
}

export async function handleStorageEvent(event: StorageEvent, db: SupabaseClient) {
  try {
    const bucket = event?.record?.bucket
    const path = event?.record?.name
    const mime = event?.record?.metadata?.mimetype

    if (bucket !== 'raw') {
      return { status: 200, body: { ok: true, reason: 'ignored: bucket' } }
    }

    if (!isVideoMime(mime)) {
      return { status: 200, body: { ok: true, reason: 'ignored: mime' } }
    }

    // Idempotent update: mark as completed if a matching row exists
    const { data: rec, error: selErr } = await db
      .from('video_recordings')
      .select('id, upload_status')
      .eq('storage_path', path)
      .single()

    if (selErr || !rec) {
      return { status: 200, body: { ok: true, reason: 'not_found' } }
    }

    if (rec.upload_status === 'completed') {
      return { status: 200, body: { ok: true, reason: 'already_completed' } }
    }

    const { error: updErr } = await db
      .from('video_recordings')
      .update({ upload_status: 'completed', upload_progress: 100 })
      .eq('storage_path', path)

    if (updErr) {
      return { status: 500, body: { ok: false, error: updErr.message } }
    }

    return { status: 200, body: { ok: true } }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return { status: 500, body: { ok: false, error: message } }
  }
}

export default async function handler(req: Request): Promise<Response> {
  // Validate webhook signature (HMAC-SHA256 of raw body)
  const secret = (globalThis as any).Deno?.env?.get('SUPABASE_STORAGE_WEBHOOK_SECRET')
  const raw = await req.text()
  if (secret) {
    const sig = req.headers.get('x-supabase-signature') || req.headers.get('X-Supabase-Signature')
    if (!sig) return new Response('missing signature', { status: 401 })
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw))
    const expected = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    if (expected !== sig) return new Response('bad signature', { status: 401 })
  }
  const payload = JSON.parse(raw) as StorageEvent
  const db = createServiceClientFromEnv()
  const result = await handleStorageEvent(payload, db)
  return new Response(JSON.stringify(result.body), { status: result.status })
}


