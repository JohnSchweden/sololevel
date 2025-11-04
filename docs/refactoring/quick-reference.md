# Orchestrator Removal Quick Reference

## TL;DR
- **Problem:** 1700 LOC God Hook with 49 memoization layers
- **Solution:** Compose 14 hooks directly in VideoAnalysisScreen
- **Outcome:** 80-90% memoization reduction, better maintainability
- **Timeline:** 30 hours (~4 days) for core refactoring

---

## Task Checklist

### Phase 1: Preparation (2 hours, all parallel)
- [ ] **1.1** Document orchestrator behavior and dependencies
- [ ] **1.2** Audit all 49 memoization instances
- [ ] **1.3** Analyze VideoAnalysisLayout props (18 groups)
- [ ] **1.4** Create test coverage baseline

### Phase 2: Incremental Extraction (18 hours, sequential)
- [ ] **2.1** Extract Batch 1: useStatusBar, useHistoricalAnalysis, useAnalysisState
- [ ] **2.2** Extract Batch 2: useVideoPlayback, useVideoControls, useAutoPlayOnReady
- [ ] **2.3** Extract Batch 3: useFeedbackAudioSource, useAudioController, useVideoAudioSync
- [ ] **2.4** Extract Batch 4: useFeedbackPanel, useFeedbackCoordinator
- [ ] **2.5** Extract Batch 5: useGestureController, useAnimationController

### Phase 3: Props Restructuring (6 hours, sequential)
- [ ] **3.1** Simplify VideoAnalysisLayout props interface
- [ ] **3.2** Remove orchestrator memoization (49 instances)

### Phase 4: Cleanup (4 hours, partial parallel)
- [ ] **4.1** Delete orchestrator file (1789 LOC)
- [ ] **4.2** Update architecture documentation
- [ ] **4.3** Add integration tests for direct composition
- [ ] **4.4** Performance validation with React DevTools Profiler

### Phase 5: Advanced Optimization (4 hours, optional, parallel)
- [ ] **5.1** Implement Context for cross-cutting concerns
- [ ] **5.2** Implement Event Bus for hook coordination

---

## Validation Gates

### After Each Task
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] `yarn workspace @my/app test` passes
- [ ] Feature flag allows switching between orchestrator and direct composition
- [ ] Manual QA confirms no regressions

### Final Success Criteria
- [ ] **Functionality:** All features work identically
- [ ] **Performance:** Memoization reduced by 80-90% (49 → ~5-10)
- [ ] **Performance:** Re-render counts same or better
- [ ] **Code Quality:** Orchestrator deleted (1789 LOC removed)
- [ ] **Tests:** All tests pass, coverage maintained
- [ ] **Documentation:** Architecture docs updated

---

## Risk Mitigation

### Feature Flag Pattern
```typescript
const USE_DIRECT_COMPOSITION = process.env.USE_DIRECT_COMPOSITION === 'true'

if (USE_DIRECT_COMPOSITION) {
  // Direct hook composition (new path)
  useStatusBar(true, 'fade')
  const historical = useHistoricalAnalysis(analysisJobId ?? null)
  // ... etc
} else {
  // Orchestrator (fallback path)
  const orchestrated = useVideoAnalysisOrchestrator(props)
}
```

### Rollback Plan
- Git commit after each task
- Can revert to any previous batch if issues arise
- Keep orchestrator file until Phase 4 (final validation)

---

## Key Insights

### Why Orchestrator Memoization is Unnecessary
- **Problem:** 49 memoization layers compensate for aggregation complexity
- **Root Cause:** Massive object returned by orchestrator requires constant stabilization
- **Solution:** Pass hook results directly → no aggregation → no need for most memoization

### Memoization Breakdown
| Location | Before | After | Reduction |
|----------|--------|-------|-----------|
| Orchestrator | 49 instances | 0 (deleted) | 100% |
| VideoAnalysisScreen | 4 layers | 1-2 layers | 50-75% |
| **Total** | **53 instances** | **~5-10 instances** | **80-90%** |

### Architecture Comparison

**Before (Orchestrator Pattern):**
```
VideoAnalysisScreen
  ↓
useVideoAnalysisOrchestrator (1700 LOC, 49 memoization layers)
  ↓ (coordinates 14 hooks)
  ↓ (returns massive aggregated object)
VideoAnalysisScreen
  ↓ (adds 4 more memoization layers)
VideoAnalysisLayout
```

**After (Direct Composition):**
```
VideoAnalysisScreen
  ↓ (composes 14 hooks directly)
  ↓ (minimal composition, ~5 memoization layers)
VideoAnalysisLayout
```

---

## Agent Workflow Distribution

### Agent A (Phase 1 - Parallel)
- Task 1.1: Document orchestrator
- Task 1.2: Audit memoization

### Agent B (Phase 1 - Parallel)
- Task 1.3: Analyze props
- Task 1.4: Test baseline

### Agent C (Phase 2 - Sequential)
- Task 2.1 → 2.2 → 2.3 → 2.4 → 2.5 (full extraction chain)

### Agent D (Phase 3 - Sequential)
- Task 3.1 → 3.2 (props restructuring)

### Agent E (Phase 4 - After 4.1)
- Task 4.2: Documentation

