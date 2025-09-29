/**
 * Gemini Files API Client
 * Handles file upload and status polling for Gemini Files API
 */

import { createLogger } from '../logger.ts'
import type { GeminiConfig } from './config.ts'

const logger = createLogger('gemini-files-client')

/**
 * Uploaded file reference
 */
export interface GeminiFileReference {
  name: string
  uri: string
  mimeType: string
}

/**
 * Upload video to Gemini Files API
 */
export async function uploadToGemini(
  fileBytes: Uint8Array,
  mimeType: string,
  displayName: string,
  config: GeminiConfig
): Promise<GeminiFileReference> {
  logger.info(`Uploading video to Gemini Files API: ${displayName}`, {
    bytes: fileBytes.length,
    mimeType,
    keyLength: config.apiKey?.length ?? 0,
  })
  const uploadStartMs = Date.now()

  // Build streaming multipart/related payload: JSON metadata part + binary file part
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const encoder = new TextEncoder()

  const jsonMeta = JSON.stringify({ file: { display_name: displayName, mime_type: mimeType } })

  // Create a ReadableStream to stream the multipart content without buffering
  const stream = new ReadableStream({
    start(controller) {
      try {
        // Part 1: JSON metadata
        const part1Header = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`
        const part1 = encoder.encode(part1Header + jsonMeta + '\r\n')
        controller.enqueue(part1)

        // Part 2 header
        const part2Header = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
        const part2HeaderBytes = encoder.encode(part2Header)
        controller.enqueue(part2HeaderBytes)

        // Part 2: File content (streamed directly)
        controller.enqueue(fileBytes)

        // Part 2 footer
        const part2FooterBytes = encoder.encode('\r\n')
        controller.enqueue(part2FooterBytes)

        // Closing boundary
        const closing = encoder.encode(`--${boundary}--\r\n`)
        controller.enqueue(closing)

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  const response = await fetch(
    `${config.filesUploadUrl}?key=${config.apiKey}&uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: stream,
    }
  )

  logger.info(
    `Gemini upload response status: ${response.status}, elapsedMs: ${Date.now() - uploadStartMs}`
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    logger.error('Gemini Files upload failed', {
      status: response.status,
      errorText: errorText?.slice(0, 500),
    })
    throw new Error(`Gemini Files upload failed: ${response.status} - ${errorText}`)
  }

  const uploadResult = await response.json()
  // API may return either { name: "files/...", uri: "..." } or { file: { name, uri } }
  const fileName = uploadResult?.name || uploadResult?.file?.name
  const fileUri = uploadResult?.uri || uploadResult?.file?.uri

  if (!fileName) {
    logger.error('Gemini Files upload: unexpected response without name', uploadResult)
    throw new Error('No file name returned from Gemini Files API')
  }

  const uri = fileUri || `${config.apiBase}/v1beta/${fileName}`
  logger.info(`Video uploaded to Gemini Files: ${fileName}`, { uriPresent: !!fileUri })
  return { name: fileName, uri, mimeType }
}

/**
 * Get dynamic poll interval based on attempt number
 * Front-load polling: 300ms for first 5 attempts, 500ms for next 6, then 1s
 */
function getPollInterval(attempt: number): number {
  if (attempt < 5) {
    return 300 // Fast polling for first 5 attempts (1.5s total)
  } else if (attempt < 11) {
    return 500 // Medium polling for next 6 attempts (3s total)
  } else {
    return 1000 // Standard 1s polling for remaining attempts
  }
}

/**
 * Poll file status until ACTIVE
 */
export async function pollFileActive(
  fileName: string,
  config: GeminiConfig,
  options?: { maxAttempts?: number; pollInterval?: number }
): Promise<void> {
  logger.info(`Polling file status for: ${fileName}`)

  const maxAttempts = options?.maxAttempts ?? 60 // up to 60s

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Use dynamic poll interval if no fixed interval specified
    const pollInterval = options?.pollInterval ?? getPollInterval(attempt)
    let res: Response
    try {
      // Google Files API returns name like "files/abc123". The GET endpoint is v1beta/{name}
      const resourcePath = fileName.startsWith('files/') ? fileName : `files/${fileName}`
      res = await fetch(`${config.apiBase}/v1beta/${resourcePath}?key=${config.apiKey}`)
    } catch (error) {
      // Handle network errors during fetch - retry after delay
      logger.error('Network error during file polling', {
        attempt: attempt + 1,
        error: error instanceof Error ? error.message : String(error),
      })
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      continue
    }

    if (res.status === 404) {
      // File may not be visible yet; wait and retry
      logger.info(`File status check ${attempt + 1}: 404 (not ready yet)`)
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      continue
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      logger.error('File status check failed', { status: res.status, body: text?.slice(0, 300) })
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
      continue
    }

    const info = await res.json()
    logger.info(`File status check ${attempt + 1}: ${info.state}`)

    if (info.state === 'ACTIVE') {
      logger.info(`File is now ACTIVE: ${fileName}`)
      return
    }

    if (info.state === 'FAILED') {
      throw new Error(`File processing failed: ${fileName}`)
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new Error(`File did not become ACTIVE within ${maxAttempts * (options?.pollInterval ?? 1000) / 1000} seconds: ${fileName}`)
}
