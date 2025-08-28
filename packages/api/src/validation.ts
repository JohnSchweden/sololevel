import { z } from 'zod'

/**
 * Common validation schemas for API responses
 */

// Profile schema (matches Supabase profiles table)
export const ProfileSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  full_name: z.string().nullable(),
  username: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  bio: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Profile = z.infer<typeof ProfileSchema>

// Legacy User type alias for backward compatibility
export type User = Profile

/**
 * Safe parsing with detailed error reporting
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
}

export function safeParseWithDetails<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): ValidationResult<T> {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
    }
  }

  // Extract readable error messages
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.')
    return `${path}: ${issue.message}`
  })

  return {
    success: false,
    errors,
  }
}

/**
 * Validate API response data with error handling
 */
export function validateApiResponse<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const validation = safeParseWithDetails(schema, data, context)

  if (!validation.success) {
    throw new Error(`Invalid API response in ${context}: ${validation.errors?.join(', ')}`)
  }

  return validation.data!
}
