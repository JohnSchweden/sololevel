/**
 * Supabase Storage Video Download Utilities
 */

// Import centralized logger for Edge Functions
import { createLogger } from '../logger.ts'

const logger = createLogger('storage-download')

/**
 * Downloaded video file data
 */
export interface DownloadedVideo {
  bytes: Uint8Array
  mimeType: string
}

/**
 * Download video from Supabase Storage or HTTP URL
 */
export async function downloadVideo(
  supabase: any,
  videoPath: string,
  maxFileSizeMB = 20
): Promise<DownloadedVideo> {
  logger.info(`Resolving video source: ${videoPath}`)
  const _startResolveMs = Date.now()

  // If HTTP(S) URL, fetch directly
  if (/^https?:\/\//i.test(videoPath)) {
    const res = await fetch(videoPath)
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Failed to fetch video URL: ${res.status} ${res.statusText} ${errText}`)
    }
    const arrBuf = await res.arrayBuffer()
    const bytes = new Uint8Array(arrBuf)
    const mimeType = res.headers.get('content-type') || 'video/mp4'
    logger.info(
      `Video fetched via HTTP: ${(bytes.length / 1024 / 1024).toFixed(2)}MB, type: ${mimeType}`
    )

    const videoSizeMB = bytes.length / (1024 * 1024)
    if (videoSizeMB > maxFileSizeMB) {
      throw new Error(
        `Video is too large (${videoSizeMB.toFixed(2)}MB). Maximum allowed size is ${maxFileSizeMB}MB.`
      )
    }
    return { bytes, mimeType }
  }

  // Supabase Storage path handling: "bucket/object/path.mp4" or legacy "raw/path.mp4"
  let bucket = 'raw'
  let objectPath = videoPath

  const normalized = videoPath.replace(/^\/*/, '')
  const firstSlash = normalized.indexOf('/')
  if (firstSlash > 0) {
    bucket = normalized.slice(0, firstSlash)
    objectPath = normalized.slice(firstSlash + 1)
  }

  logger.info(`Downloading from storage bucket: ${bucket}, object: ${objectPath}`)
  const downloadStartMs = Date.now()

  const { data: videoData, error: storageError } = await supabase.storage
    .from(bucket)
    .download(objectPath)

  if (storageError || !videoData) {
    logger.error('Storage download error', { bucket, objectPath, error: storageError?.message })
    throw new Error(
      `Failed to download video from storage (${bucket}/${objectPath}): ${storageError?.message}`
    )
  }

  const videoBuffer = await videoData.arrayBuffer()
  const bytes = new Uint8Array(videoBuffer)
  const mimeType = videoData.type || 'video/mp4'

  logger.info(
    `Video downloaded: ${(bytes.length / 1024 / 1024).toFixed(2)}MB, type: ${mimeType}, elapsedMs: ${Date.now() - downloadStartMs}`
  )

  const videoSizeMB = bytes.length / (1024 * 1024)
  if (videoSizeMB > maxFileSizeMB) {
    throw new Error(
      `Video is too large (${videoSizeMB.toFixed(2)}MB). Maximum allowed size is ${maxFileSizeMB}MB.`
    )
  }

  return { bytes, mimeType }
}
