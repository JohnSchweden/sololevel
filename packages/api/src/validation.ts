import { z } from 'zod'

/**
 * Common validation schemas for API responses
 */

// Helper for datetime strings that accepts both ISO 8601 and PostgreSQL formats
const datetimeString = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid datetime format' })

// Helper for nullable URL strings
const nullableUrl = z.string().url().or(z.null())

// Profile schema (matches Supabase profiles table)
export const ProfileSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  full_name: z.string().nullable(),
  username: z.string().nullable(),
  avatar_url: nullableUrl,
  bio: z.string().nullable(),
  created_at: datetimeString,
  updated_at: datetimeString,
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
  _context: string
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
