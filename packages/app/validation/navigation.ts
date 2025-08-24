import { z } from 'zod'
import { IdSchema } from './common'

// Navigation parameter schemas for type-safe routing

// User-related navigation params
export const UserParamsSchema = z.object({
  id: IdSchema,
})

export const UserDetailParamsSchema = UserParamsSchema

// Demo/example navigation params
export const DemoParamsSchema = z.object({
  demoId: z.string().optional(),
  variant: z.enum(['basic', 'advanced', 'custom']).optional(),
})

// Search-related navigation params
export const SearchParamsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  page: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .optional(),
})

// Settings navigation params
export const SettingsParamsSchema = z.object({
  section: z.enum(['profile', 'privacy', 'notifications', 'appearance']).optional(),
})

// Modal/sheet navigation params
export const ModalParamsSchema = z.object({
  modal: z.enum(['signin', 'signup', 'forgot-password', 'settings']).optional(),
  returnTo: z.string().optional(),
})

// Deep linking params
export const DeepLinkParamsSchema = z.object({
  token: z.string().optional(),
  redirect: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
})

// Export types for navigation params
export type UserParams = z.infer<typeof UserParamsSchema>
export type UserDetailParams = z.infer<typeof UserDetailParamsSchema>
export type DemoParams = z.infer<typeof DemoParamsSchema>
export type SearchParams = z.infer<typeof SearchParamsSchema>
export type SettingsParams = z.infer<typeof SettingsParamsSchema>
export type ModalParams = z.infer<typeof ModalParamsSchema>
export type DeepLinkParams = z.infer<typeof DeepLinkParamsSchema>

// Helper function to validate navigation params
export function validateNavParams<T extends z.ZodSchema>(
  schema: T,
  params: unknown
): z.infer<T> | null {
  const result = schema.safeParse(params)
  return result.success ? result.data : null
}

// Navigation validation helpers
export const navigationValidators = {
  user: (params: unknown) => validateNavParams(UserParamsSchema, params),
  userDetail: (params: unknown) => validateNavParams(UserDetailParamsSchema, params),
  demo: (params: unknown) => validateNavParams(DemoParamsSchema, params),
  search: (params: unknown) => validateNavParams(SearchParamsSchema, params),
  settings: (params: unknown) => validateNavParams(SettingsParamsSchema, params),
  modal: (params: unknown) => validateNavParams(ModalParamsSchema, params),
  deepLink: (params: unknown) => validateNavParams(DeepLinkParamsSchema, params),
} as const
