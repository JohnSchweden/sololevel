# Memory Leak Analysis Report
**Date:** October 4, 2025  
**Scope:** packages/app, apps/expo/app, packages/ui/src  
**Tool:** scripts/ops/memory-leak-detector.mjs

## Executive Summary

Scanned 261 TypeScript files across the codebase, analyzing 14 Zustand stores, 158 useEffect hooks, 91 timers, and 12 subscriptions.

### Critical Issues Fixed
- ✅ **Auth Store Memory Leak** - `onAuthStateChange` subscription now properly cleaned up

### Issues Found
- 🟡 5 subscription cleanups flagged (4 false positives, 1 potential issue)
- 🟡 1 critical setInterval without cleanup
- 🟡 3 useEffect hooks with subscriptions lacking cleanup
- 🟢 8 potential issues with refs and store subscriptions (low risk)

## Critical Fixes Applied

### 1. Auth Store Subscription Leak (FIXED)

**File:** `packages/app/stores/auth.ts`  
**Issue:** `supabase.auth.onAuthStateChange()` creates a subscription on every `initialize()` call without cleanup.

**Impact:** 
- Memory leak accumulating on every auth initialization
- Multiple duplicate auth handlers stacking up
- Potential for stale session state updates

**Fix Applied:**
```typescript
// Store subscription reference outside store
let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null

// In initialize():
authSubscription = supabase.auth.onAuthStateChange(async (_event, session) => {
  set({ user: session?.user ?? null, session, loading: false })
})

// New cleanup method:
cleanup: () => {
  if (authSubscription) {
    authSubscription.data.subscription.unsubscribe()
    authSubscription = null
  }
  set({ user: null, session: null, loading: false, initialized: false })
}
```

## Verified Issues Requiring Attention

### 2. Frame Processor setInterval (HIGH PRIORITY)

**File:** `packages/app/features/CameraRecording/hooks/useFrameProcessor.native.ts:346`  
**Severity:** HIGH  
**Issue:** `setInterval` in useEffect without cleanup

**Impact:**
- Interval continues running after component unmounts
- CPU cycles wasted on dead component
- Battery drain on mobile devices

**Recommended Fix:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // processing logic
  }, intervalMs);
  
  return () => clearInterval(interval); // Add cleanup
}, [dependencies]);
```

### 3. Subscription Cleanup in VideoAnalysisScreen

**File:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`  
**Lines:** 516, 523  
**Severity:** MEDIUM  
**Issue:** Two useEffect hooks with subscriptions lack cleanup

**Impact:**
- Subscriptions may persist after component unmounts
- Potential state updates on unmounted component
- Small memory leak per video analysis session

**Recommended Fix:**
Review the subscriptions at these lines and ensure cleanup:
```typescript
useEffect(() => {
  const subscription = someStore.subscribe(...);
  return () => subscription.unsubscribe(); // Add cleanup
}, [dependencies]);
```

## False Positives (Verified Safe)

### feedbackStatus.ts Subscriptions
**Status:** ✅ SAFE  
The store properly implements cleanup via `unsubscribeFromAnalysis()` and `unsubscribeAll()` methods. The hook `useFeedbacksByAnalysisId` correctly calls cleanup in its useEffect return.

### Store Subscription Patterns
Several flagged store subscriptions are actually safe because:
1. They're used in component lifecycle hooks with proper cleanup
2. The stores provide `unsubscribe` methods that are called
3. Test files don't need cleanup

## Recommendations

### Immediate Actions
1. ✅ **COMPLETED:** Fix auth store subscription leak
2. ⚠️ **HIGH:** Fix setInterval in useFrameProcessor.native.ts
3. ⚠️ **MEDIUM:** Review VideoAnalysisScreen.tsx subscriptions (lines 516, 523)

### Code Review Guidelines
1. **All useEffect with subscriptions** must return cleanup function
2. **All timers** (setTimeout/setInterval) must be cleared in cleanup
3. **All event listeners** must be removed in cleanup
4. **Zustand stores with Maps** should have reset() or cleanup() methods
5. **Large objects in refs** should be set to null in cleanup

### Automated Prevention
The new `scripts/ops/memory-leak-detector.mjs` script can be:
- Run manually: `node scripts/ops/memory-leak-detector.mjs`
- Added to pre-commit hooks (optional)
- Run in CI to catch new leaks (exits with code 1 on critical issues)

## Statistics

| Metric | Count |
|--------|-------|
| Files Scanned | 261 |
| Zustand Stores | 14 |
| useEffect Hooks | 158 |
| Timers Found | 91 |
| Subscriptions Found | 12 |
| Critical Issues | 1 (fixed) |
| High Priority Issues | 1 |
| Medium Priority Issues | 3 |
| False Positives | 4 |

## Memory Management Best Practices

### useEffect Cleanup Pattern
```typescript
useEffect(() => {
  // Setup
  const subscription = something.subscribe();
  const timer = setTimeout(() => {}, 1000);
  const listener = () => {};
  element.addEventListener('event', listener);
  
  // Cleanup - ALWAYS return
  return () => {
    subscription.unsubscribe();
    clearTimeout(timer);
    element.removeEventListener('event', listener);
  };
}, [dependencies]);
```

### Zustand Store Cleanup Pattern
```typescript
export const useMyStore = create<MyStore>()(
  immer((set, get) => ({
    // State with Maps
    items: new Map(),
    subscriptions: new Map(),
    
    // ... actions ...
    
    // ALWAYS provide cleanup/reset
    cleanup: () => set((draft) => {
      // Unsubscribe all
      draft.subscriptions.forEach(unsub => unsub());
      draft.subscriptions.clear();
      
      // Clear collections
      draft.items.clear();
      
      // Reset primitives
      // ... reset other state
    }),
  }))
);
```

### Ref Cleanup Pattern
```typescript
const videoRef = useRef<HTMLVideoElement | null>(null);

useEffect(() => {
  // Use ref
  const video = videoRef.current;
  
  return () => {
    // Release large objects
    videoRef.current = null;
  };
}, []);
```

## Next Steps

1. Prioritize fixing the setInterval leak in useFrameProcessor.native.ts
2. Review and fix VideoAnalysisScreen.tsx subscriptions
3. Consider running the memory leak detector in CI pipeline
4. Add memory leak prevention to code review checklist
5. Document cleanup patterns in contributing guidelines

## Tool Usage

Run the memory leak detector:
```bash
node scripts/ops/memory-leak-detector.mjs
```

The tool will:
- Scan all TypeScript files in specified directories
- Detect common memory leak patterns
- Generate actionable reports
- Exit with error code 1 if critical issues found (CI-friendly)

## Conclusion

The codebase is generally well-maintained with proper cleanup in most stores. The critical auth store leak has been fixed. Remaining issues are manageable and mostly involve adding cleanup to a few useEffect hooks and one setInterval.

**Overall Assessment:** 🟢 GOOD (after auth fix)
- Most stores implement proper cleanup
- Subscription management is mostly solid
- A few edge cases need attention

