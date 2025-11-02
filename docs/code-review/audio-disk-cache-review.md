# Code Review: Audio Disk Cache Implementation (Task 52)

**Commit:** `3eb701a` - `feat(packages/app): implement audio disk cache with 4-tier resolution`  
**Branch:** `main`  
**Reviewer:** Auto (AI Assistant)  
**Date:** 2025-11-02

## Overview

Implements persistent disk caching for audio feedback segments, completing 3-tier caching parity across thumbnails, videos, and audio. Adds 780 lines across 3 files with comprehensive test coverage.

## Data Flow Analysis

### New Pattern: 4-Tier Cache Resolution

```
1. Tier 1: Zustand `feedbackAudio` store (indexed in-memory cache)
   ↓ Cache miss or stale entry
2. Tier 2: Direct file existence check (`${AUDIO_DIR}${feedbackId}.m4a`)
   ↓ Rebuilds index on cache miss (self-healing pattern from Task 51)
3. Tier 3: Generate signed URL from Supabase Storage (`getFirstAudioUrlForFeedback`)
   ↓ Network fetch succeeds
4. Tier 4: Background persistence (non-blocking download to disk)
   ↓ Updates store index for next access
```

**Why This Pattern:**
- **Dual cache validation** prevents re-downloads after app restarts when Zustand state is lost
- **Self-healing**: Direct file check rebuilds index automatically
- **Non-blocking persistence**: Playback starts immediately with signed URL while disk write happens in background
- **Consistent with Task 51**: Mirrors video caching pattern for maintainability

### Data Flow Issues Found

⚠️ **CRITICAL: File Extension Mismatch**
- `audioCache.ts` line 24: Uses `.wav` extension
- Implementation logs mention `.m4a` format
- **Actual audio format from Supabase**: `.m4a` (MPEG-4 Audio)
- **Risk**: Files cached with wrong extension, cache misses on subsequent plays
- **Fix Required**: Change `getCachedAudioPath()` to use `.m4a` extension

## Infrastructure Impact

### Storage Implications
- **New directory**: `${documentDirectory}feedback-audio/` created on first use
- **Storage limit**: 100MB hard cap with LRU eviction
- **File naming**: `${feedbackId}.wav` (should be `.m4a`)
- **No migration needed**: New feature, doesn't affect existing data

### Network Impact
- **Reduced**: Background downloads don't block UI
- **Bandwidth savings**: Subsequent plays avoid network requests
- **Supabase API calls**: Signed URL generation still happens on first play (expected)

### Platform Compatibility
- ✅ Web guard: `Platform.OS !== 'web'` prevents disk operations on web
- ✅ iOS/Android: Uses Expo FileSystem APIs (cross-platform compatible)
- ⚠️ **Web fallback**: Web continues using signed URLs (no disk cache) - acceptable

## Error, Loading, and Offline States

### Error Handling ✅
- **Disk operations**: All wrapped in try/catch with structured logging
- **Network failures**: Caught in `useFeedbackAudioSource`, errors stored in state
- **Background persistence failures**: Logged but non-blocking (playback continues)
- **Missing feedback**: Gracefully returns error state, UI can display placeholder

### Loading States ✅
- **`inFlightRef`**: Prevents duplicate requests for same feedback ID
- **State management**: `audioUrls` state tracks resolved URLs
- **No explicit loading spinner**: Delegated to parent components (appropriate)

### Offline Support ✅
- **Disk cache checked first**: Offline playback works after initial download
- **Network failure graceful**: Errors stored in `errors` state, UI can display message
- ⚠️ **First-time offline**: No audio available (expected behavior)

### Empty States
- ✅ Empty feedback items: Hook skips gracefully (`audioStatus !== 'completed'`)
- ✅ No cache: Falls back to signed URL generation
- ✅ Test coverage: Handles empty directory scenarios

## Accessibility (A11y)

**Not applicable** - This is a data fetching/caching hook, no UI components modified. Audio playback components are separate and not in scope.

## API Compatibility

### Public API Changes
- ✅ **No breaking changes**: New functions added to `audioCache.ts`
- ✅ **Backwards compatible**: Existing `useFeedbackAudioSource` hook behavior unchanged (still returns URLs)
- ✅ **Store extension**: Added `setAudioPath` action, existing `getAudioPath` still works

### Internal API Changes
- `useFeedbackAudioSource` internal logic changed but external interface identical
- Return type unchanged: `FeedbackAudioSourceState`
- Hook parameters unchanged: `(feedbackItems: FeedbackAudioItem[])`

## Dependencies

### New Dependencies
- ✅ **None added**: Uses existing `expo-file-system` (already in dependencies)
- ✅ **No heavy dependencies**: All utilities are lightweight Expo APIs

### Existing Dependencies Used
- `expo-file-system`: File operations (already required for video cache)
- `@my/logging`: Structured logging (shared dependency)
- `@my/api`: `getFirstAudioUrlForFeedback` (existing API)

## Test Quality Assessment

### Test Coverage ✅ Excellent
- **21 tests** covering all functions
- **Test ratio**: ~3:1 (536 test lines / ~180 code lines) - exceeds 1:2 requirement
- **AAA pattern**: Tests follow Arrange-Act-Assert structure
- **Edge cases**: Error paths, empty directories, eviction logic

### Test Gaps ⚠️ Minor
- **Integration tests**: No tests for `useFeedbackAudioSource` integration with cache (unit tests exist)
- **Platform-specific**: No tests for web platform guard behavior
- **Concurrent access**: No tests for race conditions (though `inFlightRef` prevents duplicates)

### Test Quality ✅ High
- Mocks properly set up (FileSystem, logging)
- Clear test descriptions
- Covers success and failure paths
- Tests validate error handling

## Schema & Database Changes

