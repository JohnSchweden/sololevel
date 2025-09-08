# Error Handling Implementation Guide

## Overview

This document outlines the comprehensive error handling implementation added to the sololevel project. All patterns follow the guidelines in `.cursor/rules/quality/error-handling.mdc`.

## 🎯 **Goals Achieved**

✅ **React Error Boundaries** - Prevent app crashes
✅ **TanStack Query Error Handling** - Graceful API failures  
✅ **Supabase Error Handling** - Type-safe database operations
✅ **Zod Runtime Validation** - Data integrity and user-friendly errors
✅ **Fallback UI Components** - Graceful degradation
✅ **Mobile-First Testing** - E2E testing with Detox

## 📁 **File Structure**

```
packages/app/
├── components/
│   ├── ErrorBoundary.tsx          # React error boundary with retry
│   ├── ErrorBanner.tsx            # User-friendly error display
│   ├── LoadingSpinner.tsx         # Consistent loading states
│   └── __tests__/
│       └── ErrorBoundary.test.tsx # Complete test coverage
├── hooks/
│   ├── useQueryWithErrorHandling.ts    # Enhanced TanStack Query
│   └── useMutationWithErrorHandling.ts # Enhanced mutations
└── validation/
    └── api-responses.ts           # Zod schemas for API validation

packages/api/src/
├── supabase-errors.ts             # Supabase error handling utilities
└── hooks/
    └── useUser.ts                 # Example API hook with error handling

e2e/
├── jest.config.js                 # Detox Jest configuration
├── setup.js                      # E2E test helpers
└── flows/
    └── error-handling.e2e.js     # Error handling E2E tests

.detoxrc.js                        # Detox configuration
.github/workflows/test.yml         # CI/CD pipeline
```

## 🔧 **Implementation Patterns**

### 1. React Error Boundaries

**Usage:**
```typescript
import { ErrorBoundary, withErrorBoundary } from '@app/components/ErrorBoundary'

// Component wrapper
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// HOC pattern
const SafeComponent = withErrorBoundary(YourComponent)
```

**Features:**
- Automatic error catching and logging
- User-friendly error messages
- Retry functionality
- Custom fallback support

### 2. TanStack Query Error Handling

**Usage:**
```typescript
import { useQueryWithErrorHandling } from '@app/hooks/useQueryWithErrorHandling'

const { data, error, isLoading, isError, refetch } = useQueryWithErrorHandling({
  queryKey: ['user', id],
  queryFn: fetchUser,
  throwOnError: false,        // ✅ Required
  showErrorToast: true,       // User notification
  errorMessage: 'Failed to load user',
  retryCount: 3
})

// Handle in UI
if (isError) return <ErrorBanner error={error} onRetry={refetch} />
if (isLoading) return <LoadingSpinner />
```

**Features:**
- Automatic toast notifications
- Exponential backoff retry
- Error logging with context
- No crashes from unhandled errors

### 3. Supabase Error Handling

**Usage:**
```typescript
import { safeSupabaseOperation, handleSupabaseResult } from '@my/api'

// Safe operation wrapper
const result = await safeSupabaseOperation(
  () => supabase.from('users').select().eq('id', userId).single(),
  'fetchUser'
)

if (!result.success) {
  throw new Error(result.message) // User-friendly message
}

// Direct result handling
const { data, error } = await supabase.from('posts').select()
const result = handleSupabaseResult({ data, error }, 'fetchPosts')
```

**Features:**
- All `.error` properties checked
- User-friendly error messages
- Technical error logging
- Type-safe error handling

### 4. Zod Runtime Validation

**Usage:**
```typescript
import { validateApiResponse, safeParseWithDetails } from '@app/validation/api-responses'

// API response validation
const user = validateApiResponse(UserSchema, apiData, 'fetchUser')

// Form validation
const validation = validateFormData(LoginSchema, formData)
if (!validation.success) {
  setFieldErrors(validation.fieldErrors)
  return
}
```

**Features:**
- Runtime type safety
- Field-level error messages
- Detailed error reporting
- Form integration ready

### 5. UI Error Components

