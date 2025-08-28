// Export Supabase client and types
export { supabase } from './supabase'
export type { Database, Enums, Tables } from './supabase'

// Export validation utilities
export * from './validation'

// Export error handling utilities
export * from './supabase-errors'

// Export auth utilities (to be implemented)
// export * from './auth'

// Export query hooks
export * from './hooks/useUser'
export * from './hooks/useQueryWithErrorHandling'
export * from './hooks/useMutationWithErrorHandling'
