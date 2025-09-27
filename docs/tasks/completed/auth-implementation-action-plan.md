# Authentication Implementation Action Plan

## Overview
Complete implementation of user authentication for Solo:Level MVP with deterministic test auth mode for development and testing.

## Objectives
- Replace hardcoded user IDs with proper session-based authentication
- Implement route protection across Expo and Next.js apps
- Enable deterministic test auth for automated testing and development
- Ensure RLS compliance and security best practices

## Prerequisites
- Existing Supabase project with auth enabled
- Test user credentials available in environment variables
- Current monorepo structure with @my/* packages

## Implementation Tasks

### Phase 1: Core Auth Infrastructure ✅ COMPLETED

#### 1. Auth API Wrapper (`@my/api`) ✅ COMPLETED
**File**: `packages/api/src/auth/authClient.ts`
**DoD**: Typed Supabase auth wrapper with error handling and logging

```typescript
// Key exports:
// - signInWithPassword(email, password)
// - signOut()
// - getSession()
// - onAuthStateChange(callback)
// - getCurrentUserId()
```

**Requirements**:
- Use logger instead of console [[memory:8275611]]
- Typed error responses (no `any`)
- Correlation IDs for auth events
- Session validation helpers

#### 2. Auth Hook and Store (`@my/app`) ✅ COMPLETED
**File**: `packages/app/hooks/useAuth.ts`
**DoD**: Zustand-backed auth state with session management

```typescript
// Key exports:
// - useAuth() hook
// - authStore (Zustand)
// - Session restore on app start
// - Auth state subscription
```

**Requirements**:
- Cross-platform compatibility (Expo + Next.js)
- Session persistence and restoration
- Loading states and error handling
- Event-driven updates via Supabase auth listener

#### 3. Test Auth Bootstrap ✅ COMPLETED
**File**: `packages/app/auth/testAuthBootstrap.ts`
**DoD**: Environment-gated auto-authentication for testing

**Environment Variables**:
```bash
TEST_AUTH_ENABLED=true
TEST_AUTH_EMAIL=test@example.com
TEST_AUTH_PASSWORD=test-password-123
```

**Requirements**:
- Only active when `TEST_AUTH_ENABLED=true`
- Auto sign-in on app start if no session
- Build-time guard prevents production usage
- Structured logging for auth events

### Phase 2: Route Protection ✅ COMPLETED

#### 4. Expo Router Auth Gate ✅ COMPLETED
**File**: `apps/expo/components/AuthGate.tsx` (new) + `apps/expo/app/_layout.tsx` (updated)
**DoD**: Protected route wrapper with redirect logic

**Requirements**:
- Redirect unauthenticated users to sign-in
- No authentication flash/flicker
- Preserve intended destination for post-auth redirect
- Loading state during session check

#### 5. Next.js Route Guard ✅ COMPLETED
**File**: `apps/next/middleware.ts` (new) + `apps/next/components/AuthGate.tsx` (new)
**DoD**: Server-side auth validation and redirects

**Requirements**:
- Check Supabase auth cookie
- Redirect protected routes when unauthenticated
- Server/client hydration consistency
- No auth state flash on protected pages

#### 6. Basic Auth Screens ✅ COMPLETED
**Files**: 
- `apps/expo/app/auth/sign-in.tsx` (new)
- `apps/next/app/auth/sign-in.tsx` (new)
- Sign-out functionality integrated in useAuth hook

**DoD**: Minimal functional auth UI

**Requirements**:
- Email/password sign-in form
- Sign-out functionality
- Error display and loading states
- Tamagui styling consistency [[memory:7815280]]

### Phase 3: Security and Data Integration ✅ COMPLETED

#### 7. Remove Hardcoded User IDs ✅ COMPLETED
**File**: `packages/app/hooks/useVideoProcessing.ts` (updated)
**DoD**: Replace `'current-user'` with session-derived user ID

**Current Issue**:
```typescript
// ❌ Remove this hardcoded value
userId: 'current-user'
```

**Solution**:
```typescript
// ✅ Use authenticated user ID
const { userId } = useAuth()
if (!userId) throw new Error('User not authenticated')
```

#### 8. Edge Function Security ✅ COMPLETED
**File**: `supabase/functions/ai-analyze-video/routes/handleStartAnalysis.ts` (updated)
**DoD**: Remove client-supplied userId parameter

**Requirements**:
- Extract user ID from JWT token server-side
- Validate user owns the video storage path
- Update API specification in TRD
- Remove userId from request schema

#### 9. RLS Verification ✅ COMPLETED
**DoD**: Audit all database operations for proper RLS compliance

**Requirements**:
- All `@my/api` calls use authenticated Supabase client
- No service-role key usage on client side
- Verify `video_recordings` and `analysis_jobs` queries filter by `auth.uid()`
- Test RLS policies with different user contexts

### Phase 4: Testing Infrastructure ✅ COMPLETED

#### 10. Unit Tests ✅ COMPLETED
**Files**: 
- `packages/app/hooks/__tests__/useAuth.test.tsx` (implemented)
- `packages/api/src/auth/__tests__/authClient.test.ts` (implemented)
- `packages/app/auth/__tests__/testAuthBootstrap.test.ts` (implemented)
- `packages/app/stores/__tests__/auth.test.ts` (implemented)

**DoD**: Behavior-focused tests with 1:2 test-to-code ratio [[memory:8157340]]

**Requirements**:
- Test user interactions, not implementation details [[memory:8911853]]
- Mock external dependencies only
- Use established mock patterns from codebase
- Maximum 2-3 tests initially per component

#### 11. Integration Tests ✅ COMPLETED
**Files**: 
- `packages/app/__tests__/authRouteProtection.integration.test.ts` (implemented)
- `packages/app/__tests__/authFlow.e2e.test.ts` (implemented)
- `packages/app/auth/__tests__/authIntegration.test.ts` (implemented)

**DoD**: Route protection and auth flow testing

**Requirements**:
- Test AuthGate redirect behavior
- Verify protected route access control
- Test session restoration on app restart
- Cross-platform compatibility validation

#### 12. E2E Test Setup ✅ COMPLETED
**Files**: 
- `playwright.config.ts` (updated with global setup)
- `e2e/global-setup.ts` (implemented)
- `e2e/auth-preauth.spec.ts` (implemented)
- `e2e/setup-test.spec.ts` (implemented)

**DoD**: Pre-authenticated test sessions

**Requirements**:
- Global setup signs in test user automatically
- Persist authentication state across tests
- All E2E tests run with authenticated context
- No manual login steps in individual tests

### Phase 5: Documentation and Configuration

#### 13. Environment Configuration ✅ COMPLETED
**Files**: 
- `env.example` (updated with TEST_AUTH_* variables)
- `env.dev.example` (updated with TEST_AUTH_* variables)
- `env.prod.example` (updated with TEST_AUTH_* variables)

**DoD**: Document all auth-related environment variables

```bash
# Test Authentication (dev/test only)
TEST_AUTH_ENABLED=false
TEST_AUTH_EMAIL=
TEST_AUTH_PASSWORD=

# Supabase Auth Configuration
SUPABASE_AUTH_REDIRECT_URL_NATIVE=
SUPABASE_AUTH_REDIRECT_URL_WEB=
```

#### 14. TRD Updates ✅ COMPLETED
**File**: `docs/spec/TRD.md`
**DoD**: Comprehensive auth specification

**Sections to Add/Update**:
- Functional Requirements (expand auth section)
- API Specifications (remove client userId parameter)
- Security Considerations (auth flows and RLS)
- Testing Strategy (auth-specific test cases)
- Environment Configuration (test auth mode)

#### 15. Architecture Updates ✅ COMPLETED
**File**: `docs/spec/architecture.mermaid`
**DoD**: Visual representation of auth flows

**Updates Required**:
- Show AuthGate in client layer
- Illustrate auth state flow between components
- Document RLS enforcement path
- Add test auth bootstrap notation

#### 16. Status Documentation ✅ COMPLETED
**File**: `docs/spec/status.md`
**DoD**: Track implementation progress and decisions

**Content**:
- Auth implementation milestones
- Technical decisions and rationale
- Known limitations and future enhancements
- Testing coverage and validation results

## Implementation Sequence

### Week 1: Foundation
1. Auth API wrapper
2. useAuth hook and store
3. Test auth bootstrap
4. Remove hardcoded user IDs

### Week 2: Protection
5. Expo Router auth gate
6. Next.js route guard  
7. Basic auth screens
8. Edge function security updates

### Week 3: Testing & Polish
9. RLS verification and fixes
10. Unit and integration tests
11. E2E test setup
12. Documentation updates

## Success Criteria

### Functional
- [x] All protected routes require authentication
- [x] Test auth mode enables seamless development workflow
- [x] No hardcoded user IDs remain in codebase
- [x] RLS policies enforce proper data access control

### Technical
- [x] Auth state persists across app restarts
- [x] Cross-platform compatibility (iOS/Android/Web)
- [x] Proper error handling and user feedback
- [x] Structured logging for all auth events

### Testing
- [x] E2E tests run with pre-authenticated sessions
- [x] Unit tests cover critical auth behaviors (45+ tests passing)
- [x] Integration tests verify route protection
- [x] Manual testing validates user experience

## Risk Mitigation

### Development Risks
- **Risk**: Test auth credentials leaked to production
- **Mitigation**: Build-time guards and environment validation

### Security Risks
- **Risk**: RLS bypass through client manipulation
- **Mitigation**: Server-side user ID extraction from JWT

### UX Risks
- **Risk**: Authentication state flicker on app start
- **Mitigation**: Proper loading states and session restoration

## Dependencies

### Internal
- `@my/api` - Supabase client wrapper
- `@my/app` - Business logic and hooks
- `@my/ui` - Auth form components

### External
- `@supabase/supabase-js` - Auth client
- `expo-router` - Route protection
- `next.js` - Middleware and SSR auth

## Rollback Plan

### Immediate Rollback
- Revert to hardcoded user ID temporarily
- Disable test auth bootstrap
- Remove route protection

### Data Integrity
- RLS policies remain active
- No data migration required
- Session cleanup on rollback

## Monitoring

### Auth Events
- Sign-in success/failure rates
- Session duration and renewal
- Route protection effectiveness

### Performance
- Auth check latency
- Session restoration time
- Route redirect performance

## Future Enhancements

### Phase 2 Features
- OAuth providers (Apple, Google)
- Magic link authentication
- Email verification flows
- Password reset functionality

### Advanced Features
- Multi-factor authentication
- Session management dashboard
- Advanced security policies
- Audit logging and compliance

---

**Document Version**: 3.0  
**Last Updated**: 2025-09-24  
**Owner**: Engineering Team  
**Status**: ✅ **100% IMPLEMENTATION COMPLETE** (16/16 tasks completed)