### Agent F (Phase 4 - After 4.1)
- Task 4.3: Integration tests
- Task 4.4: Performance validation

### Agent G (Phase 5 - Optional)
- Task 5.1: Context implementation

### Agent H (Phase 5 - Optional)
- Task 5.2: Event bus implementation

---

## Common Pitfalls to Avoid

### 1. **Don't Over-Memoize**
- ❌ Memoizing every object/callback in VideoAnalysisScreen
- ✅ Only memoize what React DevTools Profiler shows is problematic

### 2. **Don't Skip Feature Flag**
- ❌ Directly replacing orchestrator without fallback
- ✅ Keep orchestrator working alongside direct composition until validation

### 3. **Don't Change Multiple Batches At Once**
- ❌ Extracting all 14 hooks in one commit
- ✅ Extract in small batches, test after each

### 4. **Don't Ignore Prop Stability**
- ❌ Passing inline object literals to VideoAnalysisLayout
- ✅ Pass hook results directly or use minimal stable composition

### 5. **Don't Delete Tests**
- ❌ Removing tests because orchestrator is gone
- ✅ Update tests to work with direct composition, add more integration tests

---

## Performance Monitoring

### React DevTools Profiler Checkpoints
1. **Baseline (with orchestrator)** - Record re-render counts for:
   - Video playback
   - Feedback item selection
   - Panel expand/collapse
   - Audio overlay show/hide

2. **After Phase 2 (all hooks extracted)** - Validate:
   - Re-render counts similar or better
   - No new unnecessary renders

3. **After Phase 3 (props restructured)** - Validate:
   - Memoization reduction didn't cause regressions
   - Layout re-renders only when props actually change

4. **After Phase 4 (orchestrator deleted)** - Final validation:
   - Overall app performance same or better
   - Memory usage reduced (fewer memoized objects in memory)

### Metrics to Track
- **Re-render Count:** VideoAnalysisLayout, VideoPlayerSection, FeedbackSection
- **Memory Usage:** Chrome DevTools Memory Profiler (heap size)
- **Memoization Count:** 49 → ~5-10 (80-90% reduction)
- **LOC:** 1789 (orchestrator) deleted, ~200 (composition) added = net -1589 LOC

---

## Questions & Answers

**Q: Can we skip some batches in Phase 2?**  
A: No. Hooks have dependencies (e.g., coordinator needs video + audio). Follow the order.

**Q: What if tests fail after extracting a batch?**  
A: Revert that batch's commit, investigate the issue, fix it, then proceed.

**Q: Can we delete the orchestrator before Phase 4?**  
A: No. Keep it as fallback until all extraction, restructuring, and validation complete.

**Q: Is Phase 5 required?**  
A: No. Context and Event Bus are optimizations. Only implement if prop drilling becomes painful.

**Q: How do we validate performance?**  
A: Use React DevTools Profiler. Record re-render counts before/after. Compare metrics.

**Q: What if we find bugs in production after deployment?**  
A: We kept the feature flag pattern. Can quickly revert to orchestrator if needed.

---

## Files Modified Summary

### Created
- `docs/refactoring/orchestrator-removal-workflow.md`
- `docs/refactoring/task-dependency-graph.mermaid`
- `docs/refactoring/orchestrator-analysis.md` (Task 1.1)
- `docs/refactoring/memoization-audit.md` (Task 1.2)
- `docs/refactoring/layout-props-analysis.md` (Task 1.3)
- `docs/refactoring/test-baseline.md` (Task 1.4)
- `docs/architecture/decisions/005-remove-orchestrator-pattern.md` (Task 4.2)

### Modified
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx` (Phase 2, 3, 4)
- `docs/spec/architecture.mermaid` (Task 4.2)
- `docs/spec/TRD.md` (Task 4.2)
- `docs/performance/react-memoization-architecture.md` (Task 4.2)

### Deleted
- `packages/app/features/VideoAnalysis/hooks/useVideoAnalysisOrchestrator.ts` (Task 4.1, 1789 LOC)

---

## Timeline Summary

| Phase | Description | Duration | Parallelizable |
|-------|-------------|----------|----------------|
| Phase 1 | Preparation & Analysis | 2 hours | ✅ Yes (4 tasks) |
| Phase 2 | Incremental Hook Extraction | 18 hours | ❌ No (sequential) |
| Phase 3 | Props Restructuring | 6 hours | ❌ No (sequential) |
| Phase 4 | Cleanup & Validation | 4 hours | ⚠️ Partial (after 4.1) |
| Phase 5 | Advanced Optimization | 4 hours | ✅ Yes (optional) |
| **Total (Core)** | **Phases 1-4** | **30 hours** | **~4 days** |
| **Total (Full)** | **Phases 1-5** | **34 hours** | **~4.5 days** |

---

## Contact & Support

If you have questions during refactoring:
1. Review this quick reference
2. Check the full workflow: `docs/refactoring/orchestrator-removal-workflow.md`
3. Review Task 56 in tasks.md for architectural context
4. Use React DevTools Profiler to validate performance at each step

**Remember:** This refactoring is an **investment in maintainability**, not a bug fix. The code works fine now. This makes it better for the future.

