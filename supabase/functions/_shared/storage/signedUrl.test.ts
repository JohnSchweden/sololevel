/**
 * Tests for Supabase Storage signed URL helper
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSignedVideoUrl, parseStoragePath } from './signedUrl.ts'

const createSignedUrlFn = vi.fn()

const mockSupabase = {
  storage: {
    from: vi.fn(() => ({ createSignedUrl: createSignedUrlFn }))
  }
}

describe('parseStoragePath', () => {
  it('should resolve raw/ prefix to raw bucket and rest as objectPath', () => {
    expect(parseStoragePath('raw/foo/bar.mp4')).toEqual({ bucket: 'raw', objectPath: 'foo/bar.mp4' })
  })

  it('should resolve processed/ prefix to processed bucket', () => {
    expect(parseStoragePath('processed/audio/x.wav')).toEqual({ bucket: 'processed', objectPath: 'audio/x.wav' })
  })

  it('should resolve thumbnails/ prefix to thumbnails bucket', () => {
    expect(parseStoragePath('thumbnails/uid/thumb.jpg')).toEqual({ bucket: 'thumbnails', objectPath: 'uid/thumb.jpg' })
  })

  it('should default to raw bucket for unknown prefix (e.g. uuid)', () => {
    expect(parseStoragePath('488a7161-a2c7-40dc-88ac-d27e1ea3c0b0/video.mp4')).toEqual({
      bucket: 'raw',
      objectPath: '488a7161-a2c7-40dc-88ac-d27e1ea3c0b0/video.mp4'
    })
  })

  it('should default to raw bucket and full path as objectPath when no slash', () => {
    expect(parseStoragePath('file.mp4')).toEqual({ bucket: 'raw', objectPath: 'file.mp4' })
  })
})

describe('createSignedVideoUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createSignedUrlFn.mockResolvedValue({ data: { signedUrl: 'https://storage.example.com/signed?token=abc' }, error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should throw for HTTP(S) URLs', async () => {
    await expect(createSignedVideoUrl(mockSupabase as any, 'https://example.com/video.mp4'))
      .rejects.toThrow('createSignedVideoUrl only supports storage paths; for HTTP URLs use the URL directly')
    await expect(createSignedVideoUrl(mockSupabase as any, 'http://example.com/video.mp4'))
      .rejects.toThrow('createSignedVideoUrl only supports storage paths; for HTTP URLs use the URL directly')
    expect(mockSupabase.storage.from).not.toHaveBeenCalled()
  })

  it('should return signedUrl from storage for storage path', async () => {
    const url = await createSignedVideoUrl(mockSupabase as any, 'raw/uid/video.mp4')
    expect(url).toBe('https://storage.example.com/signed?token=abc')
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('raw')
    expect(createSignedUrlFn).toHaveBeenCalledWith('uid/video.mp4', 300)
  })

  it('should use default TTL 300 when not provided', async () => {
    await createSignedVideoUrl(mockSupabase as any, 'test.mp4')
    expect(createSignedUrlFn).toHaveBeenCalledWith('test.mp4', 300)
  })

  it('should pass custom TTL', async () => {
    await createSignedVideoUrl(mockSupabase as any, 'raw/x.mp4', 600)
    expect(createSignedUrlFn).toHaveBeenCalledWith('x.mp4', 600)
  })

  it('should throw when storage returns error', async () => {
    createSignedUrlFn.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    await expect(createSignedVideoUrl(mockSupabase as any, 'raw/missing.mp4'))
      .rejects.toThrow('Failed to create signed URL (raw/missing.mp4): Not found')
  })

  it('should throw when signedUrl is missing in response', async () => {
    createSignedUrlFn.mockResolvedValue({ data: {}, error: null })
    await expect(createSignedVideoUrl(mockSupabase as any, 'raw/x.mp4'))
      .rejects.toThrow('Failed to create signed URL (raw/x.mp4): No signedUrl in response')
  })
})
