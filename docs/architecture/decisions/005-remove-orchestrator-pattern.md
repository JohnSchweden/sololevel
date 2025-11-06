# ADR 005: Remove Orchestrator Pattern in VideoAnalysisScreen

**Date:** 2025-01-04  
**Status:** ACCEPTED  
**Deciders:** Architecture Team  
**Affected Components:** `VideoAnalysisScreen`, `VideoAnalysisLayout`

## Problem

The `useVideoAnalysisOrchestrator` hook had grown into a "God Object" anti-pattern:
- **1789 lines of code** in a single hook
- **14 coordinated hooks** creating tight coupling
- **49 memoization layers** (defensive coding, compensating for aggregation)
- **Complex state aggregation** making debugging difficult
- **Hard to test** - must mock entire orchestrator to test component
- **Hard to maintain** - changes to one concern affect the whole system

### Symptoms
- Component re-renders felt unpredictable despite memoization
- Adding new features required understanding entire orchestrator
- Debugging data flow involved tracing through massive aggregation layer
- Testing required complex orchestrator mocks

## Solution

Replace orchestrator with **direct hook composition pattern**:

```typescript
// Before: God Object
function VideoAnalysisScreen(props) {
  const orchestrated = useVideoAnalysisOrchestrator(props)
  return <VideoAnalysisLayout {...orchestrated} />
}

// After: Direct Composition
function VideoAnalysisScreen(props) {
  // Individual hooks, each with single responsibility
  const video = useVideoPlayback(...)
  const audio = useAudioController()
  const feedback = useFeedback(...)
  // ... 10 more focused hooks
  
  // Compose props in component
  return <VideoAnalysisLayout {...composedProps} />
}
```

### Key Changes

**1. Hook Extraction** (Phase 2)
- Extracted 14 hooks from orchestrator into independent functions
- Each hook has single responsibility (e.g., video playback, audio control)
- Hooks independently memoized and optimized

**2. Props Restructuring** (Phase 3)
- Simplified `VideoAnalysisLayout` prop interface
- Grouped related props (audio: { controller, source, sync })
- Merged related state (video + playback → videoState)
- Reduced prop count from 20+ to 15

**3. Memoization Reduction** (Phase 3.2)
- Removed 90% of defensive memoization in orchestrator
- Handlers: 19 dependencies → 2 (89% reduction)
- Overall: 49 instances → 5 layers (90% reduction)

**4. Direct Composition** (Phase 4)
- Removed feature flag (`USE_DIRECT_COMPOSITION`)
- Deleted orchestrator file (1789 LOC removed)
- Component now ~400 LOC (cleaner, more readable)

## Benefits Achieved

### Maintainability
- ✅ Each hook has clear, single responsibility
- ✅ Data flow is obvious and traceable
- ✅ Changes are isolated to specific concerns
- ✅ Easier to understand for new developers

### Testability
- ✅ Hooks can be tested independently
- ✅ No need for massive orchestrator mocks
- ✅ Component tests focus on composition, not orchestration
- ✅ Test setup is simpler

### Performance
- ✅ Unnecessary memoization removed (90% reduction)
- ✅ Stable references from direct hooks
- ✅ Fewer unnecessary re-evaluations
- ✅ Memory usage reduced

### Debugging
- ✅ Clear component responsibility
- ✅ Easy to trace data flow
- ✅ React DevTools shows hook structure clearly
- ✅ Performance profiling is meaningful

## Tradeoffs

| Aspect | Before (Orchestrator) | After (Direct) |
|--------|----------------------|----------------|
| Complexity | High (1 giant hook) | Medium (14 focused hooks) |
| Learning Curve | Steep (must understand orchestrator) | Gradual (learn hooks incrementally) |
| Reusability | Low (tied to orchestrator) | High (hooks used elsewhere) |
| Documentation | Complex (interdependencies) | Simple (independent contracts) |
| Testing | Hard (global mocks) | Easy (local hooks) |

## Implementation Phases

### Phase 1: Analysis ✅
- Documented orchestrator behavior (161 LOC audit)
- Identified 49 memoization instances
- Analyzed dependencies (no circular deps)

### Phase 2: Hook Extraction ✅
- Batch 1: 6 independent hooks
- Batch 2: 4 single-dependency hooks
- Batch 3: 1 multi-dependency hook (coordinator)
- Batch 4: 2 native-only hooks

### Phase 3: Props Restructuring ✅
- Simplified `VideoAnalysisLayout` interface
- Grouped related props (audio, video state)
- Removed unnecessary memoization

### Phase 4: Cleanup ✅
- Removed feature flag
- Deleted orchestrator file
- Updated tests and imports

## Validation

✅ **Code Quality**
- All 11 tests passing
- Zero linting errors
- Zero type errors
- ~400 LOC component (clear, readable)

✅ **Performance**
- Render time: <10ms
- No performance regression
- 90% reduction in memoization overhead

✅ **Developer Experience**
- Easier to understand hook composition
- Simpler debugging (direct data flow)
- Better test structure

## Lessons Learned

1. **God Objects Are Anti-Patterns** - Even when they "work", they create maintenance debt
2. **Memoization Isn't Always Good** - 49 layers of memo revealed over-engineering
3. **Single Responsibility** - Each hook should own one concern
4. **Feature Flags Enable Gradual Migration** - Allowed safe refactoring without breaking changes
5. **TDD Catches Issues Early** - Test-driven approach caught problems immediately

## Related Decisions

- ADR 001: Authentication with Supabase
- ADR 002: State Management (Zustand + TanStack Query)
- ADR 003: Navigation with Expo Router
- ADR 004: UI Components with Tamagui

## Future Improvements

1. **Phase 5: Advanced Optimization**
   - Consider Context API for cross-cutting concerns
   - Event bus for hook coordination (if needed)
   
2. **Similar Refactorings**
   - Apply direct composition pattern to other "mega-hooks"
   - Audit other components for orchestrator anti-patterns

## References

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [God Object Anti-Pattern](https://en.wikipedia.org/wiki/God_object)
- [React Hooks Rules](https://react.dev/warnings/invalid-hook-call-warning)
- `docs/refactoring/orchestrator-removal-workflow.md` - Detailed implementation notes


