/**
 * File utilities for cross-platform file handling
 */

import { log } from '@my/logging'

/**
 * Convert a file URI to a Blob object for upload
 * Handles platform-specific URI formats and conversion
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  if (!uri || typeof uri !== 'string') {
    throw new Error('Invalid URI provided')
  }

  try {
    // For native platforms (React Native), convert file:// URIs to Blobs
    if (uri.startsWith('file://')) {
      return await convertFileUriToBlob(uri)
    }

    // For web platforms, handle blob: and other URIs
    if (uri.startsWith('blob:') || uri.startsWith('http')) {
      return await convertWebUriToBlob(uri)
    }

    throw new Error('Unsupported URI format')
  } catch (error) {
    log.error('files', 'Failed to convert URI to Blob', {
      uri,
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Error(
      `Failed to convert URI to Blob: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Convert file:// URI to Blob on native platforms
 */
async function convertFileUriToBlob(uri: string): Promise<Blob> {
  try {
    // Use fetch API to convert file:// URI to Blob
    // This works on React Native with proper file system permissions
    const response = await fetch(uri)

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`)
    }

    const blob = await response.blob()
    return blob
  } catch (error) {
    log.error('files', 'Failed to convert file URI to Blob', {
      uri,
      error: error instanceof Error ? error.message : String(error),
    })

    // Fallback: try to read file as base64 and convert to Blob
    try {
      const { readAsStringAsync, EncodingType } = await import('expo-file-system')

      // Remove file:// prefix for expo-file-system
      const filePath = uri.replace('file://', '')
      const base64Data = await readAsStringAsync(filePath, {
        encoding: EncodingType.Base64,
      })

      // Convert base64 to Blob
      return base64ToBlob(base64Data, getMimeTypeFromUri(uri))
    } catch (fallbackError) {
      log.error('files', 'Fallback file conversion also failed', {
        uri,
        fallbackError:
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      })
      throw error // Throw original error
    }
  }
}

/**
 * Convert web-compatible URIs to Blob
 */
async function convertWebUriToBlob(uri: string): Promise<Blob> {
  try {
    const response = await fetch(uri)

    if (!response.ok) {
      throw new Error(`Failed to fetch URI: ${response.status}`)
    }

    return await response.blob()
  } catch (error) {
    log.error('files', 'Failed to convert web URI to Blob', {
      uri,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  // Remove data URL prefix if present
  const cleanedBase64 = base64.replace(/^data:[^;]+;base64,/, '')

  const byteCharacters = atob(cleanedBase64)
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

/**
 * Get MIME type from URI based on file extension
 */
function getMimeTypeFromUri(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'mp4':
      return 'video/mp4'
    case 'mov':
      return 'video/quicktime'
    case 'avi':
      return 'video/x-msvideo'
    case 'mkv':
      return 'video/x-matroska'
    case 'webm':
      return 'video/webm'
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'aac':
      return 'audio/aac'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    default:
      return 'application/octet-stream'
  }
}
