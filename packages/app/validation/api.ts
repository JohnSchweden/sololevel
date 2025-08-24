import { z } from 'zod'
import { IdSchema, EmailSchema, ISODateSchema, PaginationSchema, ApiResponseSchema } from './common'

// User-related API schemas
export const UserSchema = z.object({
  id: IdSchema,
  email: EmailSchema,
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().optional(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
})

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateUserSchema = CreateUserSchema.partial()

// Authentication API schemas
export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal('Bearer'),
})

export const AuthResponseSchema = z.object({
  user: UserSchema,
  session: AuthTokenSchema,
})

// Session/Profile API schemas
export const SessionSchema = z.object({
  user: UserSchema,
  expiresAt: ISODateSchema,
})

// API response wrappers
export const UserResponseSchema = ApiResponseSchema(UserSchema)
export const UsersResponseSchema = ApiResponseSchema(z.array(UserSchema))
export const AuthApiResponseSchema = ApiResponseSchema(AuthResponseSchema)
export const SessionResponseSchema = ApiResponseSchema(SessionSchema)

// Paginated responses
export const PaginatedUserResponseSchema = ApiResponseSchema(
  z.object({
    users: z.array(UserSchema),
    pagination: PaginationSchema.extend({
      total: z.number(),
      totalPages: z.number(),
    }),
  })
)

// Query parameters for API endpoints
export const UserQuerySchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'username', 'email']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  ...PaginationSchema.shape,
})

// File upload API schemas
export const UploadRequestSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().positive(),
})

export const UploadResponseSchema = ApiResponseSchema(
  z.object({
    uploadUrl: z.string().url(),
    fileUrl: z.string().url(),
    fileId: IdSchema,
  })
)

// Error schemas specific to API
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
})

export const ValidationErrorSchema = z.object({
  code: z.literal('VALIDATION_ERROR'),
  message: z.string(),
  errors: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
      code: z.string(),
    })
  ),
})

// Health check and status schemas
export const HealthCheckSchema = ApiResponseSchema(
  z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    timestamp: ISODateSchema,
    version: z.string(),
    uptime: z.number(),
  })
)

// Export types for API data
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type AuthToken = z.infer<typeof AuthTokenSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type Session = z.infer<typeof SessionSchema>
export type UserQuery = z.infer<typeof UserQuerySchema>
export type UploadRequest = z.infer<typeof UploadRequestSchema>
export type UploadResponse = z.infer<typeof UploadResponseSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type ValidationError = z.infer<typeof ValidationErrorSchema>

// Helper function to validate API responses
export function validateApiResponse<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    error: result.error.issues
      .map((issue: any) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', '),
  }
}
