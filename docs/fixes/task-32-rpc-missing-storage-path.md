# Fix: Task 32 RPC Missing storage_path Field

## Issue

**Date:** 2025-10-21  
**Task:** Task 32 Module 4/5 - Audio Worker Integration & Client-Side Signed URL Generation  
**Severity:** HIGH (Audio playback broken)

### Problem

Audio feedback playback failed in runtime with error:
```
ERROR [AudioPlayer] Video component onError
{
  "error": {
    "code": -1008,
    "domain": "NSURLErrorDomain",
    "localizedDescription": "resource unavailable"
  }
}
```

Logs showed:
```
INFO [audioService.getFirstAudioUrlForFeedback] Using legacy audio_url (RPC)
```

### Root Cause

The RPC function `get_audio_segments_for_feedback` was never updated to return the new `storage_path` field added in Task 32.

**What was implemented:**
- ✅ Database column: `analysis_audio_segments.storage_path` (Migration 20251021000000)
- ✅ Audio worker: Stores `storage_path` when generating audio
- ✅ Client code: Prefers `storage_path` and generates signed URLs

**What was MISSED:**
- ❌ RPC function signature: Did not include `storage_path` in return columns

**Result:**
Client code always received `undefined` for `storage_path`, causing fallback to legacy `audio_url` which pointed to inaccessible storage URLs.

### Timeline

1. **Migration 20251021000000** (Task 32 Module 1): Added `storage_path` column to `analysis_audio_segments`
2. **Audio Worker** (Task 32 Module 4): Updated to store `storage_path` values
3. **Audio Service** (Task 32 Module 5): Updated to prefer `storage_path` over `audio_url`
4. **⚠️ Gap**: RPC function `get_audio_segments_for_feedback` signature never updated
5. **Runtime**: Client reads `storage_path` from RPC → always gets `undefined` → falls back to `audio_url` → playback fails

### Impact

- 🔴 **User Impact:** Audio feedback playback completely broken
- 🟡 **Scope:** All users with new audio segments generated after Task 32 Module 1
- 🟢 **Data Integrity:** No data loss (storage_path values stored correctly in DB)

### Fix

**Migration:** `supabase/migrations/20251021000001_add_storage_path_to_audio_rpc.sql`

**Changes:**
```sql
CREATE OR REPLACE FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint)
RETURNS TABLE(
  "id" bigint,
  "audio_url" "text",
  "storage_path" "text",  -- ✅ ADDED
  "duration_ms" numeric,
  "format" "text",
  "provider" "text",
  "version" "text",
  "created_at" timestamp with time zone
)
...
  SELECT
    aas.id,
    aas.audio_url,
    aas.storage_path,  -- ✅ ADDED
    aas.duration_ms,
    ...
```

### Verification

**Expected behavior after fix:**
1. Client calls `getFirstAudioUrlForFeedback(feedbackId)`
2. RPC returns audio segment with `storage_path` populated
3. Client generates signed URL from `processed` bucket using semantic path
4. Audio playback succeeds with signed URL

**Logs after fix should show:**
```
INFO [audioService] Generating signed URL from storage_path (RPC)
  storagePath: user123/videos/20251021/1234/audio/456/0.wav
```

### Prevention

**Test gap:** No integration test verified RPC returns `storage_path`

**Recommendation:** Add test:
```typescript
it('should return storage_path field from RPC', async () => {
  const { data, error } = await supabase.rpc('get_audio_segments_for_feedback', {
    feedback_item_id: testFeedbackId
  })
  
  expect(error).toBeNull()
  expect(data[0]).toHaveProperty('storage_path')
  expect(data[0].storage_path).toMatch(/^[^/]+\/videos\/\d{8}\/\d+\/audio\/\d+\/\d+\.(wav|mp3)$/)
})
```

### Related Files

- **Migration:** `supabase/migrations/20251021000001_add_storage_path_to_audio_rpc.sql`
- **Original Migration:** `supabase/migrations/20251021000000_optimize_storage_paths.sql`
- **Audio Service:** `packages/api/src/services/audioService.ts`
- **Audio Worker:** `supabase/functions/ai-analyze-video/workers/audioWorker.ts`
- **Task Doc:** `docs/tasks/tasks.md` (Task 32)

### Status

✅ **FIXED** - Migration 20251021000001 applied to local database
⏳ **Pending** - Manual QA to verify audio playback works with signed URLs

