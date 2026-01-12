---
name: Fix Profile Display in Settings
overview: Fix Zod schema validation error that blocks profile fetching, handle missing profiles gracefully, then display username from profiles table in SettingsScreen.
todos:
  - id: fix-zod-schema
    content: Fix ProfileSchema avatar_url validation to properly handle null values
    status: completed
  - id: fix-useCurrentUser
    content: Handle PGRST116 in useCurrentUser to return null instead of throwing
    status: completed
    dependencies:
      - fix-zod-schema
  - id: update-settings-screen
    content: Add useCurrentUser hook and update profileUser memo to use username
    status: completed
    dependencies:
      - fix-useCurrentUser
---

# Fix Profile Display in Settings

## Root Cause

`ProfileSchema` in [`packages/api/src/validation.ts`](packages/api/src/validation.ts) had multiple validation issues:

1. **Avatar URL**: `z.string().url().nullable()` fails when `avatar_url` is `null` because Zod validates left-to-right - `z.string()` fails before `.nullable()` is considered.

2. **Datetime Fields**: `z.string().datetime()` is too strict and fails on PostgreSQL timestamp format (`2026-01-11 18:24:20.034935+00`) which doesn't match ISO 8601 exactly.

3. **Missing Profile Handling**: `useCurrentUser()` threw errors when profiles didn't exist (PGRST116), causing error toasts.

## Implementation Summary

### Part 1: Fixed Zod Schema in [`packages/api/src/validation.ts`](packages/api/src/validation.ts)

**Created reusable helpers:**

```typescript
// Helper for datetime strings that accepts both ISO 8601 and PostgreSQL formats
const datetimeString = z.string().refine(
  (val) => !Number.isNaN(Date.parse(val)),
  { message: 'Invalid datetime format' }
)

// Helper for nullable URL strings
const nullableUrl = z.string().url().or(z.null())
```

**Updated ProfileSchema:**

```typescript
export const ProfileSchema = z.object({
  id: z.number(),
  user_id: z.string().uuid(),
  full_name: z.string().nullable(),
  username: z.string().nullable(),
  avatar_url: nullableUrl,  // Fixed: handles null properly
  bio: z.string().nullable(),
  created_at: datetimeString,  // Fixed: accepts multiple formats
  updated_at: datetimeString,  // Fixed: accepts multiple formats
})
```

### Part 2: Fixed useCurrentUser Hook in [`packages/app/hooks/useUser.ts`](packages/app/hooks/useUser.ts)

**Added constant for profile fields:**

```typescript
// Profile fields to select (excludes coach_gender, coach_mode which aren't in ProfileSchema)
const PROFILE_FIELDS = 'id, user_id, username, full_name, avatar_url, bio, created_at, updated_at'
```

**Updated useCurrentUser() implementation:**

```typescript
export function useCurrentUser() {
  return useQueryWithErrorHandling({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<User | null> => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        return null
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)  // Only select fields in schema
        .match({ user_id: session.user.id })
        .single()

      // Handle "no rows found" as valid null case, not error
      if (error?.code === 'PGRST116') {
        return null
      }

      if (error) {
        throw new Error(`Failed to fetch profile: ${error.message}`)
      }

      return validateApiResponse(ProfileSchema, data, 'useCurrentUser')
    },
    showErrorToast: true,
    errorMessage: 'Failed to load your profile',
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })
}
```

**Key changes:**

- Query directly (not wrapped in `safeSupabaseOperation`) to check error code before validation
- Select only fields in `ProfileSchema` to avoid validation issues with extra fields (`coach_gender`, `coach_mode`)
- Handle PGRST116 gracefully by returning `null` instead of throwing
- Removed redundant `if (!data)` check (`.single()` guarantees data when no error)

### Part 3: SettingsScreen Already Implemented

The [`packages/app/features/Settings/SettingsScreen.tsx`](packages/app/features/Settings/SettingsScreen.tsx) was already using `useCurrentUser()` correctly:

```typescript
const { data: profile, isLoading: isLoadingProfile } = useCurrentUser()

const profileUser = useMemo(
  () =>
    user
      ? {
          id: user.id,
          name: profile?.username || profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        }
      : null,
  [user, profile]
)

<ProfileSection
  user={profileUser}
  isLoading={isLoadingUser || isLoadingProfile}
/>
```

## Fallback Chain (Graceful Degradation)

1. `profile.username` (profiles table - primary source)
2. `profile.full_name` (profiles table)
3. `user.user_metadata?.full_name` (auth metadata)
4. Email prefix (`user.email?.split('@')[0]`)
5. "User" (final fallback)

## Code Simplifications Applied

1. **Extracted repeated patterns**: Created `datetimeString` and `nullableUrl` helpers to avoid duplication
2. **Extracted field list**: Created `PROFILE_FIELDS` constant for maintainability
3. **Removed redundant checks**: Eliminated unnecessary `if (!data)` check
4. **Cleaned up comments**: Removed comments that restated obvious code

## Files Changed

1. `packages/api/src/validation.ts` - Fixed `avatar_url` and datetime validation schemas
2. `packages/app/hooks/useUser.ts` - Handle PGRST116 gracefully, select only schema fields
3. `packages/app/features/Settings/SettingsScreen.tsx` - Already correctly implemented (no changes needed)

## Testing

- ✅ Type checking passes
- ✅ Linting passes
- ✅ Profile username displays correctly
- ✅ Missing profiles handled gracefully (no error toast)
- ✅ Null avatar_url values handled correctly
- ✅ Multiple datetime formats accepted