✅ **No database migrations needed**
- Cache is client-side only (disk storage)
- No new tables or columns
- Existing API (`getFirstAudioUrlForFeedback`) unchanged

## Authentication & Permissions

✅ **No auth changes**
- Uses existing signed URLs from Supabase
- RLS policies unchanged (cloud storage access remains same)
- No new permission scopes needed

## Caching Strategy

### Current Implementation
- **Memory**: Zustand store (Tier 1)
- **Disk**: Expo FileSystem (Tier 2)
- **Cloud**: Supabase signed URLs (Tier 3)

### Cache Invalidation
⚠️ **Missing**: No explicit cache invalidation on:
- Analysis deletion
- Audio re-generation (new audio segment replaces old)
- Manual cache clear from settings

**Recommendation**: Add `deleteCachedAudio()` call when analysis is deleted (future enhancement).

### Cache Warming
- ❌ **No prefetching**: Audio only cached on-demand
- **Opportunity**: Task 54 (Smart Prefetch) will address this

## Logging & Observability

### Structured Logging ✅ Excellent
- All operations logged with context (`audioCache`, `useFeedbackAudioSource`)
- Error logging includes feedback IDs and error messages
- Success logging tracks cache hits/misses
- Uses `@my/logging` consistently

### Log Gaps ⚠️ Minor
- **Performance metrics**: No timing logs for cache hits vs misses
- **Storage usage**: No periodic logging of cache size (available via `getAudioStorageUsage()`)

**Recommendation**: Add periodic cache stats logging in future optimization task.

## Critical Issues

### 🔴 HIGH PRIORITY: File Extension Mismatch

**Location**: `packages/app/features/VideoAnalysis/utils/audioCache.ts:24`

```typescript
// CURRENT (WRONG):
export function getCachedAudioPath(feedbackId: string): string {
  return `${AUDIO_DIR}${feedbackId}.wav`  // ❌ Should be .m4a
}
```

**Impact**: Files cached with `.wav` extension, but actual audio format is `.m4a`. This causes:
- Cache misses on subsequent plays (file doesn't exist at expected path)
- Wasted storage (duplicate downloads)
- Poor user experience (slower audio loading)

**Fix Required**:
```typescript
export function getCachedAudioPath(feedbackId: string): string {
  return `${AUDIO_DIR}${feedbackId}.m4a`  // ✅ Correct extension
}
```

**Also update**:
- `getAudioStorageUsage()` line 86: Filter should check `.m4a`, not `.wav`
- `evictOldestAudio()` line 117: Filter should check `.m4a`, not `.wav`
- `evictOldestAudio()` line 163: `replace('.wav', '')` should be `replace('.m4a', '')`

### ⚠️ MEDIUM PRIORITY: Missing Automatic Eviction Trigger

**Issue**: `evictOldestAudio()` implemented but never called automatically.

**Location**: No trigger after `persistAudioFile()` completes

**Impact**: Storage can exceed 100MB limit if many audio segments cached.

**Recommendation**: Add eviction check in `persistAudioFile()` after download:
```typescript
export async function persistAudioFile(...) {
  // ... download logic ...
  
  // Check and evict if needed
  const usage = await getAudioStorageUsage()
  if (usage.totalSizeMB > MAX_AUDIO_STORAGE_MB) {
    await evictOldestAudio(MAX_AUDIO_STORAGE_MB)
  }
  
  return target
}
```

**Note**: Manual eviction exists, but automatic enforcement would be better.

## Security Review

✅ **No security concerns**
- Disk cache is client-side only (no sensitive data)
- Signed URLs already validated by Supabase RLS
- File paths use `feedbackId` (not user-controlled)
- No new attack vectors introduced

## Performance Considerations

### ✅ Strengths
- **Non-blocking downloads**: Playback starts immediately
- **LRU eviction**: Prevents unbounded storage growth
- **Direct file checks**: Fast disk I/O (< 5ms typically)

### ⚠️ Potential Issues
- **Concurrent downloads**: No rate limiting on background persistence (could spike network)
- **Storage quota**: 100MB might be too small for power users (consider user-configurable limit)

### Optimization Opportunities
- Batch persistence for multiple segments
- Prefetch adjacent audio segments
- Compression for old cached files (future)

## Code Quality

### ✅ Strengths
- Clean separation of concerns (cache logic in `audioCache.ts`)
- Consistent error handling patterns
- TypeScript strict typing
- Comprehensive JSDoc comments
- Follows existing patterns from `audioCache.ts` and video cache

### ⚠️ Minor Issues
- Duplicate `checkCachedAudio()` calls in `useFeedbackAudioSource` (lines 95 and 106) - could optimize
- Magic number: `100MB` limit hardcoded (consider constant or config)

## Recommendations

### Immediate Actions
1. 🔴 **Fix file extension**: Change `.wav` to `.m4a` throughout `audioCache.ts`
2. ⚠️ **Add automatic eviction**: Trigger eviction check after downloads

### Future Enhancements
1. Add cache invalidation on analysis deletion
2. Implement cache warming (Task 54)
3. Add storage stats to settings UI
4. Consider compression for old cached audio
5. Add performance metrics logging

### Testing Additions
1. Integration test for full cache resolution flow
2. Test web platform guard behavior
3. Test concurrent access scenarios

## Conclusion

**Overall Assessment**: ✅ **APPROVE WITH FIXES**

The implementation is solid, follows established patterns, and adds comprehensive test coverage. The **file extension mismatch is critical** and must be fixed before merge. Once fixed, this is production-ready code that completes the 3-tier caching strategy.

**Estimated Fix Time**: 5 minutes (find/replace `.wav` → `.m4a` in `audioCache.ts`)

**Risk Level**: Low (after extension fix) - Feature is additive, doesn't break existing functionality.

