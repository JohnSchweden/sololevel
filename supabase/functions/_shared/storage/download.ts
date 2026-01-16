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
  maxFileSizeMB = 50,
  dbLogger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; child?: (module: string) => any }
): Promise<DownloadedVideo> {
  logger.info(`Resolving video source: ${videoPath}`)
  const downloadLogger = dbLogger?.child ? dbLogger.child('storage-download') : dbLogger
  downloadLogger?.info('Resolving video source', { videoPath })

  // If HTTP(S) URL, fetch directly
  if (/^https?:\/\//i.test(videoPath)) {
    downloadLogger?.info('Fetching video from HTTP URL', { videoPath })
    try {
      const res = await fetch(videoPath)
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        const error = `Failed to fetch video URL: ${res.status} ${res.statusText} ${errText}`
        downloadLogger?.error('HTTP video fetch failed', { videoPath, status: res.status, error: errText })
        throw new Error(error)
      }
      const arrBuf = await res.arrayBuffer()
      const bytes = new Uint8Array(arrBuf)
      const mimeType = res.headers.get('content-type') || 'video/mp4'
      logger.info(
        `Video fetched via HTTP: ${(bytes.length / 1024 / 1024).toFixed(2)}MB, type: ${mimeType}`
      )
      downloadLogger?.info('Video fetched via HTTP', {
        videoPath,
        sizeMB: (bytes.length / 1024 / 1024).toFixed(2),
        mimeType
      })

      const videoSizeMB = bytes.length / (1024 * 1024)
      if (videoSizeMB > maxFileSizeMB) {
        const error = `Video is too large (${videoSizeMB.toFixed(2)}MB). Maximum allowed size is ${maxFileSizeMB}MB.`
        downloadLogger?.error('Video size exceeds limit', { videoPath, videoSizeMB, maxFileSizeMB })
        throw new Error(error)
      }
      return { bytes, mimeType }
    } catch (error) {
      downloadLogger?.error('HTTP video download error', {
        videoPath,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  // Supabase Storage path handling: "bucket/object/path.mp4" or object-only "path.mp4"
  // Only treat known bucket names as explicit bucket prefixes; default to 'raw' otherwise
  const KNOWN_BUCKETS = ['raw', 'processed', 'thumbnails']

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
      // Not a known bucket prefix, treat entire path as object path in 'raw' bucket
      objectPath = normalized
    }
  }

  logger.info(`Downloading from storage bucket: ${bucket}, object: ${objectPath}`)
  downloadLogger?.info('Downloading from storage', { bucket, objectPath })
  const downloadStartMs = Date.now()

  try {
    const { data: videoData, error: storageError } = await supabase.storage
      .from(bucket)
      .download(objectPath)

    if (storageError || !videoData) {
      logger.error('Storage download error', { bucket, objectPath, error: storageError })
      const error = `Failed to download video from storage (${bucket}/${objectPath}): ${storageError?.message || 'Unknown error'}`
      downloadLogger?.error('Storage download error', {
        bucket,
        objectPath,
        error: storageError?.message || 'Unknown error'
      })
      throw new Error(error)
    }

    const videoBuffer = await videoData.arrayBuffer()
    const bytes = new Uint8Array(videoBuffer)
    const mimeType = videoData.type || 'video/mp4'

    logger.info(
      `Video downloaded: ${(bytes.length / 1024 / 1024).toFixed(2)}MB, type: ${mimeType}, elapsedMs: ${Date.now() - downloadStartMs}`
    )
    dbLogger?.info('Video downloaded from storage', {
      bucket,
      objectPath,
      sizeMB: (bytes.length / 1024 / 1024).toFixed(2),
      mimeType,
      elapsedMs: Date.now() - downloadStartMs
    })

    const videoSizeMB = bytes.length / (1024 * 1024)
    if (videoSizeMB > maxFileSizeMB) {
      const error = `Video is too large (${videoSizeMB.toFixed(2)}MB). Maximum allowed size is ${maxFileSizeMB}MB.`
      downloadLogger?.error('Video size exceeds limit', { bucket, objectPath, videoSizeMB, maxFileSizeMB })
      throw new Error(error)
    }

    return { bytes, mimeType }
  } catch (error) {
    downloadLogger?.error('Storage download error', {
      bucket,
      objectPath,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}
