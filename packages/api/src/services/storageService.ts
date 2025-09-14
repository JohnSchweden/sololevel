/**
 * Storage Service - Phase 2: Storage Integration
 * Implements storage bucket policies, rate limiting, and file management
 */

import { supabase } from '../supabase'

// Types for storage operations
export interface SignedUrlResult {
  signedUrl: string
  path: string
}

export interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: Date
  error?: string
}

export interface StorageAccessResult {
  allowed: boolean
  error?: string | null
}

export interface FileInfo {
  name: string
  size: number
  created_at: string
  updated_at: string
}

// Rate limiting storage (in-memory for now, should be Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 3600000 // 1 hour in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 50 // Max requests per hour

/**
 * Create signed upload URL with user folder isolation
 */
export async function createSignedUploadUrl(
  bucket: string,
  fileName: string,
  _contentType: string
): Promise<{ data: SignedUrlResult | null; error: string | null }> {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: 'User not authenticated' }
    }

    // Check rate limit
    const rateLimitResult = await rateLimitSignedUrls(user.id)
    if (!rateLimitResult.allowed) {
      return { data: null, error: rateLimitResult.error || 'Rate limit exceeded' }
    }

    // Create user-isolated file path
    const filePath = `${user.id}/${fileName}`

    // Create signed upload URL with 1 hour TTL
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, { upsert: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return {
      data: {
        signedUrl: data.signedUrl,
        path: filePath,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Create signed download URL with access validation
 */
export async function createSignedDownloadUrl(
  bucket: string,
  filePath: string
): Promise<{ data: SignedUrlResult | null; error: string | null }> {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: 'User not authenticated' }
    }

    // Validate file path format
    if (!filePath.includes('/')) {
      return { data: null, error: 'Invalid file path format' }
    }

    // Extract user ID from file path
    const [fileUserId] = filePath.split('/')

    // Check if user can access this file
    if (fileUserId !== user.id) {
      return { data: null, error: 'Access denied: file does not belong to user' }
    }

    // Create signed download URL with 1 hour TTL
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600)

    if (error) {
      return { data: null, error: error.message }
    }

    return {
      data: {
        signedUrl: data.signedUrl,
        path: filePath,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Rate limiting for signed URL generation
 */
export async function rateLimitSignedUrls(userId: string): Promise<RateLimitResult> {
  const now = Date.now()
  const userKey = `rate_limit_${userId}`

  // Get current rate limit data
  const currentData = rateLimitStore.get(userKey)

  // Check if window has reset
  if (!currentData || now >= currentData.resetTime) {
    // Reset the window
    const resetTime = now + RATE_LIMIT_WINDOW
    rateLimitStore.set(userKey, { count: 1, resetTime })

    return {
      allowed: true,
      remainingRequests: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: new Date(resetTime),
    }
  }

  // Check if limit exceeded
  if (currentData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: new Date(currentData.resetTime),
      error: 'Rate limit exceeded',
    }
  }

  // Increment count
  currentData.count += 1
  rateLimitStore.set(userKey, currentData)

  return {
    allowed: true,
    remainingRequests: RATE_LIMIT_MAX_REQUESTS - currentData.count,
    resetTime: new Date(currentData.resetTime),
  }
}

/**
 * Validate storage access for a file path
 */
export async function validateStorageAccess(
  filePath: string,
  userId: string
): Promise<StorageAccessResult> {
  // Service role has access to all files
  if (userId === 'service-role') {
    return { allowed: true, error: null }
  }

  // Validate file path format
  if (!filePath.includes('/')) {
    return { allowed: false, error: 'Invalid file path format' }
  }

  // Extract user ID from file path
  const [fileUserId] = filePath.split('/')

  // Check if user can access this file
  if (fileUserId !== userId) {
    return { allowed: false, error: 'Access denied: file does not belong to user' }
  }

  return { allowed: true, error: null }
}

/**
 * Delete storage file with proper authorization
 */
export async function deleteStorageFile(
  bucket: string,
  filePath: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: false, error: 'User not authenticated' }
    }

    // Validate access
    const accessResult = await validateStorageAccess(filePath, user.id)
    if (!accessResult.allowed) {
      return { data: false, error: accessResult.error || 'Access denied' }
    }

    // Delete the file
    const { error } = await supabase.storage.from(bucket).remove([filePath])

    if (error) {
      return { data: false, error: error.message }
    }

    return { data: true, error: null }
  } catch (error) {
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Get storage file information
 */
export async function getStorageFileInfo(
  bucket: string,
  filePath: string
): Promise<{ data: FileInfo | null; error: string | null }> {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: 'User not authenticated' }
    }

    // Validate access
    const accessResult = await validateStorageAccess(filePath, user.id)
    if (!accessResult.allowed) {
      return { data: null, error: accessResult.error || 'Access denied' }
    }

    // Get file info by listing the directory
    const [userFolder, fileName] = filePath.split('/')
    const { data, error } = await supabase.storage.from(bucket).list(userFolder)

    if (error) {
      return { data: null, error: error.message }
    }

    // Find the specific file
    const fileInfo = data?.find((file) => file.name === fileName)
    if (!fileInfo) {
      return { data: null, error: 'File not found' }
    }

    return {
      data: {
        name: fileInfo.name,
        size: (fileInfo as any).size || fileInfo.metadata?.size || 0,
        created_at: fileInfo.created_at || '',
        updated_at: fileInfo.updated_at || '',
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
