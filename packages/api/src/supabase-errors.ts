import type { PostgrestError } from '@supabase/supabase-js'

export interface SupabaseResult<T> {
  data: T | null
  error: PostgrestError | null
}

export interface ApiResult<T> {
  success: boolean
  data?: T
  message: string
  error?: string
}

/**
 * Handles Supabase query results with proper error checking
 * Always check .error property on Supabase responses
 */
export function handleSupabaseResult<T>(result: SupabaseResult<T>, _context: string): ApiResult<T> {
  const { data, error } = result

  if (error) {
    return {
      success: false,
      data: undefined,
      message: getUserFriendlyErrorMessage(error),
      error: error.code,
    }
  }

  return {
    success: true,
    data: data as T,
    message: 'Success',
  }
}

/**
 * Maps Supabase error codes to user-friendly messages
 */
function getUserFriendlyErrorMessage(error: PostgrestError): string {
  switch (error.code) {
    case 'PGRST116': // No rows found
      return 'No data found'

    case 'PGRST301': // Row not found
      return 'The requested item could not be found'

    case '23505': // Unique constraint violation
      return 'This item already exists'

    case '23503': // Foreign key constraint violation
      return 'Cannot complete action due to related data'

    case '42501': // Insufficient privilege (RLS)
      return "You don't have permission to access this resource"

    case 'PGRST103': // Ambiguous or missing relationship
      return 'Database relationship error'

    case 'PGRST204': // Schema cache stale
      return 'Please refresh the page and try again'

    default:
      // Don't expose internal error details
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Type-safe wrapper for Supabase operations with error handling
 */
export async function safeSupabaseOperation<T>(
  operation: () => Promise<SupabaseResult<T>>,
  context: string
): Promise<ApiResult<T>> {
  try {
    const result = await operation()
    return handleSupabaseResult(result, context)
  } catch (_error) {
    return {
      success: false,
      data: undefined,
      message: 'An unexpected error occurred. Please try again.',
      error: 'UNEXPECTED_ERROR',
    }
  }
}

/**
 * Validates that required fields exist in Supabase data
 */
export function validateSupabaseData<T>(
  data: T | null,
  requiredFields: (keyof T)[],
  _context: string
): ApiResult<T> {
  if (!data) {
    return {
      success: false,
      data: undefined,
      message: 'No data received',
      error: 'NO_DATA',
    }
  }

  const missingFields = requiredFields.filter(
    (field) => data[field] === null || data[field] === undefined
  )

  if (missingFields.length > 0) {
    return {
      success: false,
      data: undefined,
      message: 'Invalid data received',
      error: 'INVALID_DATA',
    }
  }

  return {
    success: true,
    data,
    message: 'Valid data',
  }
}
