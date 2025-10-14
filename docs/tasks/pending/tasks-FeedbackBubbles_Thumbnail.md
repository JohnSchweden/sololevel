# Tasks

---

### Task 31: Video Thumbnail Cloud Storage Migration [P1] 🔄 PENDING
**Effort:** 1 day | **Priority:** P1 (Future optimization) | **Depends on:** Task 30
**User Story:** US-HI-01a (Videos Section - Horizontal Thumbnail Gallery)

@step-by-step.md - Migrate thumbnail storage from client-side device storage to Supabase Storage with CDN-backed delivery.

**OBJECTIVE:** Move thumbnails from client-side storage (local file URIs/data URLs in `metadata.thumbnailUri`) to Supabase Storage `processed` bucket for CDN-backed delivery, add dedicated `thumbnail_url` column, and update cache retrieval to use cloud URLs.

**RATIONALE:**
- **Current State (Task 30):** Thumbnails stored as client-side URIs in `metadata.thumbnailUri` JSONB field
  - Native: `file://` local file URIs stored on device
  - Web: `data:` URLs (base64) stored in browser
- **Future Goal (Task 31):** Cloud-hosted thumbnails with CDN delivery
  - Faster load times via CDN caching
  - Reduced client storage usage
  - Centralized thumbnail management
  - Better cross-device consistency

**ARCHITECTURE ALIGNMENT:**
- Storage: Supabase Storage `processed` bucket with public read access
- Database: Dedicated `thumbnail_url` TEXT column with index for performance
- CDN: Automatic via Supabase Storage public URLs
- Cache: Update retrieval to fetch cloud URLs instead of local URIs
- Backward compatibility: Fallback to `metadata.thumbnailUri` for old records

**CURRENT STATE:**
- ✅ Thumbnails generated during compression (Task 30 Module 2/3)
- ✅ Local URIs stored in `metadata.thumbnailUri` (Task 30 Module 5)
- ✅ Cache retrieval from database (Task 30 Module 5)
- ❌ No cloud storage upload
- ❌ No dedicated `thumbnail_url` column
- ❌ No Supabase Storage bucket configuration
- ❌ No CDN delivery

**SCOPE:**

#### Module 1: Database Schema Update [from Task 30 Module 1]
**Summary:** Add `thumbnail_url` column to `video_recordings` table for cloud storage URLs.

**Cross-reference:** Deferred from Task 30 Module 1 - Database Schema Update

**File:** `supabase/migrations/[timestamp]_add_thumbnail_url.sql`

**Tasks:**
- [ ] Create migration to add `thumbnail_url TEXT` column
- [ ] Add index on `thumbnail_url` for query performance
- [ ] Update RLS policies (no changes needed - inherits from row policies)
- [ ] Test migration on local Supabase instance
- [ ] Update TypeScript types in `packages/api/types/database.ts`

**SQL Schema:**
```sql
-- Add thumbnail_url column to video_recordings
ALTER TABLE video_recordings 
ADD COLUMN thumbnail_url TEXT;

-- Add index for query performance
CREATE INDEX idx_video_recordings_thumbnail_url 
ON video_recordings(thumbnail_url) 
WHERE thumbnail_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN video_recordings.thumbnail_url IS 
'Public URL to video thumbnail in Supabase Storage (processed bucket)';
```

**Acceptance Criteria:**
- [ ] Migration runs without errors on local Supabase
- [ ] Column accepts NULL and TEXT values
- [ ] Index created successfully
- [ ] TypeScript types updated and type-check passes
- [ ] Existing data unaffected (column defaults to NULL)

#### Module 2: Supabase Storage Upload Service [from Task 30 Module 4]
**Summary:** Upload thumbnail to Supabase Storage `processed` bucket and get CDN URL.

**Cross-reference:** Deferred from Task 30 Module 4 - Supabase Storage Upload

**File:** `packages/api/src/services/videoThumbnailService.ts` (modify shared file)

**Tasks:**
- [ ] Create `uploadVideoThumbnail(thumbnailUri, videoId, userId)` function
- [ ] Upload to `processed/thumbnails/{userId}/{videoId}.jpg`
- [ ] Set content type to `image/jpeg`
- [ ] Get public URL after upload
- [ ] Handle upload failures gracefully with retry logic (retry once)
- [ ] Add structured logging for upload (success/failure/duration)
- [ ] Ensure `processed` bucket exists with public read policy
- [ ] Convert local URI/data URL to blob for upload

