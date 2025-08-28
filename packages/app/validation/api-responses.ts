import { z } from 'zod'

/**
 * Common validation schemas for API responses
 */

// Base response schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: z.string().optional(),
})

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

// Post schema (example)
export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string(),
  author_id: z.string().uuid(),
  published: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Post = z.infer<typeof PostSchema>

// Paginated response schema
export const PaginatedResponseSchema = <T>(itemSchema: z.ZodType<T>) =>
  z.object({
    data: z.array(itemSchema),
    count: z.number().int().min(0),
    page: z.number().int().min(1),
    per_page: z.number().int().min(1),
    total_pages: z.number().int().min(0),
  })

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

/**
 * Validate form data with user-friendly error formatting
 */
export function validateFormData<T>(
  schema: z.ZodType<T>,
  data: unknown
):
  | { success: true; data: T }
  | {
      success: false
      fieldErrors: Record<string, string[]>
    } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Format errors for form display
  const fieldErrors: Record<string, string[]> = {}

  result.error.issues.forEach((issue) => {
    const field = issue.path.join('.')
    if (!fieldErrors[field]) {
      fieldErrors[field] = []
    }
    fieldErrors[field].push(issue.message)
  })

  return { success: false, fieldErrors }
}

/**
 * Common validation patterns
 */
export const CommonValidation = {
  // UUID validation
  uuid: () => z.string().uuid('Invalid ID format'),

  // Email validation
  email: () => z.string().email('Invalid email address'),

  // Password validation
  password: () =>
    z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),

  // URL validation
  url: () => z.string().url('Invalid URL format'),

  // Non-empty string
  nonEmptyString: (message = 'This field is required') => z.string().min(1, message),

  // Positive integer
  positiveInt: () => z.number().int().positive('Must be a positive number'),

  // Date string validation
  dateString: () => z.string().datetime('Invalid date format'),
}
