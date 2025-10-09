import type { TablesInsert, TablesUpdate } from '@my/api'
import { supabase } from '@my/api'
import { safeSupabaseOperation } from '@my/api'
import { ProfileSchema, type User, validateApiResponse } from '@my/api'
import { useMutationWithErrorHandling } from './useMutationWithErrorHandling'
import { useQueryWithErrorHandling } from './useQueryWithErrorHandling'

/**
 * Fetch user profile by user_id with proper error handling
 */
export function useUser(userId: string | undefined, options?: { retry?: number | false }) {
  return useQueryWithErrorHandling({
    queryKey: ['user', userId],
    queryFn: async (): Promise<User> => {
      if (!userId) {
        throw new Error('User ID is required')
      }

      const result = await safeSupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .match({ user_id: userId })
          .single()
        return { data, error }
      }, 'useUser')

      if (!result.success) {
        throw new Error(result.message)
      }

      // Validate response with Zod
      return validateApiResponse(ProfileSchema, result.data, 'useUser')
    },
    enabled: !!userId && typeof window !== 'undefined', // Only run on client
    showErrorToast: true,
    errorMessage: 'Failed to load user profile',
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: options?.retry ?? 3,
  })
}

/**
 * Update user profile with optimistic updates
 */
export function useUpdateUser() {
  return useMutationWithErrorHandling({
    mutationFn: async (
      updateData: { user_id: string } & TablesUpdate<'profiles'>
    ): Promise<User> => {
      const { user_id, ...updates } = updateData
      const updatesPayload: TablesUpdate<'profiles'> = { ...updates }

      const result = await safeSupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .update(updatesPayload)
          .match({ user_id })
          .select()
          .single()
        return { data, error }
      }, 'useUpdateUser')

      if (!result.success) {
        throw new Error(result.message)
      }

      // Validate response with Zod
      return validateApiResponse(ProfileSchema, result.data, 'useUpdateUser')
    },
    showErrorToast: true,
    showSuccessToast: true,
    errorMessage: 'Failed to update profile',
    successMessage: 'Profile updated successfully',
    onSuccess: (_updatedUser) => {
      // Optimistically update query cache
      // queryClient.setQueryData(['user', updatedUser.user_id], updatedUser)
    },
  })
}

/**
 * Fetch current user profile
 */
export function useCurrentUser() {
  return useQueryWithErrorHandling({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<User | null> => {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        return null
      }

      const result = await safeSupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .match({ user_id: session.user.id })
          .single()
        return { data, error }
      }, 'useCurrentUser')

      if (!result.success) {
        throw new Error(result.message)
      }

      // Validate response with Zod
      return validateApiResponse(ProfileSchema, result.data, 'useCurrentUser')
    },
    showErrorToast: true,
    errorMessage: 'Failed to load your profile',
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })
}

/**
 * Create new user profile
 */
export function useCreateUser() {
  return useMutationWithErrorHandling({
    mutationFn: async (userData: TablesInsert<'profiles'>): Promise<User> => {
      const result = await safeSupabaseOperation(async () => {
        const { data, error } = await supabase.from('profiles').insert([userData]).select().single()
        return { data, error }
      }, 'useCreateUser')

      if (!result.success) {
        throw new Error(result.message)
      }

      // Validate response with Zod
      return validateApiResponse(ProfileSchema, result.data, 'useCreateUser')
    },
    showErrorToast: true,
    showSuccessToast: true,
    errorMessage: 'Failed to create profile',
    successMessage: 'Profile created successfully',
  })
}
