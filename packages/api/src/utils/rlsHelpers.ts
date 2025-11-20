/**
 * RLS (Row Level Security) Helper Functions
 *
 * Provides utilities to ensure all database operations properly enforce RLS
 * and include proper authentication and user context.
 */

import { log } from '@my/logging'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabase'

/**
 * Authentication result for RLS operations
 */
export interface AuthenticatedUser {
  user: User
  isAuthenticated: true
}

export interface UnauthenticatedUser {
  user: null
  isAuthenticated: false
  error: string
}

export type AuthenticationResult = AuthenticatedUser | UnauthenticatedUser

/**
 * Get the current authenticated user with proper error handling
 */
export async function getCurrentAuthenticatedUser(): Promise<AuthenticationResult> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      log.warn('RLS Helper', 'Authentication error', { error: error.message })
      return {
        user: null,
        isAuthenticated: false,
        error: 'Authentication failed',
      }
    }

    if (!user) {
      log.warn('RLS Helper', 'No authenticated user found')
      return {
        user: null,
        isAuthenticated: false,
        error: 'User not authenticated',
      }
    }

    log.info('RLS Helper', 'User authenticated', { userId: user.id })
    return {
      user,
      isAuthenticated: true,
    }
  } catch (error) {
    log.error('RLS Helper', 'Failed to get authenticated user', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      user: null,
      isAuthenticated: false,
      error: 'Authentication check failed',
    }
  }
}

/**
 * Ensure user is authenticated before proceeding with database operations
 */
export async function requireAuthentication(): Promise<User> {
  const authResult = await getCurrentAuthenticatedUser()

  if (!authResult.isAuthenticated) {
    // TypeScript should narrow this to UnauthenticatedUser, but let's be explicit
    const unauthResult = authResult as UnauthenticatedUser
    throw new Error(unauthResult.error)
  }

  return authResult.user
}

/**
 * Create a user-scoped query builder that automatically includes user_id filtering
 */
export function createUserScopedQuery(tableName: UserScopedTable, userId: string) {
  log.info('RLS Helper', 'Creating user-scoped query', { tableName, userId })

  // Use type assertion to work around complex Supabase typing
  return (supabase.from as any)(tableName).select('*').eq('user_id', userId)
}

/**
 * Create a user-scoped insert operation that automatically includes user_id
 */
export function createUserScopedInsert<D extends Record<string, any>>(
  tableName: UserScopedTable,
  data: D,
  userId: string
) {
  log.info('RLS Helper', 'Creating user-scoped insert', { tableName, userId })

  const dataWithUser = {
    ...data,
    user_id: userId,
  }

  // Use type assertion to work around complex Supabase typing
  return (supabase.from as any)(tableName).insert(dataWithUser).select().single()
}

/**
 * Create a user-scoped update operation that includes user_id filtering
 */
export function createUserScopedUpdate<U extends Record<string, any>>(
  tableName: UserScopedTable,
  id: number,
  updates: U,
  userId: string
) {
  log.info('RLS Helper', 'Creating user-scoped update', { tableName, id, userId })

  // Use type assertion to work around complex Supabase typing
  return (supabase.from as any)(tableName)
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId) // Critical: ensure user owns the record
    .select()
    .single()
}

/**
 * Create a user-scoped delete operation that includes user_id filtering
 */
export function createUserScopedDelete(tableName: UserScopedTable, id: number, userId: string) {
  log.info('RLS Helper', 'Creating user-scoped delete', { tableName, id, userId })

  // Use type assertion to work around complex Supabase typing
  return (supabase.from as any)(tableName).delete().eq('id', id).eq('user_id', userId) // Critical: ensure user owns the record
}

/**
 * Validate that a database operation result belongs to the authenticated user
 */
export function validateUserOwnership(data: any, userId: string, operation: string): void {
  if (!data) {
    log.warn('RLS Helper', 'No data returned from operation', { operation, userId })
    throw new Error('Record not found or access denied')
  }

  if (data.user_id && data.user_id !== userId) {
    log.error('RLS Helper', 'User ownership validation failed', {
      operation,
      userId,
      recordUserId: data.user_id,
    })
    throw new Error('Access denied: record does not belong to user')
  }

  log.info('RLS Helper', 'User ownership validated', { operation, userId })
}

/**
 * List of tables that should always include user_id filtering
 */
export const USER_SCOPED_TABLES = [
  'video_recordings',
  'analysis_jobs',
  'analysis_metrics',
  'feedback_items',
  'upload_sessions',
  'user_preferences',
  'profiles',
  'user_feedback',
] as const

export type UserScopedTable = (typeof USER_SCOPED_TABLES)[number]

/**
 * Validate that a table name is user-scoped
 */
export function isUserScopedTable(tableName: string): tableName is UserScopedTable {
  return USER_SCOPED_TABLES.includes(tableName as UserScopedTable)
}

/**
 * Audit function to check if a database operation follows RLS best practices
 */
export function auditDatabaseOperation(
  operation: 'select' | 'insert' | 'update' | 'delete',
  tableName: string,
  hasUserIdFilter: boolean,
  hasAuthentication: boolean
): { isCompliant: boolean; issues: string[] } {
  const issues: string[] = []

  if (!hasAuthentication) {
    issues.push('Missing authentication check')
  }

  if (isUserScopedTable(tableName) && !hasUserIdFilter) {
    issues.push(`Missing user_id filter for user-scoped table: ${tableName}`)
  }

  if (operation === 'insert' && isUserScopedTable(tableName) && !hasUserIdFilter) {
    issues.push(`Missing user_id in insert data for table: ${tableName}`)
  }

  const isCompliant = issues.length === 0

  if (!isCompliant) {
    log.warn('RLS Audit', 'Non-compliant database operation detected', {
      operation,
      tableName,
      issues,
    })
  } else {
    log.info('RLS Audit', 'Database operation is RLS compliant', {
      operation,
      tableName,
    })
  }

  return { isCompliant, issues }
}