**Function Interface:**
```typescript
export async function uploadVideoThumbnail(
  thumbnailUri: string,
  videoId: number,
  userId: string
): Promise<string | null> {
  try {
    const filePath = `thumbnails/${userId}/${videoId}.jpg`
    
    // Convert local URI/data URL to blob for upload
    const response = await fetch(thumbnailUri)
    const blob = await response.blob()
    
    const { data, error } = await supabase.storage
      .from('processed')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from('processed')
      .getPublicUrl(filePath)
    
    return urlData.publicUrl
  } catch (error) {
    logger.error('Failed to upload thumbnail', { videoId, error })
    return null
  }
}
```

**Acceptance Criteria:**
- [ ] Thumbnail uploads successfully to `processed` bucket
- [ ] Public URL returned and accessible via CDN
- [ ] File path uses `thumbnails/{userId}/{videoId}.jpg` structure
- [ ] Upsert enabled (overwrites existing thumbnails)
- [ ] Errors handled gracefully with retry logic
- [ ] Logging captures upload metrics (duration, size, success/failure)
- [ ] Bucket configuration verified (public read access)

#### Module 3: Pipeline Integration
**Summary:** Integrate cloud upload into video upload pipeline after local thumbnail generation.

**Files:**
- `packages/app/services/videoUploadAndAnalysis.ts` (modify)
- `packages/api/src/services/videoUploadService.ts` (modify)