**ErrorBanner:**
```typescript
<ErrorBanner 
  error={error}
  onRetry={refetch}
  variant="inline"        // 'banner' | 'inline' | 'toast'
  onDismiss={onDismiss}
/>
```

**LoadingSpinner:**
```typescript
<LoadingSpinner 
  message="Loading user profile..."
  size="large"           // 'small' | 'large'
  inline={false}
/>
```

## 🧪 **Testing Strategy**

### Unit Tests
- Error boundary component tests
- Hook error handling tests
- Validation schema tests
- Error utility function tests

### Integration Tests
- Screen-level error scenarios
- API error handling flows
- Form validation integration

### E2E Tests (Detox)
- Network failure recovery
- Error message display
- Retry mechanism functionality
- Cross-platform consistency

**Run Tests:**
```bash
# Unit tests
yarn test

# E2E tests
yarn test:e2e:ios
yarn test:e2e:android

# Web E2E
yarn playwright test
```

## 📱 **Mobile-First Considerations**

### Platform-Specific Error Handling
- Network state changes
- Background/foreground transitions
- Memory warnings
- Permission errors

### Performance Impact
- Error boundaries don't affect render performance
- Toast notifications are lightweight
- Error logging is non-blocking
- Retry mechanisms use exponential backoff

## 🚀 **CI/CD Integration**

### GitHub Actions Workflow
- **Unit Tests**: Run on all PRs
- **Build Tests**: Verify cross-platform builds
- **E2E Web**: Playwright tests on all PRs
- **E2E Mobile**: iOS/Android tests on main branch only
- **Performance Tests**: Bundle size analysis
- **Security Scan**: Dependency audits

### Quality Gates
- 80% test coverage required
- No unhandled errors in tests
- Performance regression detection
- Security vulnerability scanning

## 📊 **Monitoring & Analytics**

### Error Tracking
- All errors logged with context
- No sensitive data in error messages
- Timestamp and user context included
- Stack traces for debugging

### User Experience Metrics
- Error recovery success rate
- User retry behavior
- Time to recovery
- Error message effectiveness

## 🔄 **Migration Guide**

### Updating Existing Screens

1. **Wrap with Error Boundary:**
```typescript
// Before
export function MyScreen() {
  return <MyContent />
}

// After
export function MyScreen() {
  return (
    <ErrorBoundary>
      <MyContent />
    </ErrorBoundary>
  )
}
```

2. **Update API Calls:**
```typescript
// Before
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData })

// After
const { data, error, isLoading, isError, refetch } = useQueryWithErrorHandling({
  queryKey: ['data'],
  queryFn: fetchData,
  throwOnError: false,
  showErrorToast: true
})
```

3. **Add Error UI:**
```typescript
// Add to your screen
{isError && <ErrorBanner error={error} onRetry={refetch} />}
{isLoading && <LoadingSpinner />}
```

### Best Practices

1. **Always use error boundaries** for any component that might error
2. **Never throw unhandled errors** in components
3. **Show user-friendly messages** instead of technical errors
4. **Provide retry mechanisms** for transient failures
5. **Log errors with context** for debugging
6. **Test error scenarios** in your test suites

## 🎓 **Training Resources**

- Review `.cursor/rules/quality/error-handling.mdc` for complete patterns
- Check example implementations in `detail-screen-with-error-handling.tsx`
- Run existing tests to see expected behavior
- Follow the error handling checklist for new features

## 🔧 **Troubleshooting**

### Common Issues

**Q: Error boundary not catching errors**
A: Make sure the error is thrown during render, not in event handlers. Use try/catch for event handlers.

**Q: Toast notifications not showing**
A: Verify `ToastProvider` is in your component tree and `useToastController` is available.

**Q: Supabase errors not handled**
A: Always check the `.error` property and use `safeSupabaseOperation` wrapper.

**Q: Zod validation failing**
A: Check that your schemas match the actual API response structure and use `safeParseWithDetails` for debugging.

This implementation provides a robust, user-friendly error handling system that maintains app stability while providing excellent user experience across web and mobile platforms.
