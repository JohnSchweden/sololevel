import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler, { handleStorageEvent } from './index'

function makeEvent(path: string, bucket = 'raw') {
  return {
    type: 'OBJECT_CREATED',
    record: {
      bucket,
      name: path,
      metadata: { mimetype: 'video/mp4' },
    },
  } as any
}

describe('storage-upload-finalize', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('rejects bad signature in handler when secret is set', async () => {
    ;(globalThis as any).Deno = { env: { get: (k: string) => (k === 'SUPABASE_STORAGE_WEBHOOK_SECRET' ? 's3cr3t' : undefined) } }
    const payload = { type: 'OBJECT_CREATED', record: { bucket: 'raw', name: 'x.mp4', metadata: { mimetype: 'video/mp4' } } }
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-supabase-signature': 'deadbeef' },
      body: JSON.stringify(payload),
    })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  it('updates video_recordings to completed when matching storage_path found', async () => {
    const db = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 123, upload_status: 'pending' }, error: null }),
    }

    const event = makeEvent('user/12345_test.mp4')

    const result = await handleStorageEvent(event, db as any)

    expect(db.from).toHaveBeenCalledWith('video_recordings')
    expect(db.update).toHaveBeenCalledWith({ upload_status: 'completed', upload_progress: 100 })
    expect(db.eq).toHaveBeenCalledWith('storage_path', 'user/12345_test.mp4')
    expect(result.status).toBe(200)
  })

  it('no-ops for non-raw bucket', async () => {
    const db = { from: vi.fn() }
    const event = makeEvent('user/vid.mp4', 'processed')
    const result = await handleStorageEvent(event, db as any)
    expect(result.status).toBe(200)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('no-ops if not a video', async () => {
    const db = { from: vi.fn() }
    const event = makeEvent('user/file.txt')
    ;(event as any).record.metadata.mimetype = 'text/plain'
    const result = await handleStorageEvent(event, db as any)
    expect(result.status).toBe(200)
    expect(db.from).not.toHaveBeenCalled()
  })
})