**Tasks:**
- [ ] Call `uploadVideoThumbnail()` after local thumbnail generation in `videoUploadAndAnalysis.ts`
- [ ] Pass cloud URL to `uploadVideo()` instead of local URI
- [ ] Store cloud URL in `thumbnail_url` column (not `metadata.thumbnailUri`)
- [ ] Maintain backward compatibility: keep `metadata.thumbnailUri` for local fallback
- [ ] Maintain non-blocking behavior (upload failures don't crash pipeline)
- [ ] Add structured logging for cloud upload step

**Integration Pattern:**
```typescript
// After local thumbnail generation (Task 30 Module 2/3)
const localThumbnail = await generateVideoThumbnail(videoUri)

// Upload to cloud storage (Task 31 Module 2)
const cloudUrl = await uploadVideoThumbnail(
  localThumbnail?.uri,
  videoRecordingId,
  userId
).catch(() => null)

// Store in database with fallback
const metadata = {
  thumbnailUri: localThumbnail?.uri, // Local fallback
}

await uploadVideo(videoUri, {
  thumbnailUrl: cloudUrl, // Cloud URL in dedicated column
  metadata,
})
```

**Acceptance Criteria:**
- [ ] Cloud upload runs after local thumbnail generation
- [ ] Public URL stored in `thumbnail_url` column
- [ ] Local URI still stored in `metadata.thumbnailUri` (fallback)
- [ ] Pipeline doesn't fail if cloud upload fails
- [ ] Graceful degradation to local URI if cloud unavailable
- [ ] Structured logging for debugging

#### Module 4: Cache Retrieval Update
**Summary:** Update cache retrieval to prefer cloud URLs over local URIs.

**File:** `packages/app/features/VideoAnalysis/stores/analysisStatus.ts` (modify)

**Tasks:**
- [ ] Update `setJobResults()` to read `thumbnail_url` column first
- [ ] Fallback to `metadata.thumbnailUri` if `thumbnail_url` is null (backward compatibility)
- [ ] Update `historyStore.updateCache()` to use cloud URL when available
- [ ] Add null checks for missing thumbnails
- [ ] Add logging for cache retrieval source (cloud vs local)

**Retrieval Pattern:**
```typescript
// Prefer cloud URL, fallback to local URI
const thumbnail = videoRecording.thumbnail_url 
  || videoRecording.metadata?.thumbnailUri

historyStore.updateCache({
  thumbnail, // Cloud URL or local URI
})
```

**Acceptance Criteria:**
- [ ] Cache retrieval prefers `thumbnail_url` over `metadata.thumbnailUri`
- [ ] Fallback to `metadata.thumbnailUri` works for old records
- [ ] Cache stores cloud URL correctly
- [ ] VideosSection displays thumbnails from cloud URLs (CDN)
- [ ] Backward compatibility maintained for existing records

#### Module 5: Test Suite
**Summary:** Unit tests for cloud storage upload.

**File:** `packages/api/src/services/videoThumbnailService.test.ts` (extend existing tests)

**Tasks:**
- [ ] Test successful cloud upload (native + web platforms)
- [ ] Test upload failure handling with retry
- [ ] Test public URL generation
- [ ] Test blob conversion from local URI and data URL
- [ ] Test upsert behavior (overwrites existing)
- [ ] Mock Supabase Storage client

**Acceptance Criteria:**
- [ ] All tests pass (existing 9 + new cloud upload tests)
- [ ] Cloud upload logic tested separately from local generation
- [ ] Error cases covered (network failures, bucket errors, auth failures)
- [ ] Retry logic verified (1 retry attempt)
- [ ] Platform-specific blob conversion tested

#### Module 6: Manual QA
**Summary:** End-to-end validation of cloud storage migration.

**Tasks:**
- [ ] Record video → thumbnail uploaded to Supabase Storage
- [ ] Verify `thumbnail_url` populated in database
- [ ] Verify cloud URL is publicly accessible (CDN)
- [ ] VideosSection displays thumbnails from cloud URLs
- [ ] Upload pipeline succeeds even if cloud upload fails
- [ ] Thumbnail load time < 500ms (CDN benefit)
- [ ] Old records with `metadata.thumbnailUri` still work (backward compatibility)
- [ ] Verify bucket storage quota usage

**SUCCESS VALIDATION:**
- [ ] `yarn type-check` passes ✅ (0 errors)
- [ ] `yarn workspace @my/api test videoThumbnailService.test.ts --run` → all tests pass
- [ ] `yarn lint` passes ✅ (0 errors)
- [ ] Manual QA: All items above verified
- [ ] Performance: Cloud thumbnail load < 500ms (CDN)
- [ ] Storage: Thumbnails visible in Supabase Storage dashboard

**FILES TO CREATE:**
- `supabase/migrations/[timestamp]_add_thumbnail_url.sql` (database migration)

**FILES TO MODIFY:**
- `packages/api/src/services/videoThumbnailService.ts` (add cloud upload function)
- `packages/app/services/videoUploadAndAnalysis.ts` (integrate cloud upload)
- `packages/api/src/services/videoUploadService.ts` (store `thumbnail_url`)
- `packages/app/features/VideoAnalysis/stores/analysisStatus.ts` (read `thumbnail_url`)
- `packages/api/types/database.ts` (add `thumbnail_url` to types)
- `packages/api/src/services/videoThumbnailService.test.ts` (extend with cloud upload tests)

**DEPENDENCIES:**
- Supabase Storage `processed` bucket must be configured with public read access
- Database migration must run before code deployment
- Backward compatibility maintained throughout migration

---

### Task 11: Eliminate useFeedbackPanel Redundancy 
**Effort:** 2 hours | **Priority:** Medium | **Depends on:** Task 10

@step-by-step-rule.mdc - Evaluate and potentially remove useFeedbackPanel hook if it only wraps useState with no business logic.

OBJECTIVE: Reduce abstraction overhead by eliminating hooks that don't provide value beyond useState.

CURRENT STATE:
- packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts (78 lines)
- Only manages: panelFraction, activeTab, selectedFeedbackId
- selectedFeedbackId now redundant with useFeedbackSelection.highlightedFeedbackId
- panelFraction/activeTab are simple UI state (expand/collapse, tab switching)

DECISION CRITERIA:
IF useFeedbackPanel only does:
  - useState wrappers
  - No coordination with other hooks
  - No complex business logic
THEN: Remove it, move state directly to VideoAnalysisScreen or FeedbackSection

IF it provides:
  - Animation coordination
  - Complex panel lifecycle management
  - Multi-component synchronization
THEN: Keep it but remove selectedFeedbackId (now redundant)

SCOPE:
- OPTION A (Most Likely): Remove hook entirely
  - DELETE: packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts
  - DELETE: packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.test.ts
  - MODIFY: VideoAnalysisScreen.tsx - Replace with useState for panelFraction/activeTab
  
- OPTION B: Keep but simplify
  - REMOVE: selectedFeedbackId from interface (now handled by useFeedbackSelection)
  - KEEP: panelFraction and activeTab management
  - UPDATE: Tests to remove selectedFeedbackId coverage

ACCEPTANCE CRITERIA:
- [ ] No redundant selectedFeedbackId state
- [ ] Panel expand/collapse still works
- [ ] Tab switching still works
- [ ] No loss of animation coordination (if Option B)
- [ ] VideoAnalysisScreen.tsx cleaner, not more complex
- [ ] All existing panel behavior preserved

SUCCESS VALIDATION:
- yarn type-check passes
- Panel expands/collapses smoothly
- Tab switching works
- No state synchronization bugs

