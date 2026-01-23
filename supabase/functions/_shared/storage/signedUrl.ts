/**
 * Supabase Storage signed URL helpers for external consumers (e.g. Gemini).
 * Reuses the same bucket/object parsing rules as download.ts.
 */

import { createLogger } from '../logger.ts'

const logger = createLogger('storage-signed-url')

const KNOWN_BUCKETS = ['raw', 'processed', 'thumbnails']

/**
 * Resolve a storage path into bucket and object path.
 * Mirrors the logic in download.ts for consistency.
 */
export function parseStoragePath(videoPath: string): { bucket: string; objectPath: string } {
  let bucket = 'raw'
  let objectPath = videoPath

  const normalized = videoPath.replace(/^\/*/, '')
  const firstSlash = normalized.indexOf('/')
  if (firstSlash > 0) {
    const potentialBucket = normalized.slice(0, firstSlash)
    if (KNOWN_BUCKETS.includes(potentialBucket)) {
      bucket = potentialBucket
      objectPath = normalized.slice(firstSlash + 1)
    } else {
      objectPath = normalized
    }
  } else {
    objectPath = normalized
  }
  return { bucket, objectPath }
}

/**
 * Create a signed download URL for a video in Supabase Storage.
 * Only supports storage paths; for http(s) URLs the caller should use the URL as-is.
 *
 * @param supabase - Supabase client
 * @param videoPath - Storage path (e.g. "raw/uid/file.mp4" or "uid/file.mp4")
 * @param ttlSeconds - URL TTL (default 300 = 5 minutes)
 * @returns Signed URL string
 */
export async function createSignedVideoUrl(
  supabase: any,
  videoPath: string,
  ttlSeconds = 300
): Promise<string> {
  if (/^https?:\/\//i.test(videoPath)) {
    throw new Error('createSignedVideoUrl only supports storage paths; for HTTP URLs use the URL directly')
  }

  const { bucket, objectPath } = parseStoragePath(videoPath)
  logger.info('Creating signed URL', { bucket, objectPath, ttlSeconds })

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, ttlSeconds)

  if (error || !data?.signedUrl) {
    const msg = error?.message || 'No signedUrl in response'
    logger.error('Failed to create signed URL', { bucket, objectPath, error: msg })
    throw new Error(`Failed to create signed URL (${bucket}/${objectPath}): ${msg}`)
  }

  return data.signedUrl
}
